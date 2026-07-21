import api from "./axios";
import {
  Appraisal,
  AppraisalCycle,
  AppraisalDetail,
  AppraisalTemplate,
  CompetencyProfile,
  PerformanceEmployee,
  PerformanceTracker,
  TemplateQuestion,
} from "../types/performance.types";
import { PERFORMANCE_PATHS } from "../constants/apiPaths";

type ApiResponse<T> = { success: boolean; data: T };
type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
};

export const getPerformanceTemplates = async () => {
  const response = await api.get<ApiResponse<AppraisalTemplate[]>>(
    PERFORMANCE_PATHS.TEMPLATES,
  );
  return response.data.data;
};

export const getPerformanceTemplate = async (id: string) => {
  const response = await api.get<ApiResponse<AppraisalTemplate>>(
    PERFORMANCE_PATHS.templateById(id),
  );
  return response.data.data;
};

export const createPerformanceTemplate = async (payload: {
  jobTitle: string;
  templateName: string;
  description?: string;
  weight: number;
  header?: string;
}) => {
  const response = await api.post<ApiResponse<AppraisalTemplate>>(
    PERFORMANCE_PATHS.TEMPLATES,
    payload,
  );
  return response.data.data;
};

export const updatePerformanceTemplate = async (
  id: string,
  payload: Partial<
    Pick<AppraisalTemplate, "jobTitle" | "templateName" | "weight" | "header">
  > & { description?: string },
) => {
  const response = await api.put<ApiResponse<AppraisalTemplate>>(
    PERFORMANCE_PATHS.templateById(id),
    payload,
  );
  return response.data.data;
};

export const clonePerformanceTemplate = async (id: string) => {
  const response = await api.post<ApiResponse<AppraisalTemplate>>(
    PERFORMANCE_PATHS.cloneTemplate(id),
  );
  return response.data.data;
};

export const deletePerformanceTemplate = async (id: string) => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    PERFORMANCE_PATHS.templateById(id),
  );
  return response.data.data;
};

export const createTemplateKpi = async (
  templateId: string,
  payload: Omit<TemplateQuestion, "id" | "displayText" | "order">,
) => {
  const response = await api.post<ApiResponse<AppraisalTemplate>>(
    PERFORMANCE_PATHS.templateKpis(templateId),
    payload,
  );
  return response.data.data;
};

export const updateTemplateKpi = async (
  templateId: string,
  questionId: string,
  payload: Partial<TemplateQuestion>,
) => {
  const response = await api.put<ApiResponse<AppraisalTemplate>>(
    PERFORMANCE_PATHS.templateKpiById(templateId, questionId),
    payload,
  );
  return response.data.data;
};

export const deleteTemplateKpi = async (
  templateId: string,
  questionId: string,
) => {
  const response = await api.delete<ApiResponse<AppraisalTemplate>>(
    PERFORMANCE_PATHS.templateKpiById(templateId, questionId),
  );
  return response.data.data;
};

export const getPerformanceEmployees = async (
  params: Record<string, string | number | undefined> = {},
) => {
  const response = await api.get<ApiResponse<Paginated<PerformanceEmployee>>>(
    PERFORMANCE_PATHS.EMPLOYEES,
    { params },
  );
  return response.data.data;
};

export const getAppraisalCycles = async () => {
  const response = await api.get<ApiResponse<AppraisalCycle[]>>(
    PERFORMANCE_PATHS.CYCLES,
  );
  return response.data.data;
};

export const createAppraisalCycle = async (payload: {
  name: string;
  location: string;
  fromDate: string;
  toDate: string;
  dueDate: string;
  templateId: string;
}) => {
  const response = await api.post<ApiResponse<AppraisalCycle>>(
    PERFORMANCE_PATHS.CYCLES,
    payload,
  );
  return response.data.data;
};

export const getAppraisalCycle = async (id: string) => {
  const response = await api.get<ApiResponse<AppraisalCycle>>(
    PERFORMANCE_PATHS.cycleById(id),
  );
  return response.data.data;
};

export const updateAppraisalCycleStatus = async (
  id: string,
  status: string,
) => {
  const response = await api.patch<ApiResponse<AppraisalCycle>>(
    PERFORMANCE_PATHS.cycleStatus(id),
    { status },
  );
  return response.data.data;
};

export const deleteAppraisalCycle = async (id: string) => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    PERFORMANCE_PATHS.cycleById(id),
  );
  return response.data.data;
};

export const downloadAppraisalCycleZip = async (
  id: string,
  cycleName: string,
) => {
  const response = await api.get<Blob>(PERFORMANCE_PATHS.cycleDownload(id), {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || `${cycleName || "appraisal-cycle"}.zip`;
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const addEmployeesToCycle = async (
  cycleId: string,
  employeeIds: string[],
) => {
  const response = await api.post<ApiResponse<AppraisalCycle>>(
    PERFORMANCE_PATHS.cycleEmployees(cycleId),
    { employeeIds },
  );
  return response.data.data;
};

export const removeEmployeeFromCycle = async (
  cycleId: string,
  employeeId: string,
) => {
  const response = await api.delete<ApiResponse<AppraisalCycle>>(
    PERFORMANCE_PATHS.cycleEmployeeById(cycleId, employeeId),
  );
  return response.data.data;
};

export const createCycleAppraisals = async (cycleId: string) => {
  const response = await api.post<ApiResponse<Appraisal[]>>(
    PERFORMANCE_PATHS.cycleAppraisals(cycleId),
  );
  return response.data.data;
};

export const getAppraisals = async (params?: {
  from?: string;
  to?: string;
  cycleId?: string;
  status?: string;
}) => {
  const response = await api.get<ApiResponse<Appraisal[]>>(
    PERFORMANCE_PATHS.APPRAISALS,
    { params },
  );
  return response.data.data;
};

export const getMyAppraisals = async (params?: {
  from?: string;
  to?: string;
  cycleId?: string;
  status?: string;
}) => {
  const response = await api.get<ApiResponse<Appraisal[]>>(
    PERFORMANCE_PATHS.MY_APPRAISALS,
    { params },
  );
  return response.data.data;
};

export const getAppraisalDetail = async (id: string) => {
  const response = await api.get<ApiResponse<AppraisalDetail>>(
    PERFORMANCE_PATHS.appraisalById(id),
  );
  return response.data.data;
};

export const downloadAppraisalPdf = async (
  id: string,
  employeeName: string,
) => {
  const response = await api.get<Blob>(
    PERFORMANCE_PATHS.appraisalDownload(id),
    { responseType: "blob" },
  );
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || `${employeeName || "appraisal"}.pdf`;
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const saveAppraisalRatings = async (
  id: string,
  payload: {
    reviewerType: "self" | "supervisor";
    ratings: Array<{ questionId: string; score: number; comment?: string }>;
  },
) => {
  const response = await api.put<ApiResponse<AppraisalDetail>>(
    PERFORMANCE_PATHS.appraisalRatings(id),
    payload,
  );
  return response.data.data;
};

export const submitAppraisalReview = async (
  id: string,
  payload: {
    reviewerType: "self" | "supervisor";
    ratings: Array<{ questionId: string; score: number; comment?: string }>;
  },
) => {
  const response = await api.post<ApiResponse<AppraisalDetail>>(
    PERFORMANCE_PATHS.appraisalSubmit(id),
    payload,
  );
  return response.data.data;
};

export const getPerformanceTrackers = async () => {
  const response = await api.get<ApiResponse<PerformanceTracker[]>>(
    PERFORMANCE_PATHS.TRACKERS,
  );
  return response.data.data;
};

export const getCompetencyProfiles = async () => {
  const response = await api.get<ApiResponse<CompetencyProfile[]>>(
    PERFORMANCE_PATHS.COMPETENCY_PROFILES,
  );
  return response.data.data;
};
