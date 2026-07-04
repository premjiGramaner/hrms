import api from "./axios";
import { AuthUser } from "../types";

export const login = async (
  username: string,
  password: string,
  rememberMe: boolean = false,
) => {
  const response = await api.post<{
    success: boolean;
    data: { token: string; user: AuthUser };
    passwordExpired?: boolean;
    username?: string;
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

export const verifyCookie = async () => {
  const response = await api.get<{
    success: boolean;
    data: {
      authenticated: boolean;
      user: { id: number; role: string; username: string };
    };
  }>("/auth/verify-cookie");
  return response.data;
};

export const resetExpiredPassword = async (
  username: string,
  newPassword: string,
  confirmPassword: string,
) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>("/auth/reset-expired-password", {
    username,
    newPassword,
    confirmPassword,
  });
  return response.data;
};

export const self = async () => {
  const response = await api.get<{
    success: boolean;
    data: AuthUser;
  }>("/auth/profile");
  return response.data;
};
