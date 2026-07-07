import api from "./axios";
import { AuthUser } from "../types";

export const login = async (
  username: string,
  password: string,
  rememberMe: boolean = false,
) => {
  const response = await api.post<{
    success: boolean;
    data: { 
      token: string; 
      user: AuthUser;
      requiresPasswordChange?: boolean;
      userId?: number;
      isFirstLogin?: boolean;
    };
  }>("/auth/login", { username, password, rememberMe });
  return response.data;
};

export const logout = async () => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>("/auth/logout");
  return response.data;
};

export const self = () => api.get<AuthUser>("/auth/profile");

export const forgotPassword = async (email: string) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>("/auth/forgot-password", { email });
  return { data: response.data.data };
};

export const resetPassword = async (
  token: string,
  password: string,
  confirmPassword: string,
) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>("/auth/reset-password", { token, password, confirmPassword });
  return { data: response.data.data };
};

export const createFirstTimePassword = async (
  userId: number,
  password: string,
  confirmPassword: string,
) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>("/auth/create-first-time-password", { userId, password, confirmPassword });
  return { data: response.data.data };
};
