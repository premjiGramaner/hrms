import toast from "react-hot-toast";

const commonStyle = {
  color: "#fff",
  borderRadius: "8px",
  padding: "12px 16px",
  fontWeight: 500,
};

export const Toast = {
  created: (name = "Record") =>
    toast.success(`${name} created successfully.`, {
      style: {
        ...commonStyle,
        background: "#16a34a",
      },
      icon: "✅",
    }),

  updated: (name = "Record") =>
    toast(`${name} updated successfully.`, {
      icon: "✏️",
      style: {
        ...commonStyle,
        background: "#2563eb",
      },
    }),

  deleted: (name = "Record") =>
    toast(`${name} deleted successfully.`, {
      icon: "🗑️",
      style: {
        ...commonStyle,
        background: "#dc2626",
      },
    }),

  info: (message: string) =>
    toast(message, {
      icon: "ℹ️",
      style: {
        ...commonStyle,
        background: "#eab308",
        color: "#000",
      },
    }),

  warning: (message: string) =>
    toast(message, {
      icon: "⚠️",
      style: {
        ...commonStyle,
        background: "#f97316",
      },
    }),

  error: (message: string) =>
    toast.error(message, {
      style: {
        ...commonStyle,
        background: "#b91c1c",
      },
    }),

  success: (message: string) =>
    toast.success(message, {
      style: {
        ...commonStyle,
        background: "#16a34a",
      },
    }),

  loading: (message: string) => toast.loading(message),

  dismiss: (id?: string) => toast.dismiss(id),
};
