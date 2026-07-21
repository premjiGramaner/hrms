import api from "./axios";
import type {
  TerminationReportRecord,
  BirthdayReportRecord,
  WorkAnniversaryReportRecord,
  ReportPaginatedResponse,
  NotificationConfig,
  ReportFilterOptions,
} from "../types";
import { REPORT_PATHS } from "../constants/apiPaths";

export async function fetchTerminationReport(queryParams: Record<string, any>) {
  const response = await api.get<{
    success: boolean;
    data: ReportPaginatedResponse<TerminationReportRecord>;
  }>(REPORT_PATHS.TERMINATION, { params: queryParams });
  return response.data.data;
}

export async function downloadTerminationReportExcel(
  queryParams: Record<string, any>,
  filename?: string,
) {
  const response = await api.get(REPORT_PATHS.TERMINATION_EXPORT_EXCEL, {
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
  const response = await api.get(REPORT_PATHS.TERMINATION_EXPORT_PDF, {
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
  }>(REPORT_PATHS.BIRTHDAY, { params: queryParams });
  return response.data.data;
}

export async function downloadBirthdayReportExcel(
  queryParams: Record<string, any>,
  filename?: string,
) {
  const response = await api.get(REPORT_PATHS.BIRTHDAY_EXPORT_EXCEL, {
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
  }>(REPORT_PATHS.WORK_ANNIVERSARY, { params: queryParams });
  return response.data.data;
}

export async function downloadWorkAnniversaryReportExcel(
  queryParams: Record<string, any>,
  filename?: string,
) {
  const response = await api.get(REPORT_PATHS.WORK_ANNIVERSARY_EXPORT_EXCEL, {
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
  }>(REPORT_PATHS.NOTIFICATION_CONFIG);
  return response.data.data;
}

export async function updateNotificationConfig(
  configData: Partial<NotificationConfig>,
) {
  const response = await api.put<{
    success: boolean;
    data: { config: NotificationConfig; message: string };
  }>(REPORT_PATHS.NOTIFICATION_CONFIG, configData);
  return response.data.data;
}

export async function fetchReportFilterOptions() {
  const response = await api.get<{
    success: boolean;
    data: ReportFilterOptions;
  }>(REPORT_PATHS.FILTER_OPTIONS);
  return response.data.data;
}

export async function triggerNotificationsManually() {
  const response = await api.post<{
    success: boolean;
    data: {
      message: string;
      results: {
        birthday: { success: boolean; message: string };
        work_anniversary: { success: boolean; message: string };
      };
    };
  }>(REPORT_PATHS.TRIGGER_NOTIFICATIONS);
  return response.data.data;
}
