import api from "./axios";
import type {
  TerminationReportRecord,
  BirthdayReportRecord,
  WorkAnniversaryReportRecord,
  ReportPaginatedResponse,
  NotificationConfig,
  ReportFilterOptions,
  LeaveDepartmentFilterOptions,
  LeaveDepartmentReportQuery,
  LeaveDepartmentReportResponse,
  ReportQueryParams,
} from "../types";
import { REPORT_PATHS } from "../constants/apiPaths";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PDF_MIME_TYPE = "application/pdf";

function downloadReportFile(
  fileData: BlobPart,
  mimeType: string,
  fileName: string,
) {
  const reportBlob = new Blob([fileData], { type: mimeType });
  const downloadUrl = window.URL.createObjectURL(reportBlob);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function fetchTerminationReport(queryParams: ReportQueryParams) {
  const response = await api.get<{
    success: boolean;
    data: ReportPaginatedResponse<TerminationReportRecord>;
  }>(REPORT_PATHS.TERMINATION, { params: queryParams });
  return response.data.data;
}

export async function downloadTerminationReportExcel(
  queryParams: ReportQueryParams,
  filename?: string,
) {
  const response = await api.get(REPORT_PATHS.TERMINATION_EXPORT_EXCEL, {
    params: queryParams,
    responseType: "blob",
  });
  downloadReportFile(
    response.data,
    EXCEL_MIME_TYPE,
    filename || `Termination_Report_${new Date().getFullYear()}.xlsx`,
  );
}

export async function downloadTerminationReportPDF(
  queryParams: ReportQueryParams,
  filename?: string,
) {
  const response = await api.get(REPORT_PATHS.TERMINATION_EXPORT_PDF, {
    params: queryParams,
    responseType: "blob",
  });
  downloadReportFile(
    response.data,
    PDF_MIME_TYPE,
    filename || `Termination_Report_${new Date().getFullYear()}.pdf`,
  );
}

export async function fetchBirthdayReport(queryParams: ReportQueryParams) {
  const response = await api.get<{
    success: boolean;
    data: ReportPaginatedResponse<BirthdayReportRecord>;
  }>(REPORT_PATHS.BIRTHDAY, { params: queryParams });
  return response.data.data;
}

export async function downloadBirthdayReportExcel(
  queryParams: ReportQueryParams,
  filename?: string,
) {
  const response = await api.get(REPORT_PATHS.BIRTHDAY_EXPORT_EXCEL, {
    params: queryParams,
    responseType: "blob",
  });
  downloadReportFile(
    response.data,
    EXCEL_MIME_TYPE,
    filename || `Birthday_Report_${new Date().getFullYear()}.xlsx`,
  );
}

export async function fetchWorkAnniversaryReport(
  queryParams: ReportQueryParams,
) {
  const response = await api.get<{
    success: boolean;
    data: ReportPaginatedResponse<WorkAnniversaryReportRecord>;
  }>(REPORT_PATHS.WORK_ANNIVERSARY, { params: queryParams });
  return response.data.data;
}

export async function downloadWorkAnniversaryReportExcel(
  queryParams: ReportQueryParams,
  filename?: string,
) {
  const response = await api.get(REPORT_PATHS.WORK_ANNIVERSARY_EXPORT_EXCEL, {
    params: queryParams,
    responseType: "blob",
  });
  downloadReportFile(
    response.data,
    EXCEL_MIME_TYPE,
    filename || `Work_Anniversary_Report_${new Date().getFullYear()}.xlsx`,
  );
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

export async function fetchLeaveByDepartmentReport(
  queryParams: LeaveDepartmentReportQuery,
) {
  const response = await api.get<{
    success: boolean;
    data: LeaveDepartmentReportResponse;
  }>(REPORT_PATHS.LEAVE_BY_DEPARTMENT, { params: queryParams });
  return response.data.data;
}

export async function fetchLeaveByDepartmentFilterOptions() {
  const response = await api.get<{
    success: boolean;
    data: LeaveDepartmentFilterOptions;
  }>(REPORT_PATHS.LEAVE_BY_DEPARTMENT_FILTER_OPTIONS);
  return response.data.data;
}

export async function downloadLeaveByDepartmentReportPDF(
  queryParams: LeaveDepartmentReportQuery,
  filename?: string,
) {
  const response = await api.get(REPORT_PATHS.LEAVE_BY_DEPARTMENT_EXPORT_PDF, {
    params: queryParams,
    responseType: "blob",
  });
  downloadReportFile(
    response.data,
    PDF_MIME_TYPE,
    filename || "Current Year's Leave Taken by Department.pdf",
  );
}
