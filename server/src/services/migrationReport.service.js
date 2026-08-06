import ExcelJS from "exceljs";
import * as MigrationModel from "../models/migration.model.js";

const CSV_FORMULA = /^[=+\-@]/;
const safeCsv = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (CSV_FORMULA.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const sourceValue = (rawData, header) => {
  const found = Object.entries(rawData || {}).find(
    ([key]) => key.trim().toLowerCase() === header.toLowerCase(),
  );
  return found?.[1] ?? "";
};

function addSheet(workbook, name, columns, rows) {
  const worksheet = workbook.addWorksheet(name.slice(0, 31));
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || 22,
  }));
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B2A6B" },
  };
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + Math.min(columns.length, 26))}1` };
}

export async function buildMigrationReport(id, type = "all", format = "xlsx") {
  const job = await MigrationModel.getMigration(id);
  if (!job) {
    const error = new Error("Migration not found");
    error.statusCode = 404;
    throw error;
  }
  const rows = await MigrationModel.getReportRows(id, type);
  const reportRows = rows.flatMap((row) => {
    const issues = row.validation_errors?.length ? row.validation_errors : [null];
    return issues.map((entry) => ({
      sheet: row.sheet_name,
      row: row.source_row,
      status: row.status,
      employee: sourceValue(row.raw_data, "Employee Name"),
      leaveType: sourceValue(row.raw_data, "Leave Type"),
      column: entry?.column || "",
      invalidValue: entry?.invalidValue ?? "",
      severity: entry?.severity || "",
      reason: entry?.reason || row.result_message || "",
      suggestedFix: entry?.suggestedFix || (row.status === "FAILED" ? "Correct the source lookup/data and retry the migration." : ""),
    }));
  });

  const columns = [
    { header: "Sheet", key: "sheet" },
    { header: "Row", key: "row", width: 12 },
    { header: "Status", key: "status", width: 16 },
    { header: "Employee", key: "employee", width: 28 },
    { header: "Leave Type", key: "leaveType", width: 24 },
    { header: "Column", key: "column" },
    { header: "Invalid Value", key: "invalidValue", width: 28 },
    { header: "Severity", key: "severity", width: 14 },
    { header: "Reason", key: "reason", width: 45 },
    { header: "Suggested Fix", key: "suggestedFix", width: 45 },
  ];

  if (format === "csv") {
    const csv = [columns.map((column) => safeCsv(column.header)).join(",")];
    reportRows.forEach((row) => csv.push(columns.map((column) => safeCsv(row[column.key])).join(",")));
    return {
      data: `\uFEFF${csv.join("\r\n")}`,
      contentType: "text/csv; charset=utf-8",
      fileName: `migration-${id}-${type}.csv`,
    };
  }

  const workbook = new ExcelJS.Workbook();  
  workbook.creator = "HRMS Data Migration";
  addSheet(workbook, "Summary", [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 30 },
  ], [
    { metric: "File", value: job.file_name },
    { metric: "Status", value: job.status },
    { metric: "Total records", value: job.total_records },
    { metric: "Inserted", value: job.inserted_records },
    { metric: "Updated", value: job.updated_records },
    { metric: "Skipped", value: job.skipped_records },
    { metric: "Failed", value: job.failed_records },
    { metric: "Started", value: job.started_at || "" },
    { metric: "Completed", value: job.completed_at || "" },
  ]);
  addSheet(workbook, type === "all" ? "Row Results" : type, columns, reportRows);
  return {
    workbook,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: `migration-${id}-${type}.xlsx`,
  };
}
