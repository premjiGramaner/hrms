import api from "./axios";
import {
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  LeaveFilters,
  PaginatedResponse,
} from "../types";

function toQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === null || val === undefined || val === "") continue;
    if (Array.isArray(val)) {
      if (val.length > 0) parts.push(`${key}=${encodeURIComponent(val.join(","))}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export const getLeaveTypes = async () => {
  const res = await api.get<{ success: boolean; data: LeaveType[] }>("/leaves/types");
  return res.data.data;
};

export const getLeaveFilterOptions = async (): Promise<{
  sub_units: { id: number; name: string }[];
  locations: string[];
  job_titles: { id: number; name: string }[];
  employment_statuses: string[];
  job_categories: { id: number; name: string }[];
}> => {
  const res = await api.get<{
    success: boolean;
    data: {
      sub_units: { id: number; name: string }[];
      locations: string[];
      job_titles: { id: number; name: string }[];
      employment_statuses: string[];
      job_categories: { id: number; name: string }[];
    };
  }>("/leaves/filter-options");
  return res.data.data;
};

export const searchLeaveEmployees = async (q: string): Promise<{ id: number; employee_id: string; name: string; username: string }[]> => {
  if (!q.trim()) return [];
  const res = await api.get<{
    success: boolean;
    data: { id: number; employee_id: string; name: string; username: string }[];
  }>(`/leaves/employees/search?q=${encodeURIComponent(q)}`);
  return res.data.data;
};

export const getLeaveBalance = async (employeeId?: number, year?: number) => {
  const qs = toQueryString({ employee_id: employeeId, year });
  const res = await api.get<{ success: boolean; data: LeaveBalance[] }>(
    `/leaves/balance${qs}`
  );
  return res.data.data;
};


export const getLeaves = async (filters: LeaveFilters = {}) => {
  const qs = toQueryString(filters as Record<string, unknown>);
  const res = await api.get<{
    success: boolean;
    data: PaginatedResponse<LeaveRequest>;
  }>(`/leaves${qs}&_=${Date.now()}`);
  return res.data.data;
};

export const getLeave = async (id: number) => {
  const res = await api.get<{ success: boolean; data: LeaveRequest }>(`/leaves/${id}`);
  return res.data.data;
};

export const getLeaveDetails = async (id: number) => {
  const res = await api.get<{ success: boolean; data: LeaveRequest }>(`/leaves/${id}/details`);
  return res.data.data;
};

export const uploadLeaveAttachment = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<{
    success: boolean;
    data: { message: string; attachment_path: string };
  }>(`/leaves/${id}/attachment`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const applyLeave = async (payload: Partial<LeaveRequest>) => {
  const res = await api.post<{ success: boolean; data: { message: string; id: number } }>(
    "/leaves",
    payload
  );
  return res.data.data;
};

export const approveLeave = async (id: number) => {
  const res = await api.post<{ success: boolean; data: { message: string } }>(
    `/leaves/${id}/approve`
  );
  return res.data.data;
};

export const rejectLeave = async (id: number, rejection_reason: string) => {
  const res = await api.post<{ success: boolean; data: { message: string } }>(
    `/leaves/${id}/reject`,
    { rejection_reason }
  );
  return res.data.data;
};

export const cancelLeave = async (id: number) => {
  const res = await api.post<{ success: boolean; data: { message: string } }>(
    `/leaves/${id}/cancel`
  );
  return res.data.data;
};

async function downloadExport(url: string, filename: string) {
  const token = localStorage.getItem("hrms_token");
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || "Export failed");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export const exportSummaryExcel = async (filters: LeaveFilters = {}) => {
  const qs = toQueryString(filters as Record<string, unknown>);
  await downloadExport(`/api/leaves/export/summary${qs}`, "leave_summary.xlsx");
};

export const exportDetailExcel = async (filters: LeaveFilters = {}) => {
  const qs = toQueryString(filters as Record<string, unknown>);
  await downloadExport(`/api/leaves/export/detail${qs}`, "leave_detail.xlsx");
};
