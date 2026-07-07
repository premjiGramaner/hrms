import api from "./axios";
import type {
  TerminationReportRecord,
  BirthdayReportRecord,
  WorkAnniversaryReportRecord,
  ReportPaginatedResponse,
  NotificationConfig,
  ReportFilterOptions,
} from "../types";

export async function fetchTerminationReport(queryParams: Record<string, any>) {
  const response = await api.get<{
    success: boolean;
    data: ReportPaginatedResponse<TerminationReportRecord>;
  }>("/reports/termination", { params: queryParams });
  return response.data.data;
}

export async function downloadTerminationReportExcel(
  queryParams: Record<string, any>,
  filename?: string,
) {
  const response = await api.get("/reports/termination/export/excel", {
    params: queryParams,
    responseType: "blob",
  });
  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `Termination_Report_${new Date().getFullYear()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function downloadTerminationReportPDF(
  queryParams: Record<string, any>,
  filename?: string,
) {
  const response = await api.get("/reports/termination/export/pdf", {
    params: queryParams,
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `Termination_Report_${new Date().getFullYear()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function fetchBirthdayReport(queryParams: Record<string, any>) {
  const response = await api.get<{
    success: boolean;
    data: ReportPaginatedResponse<BirthdayReportRecord>;
  }>("/reports/birthday", { params: queryParams });
  return response.data.data;
}

export async function downloadBirthdayReportExcel(
  queryParams: Record<string, any>,
  filename?: string,
) {
  const response = await api.get("/reports/birthday/export/excel", {
    params: queryParams,
    responseType: "blob",
  });
  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `Birthday_Report_${new Date().getFullYear()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function fetchWorkAnniversaryReport(
  queryParams: Record<string, any>,
) {
  const response = await api.get<{
    success: boolean;
    data: ReportPaginatedResponse<WorkAnniversaryReportRecord>;
  }>("/reports/work-anniversary", { params: queryParams });
  return response.data.data;
}

export async function downloadWorkAnniversaryReportExcel(
  queryParams: Record<string, any>,
  filename?: string,
) {
  const response = await api.get("/reports/work-anniversary/export/excel", {
    params: queryParams,
    responseType: "blob",
  });
  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `Work_Anniversary_Report_${new Date().getFullYear()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function fetchNotificationConfig() {
  const response = await api.get<{
    success: boolean;
    data: {
      birthday: NotificationConfig;
      work_anniversary: NotificationConfig;
    };
  }>("/reports/notification-config");
  return response.data.data;
}

export async function updateNotificationConfig(
  configData: Partial<NotificationConfig>,
) {
  const response = await api.put<{
    success: boolean;
    data: { config: NotificationConfig; message: string };
  }>("/reports/notification-config", configData);
  return response.data.data;
}

export async function fetchReportFilterOptions() {
  const response = await api.get<{
    success: boolean;
    data: ReportFilterOptions;
  }>("/reports/filter-options");
  return response.data.data;
}
