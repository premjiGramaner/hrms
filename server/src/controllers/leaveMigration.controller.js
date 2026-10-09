import { buildMigrationReport } from "../services/migrationReport.service.js";

export async function downloadLeaveMigrationErrors(req, res, next) {
  try {
    const format = req.query.format === "csv" ? "csv" : "xlsx";
    const report = await buildMigrationReport(
      req.params.id,
      "leave-errors",
      format,
    );
    res.setHeader("Content-Type", report.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${report.fileName}"`,
    );
    if (format === "csv") return res.send(report.data);
    await report.workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return next(error);
  }
}
