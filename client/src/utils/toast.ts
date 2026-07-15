import toast from "react-hot-toast";
import { ToastIcons } from "./toastIcons";

const COLORS = {
  success: {
    bg: "linear-gradient(135deg, #16a34a, #22c55e)",
    border: "#22c55e",
    text: "#fff",
  },
  error: {
    bg: "linear-gradient(135deg, #dc2626, #ef4444)",
    border: "#ef4444",
    text: "#fff",
  },
  warning: {
    bg: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    border: "#fbbf24",
    text: "#000",
  },
  info: {
    bg: "linear-gradient(135deg, #172554, #14b8a6)",
    border: "#14b8a6",
    text: "#fff",
  },
  loading: {
    bg: "linear-gradient(135deg, #64748b, #94a3b8)",
    border: "#94a3b8",
    text: "#fff",
  },
};

const commonStyle = {
  borderRadius: "12px",
  padding: "14px 18px",
  fontWeight: 600,
  fontSize: "14px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
  backdropFilter: "blur(10px)",
  minWidth: "300px",
  maxWidth: "500px",
};

export const Toast = {
  success: (message: string, duration = 3000) =>
    toast.success(message, {
      duration,
      style: {
        ...commonStyle,
        background: COLORS.success.bg,
        color: COLORS.success.text,
        border: `2px solid ${COLORS.success.border}`,
      },
      icon: ToastIcons.success,
      iconTheme: {
        primary: "#fff",
        secondary: "#16a34a",
      },
    }),

  error: (message: string, duration = 4000) =>
    toast.error(message, {
      duration,
      style: {
        ...commonStyle,
        background: COLORS.error.bg,
        color: COLORS.error.text,
        border: `2px solid ${COLORS.error.border}`,
      },
      icon: ToastIcons.error,
      iconTheme: {
        primary: "#fff",
        secondary: "#dc2626",
      },
    }),

  warning: (message: string, duration = 3500) =>
    toast(message, {
      duration,
      icon: ToastIcons.warning,
      style: {
        ...commonStyle,
        background: COLORS.warning.bg,
        color: COLORS.warning.text,
        border: `2px solid ${COLORS.warning.border}`,
      },
      iconTheme: {
        primary: "#000",
        secondary: "#f59e0b",
      },
    }),

  info: (message: string, duration = 3000) =>
    toast(message, {
      duration,
      icon: ToastIcons.info,
      style: {
        ...commonStyle,
        background: COLORS.info.bg,
        color: COLORS.info.text,
        border: `2px solid ${COLORS.info.border}`,
      },
      iconTheme: {
        primary: "#fff",
        secondary: "#14b8a6",
      },
    }),

  loading: (message: string) =>
    toast.loading(message, {
      style: {
        ...commonStyle,
        background: COLORS.loading.bg,
        color: COLORS.loading.text,
        border: `2px solid ${COLORS.loading.border}`,
      },
    }),

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
  ) =>
    toast.promise(promise, messages, {
      loading: {
        style: {
          ...commonStyle,
          background: COLORS.loading.bg,
          color: COLORS.loading.text,
          border: `2px solid ${COLORS.loading.border}`,
        },
      },
      success: {
        style: {
          ...commonStyle,
          background: COLORS.success.bg,
          color: COLORS.success.text,
          border: `2px solid ${COLORS.success.border}`,
        },
        icon: ToastIcons.success,
      },
      error: {
        style: {
          ...commonStyle,
          background: COLORS.error.bg,
          color: COLORS.error.text,
          border: `2px solid ${COLORS.error.border}`,
        },
        icon: ToastIcons.error,
      },
    }),

  created: (name = "Record") => Toast.success(`${name} created successfully`),

  updated: (name = "Record") => Toast.success(`${name} updated successfully`),

  deleted: (name = "Record") => Toast.success(`${name} deleted successfully`),

  saved: (name = "Record") => Toast.success(`${name} saved successfully`),

  dismiss: (id?: string) => toast.dismiss(id),

  dismissAll: () => toast.dismiss(),

  custom: (
    message: string,
    options?: {
      type?: "success" | "error" | "warning" | "info";
      duration?: number;
      icon?: string;
    },
  ) => {
    const type = options?.type || "info";
    const color = COLORS[type];

    return toast(message, {
      duration: options?.duration || 3000,
      icon: options?.icon || ToastIcons[type],
      style: {
        ...commonStyle,
        background: color.bg,
        color: color.text,
        border: `2px solid ${color.border}`,
      },
    });
  },
};

export { toast };

export default Toast;
