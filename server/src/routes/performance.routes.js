import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  addEmployeesToCycle,
  cloneTemplate,
  createAppraisalsForCycle,
  createCycle,
  createTemplate,
  createTemplateKpi,
  deleteCycle,
  downloadCycleAppraisalsZip,
  deleteTemplate,
  deleteTemplateKpi,
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
  updateCycle,
  updateCycleStatus,
  updateTemplate,
  updateTemplateKpi,
} from "../controllers/performance.controller.js";

const router = Router();
router.use(authenticate);

router.get("/templates", listTemplates);
router.post("/templates", createTemplate);
router.get("/templates/:id", getTemplate);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);
router.post("/templates/:id/clone", cloneTemplate);
router.post("/templates/:id/kpis", createTemplateKpi);
router.put("/templates/:id/kpis/:questionId", updateTemplateKpi);
router.delete("/templates/:id/kpis/:questionId", deleteTemplateKpi);
router.get("/trackers", listTrackers);
router.get("/competency-profiles", listCompetencyProfiles);
router.get("/employees", listEmployees);
router.get("/cycles", listCycles);
router.post("/cycles", createCycle);
router.get("/cycles/:id/download", downloadCycleAppraisalsZip);
router.get("/cycles/:id", getCycle);
router.put("/cycles/:id", updateCycle);
router.patch("/cycles/:id/status", updateCycleStatus);
router.delete("/cycles/:id", deleteCycle);
router.post("/cycles/:id/employees", addEmployeesToCycle);
router.delete("/cycles/:id/employees/:employeeId", removeEmployeeFromCycle);
router.post("/cycles/:id/appraisals", createAppraisalsForCycle);
router.get("/appraisals", listAppraisals);
router.get("/appraisals/my", listMyAppraisals);
router.get("/appraisals/:id/download", downloadAppraisalPdf);
router.get("/appraisals/:id", getAppraisal);
router.put("/appraisals/:id/ratings", saveAppraisalRatings);
router.post("/appraisals/:id/submit", submitAppraisalReview);

export default router;
