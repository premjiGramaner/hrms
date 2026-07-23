interface LeaveConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmButtonClassName: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function LeaveConfirmationModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmButtonClassName,
  loading = false,
  onConfirm,
  onClose,
}: LeaveConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-3 text-base font-bold text-slate-800">{title}</h3>
        <p className="mb-5 text-sm text-slate-600">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex min-w-28 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClassName}`}
          >
            {loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}