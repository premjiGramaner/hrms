import pdfParse from "pdf-parse-fork";
import pool from "../config/db.js";

const MONTH_MAP = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function parseDateToYMD(dateStr) {
  console.log(dateStr);
  const clean = dateStr.replace(/\s+/g, " ").trim();
  console.log(clean);

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

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
  const client = await pool.connect();
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No PDF file uploaded" });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text || "";
    console.log(rawText);
    if (!rawText.trim()) {
      return res.status(422).json({
        success: false,
        message: "PDF text extraction yielded empty content.",
      });
    }

    let cleanText = rawText.replace(/\|/g, " ");
    cleanText = cleanText.replace(
      /(Jan|Feb|Mar|Apr|April|May|Jun|June|Jul|July|Aug|Sep|Oct|Nov|Dec)\s*\n\s*(\d{1,2},\s*\d{4})/gi,
      "$1 $2",
    );

    const lines = cleanText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const parsedHolidays = [];
    const dateRegex =
      /(?:Jan|Feb|Mar|Apr|April|May|Jun|June|Jul|July|Aug|Sep|Oct|Nov|Dec)[\s,.-]*\d{1,2}[\s,.-]*\d{4}|\d{4}-\d{2}-\d{2}/i;
    const dayRegex =
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/Holiday|Weekdays|Weekends|CANNYFORE/i.test(line)) {
        continue;
      }

      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        const rawDateStr = dateMatch[0];
        const dateIndex = line.indexOf(rawDateStr);

        let title = line.substring(0, dateIndex).trim();

        if (!title && i > 0 && !lines[i - 1].match(dateRegex)) {
          title = lines[i - 1]
            .replace(dayRegex, "")
            .replace(/\b(YES|NO|Y|N)\b/gi, "")
            .trim();
        }

        const postDateStr = line
          .substring(dateIndex + rawDateStr.length)
          .trim();

        const dayMatch =
          postDateStr.match(dayRegex) ||
          (lines[i + 1] && lines[i + 1].match(dayRegex));
        const dayName = dayMatch ? dayMatch[1] : "";

        const flagSearchStr = postDateStr + " " + (lines[i + 1] || "");
        const flags = Array.from(
          flagSearchStr.matchAll(/\b(YES|NO|Y|N)\b/gi),
          (m) => m[0].toUpperCase(),
        );

        const isBangalore = flags[0] === "YES" || flags[0] === "Y";
        const isCoimbatore = flags[1] === "YES" || flags[1] === "Y";
        const isHyderabad = flags[2] === "YES" || flags[2] === "Y";

        const formattedDate = parseDateToYMD(rawDateStr);

        if (title && formattedDate) {
          parsedHolidays.push({
            title,
            date: formattedDate,
            day: dayName,
            isBangalore,
            isCoimbatore,
            isHyderabad,
          });
        }
      }
    }

    if (parsedHolidays.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Failed to extract holiday rows from the PDF structure.",
      });
    }

    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE tbl_holiday_matrix");

    for (const item of parsedHolidays) {
      await client.query(
        `INSERT INTO tbl_holiday_matrix 
        (title, holiday_date, day_name, is_bangalore, is_coimbatore, is_hyderabad) 
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          item.title,
          item.date,
          item.day,
          item.isBangalore,
          item.isCoimbatore,
          item.isHyderabad,
        ],
      );
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Parsed and stored ${parsedHolidays.length} holidays successfully!`,
      data: parsedHolidays,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

export const getHolidayMatrix = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title,
              TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date,
              day_name, is_bangalore, is_coimbatore, is_hyderabad
       FROM tbl_holiday_matrix
       ORDER BY holiday_date ASC`,
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};
