import toast from "react-hot-toast";

// Professional alert/confirmation dialog matching application theme
interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "confirm" | "warning" | "danger" | "info";
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

const ALERT_STYLES = {
  confirm: {
    gradient: "linear-gradient(135deg, #172554, #14b8a6)",
    icon: "✓",
    iconBg: "#dcfce7",
    iconColor: "#16a34a",
    confirmBg: "linear-gradient(135deg, #16a34a, #22c55e)",
  },
  warning: {
    gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    icon: "⚠",
    iconBg: "#fef3c7",
    iconColor: "#f59e0b",
    confirmBg: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  },
  danger: {
    gradient: "linear-gradient(135deg, #dc2626, #ef4444)",
    icon: "🗑",
    iconBg: "#fee2e2",
    iconColor: "#dc2626",
    confirmBg: "linear-gradient(135deg, #dc2626, #ef4444)",
  },
  info: {
    gradient: "linear-gradient(135deg, #172554, #14b8a6)",
    icon: "ℹ",
    iconBg: "#e0f2fe",
    iconColor: "#0284c7",
    confirmBg: "linear-gradient(135deg, #0284c7, #0ea5e9)",
  },
};

export const Alert = {
  // Confirmation dialog
  confirm: (options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const {
        title,
        message,
        confirmText = "Confirm",
        cancelText = "Cancel",
        type = "confirm",
        onConfirm,
        onCancel,
      } = options;

      const style = ALERT_STYLES[type];

      const CustomAlert = (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            minWidth: "320px",
            maxWidth: "450px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: style.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
            }}
          >
            {style.icon}
          </div>

          {/* Title */}
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "18px",
              fontWeight: 700,
              color: "#1e293b",
              textAlign: "center",
            }}
          >
            {title}
          </h3>

          {/* Message */}
          <p
            style={{
              margin: "0 0 24px",
              fontSize: "14px",
              color: "#64748b",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={async () => {
                toast.dismiss(toastId);
                if (onCancel) onCancel();
                resolve(false);
              }}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                color: "#64748b",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={async () => {
                toast.dismiss(toastId);
                if (onConfirm) await onConfirm();
                resolve(true);
              }}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: style.confirmBg,
                fontSize: "14px",
                fontWeight: 700,
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      );

      const toastId = toast.custom(CustomAlert, {
        duration: Infinity,
        position: "top-center",
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
        },
      });
    });
  },

  // Delete confirmation - specialized version
  confirmDelete: (
    itemName: string,
    onConfirm?: () => void | Promise<void>,
  ): Promise<boolean> => {
    return Alert.confirm({
      title: "Delete Confirmation",
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm,
    });
  },

  // Warning alert
  warning: (title: string, message: string): Promise<boolean> => {
    return Alert.confirm({
      title,
      message,
      confirmText: "OK",
      cancelText: "Cancel",
      type: "warning",
    });
  },

  // Info alert (single button)
  info: (title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      const style = ALERT_STYLES.info;

      const CustomAlert = (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            minWidth: "320px",
            maxWidth: "450px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: style.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
            }}
          >
            {style.icon}
          </div>

          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "18px",
              fontWeight: 700,
              color: "#1e293b",
              textAlign: "center",
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: "0 0 24px",
              fontSize: "14px",
              color: "#64748b",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>

          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve();
            }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: style.confirmBg,
              fontSize: "14px",
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            OK
          </button>
        </div>
      );

      const toastId = toast.custom(CustomAlert, {
        duration: Infinity,
        position: "top-center",
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
        },
      });
    });
  },
};

export default Alert;
