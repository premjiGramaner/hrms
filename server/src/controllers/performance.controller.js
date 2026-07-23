import * as PerformanceModel from "../models/performance.model.js";
import {
  buildAppraisalPdf,
  buildAppraisalPdfBuffer,
} from "../services/appraisalPdf.service.js";
import { buildZip, safeZipName } from "../services/zip.service.js";
import { created, error, success } from "../utils/response.js";
import { isAdminRole } from "../constants/roles.js";

const listTemplates = async (_req, res, next) => {
  try {
    return success(res, await PerformanceModel.listTemplates());
  } catch (err) {
    next(err);
  }
};

const getTemplate = async (req, res, next) => {
  try {
    const template = await PerformanceModel.findTemplateById(req.params.id);
    if (!template) return error(res, "Template not found", 404);
    return success(res, template);
  } catch (err) {
    next(err);
  }
};

const createTemplate = async (req, res, next) => {
  const { jobTitle, templateName } = req.body;
  if (!jobTitle || !templateName)
    return error(res, "Job title and template name are required", 422);
  try {
    return created(res, await PerformanceModel.createTemplate(req.body));
  } catch (err) {
    next(err);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const template = await PerformanceModel.updateTemplate(
      req.params.id,
      req.body,
    );
    if (!template) return error(res, "Template not found", 404);
    return success(res, template);
  } catch (err) {
    next(err);
  }
};

const cloneTemplate = async (req, res, next) => {
  try {
    const template = await PerformanceModel.cloneTemplate(req.params.id);
    if (!template) return error(res, "Template not found", 404);
    return created(res, template);
  } catch (err) {
    next(err);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    await PerformanceModel.deleteTemplate(req.params.id);
    return success(res, { message: "Template deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const createTemplateKpi = async (req, res, next) => {
  const { category, title } = req.body;
  if (!category || !title)
    return error(res, "KPI category and title are required", 422);
  try {
    const template = await PerformanceModel.createTemplateKpi(
      req.params.id,
      req.body,
    );
    if (!template) return error(res, "Template not found", 404);
    return created(res, template);
  } catch (err) {
    next(err);
  }
};

const updateTemplateKpi = async (req, res, next) => {
  try {
    const template = await PerformanceModel.updateTemplateKpi(
      req.params.id,
      req.params.questionId,
      req.body,
    );
    if (!template) return error(res, "Template not found", 404);
    return success(res, template);
  } catch (err) {
    next(err);
  }
};

const deleteTemplateKpi = async (req, res, next) => {
  try {
    const template = await PerformanceModel.deleteTemplateKpi(
      req.params.id,
      req.params.questionId,
    );
    if (!template) return error(res, "Template not found", 404);
    return success(res, template);
  } catch (err) {
    next(err);
  }
};

const listTrackers = async (_req, res, next) => {
  try {
    return success(res, await PerformanceModel.listTrackers());
  } catch (err) {
    next(err);
  }
};

const listCompetencyProfiles = async (_req, res, next) => {
  try {
    return success(res, await PerformanceModel.listCompetencyProfiles());
  } catch (err) {
    next(err);
  }
};

const listEmployees = async (req, res, next) => {
  try {
    const result = await PerformanceModel.findEmployees({
      page: Math.max(1, parseInt(req.query.page) || 1),
      limit: Math.min(500, Math.max(1, parseInt(req.query.limit) || 100)),
      search: req.query.search || "",
      location: req.query.location || "",
      subUnit: req.query.subUnit || "",
      jobTitle: req.query.jobTitle || "",
      employmentStatus: req.query.employmentStatus || "",
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const listCycles = async (_req, res, next) => {
  try {
    await PerformanceModel.ensureDefaultPerformanceData();
    return success(res, await PerformanceModel.listCycles());
  } catch (err) {
    next(err);
  }
};

const isClosedCycle = (cycle) =>
  cycle?.status === "Closed" || cycle?.status === "Completed";

const closedCycleMessage =
  "This appraisal cycle is closed. Reopen it before making changes.";

const createCycle = async (req, res, next) => {
  const { name, fromDate, toDate, dueDate, templateId } = req.body;
  if (!name || !fromDate || !toDate || !dueDate || !templateId) {
    return error(res, "Cycle name, dates, and template are required", 422);
  }
  try {
    const cycle = await PerformanceModel.createCycle(req.body);
    return created(res, await PerformanceModel.findCycle(cycle.id));
  } catch (err) {
    next(err);
  }
};

const getCycle = async (req, res, next) => {
  try {
    const cycle = await PerformanceModel.findCycle(req.params.id);
    if (!cycle) return error(res, "Cycle not found", 404);
    return success(res, cycle);
  } catch (err) {
    next(err);
  }
};

const addEmployeesToCycle = async (req, res, next) => {
  try {
    const existingCycle = await PerformanceModel.findCycle(req.params.id);
    if (!existingCycle) return error(res, "Cycle not found", 404);
    if (isClosedCycle(existingCycle))
      return error(res, closedCycleMessage, 409);
    const cycle = await PerformanceModel.addEmployeesToCycle(
      req.params.id,
      req.body.employeeIds || [],
    );
    if (!cycle) return error(res, "Cycle not found", 404);
    return success(res, await PerformanceModel.findCycle(req.params.id));
  } catch (err) {
    next(err);
  }
};

const removeEmployeeFromCycle = async (req, res, next) => {
  try {
    const existingCycle = await PerformanceModel.findCycle(req.params.id);
    if (!existingCycle) return error(res, "Cycle not found", 404);
    if (isClosedCycle(existingCycle))
      return error(res, closedCycleMessage, 409);
    const cycle = await PerformanceModel.removeEmployeeFromCycle(
      req.params.id,
      req.params.employeeId,
    );
    if (!cycle) return error(res, "Cycle not found", 404);
    return success(res, cycle);
  } catch (err) {
    next(err);
  }
};

const deleteCycle = async (req, res, next) => {
  try {
    const cycle = await PerformanceModel.deleteCycle(req.params.id);
    if (!cycle) return error(res, "Cycle not found", 404);
    return success(res, { message: "Cycle deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const updateCycleStatus = async (req, res, next) => {
  const { status } = req.body;
  if (!status) return error(res, "Status is required", 422);
  try {
    if (status === "Closed") {
      const summary = await PerformanceModel.getCycleCompletionSummary(
        req.params.id,
      );
      if (!summary.canClose) {
        return error(
          res,
          summary.total === 0
            ? "Create appraisals before closing this cycle."
            : `Only ${summary.completed} of ${summary.total} appraisals are completed. Complete all appraisals before closing this cycle.`,
          422,
          summary,
        );
      }
    }
    const cycle = await PerformanceModel.updateCycleStatus(
      req.params.id,
      status,
    );
    if (!cycle) return error(res, "Cycle not found", 404);
    return success(res, cycle);
  } catch (err) {
    next(err);
  }
};

const createAppraisalsForCycle = async (req, res, next) => {
  try {
    const cycle = await PerformanceModel.findCycle(req.params.id);
    if (!cycle) return error(res, "Cycle not found", 404);
    if (isClosedCycle(cycle)) return error(res, closedCycleMessage, 409);
    const result = await PerformanceModel.createAppraisalsForCycle(
      req.params.id,
    );
    if (!result) return error(res, "Cycle not found", 404);
    return created(res, result);
  } catch (err) {
    next(err);
  }
};

const listAppraisals = async (req, res, next) => {
  try {
    const isPerformanceAdmin = isAdminRole(req.user?.role);
    const { from, to, cycleId, status } = req.query;
    const filters = { from, to, cycleId, status };

    const rows = isPerformanceAdmin
      ? await PerformanceModel.listAppraisals(filters)
      : await PerformanceModel.listSupervisorAppraisals({
        userId: req.user?.id,
        ...filters,
      });

    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

const listMyAppraisals = async (req, res, next) => {
  try {
    const { from, to, cycleId, status } = req.query;
    return success(
      res,
      await PerformanceModel.listAppraisals({
        userId: req.user?.id,
        onlyMine: true,
        employeeOnly: true,
        from,
        to,
        cycleId,
        status,
      }),
    );
  } catch (err) {
    next(err);
  }
};

const getAppraisal = async (req, res, next) => {
  try {
    const appraisal = await PerformanceModel.findAppraisal(req.params.id);
    if (!appraisal) return error(res, "Appraisal not found", 404);
    return success(res, appraisal);
  } catch (err) {
    next(err);
  }
};

const downloadAppraisalPdf = async (req, res, next) => {
  try {
    const appraisal = await PerformanceModel.findAppraisal(req.params.id);
    if (!appraisal) return error(res, "Appraisal not found", 404);
    const safeName =
      `${appraisal.employee?.employeeId || appraisal.employee?.id || "employee"} - ${appraisal.employee?.name || "appraisal"}`
        .replace(/[\\/:*?"<>|]+/g, "")
        .trim();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.pdf"`,
    );
    return buildAppraisalPdf(appraisal, res);
  } catch (err) {
    next(err);
  }
};

const downloadCycleAppraisalsZip = async (req, res, next) => {
  try {
    const cycle = await PerformanceModel.findCycle(req.params.id);
    if (!cycle) return error(res, "Cycle not found", 404);

    const appraisalRows = await PerformanceModel.listAppraisals({
      cycleId: req.params.id,
    });
    if (!appraisalRows.length) {
      return error(
        res,
        "No appraisals found for this cycle. Create appraisals before downloading.",
        404,
      );
    }

    const entries = [];
    for (const row of appraisalRows) {
      const appraisal = await PerformanceModel.findAppraisal(row.id);
      if (!appraisal) continue;
      const employeeCode =
        appraisal.employee?.employeeId ||
        appraisal.employee?.id ||
        row.employeeId ||
        "employee";
      const employeeName =
        appraisal.employee?.name || row.employeeName || "appraisal";
      entries.push({
        name: `${safeZipName(`${employeeCode} - ${employeeName}`)}.pdf`,
        data: await buildAppraisalPdfBuffer(appraisal),
      });
    }

    if (!entries.length)
      return error(
        res,
        "No appraisal PDFs could be generated for this cycle.",
        404,
      );

    const zip = buildZip(entries);
    const filename = `${safeZipName(cycle.name || "Appraisal Cycle")}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", zip.length);
    return res.end(zip);
  } catch (err) {
    next(err);
  }
};

const saveAppraisalRatings = async (req, res, next) => {
  try {
    const appraisal = await PerformanceModel.findAppraisal(req.params.id);
    if (!appraisal) return error(res, "Appraisal not found", 404);
    if (isClosedCycle({ status: appraisal.cycleStatus }))
      return error(res, closedCycleMessage, 409);
    const result = await PerformanceModel.updateAppraisalRatings({
      appraisalId: req.params.id,
      reviewerType: req.body.reviewerType,
      ratings: req.body.ratings || [],
    });
    if (!result) return error(res, "Appraisal not found", 404);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const submitAppraisalReview = async (req, res, next) => {
  try {
    const appraisal = await PerformanceModel.findAppraisal(req.params.id);
    if (!appraisal) return error(res, "Appraisal not found", 404);
    if (isClosedCycle({ status: appraisal.cycleStatus }))
      return error(res, closedCycleMessage, 409);
    const result = await PerformanceModel.submitAppraisalReview({
      appraisalId: req.params.id,
      reviewerType: req.body.reviewerType,
      ratings: req.body.ratings || [],
    });
    if (!result) return error(res, "Appraisal not found", 404);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export {
  addEmployeesToCycle,
  cloneTemplate,
  createAppraisalsForCycle,
  createCycle,
  createTemplate,
  createTemplateKpi,
  deleteCycle,
  deleteTemplate,
  deleteTemplateKpi,
  downloadCycleAppraisalsZip,
  downloadAppraisalPdf,
  getAppraisal,
  getCycle,
  getTemplate,
  listAppraisals,
  listCompetencyProfiles,
  listCycles,
  listEmployees,
  listMyAppraisals,
  listTemplates,
  listTrackers,
  removeEmployeeFromCycle,
  saveAppraisalRatings,
  submitAppraisalReview,
  updateCycleStatus,
  updateTemplate,
  updateTemplateKpi,
};
