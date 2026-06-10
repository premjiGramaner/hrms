import api from './axios';
import { Employee, PaginatedResponse } from '../types';

export const getEmployees = (page = 1) =>
  api.get<PaginatedResponse<Employee>>(`/employees?page=${page}&_=${Date.now()}`);

export const getEmployee = (id: number) =>
  api.get<Employee>(`/employees/${id}`);

export const getMyInfo = () =>
  api.get<Employee>('/employees/my-info');

export const getSupervisors = () =>
  api.get<{ id: number; name: string; job_title: string }[]>('/employees/supervisors');

export const createEmployee = (formData: FormData) =>
  api.post<{ message: string; id: number }>('/employees', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateEmployee = (id: number, formData: FormData) =>
  api.put<{ message: string }>(`/employees/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteEmployee = (id: number) =>
  api.delete<{ message: string }>(`/employees/${id}`);
