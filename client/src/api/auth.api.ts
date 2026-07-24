import api from "./axios";
import { AuthUser } from "../types";
import { AUTH_PATHS } from "../constants/apiPaths";

interface LoginData {
  token?: string;
  user?: AuthUser;
  requiresPasswordChange?: boolean;
  passwordSetupToken?: string;
  passwordExpired?: boolean;
  message?: string;
  passwordReminderMessage?: string;
}

export const login = async (
  username: string,
  password: string,
  rememberMe: boolean = false,
) => {
  const response = await api.post<{
    success: boolean;
    data: LoginData;
  }>(AUTH_PATHS.LOGIN, { username, password, rememberMe });
  return response.data.data;
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
  oldPassword?: string,
) => {
  const response = await api.post<{
    success: boolean;
    data: { message: string };
  }>(AUTH_PATHS.RESET_PASSWORD, {
    token,
    password,
    confirmPassword,
    oldPassword,
  });
  return {
    data: response.data.data,
  };
};

export const verifyPasswordToken = async (token: string) => {
  const response = await api.post<{
    success: boolean;
    data: {
      message: string;
      data: { user: Pick<AuthUser, "id" | "name"> };
    };
  }>(AUTH_PATHS.VERIFY_TOKEN, { token });
  return response.data.data.data.user;
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
