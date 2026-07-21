import api from "./axios";
import { AuthUser } from "../types";
import { AUTH_PATHS } from "../constants/apiPaths";

export const login = async (
  username: string,
  password: string,
  rememberMe: boolean = false,
) => {
  const response = await api.post<{
    success: boolean;
    data: {
      token?: string;
      user?: AuthUser;
      requiresPasswordChange?: boolean;
      userId?: number;
      isFirstLogin?: boolean;
    };
    passwordExpired?: boolean;
    username?: string;
    token?: string;
    user?: AuthUser;
    requiresPasswordChange?: boolean;
    userId?: number;
    isFirstLogin?: boolean;
  }>(AUTH_PATHS.LOGIN, { username, password, rememberMe });
  return response.data;
};

export const logout = async () => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>(AUTH_PATHS.LOGOUT);
  return response.data;
};

export const self = () => api.get<AuthUser>(AUTH_PATHS.PROFILE);

export const forgotPassword = async (email: string) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>(AUTH_PATHS.FORGOT_PASSWORD, { email });
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
  }>(AUTH_PATHS.RESET_PASSWORD, { token, password, confirmPassword });
  return { data: response.data.data };
};

export const setPassword = async (
  token: string,
  password: string,
  confirmPassword: string,
) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>(
    AUTH_PATHS.SET_PASSWORD,
    { password, confirmPassword },
    { headers: { Authorization: `Bearer ${token}` } },
  );
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
  }>(AUTH_PATHS.CREATE_FIRST_TIME_PASSWORD, {
    userId,
    password,
    confirmPassword,
  });
  return { data: response.data.data };
};
