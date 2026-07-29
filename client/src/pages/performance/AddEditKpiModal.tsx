import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import SelectInput from "../../components/common/SelectInput";
import { templateQuestionCategories } from "../../data/appraisalTemplateEngine";
import {
  TemplateQuestion,
  TemplateQuestionCategory,
} from "../../types/performance.types";
import { FieldShell, SoftInput } from "./performanceUi";

type DraftQuestion = Omit<TemplateQuestion, "id" | "displayText" | "order">;

interface KpiFieldErrors {
  title: string;
  description: string;
  weight: string;
}

const EMPTY_FIELD_ERRORS: KpiFieldErrors = {
  title: "",
  description: "",
  weight: "",
};

type Props = {
  question?: TemplateQuestion | null;
  existingWeight?: number;
  maximumWeight?: number;
  onClose: () => void;
  onSave: (question: DraftQuestion | TemplateQuestion) => void;
};

export default function AddEditKpiModal({
  question,
  existingWeight = 0,
  maximumWeight = 100,
  onClose,
  onSave,
}: Props) {
  const [category, setCategory] = useState<TemplateQuestionCategory>(
    "Behavioural Competency",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("0");
  const [fieldErrors, setFieldErrors] =
    useState<KpiFieldErrors>(EMPTY_FIELD_ERRORS);

  useEffect(() => {
    if (!question) return;
    setCategory(question.category);
    setTitle(question.title);
    setDescription(question.description);
    setWeight(String(question.weight ?? 0));
    setFieldErrors(EMPTY_FIELD_ERRORS);
  }, [question]);

  const displayText = useMemo(
    () => `${category}_${title}_${description}`,
    [category, title, description],
  );

  const weightError = (value: string) => {
    const nextWeight = Number(value) || 0;
    if (existingWeight + nextWeight <= maximumWeight) return "";
    return existingWeight >= maximumWeight
      ? `The total KPI weight is already ${maximumWeight}. You cannot add more weight.`
      : `The total KPI weight cannot exceed ${maximumWeight}. Only ${Math.max(0, maximumWeight - existingWeight)} weight is available.`;
  };

  const save = () => {
    if (!category) return;
    const nextFieldErrors: KpiFieldErrors = {
      title: title.trim() ? "" : "KPI title is required.",
      description: description.trim() ? "" : "KPI description is required.",
      weight: weightError(weight),
    };
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;
    const payload = {
      ...(question ?? {}),
      category,
      title: title.trim(),
      description: description.trim(),
      displayText,
      weight: Number(weight) || 0,
    };
    onSave(payload as DraftQuestion | TemplateQuestion);
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
    setFieldErrors((currentErrors) => ({ ...currentErrors, title: "" }));
  };

  const handleDescriptionChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setDescription(event.target.value);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      description: "",
    }));
  };

  const handleWeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextWeight = event.target.value;
    setWeight(nextWeight);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      weight: weightError(nextWeight),
    }));
  };

  return (
    <Modal
      title={question ? "Edit KPI" : "Add KPI"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-6">
        <SelectInput
          label="Category"
          required
          value={category}
          onChange={(value) => setCategory(value as TemplateQuestionCategory)}
          options={templateQuestionCategories}
        />
        <FieldShell label="Title*">
          <SoftInput
            value={title}
            onChange={handleTitleChange}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "kpi-title-error" : undefined}
            className={
              fieldErrors.title ? "border-red-500 focus:border-red-500" : ""
            }
          />
          {fieldErrors.title ? (
            <span
              id="kpi-title-error"
              role="alert"
              className="mt-2 block text-sm font-semibold text-red-500"
            >
              {fieldErrors.title}
            </span>
          ) : null}
        </FieldShell>
        <label className="block text-sm font-semibold text-slate-500">
          <span className="mb-2 block">Description*</span>
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description ? "kpi-description-error" : undefined
            }
            className={`min-h-[110px] w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-600 outline-none ${fieldErrors.description ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-navy-700"}`}
          />
          {fieldErrors.description ? (
            <span
              id="kpi-description-error"
              role="alert"
              className="mt-2 block text-sm font-semibold text-red-500"
            >
              {fieldErrors.description}
            </span>
          ) : null}
        </label>
        <FieldShell label="Weight">
          <SoftInput
            type="number"
            min="0"
            max={maximumWeight}
            step="0.01"
            value={weight}
            onChange={handleWeightChange}
            aria-invalid={Boolean(fieldErrors.weight)}
            aria-describedby={fieldErrors.weight ? "kpi-weight-error" : undefined}
            className={
              fieldErrors.weight
                ? "border-red-500 focus:border-red-500"
                : ""
            }
          />
          {fieldErrors.weight ? (
            <span
              id="kpi-weight-error"
              role="alert"
              className="mt-2 block text-sm font-semibold text-red-500"
            >
              {fieldErrors.weight}
            </span>
          ) : null}
        </FieldShell>
        <div>
          <p className="mb-2 text-xs font-bold text-slate-400">Preview</p>
          <p className="rounded bg-[#eeecef] px-4 py-3 text-sm font-semibold text-slate-500">
            {displayText}
          </p>
        </div>
      </div>
    </Modal>
  );
}
