import Button from "./Button";
import Modal from "./Modal";

type Props = {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  title = "Confirm",
  message,
  confirmLabel = "Delete",
  danger = true,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            No, Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-full px-8 py-2.5 text-sm font-bold text-white transition ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-navy-700 hover:bg-navy-800"
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-center text-base font-semibold leading-7 text-slate-400">
        {message}
      </p>
    </Modal>
  );
}
