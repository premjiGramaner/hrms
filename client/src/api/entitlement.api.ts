import api from "./axios";
import { LeaveType, PaginatedResponse } from "../types";

export interface EmployeeOption {
  id: number;
  employee_id: string;
  name: string;
  job_title?: string;
  sub_unit?: string;
}

export interface EntitlementRecord {
  id: number;
  emp_code: string;
  employee_name: string;
  job_title?: string;
  sub_unit?: string;
  leave_type_id: number;
  leave_type_name: string;
  year: number;
  total_days: number;
  used_days: number;
  carried_days: number;
  net_balance: number;
  credited_on: string;
  updated_at: string;
  valid_from: string;
  valid_to: string;
  expired: boolean;
  last_added_days: number;
}

export interface MyEntitlementRecord {
  id: number;
  leave_type: string;
  entitlement_type: string;
  credited_on: string;
  valid_from: string;
  valid_to: string;
  expired: boolean;
  leave_entitlement: number;
  used_days: number;
  net_balance: number;
  year: number;
}

export interface CreateEntitlementPayload {
  employee_id?: number;
  employee_ids?: number[];
  leave_type_id: number;
  leave_period_start: string;
  entitlement_days: number;
  comments?: string;
}

export const getEntitlementEmployees = async (q = "") => {
  const res = await api.get<{ success: boolean; data: EmployeeOption[] }>(
    `/leave/entitlements/employees?q=${encodeURIComponent(q)}`,
  );
  return res.data.data;
};

export const getEntitlementLeaveTypes = async () => {
  const res = await api.get<{ success: boolean; data: LeaveType[] }>(
    "/leave/entitlements/leave-types",
  );
  return res.data.data;
};

export const createEntitlements = async (payload: CreateEntitlementPayload) => {
  const res = await api.post<{
    success: boolean;
    data: { message: string; created: number; skipped: number };
  }>("/leave/entitlements", payload);
  return res.data.data;
};

export const getEntitlementList = async (params: {
  employee_id?: number;
  leave_type_id?: number;
  year?: number;
  page?: number;
  limit?: number;
}) => {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== 0)
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
  }
  const qs = parts.length ? `?${parts.join("&")}` : "";
  const res = await api.get<{
    success: boolean;
    data: PaginatedResponse<EntitlementRecord>;
  }>(`/leave/entitlements${qs}&_=${Date.now()}`);
  return res.data.data;
};

export const getMyEntitlements = async () => {
  const res = await api.get<{
    success: boolean;
    data: MyEntitlementRecord[];
  }>(`/leave/entitlements/my?_=${Date.now()}`);
  return res.data.data;
};
