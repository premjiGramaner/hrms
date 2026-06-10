import api from './axios';
import { AuthUser } from '../types';

export const login = async (username: string, password: string) => {
  const response = await api.post<{ success: boolean; data: { token: string; user: AuthUser } }>('/auth/login', { username, password });
  return { data: response.data.data };
};

export const getMe = () => api.get<AuthUser>('/auth/me');
