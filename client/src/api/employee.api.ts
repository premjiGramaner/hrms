import api from "./axios";
import { Employee, PaginatedResponse, Supervisor } from "../types";

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
  }>(`/employees?${params.toString()}&_=${Date.now()}`);
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
  }>(`/employees/superiors?${queryString}`);
  return { data: response.data.data };
};
export const fetchAllEmployees = async (page = 1, limit = 1000) => {
  const response = await api.get<{
    success: boolean;
    data: PaginatedResponse<Employee>;
  }>(`/employees?page=${page}&limit=${limit}`);
  return response.data.data;
};

export const getEmployee = async (id: number) => {
  const response = await api.get<{ success: boolean; data: Employee }>(
    `/employees/${id}`,
  );
  return { data: response.data.data };
};

export const getMyInfo = async () => {
  const response = await api.get<{ success: boolean; data: Employee }>(
    "/employees/my-info",
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
  }>("/employees/supervisors");
  return { data: response.data.data };
};

export const getSupervisorsByIds = async (
  supervisorIds: (string | number)[],
) => {
  const response = await api.post<{
    success: boolean;
    data: { id: number; name: string }[];
  }>("/employees/supervisors-by-ids", { supervisorIds });
  return { data: response.data.data };
};

export const getLocations = async () => {
  const response = await api.get<{
    success: boolean;
    data: string[];
  }>("/employees/locations");
  return { data: response.data.data };
};

export const createEmployee = async (formData: FormData) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string; id: number };
  }>("/employees", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return { data: response.data.data };
};

export const updateEmployee = async (id: number, formData: FormData) => {
  const response = await api.put<{
    success: boolean;
    data: { message: string };
  }>(`/employees/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return { data: response.data.data };
};

export const deleteEmployee = async (id: number) => {
  const response = await api.delete<{
    success: boolean;
    data: { message: string };
  }>(`/employees/${id}`);
  return { data: response.data.data };
};

export const checkEmailExists = async (email: string, employeeId?: number) => {
  const response = await api.post<{
    success: boolean;
    data: { exists: boolean };
  }>("/employees/check-email", { email, employeeId });
  return { data: response.data.data };
};

export const terminateEmployee = async (
  id: number,
  terminationData: {
    terminationReason: string;
    terminationDateTime: string;
    notes?: string;
  },
) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>(`/employees/${id}/terminate`, terminationData);

  return { data: response.data.data };
};

export const updateProfileImage = async (id: number, formData: FormData) => {
  const response = await api.patch<{
    success: boolean;
    data: Employee;
  }>(`/employees/${id}/profile-image`, formData, {
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
  }>("/employees/check-employee-id", { employee_id: employeeId, excludeId });
  return { data: response.data.data };
};

export const getLastEmployeeId = async () => {
  const response = await api.get<{
    success: boolean;
    data: { employee_id: string | null };
  }>("/employees/last-employee-id");
  return { data: response.data.data };
};
