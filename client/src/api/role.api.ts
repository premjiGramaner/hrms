import api from './axios';
import { UserRole } from '../types';

export const getRoles = () => api.get<UserRole[]>('/roles');

export const createRole = (data: { role_name: string; role_type?: string; description?: string }) =>
  api.post<UserRole>('/roles', data);

export const deleteRole = (id: number) => api.delete(`/roles/${id}`);
