import toast from "react-hot-toast";

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
    icon: "✓",
    iconBgClass: "bg-green-100",
    confirmBtnClass: "bg-gradient-to-br from-green-600 to-green-500",
  },
  warning: {
    icon: "⚠",
    iconBgClass: "bg-amber-100",
    confirmBtnClass: "bg-gradient-to-br from-amber-500 to-amber-400",
  },
  danger: {
    icon: "🗑",
    iconBgClass: "bg-red-100",
    confirmBtnClass: "bg-gradient-to-br from-red-600 to-red-500",
  },
  info: {
    icon: "ℹ",
    iconBgClass: "bg-sky-100",
    confirmBtnClass: "bg-gradient-to-br from-sky-600 to-sky-500",
  },
};

export const Alert = {
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
          className="bg-white rounded-2xl p-6 min-w-[320px] max-w-[450px] shadow-2xl"
        >
          <div
            className={`w-14 h-14 rounded-full ${style.iconBgClass} flex items-center justify-center mx-auto mb-4 text-2xl`}
          >
            {style.icon}
          </div>

          <h3 className="mb-2 text-lg font-bold text-slate-800 text-center">
            {title}
          </h3>

          <p className="mb-6 text-sm text-slate-500 text-center leading-relaxed">
            {message}
          </p>

          <div className="flex gap-2.5">
            <button
              onClick={async () => {
                toast.dismiss(toastId);
                if (onCancel) onCancel();
                resolve(false);
              }}
              className="flex-1 px-3 py-3 rounded-xl border-[1.5px] border-slate-200 bg-white text-sm font-semibold text-slate-500 cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-300"
            >
              {cancelText}
            </button>
            <button
              onClick={async () => {
                toast.dismiss(toastId);
                if (onConfirm) await onConfirm();
                resolve(true);
              }}
              className={`flex-1 px-3 py-3 rounded-xl border-none ${style.confirmBtnClass} text-sm font-bold text-white cursor-pointer shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg`}
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

  warning: (title: string, message: string): Promise<boolean> => {
    return Alert.confirm({
      title,
      message,
      confirmText: "OK",
      cancelText: "Cancel",
      type: "warning",
    });
  },

  info: (title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      const style = ALERT_STYLES.info;

      const CustomAlert = (
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 min-w-[320px] max-w-[450px] shadow-2xl"
        >
          <div
            className={`w-14 h-14 rounded-full ${style.iconBgClass} flex items-center justify-center mx-auto mb-4 text-2xl`}
          >
            {style.icon}
          </div>

          <h3 className="mb-2 text-lg font-bold text-slate-800 text-center">
            {title}
          </h3>

          <p className="mb-6 text-sm text-slate-500 text-center leading-relaxed">
            {message}
          </p>

          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve();
            }}
            className={`w-full px-3 py-3 rounded-xl border-none ${style.confirmBtnClass} text-sm font-bold text-white cursor-pointer shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg`}
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
