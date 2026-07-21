import api from './axios';
import { UserRole } from '../types';
import { ROLE_PATHS } from '../constants/apiPaths';

export const getRoles = async () => {
  const response = await api.get<{ success: boolean; data: UserRole[] }>(ROLE_PATHS.BASE);
  return { data: response.data.data };
};

export const createRole = async (data: { role_name: string; role_type?: string; description?: string }) => {
  const response = await api.post<{ success: boolean; data: UserRole }>(ROLE_PATHS.BASE, data);
  return { data: response.data.data };
};

export const deleteRole = async (id: number) => {
  const response = await api.delete<{ success: boolean; data: any }>(ROLE_PATHS.byId(id));
  return { data: response.data.data };
};
