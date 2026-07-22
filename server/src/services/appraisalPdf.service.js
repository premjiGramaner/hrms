import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import {
  defaultPerformanceEvaluationHeader,
  legacySeedHeaderSignature,
} from "../config/performance.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function clean(value, fallback = "-") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}

function number(value, fallback = "--") {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0
    ? numeric.toFixed(2).replace(/\.00$/, "")
    : fallback;
}

function dateTime() {
  const value = new Date();
  const pad = (part) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHeaderImage(value) {
  const match = String(value || "").match(
    /<img[^>]+src=["'](data:image\/(?:png|jpeg|jpg);base64,[^"']+)["']/i,
  );
  if (!match) return null;
  const [, source] = match;
  const [, base64] = source.split(",");
  return Buffer.from(base64, "base64");
}

function ensurePageSpace(doc, y, needed = 80) {
  if (y + needed < doc.page.height - 48) return y;
  doc.addPage();
  return 48;
}

function sectionTitle(doc, title, y) {
  y = ensurePageSpace(doc, y, 34);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#52637a")
    .text(title, 42, y);
  doc
    .moveTo(42, y + 22)
    .lineTo(553, y + 22)
    .stroke("#e5e7eb");
  return y + 34;
}

function cell(doc, text, x, y, width, height, options = {}) {
  const {
    bold = false,
    fontSize = 9,
    align = "left",
    fill = "#334155",
    border = true,
    padding = 6,
  } = options;
  if (border) doc.rect(x, y, width, height).stroke("#d9dde7");
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(fontSize)
    .fillColor(fill)
    .text(clean(text, ""), x + padding, y + padding, {
      width: width - padding * 2,
      height: height - padding * 2,
      align,
    });
}

function infoRow(doc, leftLabel, leftValue, rightLabel, rightValue, x, y) {
  const widths = [118, 160, 92, 141];
  const height = 28;
  cell(doc, leftLabel, x, y, widths[0], height, {
    bold: true,
    fill: "#52637a",
  });
  cell(doc, leftValue, x + widths[0], y, widths[1], height);
  cell(doc, rightLabel || "", x + widths[0] + widths[1], y, widths[2], height, {
    bold: true,
    fill: "#52637a",
  });
  cell(
    doc,
    rightValue || "",
    x + widths[0] + widths[1] + widths[2],
    y,
    widths[3],
    height,
  );
  return y + height;
}

function fullInfoRow(doc, label, value, x, y) {
  const labelWidth = 118;
  const valueWidth = 393;
  const height = Math.max(
    28,
    doc.heightOfString(clean(value, ""), { width: valueWidth - 12 }) + 12,
  );
  cell(doc, label, x, y, labelWidth, height, { bold: true, fill: "#52637a" });
  cell(doc, value, x + labelWidth, y, valueWidth, height);
  return y + height;
}

function ratingWeight(appraisal, question) {
  const explicit = Number(question.weight);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const count = Math.max(appraisal.questions?.length || 1, 1);
  return 100 / count;
}

function weightText(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${numeric.toFixed(1).replace(/\.0$/, "")}%`;
}

function splitCompetencyText(value) {
  return clean(value, "").replace(/_/g, "_");
}

function drawHeader(doc, appraisal) {
  const logoPath = path.resolve(
    __dirname,
    "../../../client/src/assets/cannyfore_title_logo.png",
  );
  const savedHeader = appraisal.template?.header?.trim() || "";
  const header = savedHeader.includes(legacySeedHeaderSignature)
    ? defaultPerformanceEvaluationHeader
    : savedHeader || defaultPerformanceEvaluationHeader;
  const headerImage = extractHeaderImage(header);
  const logoImage = headerImage || (fs.existsSync(logoPath) ? logoPath : null);
  if (logoImage) doc.image(logoImage, 42, 35, { width: 112 });

  const lines = stripHtml(header)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title =
    lines[0] || defaultPerformanceEvaluationHeader.split(/\r?\n/)[0];
  const rest = lines.slice(1).join("\n");

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("#172554")
    .text(title, 178, 36, { width: 375, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor("#334155")
    .text(rest, 178, 64, { width: 375, align: "right", lineGap: 2 });
  doc.moveTo(42, 160).lineTo(553, 160).stroke("#cbd5e1");
  return 180;
}

function drawPageOne(doc, appraisal) {
  let y = drawHeader(doc, appraisal);

  y = sectionTitle(doc, "Appraisal Information", y);
  y = fullInfoRow(doc, "Description", appraisal.description, 42, y);
  y = infoRow(
    doc,
    "Start Date",
    appraisal.from,
    "End Date",
    appraisal.to,
    42,
    y,
  );
  y = fullInfoRow(doc, "Cycle Name", appraisal.description, 42, y);
  y = infoRow(
    doc,
    "Final Rating",
    number(appraisal.finalRating, "--"),
    "",
    "",
    42,
    y,
  );
  y =
    infoRow(
      doc,
      "Appraisal Status",
      appraisal.status,
      "Time Stamp",
      dateTime(),
      42,
      y,
    ) + 24;

  y = sectionTitle(doc, "Reviewed Employee Information", y);
  y = fullInfoRow(doc, "Reviewed Employee", appraisal.employee?.name, 42, y);
  y = infoRow(
    doc,
    "Job Title",
    appraisal.employee?.jobTitle || appraisal.template?.jobTitle,
    "Location",
    appraisal.employee?.location,
    42,
    y,
  );
  infoRow(
    doc,
    "Sub Unit",
    appraisal.employee?.subUnit,
    "Country",
    "INDIA",
    42,
    y,
  );
}

function evaluatorRows(appraisal) {
  const rows = [];
  if (appraisal.mainEvaluator)
    rows.push({
      code: "M-EV-1",
      type: "Main Evaluator",
      name: appraisal.mainEvaluator.name,
      reviewerType: "supervisor",
    });
  rows.push({
    code: appraisal.mainEvaluator ? "S-EV-2" : "S-EV-1",
    type: "Self",
    name: appraisal.employee?.name,
    reviewerType: "self",
  });
  return rows;
}

function drawSummaryPage(doc, appraisal) {
  doc.addPage();
  let y = 54;
  y = sectionTitle(doc, "Summary", y);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#52637a")
    .text("Evaluators", 42, y);
  y += 22;

  const rows = evaluatorRows(appraisal);
  const widths = [82, 150, 279];
  cell(doc, "Code", 42, y, widths[0], 24, { bold: true, fill: "#52637a" });
  cell(doc, "Evaluator Type", 42 + widths[0], y, widths[1], 24, {
    bold: true,
    fill: "#52637a",
  });
  cell(doc, "Evaluator Name", 42 + widths[0] + widths[1], y, widths[2], 24, {
    bold: true,
    fill: "#52637a",
  });
  y += 24;
  rows.forEach((row) => {
    cell(doc, row.code, 42, y, widths[0], 26);
    cell(doc, row.type, 42 + widths[0], y, widths[1], 26);
    cell(doc, row.name, 42 + widths[0] + widths[1], y, widths[2], 26);
    y += 26;
  });

  y += 24;
  y = sectionTitle(doc, "Reviews", y);
  const ratingColumns = rows.map((row) => row.code);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#172554")
    .text(
      `${appraisal.employee?.jobTitle || appraisal.template?.jobTitle || "Employee"} Competencies`,
      42,
      y,
    );
  y += 24;
  cell(doc, "Competencies", 42, y, 331, 26, { bold: true, fill: "#52637a" });
  ratingColumns.forEach((label, index) => {
    cell(doc, label, 373 + index * 90, y, 90, 26, {
      bold: true,
      fill: "#52637a",
      align: "center",
    });
  });
  y += 26;

  appraisal.questions.forEach((question) => {
    const questionText = splitCompetencyText(question.displayText);
    const rowHeight = Math.max(
      34,
      doc.heightOfString(questionText, { width: 315 }) + 12,
    );
    y = ensurePageSpace(doc, y, rowHeight + 28);
    cell(doc, questionText, 42, y, 331, rowHeight, { border: false });
    rows.forEach((row, index) => {
      const score =
        row.reviewerType === "supervisor"
          ? question.supervisorScore
          : question.selfScore;
      cell(doc, number(score, "--"), 373 + index * 90, y, 90, rowHeight, {
        border: false,
        align: "center",
        bold: true,
      });
    });
    y += rowHeight;
    doc.moveTo(42, y).lineTo(553, y).stroke("#eef2f7");
  });

  y = ensurePageSpace(doc, y + 8, 36);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#172554")
    .text("Overall Rating", 42, y);
  rows.forEach((row, index) => {
    const score =
      row.reviewerType === "supervisor"
        ? appraisal.supervisorRating
        : appraisal.selfRating;
    doc.text(number(score, "--"), 373 + index * 90, y, {
      width: 90,
      align: "center",
    });
  });
}

function reviewerScore(question, reviewerType) {
  return reviewerType === "supervisor"
    ? question.supervisorScore
    : question.selfScore;
}

function reviewerComment(question, reviewerType) {
  return reviewerType === "supervisor"
    ? question.supervisorComment
    : question.selfComment;
}

function drawEvaluatorDetailPage(doc, appraisal, row) {
  doc.addPage();
  let y = 54;
  const reviewer =
    row.reviewerType === "supervisor"
      ? appraisal.mainEvaluator
      : appraisal.employee;
  const overall =
    row.reviewerType === "supervisor"
      ? appraisal.supervisorRating
      : appraisal.selfRating;

  y = sectionTitle(doc, "Evaluator Details", y);
  y = infoRow(
    doc,
    "Evaluator Name",
    reviewer?.name,
    "Evaluator Type",
    row.type,
    42,
    y,
  );
  y = infoRow(
    doc,
    "Job Title",
    reviewer?.jobTitle || reviewer?.role,
    "Location",
    reviewer?.location || appraisal.employee?.location,
    42,
    y,
  );
  y = infoRow(
    doc,
    "Sub Unit",
    reviewer?.subUnit || appraisal.employee?.subUnit,
    "Country",
    "India",
    42,
    y,
  );
  y = infoRow(doc, "Overall Rating", number(overall, "--"), "", "", 42, y) + 26;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#172554")
    .text(
      `${appraisal.employee?.jobTitle || appraisal.template?.jobTitle || "Employee"} Competencies`,
      42,
      y,
    );
  y += 22;
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#52637a")
    .text("Weight: 100%", 42, y);
  doc.text(`Rating: ${number(overall, "--")}`, 180, y);
  y += 28;

  const widths = [60, 261, 70, 60, 60];
  cell(doc, "Group", 42, y, widths[0], 28, { bold: true, fill: "#52637a" });
  cell(doc, "Competencies", 102, y, widths[1], 28, {
    bold: true,
    fill: "#52637a",
  });
  cell(doc, "Weight", 363, y, widths[2], 28, {
    bold: true,
    fill: "#52637a",
    align: "center",
  });
  cell(doc, "Rating", 433, y, widths[3], 28, {
    bold: true,
    fill: "#52637a",
    align: "center",
  });
  cell(doc, "Comment", 493, y, widths[4], 28, { bold: true, fill: "#52637a" });
  y += 28;

  appraisal.questions.forEach((question) => {
    const questionText = splitCompetencyText(question.displayText);
    const comment = reviewerComment(question, row.reviewerType);
    const rowHeight = Math.max(
      34,
      doc.heightOfString(questionText, { width: widths[1] - 12 }) + 12,
      doc.heightOfString(clean(comment, ""), { width: widths[4] - 12 }) + 12,
    );
    y = ensurePageSpace(doc, y, rowHeight + 32);
    cell(doc, "KPI's", 42, y, widths[0], rowHeight);
    cell(doc, questionText, 102, y, widths[1], rowHeight);
    cell(
      doc,
      weightText(ratingWeight(appraisal, question)),
      363,
      y,
      widths[2],
      rowHeight,
      { align: "center" },
    );
    cell(
      doc,
      number(reviewerScore(question, row.reviewerType), "--"),
      433,
      y,
      widths[3],
      rowHeight,
      { align: "center", bold: true },
    );
    cell(doc, comment || "", 493, y, widths[4], rowHeight);
    y += rowHeight;
  });
}

function populateAppraisalPdf(doc, appraisal) {
  drawPageOne(doc, appraisal);
  drawSummaryPage(doc, appraisal);
  evaluatorRows(appraisal).forEach((row) =>
    drawEvaluatorDetailPage(doc, appraisal, row),
  );

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(`Page ${i + 1} of ${pages.count}`, 42, 780, {
        width: 511,
        align: "right",
        lineBreak: false,
      });
  }
}

function buildAppraisalPdf(appraisal, res) {
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
  doc.pipe(res);
  populateAppraisalPdf(doc, appraisal);
  doc.end();
}

function buildAppraisalPdfBuffer(appraisal) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    populateAppraisalPdf(doc, appraisal);
    doc.end();
  });
}

export { buildAppraisalPdf, buildAppraisalPdfBuffer };
