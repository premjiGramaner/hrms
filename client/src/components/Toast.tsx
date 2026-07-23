import React, { useEffect } from "react";
import { IconCheck, IconX, IconAlertCircle } from "./Icons";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface Props {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

export default function Toast({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage;
  onRemove: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const styles: Record<ToastType, string> = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-blue-900 text-white",
  };
  const icons: Record<ToastType, React.ReactNode> = {
    success: <IconCheck size={16} color="#fff" />,
    error: <IconX size={16} color="#fff" />,
    info: <IconAlertCircle size={16} color="#fff" />,
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl min-w-64 max-w-sm ${styles[toast.type]}`}
    >
      <span className="flex-shrink-0 flex items-center justify-center">
        {icons[toast.type]}
      </span>
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-white/80 hover:text-white leading-none cursor-pointer flex-shrink-0 bg-transparent border-none flex items-center justify-center p-0"
      >
        <IconX size={18} color="rgba(255,255,255,0.9)" />
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  let nextId = React.useRef(0);

  const addToast = (message: string, type: ToastType = "info") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
}
