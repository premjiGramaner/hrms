import { X } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import DateInput from "../../components/common/DateInput";
import SelectInput from "../../components/common/SelectInput";
import { AppraisalTemplate } from "../../types/performance.types";

const MODAL_CONFIG = {
  TITLE: "Edit Cycle Details",
  BUTTON_LABELS: {
    CANCEL: "Cancel",
    SAVE: "Save Changes",
  },
  FIELD_LABELS: {
    TEMPLATE: "Template",
    FROM_DATE: "From Date",
    TO_DATE: "To Date",
    DUE_DATE: "Due Date",
  },
  ARIA_LABELS: {
    CLOSE: "Close modal",
  },
} as const;

interface CycleFormData {
  templateId: string;
  fromDate: string;
  toDate: string;
  dueDate: string;
}

interface EditCycleModalProps {
  isOpen: boolean;
  initialData: CycleFormData;
  templates: AppraisalTemplate[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (data: CycleFormData) => void;
}

export default function EditCycleModal({
  isOpen,
  initialData,
  templates,
  isSubmitting,
  onClose,
  onSave,
}: EditCycleModalProps) {
  const [formData, setFormData] = useState<CycleFormData>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof CycleFormData, value: string) => {
    setFormData((previousData) => ({
      ...previousData,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const handleBackdropClick = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const templateOptions = templates.map((template) => ({
    value: template.id,
    label: template.templateName,
  }));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-5">
          <h2 className="text-lg font-bold text-slate-800">
            {MODAL_CONFIG.TITLE}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={MODAL_CONFIG.ARIA_LABELS.CLOSE}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-8 py-6">
          <SelectInput
            label={MODAL_CONFIG.FIELD_LABELS.TEMPLATE}
            required
            value={formData.templateId}
            onChange={(value) => handleFieldChange("templateId", value)}
            options={templateOptions}
          />

          <div className="grid gap-5 md:grid-cols-3">
            <DateInput
              label={MODAL_CONFIG.FIELD_LABELS.FROM_DATE}
              required
              value={formData.fromDate}
              onChange={(value) => handleFieldChange("fromDate", value)}
            />
            <DateInput
              label={MODAL_CONFIG.FIELD_LABELS.TO_DATE}
              required
              value={formData.toDate}
              onChange={(value) => handleFieldChange("toDate", value)}
            />
            <DateInput
              label={MODAL_CONFIG.FIELD_LABELS.DUE_DATE}
              required
              value={formData.dueDate}
              onChange={(value) => handleFieldChange("dueDate", value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-8 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {MODAL_CONFIG.BUTTON_LABELS.CANCEL}
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            {MODAL_CONFIG.BUTTON_LABELS.SAVE}
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { CycleFormData };
