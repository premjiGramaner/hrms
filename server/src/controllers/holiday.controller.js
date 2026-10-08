import pdfParse from "pdf-parse-fork";
import pool from "../config/db.js";
import { logError } from "../utils/logger.js";

// ── Advisory lock key — prevents concurrent uploads from racing each other
const UPLOAD_LOCK_KEY = 20261025; // arbitrary stable bigint for pg_try_advisory_xact_lock

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Parse a date string like "Oct 2, 2026", "April 14, 2026", "Jan. 5, 2026",
 * or "2026-10-02" into "YYYY-MM-DD" without using new Date(string) to avoid
 * timezone off-by-one bugs.
 */
function parseDateToYMD(dateStr) {
  // Normalize: collapse whitespace, strip trailing/leading punctuation per token
  const clean = dateStr
    .replace(/\s+/g, " ")
    .replace(/\.\s*/g, " ") // "Jan." → "Jan "
    .trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // "Oct 2, 2026" / "April 14 2026" / "Jan 5 2026"
  const match = clean.match(/^([A-Za-z]+)\s+(\d{1,2})[,\s]+(\d{4})$/);
  if (match) {
    const monthNum = MONTH_MAP[match[1].toLowerCase()];
    if (!monthNum) return null;
    const day = String(parseInt(match[2], 10)).padStart(2, "0");
    const month = String(monthNum).padStart(2, "0");
    return `${match[3]}-${month}-${day}`;
  }

  return null;
}

export const uploadHolidayPdf = async (req, res, next) => {
  let client;
  try {
    // pool.connect() is inside try so connection failures reach error middleware
    client = await pool.connect();

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF file uploaded" });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text || "";

    if (!rawText.trim()) {
      return res.status(422).json({
        success: false,
        message: "PDF text extraction yielded empty content.",
      });
    }

    // Normalize: strip pipes, join split dates like "June\n2, 2026"
    let cleanText = rawText.replace(/\|/g, " ");
    cleanText = cleanText.replace(
      /(Jan|Feb|Mar|Apr|April|May|Jun|June|Jul|July|Aug|Sep|Oct|Nov|Dec)\.?\s*\n\s*(\d{1,2}[,\s]+\d{4})/gi,
      "$1 $2",
    );

    const lines = cleanText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedHolidays = [];
    const skippedLines = [];

    const dateRegex =
      /(?:Jan|Feb|Mar|Apr|April|May|Jun|June|Jul|July|Aug|Sep|Oct|Nov|Dec)\.?[\s,.-]*\d{1,2}[\s,.-]*\d{4}|\d{4}-\d{2}-\d{2}/i;
    const dayRegex =
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip known header/footer rows
      if (/Holiday|Weekdays|Weekends|CANNYFORE/i.test(line)) continue;

      const dateMatch = line.match(dateRegex);
      if (!dateMatch) continue;

      const rawDateStr = dateMatch[0];
      const dateIndex = line.indexOf(rawDateStr);

      let title = line.substring(0, dateIndex).trim();
      if (!title && i > 0 && !lines[i - 1].match(dateRegex)) {
        title = lines[i - 1]
          .replace(dayRegex, "")
          .replace(/\b(YES|NO|Y|N)\b/gi, "")
          .trim();
      }

      const postDateStr = line.substring(dateIndex + rawDateStr.length).trim();

      const dayMatch =
        postDateStr.match(dayRegex) ||
        (lines[i + 1] && lines[i + 1].match(dayRegex));
      const dayName = dayMatch ? dayMatch[1] : "";

      const flagSearchStr = postDateStr + " " + (lines[i + 1] || "");
      const flags = Array.from(
        flagSearchStr.matchAll(/\b(YES|NO|Y|N)\b/gi),
        (m) => m[0].toUpperCase(),
      );

      const isBangalore  = flags[0] === "YES" || flags[0] === "Y";
      const isCoimbatore = flags[1] === "YES" || flags[1] === "Y";
      const isHyderabad  = flags[2] === "YES" || flags[2] === "Y";

      const formattedDate = parseDateToYMD(rawDateStr);

      if (title && formattedDate) {
        parsedHolidays.push({
          title,
          holiday_date: formattedDate, // normalised to Holiday field name
          day_name: dayName,
          is_bangalore:  isBangalore,
          is_coimbatore: isCoimbatore,
          is_hyderabad:  isHyderabad,
        });
      } else {
        // Track lines that had a date but couldn't be fully parsed
        skippedLines.push(line);
      }
    }

    if (parsedHolidays.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Failed to extract holiday rows from the PDF structure.",
      });
    }

    // Reject partial parses — if we skipped lines that looked like holidays,
    // the existing matrix is safer than a truncated replacement.
    if (skippedLines.length > 0) {
      logError("Holiday upload: partial parse detected", null, {
        parsedCount: parsedHolidays.length,
        skippedCount: skippedLines.length,
        skippedSample: skippedLines.slice(0, 5),
        uploadedBy: req.user?.id,
      });
      return res.status(422).json({
        success: false,
        message: `Upload rejected: ${skippedLines.length} row(s) could not be parsed. The existing calendar was not changed. Please check the PDF format.`,
      });
    }

    await client.query("BEGIN");

    // Advisory transaction lock — only one upload can modify the table at a time.
    // pg_try_advisory_xact_lock returns false if another transaction holds it,
    // so concurrent uploads fail fast instead of silently overwriting each other.
    const { rows: lockRows } = await client.query(
      "SELECT pg_try_advisory_xact_lock($1)",
      [UPLOAD_LOCK_KEY],
    );
    if (!lockRows[0].pg_try_advisory_xact_lock) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Another upload is already in progress. Please try again in a moment.",
      });
    }

    await client.query("TRUNCATE TABLE tbl_holiday_matrix");

    for (const item of parsedHolidays) {
      await client.query(
        `INSERT INTO tbl_holiday_matrix
         (title, holiday_date, day_name, is_bangalore, is_coimbatore, is_hyderabad)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          item.title,
          item.holiday_date,
          item.day_name,
          item.is_bangalore,
          item.is_coimbatore,
          item.is_hyderabad,
        ],
      );
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Parsed and stored ${parsedHolidays.length} holidays successfully!`,
      // Return rows in Holiday shape so the client type matches exactly
      data: parsedHolidays,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    // Always log in every environment — production failures must be visible
    logError("Holiday upload failed", error, { uploadedBy: req.user?.id });
    next(error);
  } finally {
    if (client) client.release();
  }
};

export const getHolidayMatrix = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id::text AS id, title,
              TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date,
              day_name, is_bangalore, is_coimbatore, is_hyderabad
       FROM tbl_holiday_matrix
       ORDER BY holiday_date ASC`,
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    logError("Holiday matrix fetch failed", error);
    next(error);
  }
};
