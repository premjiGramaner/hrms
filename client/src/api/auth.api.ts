import api from './axios';
import { AuthUser } from '../types';

export const login = (username: string, password: string) =>
  api.post<{ token: string; user: AuthUser }>('/auth/login', { username, password });

export const getMe = () => api.get<AuthUser>('/auth/me');
