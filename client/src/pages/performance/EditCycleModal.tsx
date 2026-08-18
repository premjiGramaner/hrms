import { X } from "lucide-react";
import { useState } from "react";
import Button from "../../components/common/Button";
import DateInput from "../../components/common/DateInput";
import SelectInput from "../../components/common/SelectInput";
import { AppraisalTemplate } from "../../types/performance.types";

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
            Edit Cycle Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-8 py-6">
          <SelectInput
            label="Template"
            required
            value={formData.templateId}
            onChange={(value) => handleFieldChange("templateId", value)}
            options={templateOptions}
          />

          <div className="grid gap-5 md:grid-cols-3">
            <DateInput
              label="From Date"
              required
              value={formData.fromDate}
              onChange={(value) => handleFieldChange("fromDate", value)}
            />
            <DateInput
              label="To Date"
              required
              value={formData.toDate}
              onChange={(value) => handleFieldChange("toDate", value)}
            />
            <DateInput
              label="Due Date"
              required
              value={formData.dueDate}
              onChange={(value) => handleFieldChange("dueDate", value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-8 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { CycleFormData };
