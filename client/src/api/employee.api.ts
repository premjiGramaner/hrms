import api from "./axios";
import { Employee, PaginatedResponse } from "../types";

export const getEmployees = async (page = 1, limit = 15) => {
  const response = await api.get<{
    success: boolean;
    data: PaginatedResponse<Employee>;
  }>(`/employees?page=${page}&limit=${limit}&_=${Date.now()}`);
  return { data: response.data.data };
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
    data: { name: string }[];
  }>("/employees/supervisors");
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
