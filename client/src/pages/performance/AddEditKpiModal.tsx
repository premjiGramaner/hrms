import { useEffect, useMemo, useState } from "react";
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

type Props = {
  question?: TemplateQuestion | null;
  onClose: () => void;
  onSave: (question: DraftQuestion | TemplateQuestion) => void;
};

export default function AddEditKpiModal({ question, onClose, onSave }: Props) {
  const [category, setCategory] = useState<TemplateQuestionCategory>(
    "Behavioural Competency",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("0");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!question) return;
    setCategory(question.category);
    setTitle(question.title);
    setDescription(question.description);
    setWeight(String(question.weight ?? 0));
  }, [question]);

  const displayText = useMemo(
    () => `${category}_${title}_${description}`,
    [category, title, description],
  );

  const save = () => {
    if (!category) {
      setError("KPI category is required.");
      return;
    }
    if (!title.trim()) {
      setError("KPI title is required.");
      return;
    }
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
            onChange={(event) => setTitle(event.target.value)}
          />
        </FieldShell>
        <label className="block text-sm font-semibold text-slate-500">
          <span className="mb-2 block">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-navy-700"
          />
        </label>
        <FieldShell label="Weight">
          <SoftInput
            type="number"
            min="0"
            step="0.01"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </FieldShell>
        <div>
          <p className="mb-2 text-xs font-bold text-slate-400">Preview</p>
          <p className="rounded bg-[#eeecef] px-4 py-3 text-sm font-semibold text-slate-500">
            {displayText}
          </p>
        </div>
        {error ? (
          <p className="text-sm font-semibold text-red-500">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
