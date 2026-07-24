import api from "./axios";
import { HRADMIN_PATHS } from "../constants/apiPaths";

export interface HRUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
}

export interface HRUsersPaginatedResponse {
  users: HRUser[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface HRUsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateHRUserPayload {
  employee_name: string;
  email: string;
  role: string;
  status?: string;
}

export interface UpdateHRUserPayload {
  employee_name: string;
  email: string;
  role: string;
  status?: string;
}

export const getHRUsers = async (
  params: HRUsersQueryParams = {},
): Promise<{ data: HRUsersPaginatedResponse }> => {
  const { page = 1, limit = 10, search = "" } = params;
  const queryString = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
  }).toString();

  const response = await api.get<{
    success: boolean;
    data: HRUsersPaginatedResponse;
  }>(`${HRADMIN_PATHS.USERS}?${queryString}`);

  return { data: response.data.data };
};

export const createHRUser = async (
  payload: CreateHRUserPayload,
): Promise<{ data: HRUser }> => {
  const response = await api.post<{ success: boolean; data: HRUser }>(
    HRADMIN_PATHS.USERS,
    payload,
  );
  return { data: response.data.data };
};

export const updateHRUser = async (
  userId: number,
  payload: UpdateHRUserPayload,
): Promise<{ data: HRUser }> => {
  const response = await api.put<{ success: boolean; data: HRUser }>(
    HRADMIN_PATHS.userById(userId),
    payload,
  );
  return { data: response.data.data };
};

export const deleteHRUser = async (userId: number): Promise<void> => {
  await api.delete(HRADMIN_PATHS.userById(userId));
};

export const toggleHRUserStatus = async (
  userId: number,
): Promise<{ data: { id: number; is_active: boolean } }> => {
  const response = await api.post<{
    success: boolean;
    data: { id: number; is_active: boolean };
  }>(HRADMIN_PATHS.userToggleStatus(userId));
  return { data: response.data.data };
};

export interface JobTitle {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
}

export interface CreateJobTitlePayload {
  title: string;
  description?: string;
}

export interface UpdateJobTitlePayload {
  title: string;
  description?: string;
  is_active?: boolean;
}

export const getJobTitles = async (): Promise<{ data: JobTitle[] }> => {
  const response = await api.get<{ success: boolean; data: JobTitle[] }>(
    HRADMIN_PATHS.JOB_TITLES,
  );
  return { data: response.data.data };
};

export const createJobTitle = async (
  payload: CreateJobTitlePayload,
): Promise<{ data: JobTitle }> => {
  const response = await api.post<{ success: boolean; data: JobTitle }>(
    HRADMIN_PATHS.JOB_TITLES,
    payload,
  );
  return { data: response.data.data };
};

export const updateJobTitle = async (
  jobTitleId: number,
  payload: UpdateJobTitlePayload,
): Promise<{ data: JobTitle }> => {
  const response = await api.put<{ success: boolean; data: JobTitle }>(
    HRADMIN_PATHS.jobTitleById(jobTitleId),
    payload,
  );
  return { data: response.data.data };
};

export const deleteJobTitle = async (jobTitleId: number): Promise<void> => {
  await api.delete(HRADMIN_PATHS.jobTitleById(jobTitleId));
};

export interface JobCategory {
  id: number;
  category: string;
  description: string | null;
  is_active: boolean;
}

export interface CreateJobCategoryPayload {
  category: string;
  description?: string;
}

export interface UpdateJobCategoryPayload {
  category: string;
  description?: string;
  is_active?: boolean;
}

export const getJobCategories = async (): Promise<{ data: JobCategory[] }> => {
  const response = await api.get<{ success: boolean; data: JobCategory[] }>(
    HRADMIN_PATHS.JOB_CATEGORIES,
  );
  return { data: response.data.data };
};

export const createJobCategory = async (
  payload: CreateJobCategoryPayload,
): Promise<{ data: JobCategory }> => {
  const response = await api.post<{ success: boolean; data: JobCategory }>(
    HRADMIN_PATHS.JOB_CATEGORIES,
    payload,
  );
  return { data: response.data.data };
};

export const updateJobCategory = async (
  jobCategoryId: number,
  payload: UpdateJobCategoryPayload,
): Promise<{ data: JobCategory }> => {
  const response = await api.put<{ success: boolean; data: JobCategory }>(
    HRADMIN_PATHS.jobCategoryById(jobCategoryId),
    payload,
  );
  return { data: response.data.data };
};

export const deleteJobCategory = async (
  jobCategoryId: number,
): Promise<void> => {
  await api.delete(HRADMIN_PATHS.jobCategoryById(jobCategoryId));
};

export interface SubUnit {
  id: number;
  sub_unit_name: string;
  supervisor_name: string | null;
  description: string | null;
  is_active: boolean;
}

export interface CreateSubUnitPayload {
  sub_unit_name: string;
  supervisor_name?: string | null;
  description?: string;
}

export interface UpdateSubUnitPayload {
  sub_unit_name: string;
  supervisor_name?: string | null;
  description?: string;
  is_active?: boolean;
}

export const getSubUnits = async (): Promise<{ data: SubUnit[] }> => {
  const response = await api.get<{ success: boolean; data: SubUnit[] }>(
    HRADMIN_PATHS.SUB_UNITS,
  );
  return { data: response.data.data };
};

export const createSubUnit = async (
  payload: CreateSubUnitPayload,
): Promise<{ data: SubUnit }> => {
  const response = await api.post<{ success: boolean; data: SubUnit }>(
    HRADMIN_PATHS.SUB_UNITS,
    payload,
  );
  return { data: response.data.data };
};

export const updateSubUnit = async (
  subUnitId: number,
  payload: UpdateSubUnitPayload,
): Promise<{ data: SubUnit }> => {
  const response = await api.put<{ success: boolean; data: SubUnit }>(
    HRADMIN_PATHS.subUnitById(subUnitId),
    payload,
  );
  return { data: response.data.data };
};

export const deleteSubUnit = async (subUnitId: number): Promise<void> => {
  await api.delete(HRADMIN_PATHS.subUnitById(subUnitId));
};

export interface AuditTrailRecord {
  id: number;
  employee_id: number | null;
  employee_code: string | null;
  action_owner: string;
  action_owner_username: string;
  action_owner_avatar: string | null;
  employee: string;
  employee_username: string;
  section: string;
  action: string;
  source: string;
  performed_screen: string;
  action_description: string;
  notes: string;
  event_time: string;
  created_at: string;
}

export interface AuditTrailPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface AuditTrailResponse {
  data: AuditTrailRecord[];
  pagination: AuditTrailPagination;
}

export const getAuditTrail = async (
  page: number = 1,
  limit: number = 50,
): Promise<AuditTrailResponse> => {
  const response = await api.get<{
    success: boolean;
    data: AuditTrailResponse;
  }>(`${HRADMIN_PATHS.AUDIT_TRAIL}?page=${page}&limit=${limit}`);
  return response.data.data;
};

export interface RoleAccessUser {
  id: number;
  employee_id: string | null;
  name: string;
  username: string;
  email: string;
  role: string;
  gender: string | null;
  avatar: string | null;
  is_active: boolean;
  status: string | null;
}

export interface RoleAccessPaginatedResponse {
  users: RoleAccessUser[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface RoleAccessQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  gender?: string;
  status?: string;
}

export const getRoleAccess = async (
  params: RoleAccessQueryParams = {},
): Promise<{ data: RoleAccessPaginatedResponse }> => {
  const {
    page = 1,
    limit = 10,
    search = "",
    role = "",
    gender = "",
    status = "",
  } = params;
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(gender ? { gender } : {}),
    ...(status ? { status } : {}),
  }).toString();
  const response = await api.get<{
    success: boolean;
    data: RoleAccessPaginatedResponse;
  }>(`${HRADMIN_PATHS.ROLE_ACCESS}?${qs}`);
  return { data: response.data.data };
};

export const updateUserRole = async (
  userId: number,
  role: string,
): Promise<{ data: RoleAccessUser }> => {
  const response = await api.put<{ success: boolean; data: RoleAccessUser }>(
    HRADMIN_PATHS.roleAccessById(userId),
    { role },
  );
  return { data: response.data.data };
};

export interface SubUnitEmployee {
  id: string;
  employee_id: string | null;
  name: string;
}

interface SubUnitEmployeesResponse {
  message: string;
  count: number;
  data: SubUnitEmployee[];
}

export const getEmployeesBySubUnit = (subUnitName: string) =>
  api.get<SubUnitEmployeesResponse>("/hradmin/sub-units/employees", {
    params: {
      subUnitName,
    },
  });
