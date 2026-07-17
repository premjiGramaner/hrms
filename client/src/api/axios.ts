import axios from "axios";
import { env } from "../config/env";
import { STORAGE_KEYS } from "../constants/storage";

const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  withCredentials: true, // Send cookies with requests
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  // Only add Authorization header if it's a real JWT token, not a placeholder
  if (token && token !== "cookie_auth" && token !== "cookie_authenticated") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If placeholder token, rely on cookie only (sent automatically via withCredentials)
  return config;
});

const AUTH_PATHS = [
  "/login",
  "/reset-password",
  "/create-password",
  "/forgot-password",
];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);
      const pathname = window.location.pathname;
      if (!AUTH_PATHS.includes(pathname)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
