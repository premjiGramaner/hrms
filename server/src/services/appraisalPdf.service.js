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

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  PRIMARY: "#172554",
  SECONDARY: "#52637a",
  TEXT: "#334155",
  BORDER: "#d9dde7",
  LIGHT_BORDER: "#eef2f7",
  HEADER_LINE: "#cbd5e1",
  SECTION_LINE: "#e5e7eb",
  FOOTER: "#94a3b8",
};

const FONTS = {
  REGULAR: "Helvetica",
  BOLD: "Helvetica-Bold",
};

const DIMS = {
  LEFT: 42,
  RIGHT: 553,
  PAGE_WIDTH: 511,
  PAGE_TOP: 54,
  PAGE_BOTTOM: 780,
  PAGE_SPACE_MIN: 48,
  ROW_HEIGHT: 28,
  HEADER_HEIGHT: 24,
  EVALUATOR_ROW_HEIGHT: 26,
  COMPETENCY_MIN_HEIGHT: 34,
  INFO_WIDTHS: [118, 160, 92, 141],
  INFO_LABEL_WIDTH: 118,
  INFO_VALUE_WIDTH: 393,
};

// ─── Text Utilities ──────────────────────────────────────────────────────────

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

function competencyHeading(appraisal) {
  return `${appraisal.employee?.jobTitle || appraisal.template?.jobTitle || "Employee"} Competencies`;
}

// ─── PDF Style Helpers ───────────────────────────────────────────────────────

function applyHeadingStyle(doc, fontSize = 17) {
  doc.font(FONTS.BOLD).fontSize(fontSize).fillColor(COLORS.PRIMARY);
}

function applySubHeadingStyle(doc, fontSize = 11) {
  doc.font(FONTS.BOLD).fontSize(fontSize).fillColor(COLORS.SECONDARY);
}

function applyLabelStyle(doc, fontSize = 10) {
  doc.font(FONTS.REGULAR).fontSize(fontSize).fillColor(COLORS.SECONDARY);
}

function applyValueStyle(doc, fontSize = 9.2) {
  doc.font(FONTS.REGULAR).fontSize(fontSize).fillColor(COLORS.TEXT);
}

function applyFooterStyle(doc) {
  doc.font(FONTS.REGULAR).fontSize(8).fillColor(COLORS.FOOTER);
}

// ─── PDF Drawing Primitives ──────────────────────────────────────────────────

function ensurePageSpace(doc, y, needed = 80) {
  if (y + needed < doc.page.height - DIMS.PAGE_SPACE_MIN) return y;
  doc.addPage();
  return DIMS.PAGE_SPACE_MIN;
}

function drawSectionDivider(doc, y) {
  doc.moveTo(DIMS.LEFT, y).lineTo(DIMS.RIGHT, y).stroke(COLORS.SECTION_LINE);
}

function sectionTitle(doc, title, y) {
  y = ensurePageSpace(doc, y, 34);
  applySubHeadingStyle(doc, 13);
  doc.text(title, DIMS.LEFT, y);
  drawSectionDivider(doc, y + 22);
  return y + 34;
}

function cell(doc, text, x, y, width, height, options = {}) {
  const {
    bold = false,
    fontSize = 9,
    align = "left",
    fill = COLORS.TEXT,
    border = true,
    padding = 6,
  } = options;
  if (border) doc.rect(x, y, width, height).stroke(COLORS.BORDER);
  doc
    .font(bold ? FONTS.BOLD : FONTS.REGULAR)
    .fontSize(fontSize)
    .fillColor(fill)
    .text(clean(text, ""), x + padding, y + padding, {
      width: width - padding * 2,
      height: height - padding * 2,
      align,
    });
}

function headerCell(doc, text, x, y, width, height, options = {}) {
  cell(doc, text, x, y, width, height, {
    bold: true,
    fill: COLORS.SECONDARY,
    ...options,
  });
}

function infoRow(doc, leftLabel, leftValue, rightLabel, rightValue, x, y) {
  const w = DIMS.INFO_WIDTHS;
  const height = DIMS.ROW_HEIGHT;
  headerCell(doc, leftLabel, x, y, w[0], height);
  cell(doc, leftValue, x + w[0], y, w[1], height);
  headerCell(doc, rightLabel || "", x + w[0] + w[1], y, w[2], height);
  cell(doc, rightValue || "", x + w[0] + w[1] + w[2], y, w[3], height);
  return y + height;
}

function fullInfoRow(doc, label, value, x, y) {
  const labelWidth = DIMS.INFO_LABEL_WIDTH;
  const valueWidth = DIMS.INFO_VALUE_WIDTH;
  const height = Math.max(
    DIMS.ROW_HEIGHT,
    doc.heightOfString(clean(value, ""), { width: valueWidth - 12 }) + 12,
  );
  headerCell(doc, label, x, y, labelWidth, height);
  cell(doc, value, x + labelWidth, y, valueWidth, height);
  return y + height;
}

// ─── Table Drawing Helpers ───────────────────────────────────────────────────

function drawTableHeaderRow(doc, labels, positions, widths, y, height) {
  labels.forEach((label, i) => {
    headerCell(doc, label, positions[i], y, widths[i], height, {
      align: i >= 2 ? "center" : "left",
    });
  });
  return y + height;
}

function drawEvaluatorTableHeader(doc, y) {
  const widths = [82, 150, 279];
  const positions = [DIMS.LEFT, DIMS.LEFT + widths[0], DIMS.LEFT + widths[0] + widths[1]];
  return drawTableHeaderRow(
    doc,
    ["Code", "Evaluator Type", "Evaluator Name"],
    positions,
    widths,
    y,
    DIMS.HEADER_HEIGHT,
  );
}

function drawEvaluatorTableRow(doc, row, y) {
  const widths = [82, 150, 279];
  const height = DIMS.EVALUATOR_ROW_HEIGHT;
  cell(doc, row.code, DIMS.LEFT, y, widths[0], height);
  cell(doc, row.type, DIMS.LEFT + widths[0], y, widths[1], height);
  cell(doc, row.name, DIMS.LEFT + widths[0] + widths[1], y, widths[2], height);
  return y + height;
}

// ─── Page Builders ───────────────────────────────────────────────────────────

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
  if (logoImage) doc.image(logoImage, DIMS.LEFT, 35, { width: 112 });

  const lines = stripHtml(header)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title =
    lines[0] || defaultPerformanceEvaluationHeader.split(/\r?\n/)[0];
  const rest = lines.slice(1).join("\n");

  applyHeadingStyle(doc, 17);
  doc.text(title, 178, 36, { width: 375, align: "right" });
  applyValueStyle(doc, 9.2);
  doc.text(rest, 178, 64, { width: 375, align: "right", lineGap: 2 });
  doc.moveTo(DIMS.LEFT, 160).lineTo(DIMS.RIGHT, 160).stroke(COLORS.HEADER_LINE);
  return 180;
}

function drawPageOne(doc, appraisal) {
  let y = drawHeader(doc, appraisal);

  y = sectionTitle(doc, "Appraisal Information", y);
  y = fullInfoRow(doc, "Description", appraisal.description, DIMS.LEFT, y);
  y = infoRow(doc, "Start Date", appraisal.from, "End Date", appraisal.to, DIMS.LEFT, y);
  y = fullInfoRow(doc, "Cycle Name", appraisal.description, DIMS.LEFT, y);
  y = infoRow(doc, "Final Rating", number(appraisal.finalRating, "--"), "", "", DIMS.LEFT, y);
  y =
    infoRow(doc, "Appraisal Status", appraisal.status, "Time Stamp", dateTime(), DIMS.LEFT, y) +
    24;

  y = sectionTitle(doc, "Reviewed Employee Information", y);
  y = fullInfoRow(doc, "Reviewed Employee", appraisal.employee?.name, DIMS.LEFT, y);
  y = infoRow(
    doc,
    "Job Title",
    appraisal.employee?.jobTitle || appraisal.template?.jobTitle,
    "Location",
    appraisal.employee?.location,
    DIMS.LEFT,
    y,
  );
  infoRow(doc, "Sub Unit", appraisal.employee?.subUnit, "Country", "INDIA", DIMS.LEFT, y);
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

function drawCompetencyReviewTable(doc, appraisal, rows, y) {
  const ratingColumns = rows.map((row) => row.code);
  applyHeadingStyle(doc, 10);
  doc.text(competencyHeading(appraisal), DIMS.LEFT, y);
  y += 24;

  cell(doc, "Competencies", DIMS.LEFT, y, 331, DIMS.EVALUATOR_ROW_HEIGHT, {
    bold: true,
    fill: COLORS.SECONDARY,
  });
  ratingColumns.forEach((label, index) => {
    cell(doc, label, 373 + index * 90, y, 90, DIMS.EVALUATOR_ROW_HEIGHT, {
      bold: true,
      fill: COLORS.SECONDARY,
      align: "center",
    });
  });
  y += DIMS.EVALUATOR_ROW_HEIGHT;

  appraisal.questions.forEach((question) => {
    const questionText = splitCompetencyText(question.displayText);
    const rowHeight = Math.max(
      DIMS.COMPETENCY_MIN_HEIGHT,
      doc.heightOfString(questionText, { width: 315 }) + 12,
    );
    y = ensurePageSpace(doc, y, rowHeight + DIMS.ROW_HEIGHT);
    cell(doc, questionText, DIMS.LEFT, y, 331, rowHeight, { border: false });
    rows.forEach((row, index) => {
      const score = reviewerScore(question, row.reviewerType);
      cell(doc, number(score, "--"), 373 + index * 90, y, 90, rowHeight, {
        border: false,
        align: "center",
        bold: true,
      });
    });
    y += rowHeight;
    doc.moveTo(DIMS.LEFT, y).lineTo(DIMS.RIGHT, y).stroke(COLORS.LIGHT_BORDER);
  });

  return y;
}

function drawOverallRating(doc, appraisal, rows, y) {
  y = ensurePageSpace(doc, y + 8, 36);
  applyHeadingStyle(doc, 10);
  doc.text("Overall Rating", DIMS.LEFT, y);
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
  return y;
}

function drawSummaryPage(doc, appraisal) {
  doc.addPage();
  let y = DIMS.PAGE_TOP;
  y = sectionTitle(doc, "Summary", y);
  applySubHeadingStyle(doc);
  doc.text("Evaluators", DIMS.LEFT, y);
  y += 22;

  const rows = evaluatorRows(appraisal);
  y = drawEvaluatorTableHeader(doc, y);
  rows.forEach((row) => {
    y = drawEvaluatorTableRow(doc, row, y);
  });

  y += 24;
  y = sectionTitle(doc, "Reviews", y);
  y = drawCompetencyReviewTable(doc, appraisal, rows, y);
  drawOverallRating(doc, appraisal, rows, y);
}

function drawEvaluatorInfo(doc, appraisal, row, y) {
  const reviewer =
    row.reviewerType === "supervisor"
      ? appraisal.mainEvaluator
      : appraisal.employee;
  const overall =
    row.reviewerType === "supervisor"
      ? appraisal.supervisorRating
      : appraisal.selfRating;

  y = sectionTitle(doc, "Evaluator Details", y);
  y = infoRow(doc, "Evaluator Name", reviewer?.name, "Evaluator Type", row.type, DIMS.LEFT, y);
  y = infoRow(
    doc,
    "Job Title",
    reviewer?.jobTitle || reviewer?.role,
    "Location",
    reviewer?.location || appraisal.employee?.location,
    DIMS.LEFT,
    y,
  );
  y = infoRow(
    doc,
    "Sub Unit",
    reviewer?.subUnit || appraisal.employee?.subUnit,
    "Country",
    "India",
    DIMS.LEFT,
    y,
  );
  y = infoRow(doc, "Overall Rating", number(overall, "--"), "", "", DIMS.LEFT, y) + 26;

  return { y, overall };
}

function drawDetailCompetencyTable(doc, appraisal, row, y, overall) {
  const widths = [60, 261, 70, 60, 60];
  const positions = [42, 102, 363, 433, 493];
  const labels = ["Group", "Competencies", "Weight", "Rating", "Comment"];

  applyHeadingStyle(doc, 12);
  doc.text(competencyHeading(appraisal), DIMS.LEFT, y);
  y += 22;
  applyLabelStyle(doc);
  doc.text("Weight: 100%", DIMS.LEFT, y);
  doc.text(`Rating: ${number(overall, "--")}`, 180, y);
  y += DIMS.ROW_HEIGHT;

  labels.forEach((label, i) => {
    headerCell(doc, label, positions[i], y, widths[i], DIMS.ROW_HEIGHT, {
      align: i >= 2 && i <= 3 ? "center" : "left",
    });
  });
  y += DIMS.ROW_HEIGHT;

  appraisal.questions.forEach((question) => {
    const questionText = splitCompetencyText(question.displayText);
    const comment = reviewerComment(question, row.reviewerType);
    const rowHeight = Math.max(
      DIMS.COMPETENCY_MIN_HEIGHT,
      doc.heightOfString(questionText, { width: widths[1] - 12 }) + 12,
      doc.heightOfString(clean(comment, ""), { width: widths[4] - 12 }) + 12,
    );
    y = ensurePageSpace(doc, y, rowHeight + 32);
    cell(doc, "KPI's", positions[0], y, widths[0], rowHeight);
    cell(doc, questionText, positions[1], y, widths[1], rowHeight);
    cell(doc, weightText(ratingWeight(appraisal, question)), positions[2], y, widths[2], rowHeight, {
      align: "center",
    });
    cell(doc, number(reviewerScore(question, row.reviewerType), "--"), positions[3], y, widths[3], rowHeight, {
      align: "center",
      bold: true,
    });
    cell(doc, comment || "", positions[4], y, widths[4], rowHeight);
    y += rowHeight;
  });
}

function drawEvaluatorDetailPage(doc, appraisal, row) {
  doc.addPage();
  let y = DIMS.PAGE_TOP;

  const { y: nextY, overall } = drawEvaluatorInfo(doc, appraisal, row, y);
  drawDetailCompetencyTable(doc, appraisal, row, nextY, overall);
}

// ─── PDF Assembly ────────────────────────────────────────────────────────────

function drawPageNumbers(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    applyFooterStyle(doc);
    doc.text(`Page ${i + 1} of ${pages.count}`, DIMS.LEFT, DIMS.PAGE_BOTTOM, {
      width: DIMS.PAGE_WIDTH,
      align: "right",
      lineBreak: false,
    });
  }
}

function populateAppraisalPdf(doc, appraisal) {
  drawPageOne(doc, appraisal);
  drawSummaryPage(doc, appraisal);
  evaluatorRows(appraisal).forEach((row) =>
    drawEvaluatorDetailPage(doc, appraisal, row),
  );
  drawPageNumbers(doc);
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
