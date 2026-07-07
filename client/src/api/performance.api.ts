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

type ApiResponse<T> = { success: boolean; data: T };
type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
};

export const getPerformanceTemplates = async () => {
  const response = await api.get<ApiResponse<AppraisalTemplate[]>>(
    "/performance/templates",
  );
  return response.data.data;
};

export const getPerformanceTemplate = async (id: string) => {
  const response = await api.get<ApiResponse<AppraisalTemplate>>(
    `/performance/templates/${id}`,
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
    "/performance/templates",
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
    `/performance/templates/${id}`,
    payload,
  );
  return response.data.data;
};

export const clonePerformanceTemplate = async (id: string) => {
  const response = await api.post<ApiResponse<AppraisalTemplate>>(
    `/performance/templates/${id}/clone`,
  );
  return response.data.data;
};

export const deletePerformanceTemplate = async (id: string) => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/performance/templates/${id}`,
  );
  return response.data.data;
};

export const createTemplateKpi = async (
  templateId: string,
  payload: Omit<TemplateQuestion, "id" | "displayText" | "order">,
) => {
  const response = await api.post<ApiResponse<AppraisalTemplate>>(
    `/performance/templates/${templateId}/kpis`,
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
    `/performance/templates/${templateId}/kpis/${questionId}`,
    payload,
  );
  return response.data.data;
};

export const deleteTemplateKpi = async (
  templateId: string,
  questionId: string,
) => {
  const response = await api.delete<ApiResponse<AppraisalTemplate>>(
    `/performance/templates/${templateId}/kpis/${questionId}`,
  );
  return response.data.data;
};

export const getPerformanceEmployees = async (
  params: Record<string, string | number | undefined> = {},
) => {
  const response = await api.get<ApiResponse<Paginated<PerformanceEmployee>>>(
    "/performance/employees",
    { params },
  );
  return response.data.data;
};

export const getAppraisalCycles = async () => {
  const response = await api.get<ApiResponse<AppraisalCycle[]>>(
    "/performance/cycles",
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
    "/performance/cycles",
    payload,
  );
  return response.data.data;
};

export const getAppraisalCycle = async (id: string) => {
  const response = await api.get<ApiResponse<AppraisalCycle>>(
    `/performance/cycles/${id}`,
  );
  return response.data.data;
};

export const updateAppraisalCycleStatus = async (
  id: string,
  status: string,
) => {
  const response = await api.patch<ApiResponse<AppraisalCycle>>(
    `/performance/cycles/${id}/status`,
    { status },
  );
  return response.data.data;
};

export const deleteAppraisalCycle = async (id: string) => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/performance/cycles/${id}`,
  );
  return response.data.data;
};

export const downloadAppraisalCycleZip = async (
  id: string,
  cycleName: string,
) => {
  const response = await api.get<Blob>(`/performance/cycles/${id}/download`, {
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
    `/performance/cycles/${cycleId}/employees`,
    { employeeIds },
  );
  return response.data.data;
};

export const removeEmployeeFromCycle = async (
  cycleId: string,
  employeeId: string,
) => {
  const response = await api.delete<ApiResponse<AppraisalCycle>>(
    `/performance/cycles/${cycleId}/employees/${employeeId}`,
  );
  return response.data.data;
};

export const createCycleAppraisals = async (cycleId: string) => {
  const response = await api.post<ApiResponse<Appraisal[]>>(
    `/performance/cycles/${cycleId}/appraisals`,
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
    "/performance/appraisals",
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
    "/performance/appraisals/my",
    { params },
  );
  return response.data.data;
};

export const getAppraisalDetail = async (id: string) => {
  const response = await api.get<ApiResponse<AppraisalDetail>>(
    `/performance/appraisals/${id}`,
  );
  return response.data.data;
};

export const downloadAppraisalPdf = async (
  id: string,
  employeeName: string,
) => {
  const response = await api.get<Blob>(
    `/performance/appraisals/${id}/download`,
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
    `/performance/appraisals/${id}/ratings`,
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
    `/performance/appraisals/${id}/submit`,
    payload,
  );
  return response.data.data;
};

export const getPerformanceTrackers = async () => {
  const response = await api.get<ApiResponse<PerformanceTracker[]>>(
    "/performance/trackers",
  );
  return response.data.data;
};

export const getCompetencyProfiles = async () => {
  const response = await api.get<ApiResponse<CompetencyProfile[]>>(
    "/performance/competency-profiles",
  );
  return response.data.data;
};
