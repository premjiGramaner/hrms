import { success } from "../utils/response.js";
import * as MigrationService from "../services/migration.service.js";
import { buildMigrationReport } from "../services/migrationReport.service.js";

export async function uploadMigration(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error("Excel file is required in field 'fileExcel'");
      error.statusCode = 400;
      throw error;
    }
    return success(
      res,
      await MigrationService.uploadAndValidate(req.file, req.user),
      201,
    );
  } catch (error) {
    return next(error);
  }
}

export async function startMigration(req, res, next) {
  try {
    const result = await MigrationService.queueMigration(
      req.params.id,
      Boolean(req.body?.overwriteExisting),
      req.user,
    );
    return success(res, result, 202);
  } catch (error) {
    return next(error);
  }
}

export async function getMigrationStatus(req, res, next) {
  try {
    return success(res, await MigrationService.getStatus(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function getMigrationErrors(req, res, next) {
  try {
    return success(
      res,
      await MigrationService.getErrors(req.params.id, req.query),
    );
  } catch (error) {
    return next(error);
  }
}

export async function getMigrationHistory(req, res, next) {
  try {
    return success(res, await MigrationService.getHistory(req.query));
  } catch (error) {
    return next(error);
  }
}

export async function downloadMigrationReport(req, res, next) {
  try {
    const format = req.query.format === "csv" ? "csv" : "xlsx";
    const report = await buildMigrationReport(
      req.params.id,
      req.query.type || "all",
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
