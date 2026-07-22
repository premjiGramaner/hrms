import api from "./axios";
import { Employee, PaginatedResponse } from "../types";
import { EMPLOYEE_PATHS } from "../constants/apiPaths";

export const getEmployees = async (page = 1, limit = 10, search?: string) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search && search.trim()) {
    params.set("search", search.trim());
  }
  const response = await api.get<{
    success: boolean;
    data: PaginatedResponse<Employee>;
  }>(`${EMPLOYEE_PATHS.BASE}?${params.toString()}&_=${Date.now()}`);
  return { data: response.data.data };
};

export const getSuperiorEmployees = async ({
  page = 1,
  limit = 10,
  search = "",
  role = "",
  status = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
} = {}) => {
  const queryString = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  }).toString();
  const response = await api.get<{
    success: boolean;
    data: PaginatedResponse<Employee> & { limit?: number };
  }>(`${EMPLOYEE_PATHS.SUPERIORS}?${queryString}`);
  return { data: response.data.data };
};
export const fetchAllEmployees = async (page = 1, limit = 1000) => {
  const response = await api.get<{
    success: boolean;
    data: PaginatedResponse<Employee>;
  }>(`${EMPLOYEE_PATHS.BASE}?page=${page}&limit=${limit}`);
  return response.data.data;
};

export const getEmployee = async (id: number) => {
  const response = await api.get<{ success: boolean; data: Employee }>(
    EMPLOYEE_PATHS.byId(id),
  );
  return { data: response.data.data };
};

export const getMyInfo = async () => {
  const response = await api.get<{ success: boolean; data: Employee }>(
    EMPLOYEE_PATHS.MY_INFO,
  );
  return { data: response.data.data };
};

export const getSupervisors = async () => {
  const response = await api.get<{
    success: boolean;
    data: {
      id?: number | null;
      employee_id?: string | null;
      name: string;
      username?: string | null;
      email?: string | null;
      role?: string | null;
      job_title?: string | null;
      sub_unit?: string | null;
    }[];
  }>(EMPLOYEE_PATHS.SUPERVISORS);
  return { data: response.data.data };
};

export const getSupervisorsByIds = async (
  supervisorIds: (string | number)[],
) => {
  const response = await api.post<{
    success: boolean;
    data: { id: number; name: string }[];
  }>(EMPLOYEE_PATHS.SUPERVISORS_BY_IDS, { supervisorIds });
  return { data: response.data.data };
};

export const getLocations = async () => {
  const response = await api.get<{
    success: boolean;
    data: string[];
  }>(EMPLOYEE_PATHS.LOCATIONS);
  return { data: response.data.data };
};

export const createEmployee = async (formData: FormData) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string; id: number };
  }>(EMPLOYEE_PATHS.BASE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return { data: response.data.data };
};

export const updateEmployee = async (id: number, formData: FormData) => {
  const response = await api.put<{
    success: boolean;
    data: { message: string };
  }>(EMPLOYEE_PATHS.byId(id), formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return { data: response.data.data };
};

export const deleteEmployee = async (id: number) => {
  const response = await api.delete<{
    success: boolean;
    data: { message: string };
  }>(EMPLOYEE_PATHS.byId(id));
  return { data: response.data.data };
};

export const checkEmailExists = async (email: string, employeeId?: number) => {
  const response = await api.post<{
    success: boolean;
    data: { exists: boolean };
  }>(EMPLOYEE_PATHS.CHECK_EMAIL, { email, employeeId });
  return { data: response.data.data };
};

export const terminateEmployee = async (
  id: number,
  terminationData: {
    terminationReason: string;
    terminationDateTime: string;
    terminationType?: string;
    lastWorkingDay?: string;
    noticePeriodDays?: number;
    exitInterviewCompleted?: boolean;
    rehireEligible?: boolean;
    notes?: string;
  },
) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>(EMPLOYEE_PATHS.terminate(id), terminationData);

  return { data: response.data.data };
};

export const updateProfileImage = async (id: number, formData: FormData) => {
  const response = await api.patch<{
    success: boolean;
    data: Employee;
  }>(EMPLOYEE_PATHS.profileImage(id), formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return { data: response.data.data };
};

export const checkEmployeeIdExists = async (
  employeeId: string,
  excludeId?: number,
) => {
  const response = await api.post<{
    success: boolean;
    data: { exists: boolean };
  }>(EMPLOYEE_PATHS.CHECK_EMPLOYEE_ID, {
    employee_id: employeeId,
    excludeId,
  });
  return { data: response.data.data };
};

export const getLastEmployeeId = async () => {
  const response = await api.get<{
    success: boolean;
    data: { employee_id: string | null };
  }>(EMPLOYEE_PATHS.LAST_EMPLOYEE_ID);
  return { data: response.data.data };
};
