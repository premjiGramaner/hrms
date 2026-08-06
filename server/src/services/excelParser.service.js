import ExcelJS from "exceljs";
import { MIGRATION_LIMITS } from "../constants/migration.js";
import {
  getHeaderAliases,
  getMappingForSheet,
  normalizeName,
} from "./migrationMapping.service.js";

const HEADER_SCAN_ROWS = 20;

function cellValue(cell) {
  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if ("result" in value) return value.result ?? null;
  if ("text" in value) return value.text;
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  return String(cell.text || "").trim() || null;
}

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function uniqueHeader(header, used) {
  const base = String(header || "").trim();
  if (!base) return "";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${base} (${suffix++})`;
  used.add(candidate.toLowerCase());
  return candidate;
}

function detectHeaderRow(worksheet, mapping) {
  const aliases = getHeaderAliases(mapping);
  const scanThrough = Math.min(worksheet.actualRowCount, HEADER_SCAN_ROWS);
  let firstPopulatedRow = 1;
  let best = { rowNumber: 1, score: 0 };
  let foundPopulatedRow = false;

  for (let rowNumber = 1; rowNumber <= scanThrough; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = [];
    for (let column = 1; column <= worksheet.actualColumnCount; column += 1) {
      const value = cellValue(row.getCell(column));
      if (!isEmpty(value)) values.push(normalizeName(value));
    }
    if (!values.length) continue;
    if (!foundPopulatedRow) {
      firstPopulatedRow = rowNumber;
      foundPopulatedRow = true;
    }
    const score = new Set(values.filter((value) => aliases.has(value))).size;
    if (score > best.score) best = { rowNumber, score };
  }
  return best.score > 0 ? best.rowNumber : firstPopulatedRow;
}

export async function parseWorkbook(buffer) {
  if (!buffer?.length || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    const error = new Error("The uploaded file is not a valid .xlsx archive");
    error.statusCode = 400;
    throw error;
  }
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    const error = new Error("The uploaded file is corrupt or is not a valid .xlsx workbook");
    error.statusCode = 400;
    throw error;
  }
  if (!workbook.worksheets.length) throw new Error("The workbook has no sheets");
  if (workbook.worksheets.length > MIGRATION_LIMITS.MAX_SHEETS) {
    throw new Error(`Workbook exceeds ${MIGRATION_LIMITS.MAX_SHEETS} sheets`);
  }

  let totalRows = 0;
  const sheets = workbook.worksheets.map((worksheet, sheetIndex) => {
    const mapping = getMappingForSheet(worksheet.name);
    const headerRowNumber = detectHeaderRow(worksheet, mapping);
    const headerRow = worksheet.getRow(headerRowNumber);
    const used = new Set();
    const headers = [];
    for (let column = 1; column <= worksheet.actualColumnCount; column += 1) {
      headers.push(uniqueHeader(cellValue(headerRow.getCell(column)), used));
    }
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;
      const values = headers.map((header, index) => [header, cellValue(row.getCell(index + 1))]);
      if (values.every(([, value]) => isEmpty(value))) return;
      rows.push({ rowNumber, values: Object.fromEntries(values.filter(([header]) => header)) });
      totalRows += 1;
      if (totalRows > MIGRATION_LIMITS.MAX_ROWS) {
        const error = new Error(`Workbook exceeds ${MIGRATION_LIMITS.MAX_ROWS} data rows`);
        error.statusCode = 400;
        throw error;
      }
    });
    return {
      name: worksheet.name,
      sheetOrder: sheetIndex,
      headerRowNumber,
      headers,
      rows,
    };
  });
  return { sheets, totalRows };
}
