import { Copy, Edit, Eye, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  clonePerformanceTemplate,
  createTemplateKpi,
  deletePerformanceTemplate,
  deleteTemplateKpi,
  getPerformanceTemplates,
  updatePerformanceTemplate,
  updateTemplateKpi,
} from "../../api/performance.api";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Modal from "../../components/common/Modal";
import RichTextEditor from "../../components/common/RichTextEditor";
import Layout from "../../components/Layout";
import { defaultPerformanceEvaluationHeader } from "../../config/performanceTemplates";
import { richTextEditorConfig } from "../../config/richTextEditor";
import {
  getTemplateById,
  moveTemplateQuestion,
  replaceTemplate,
  sortTemplateQuestions,
  validateTemplate,
} from "../../data/appraisalTemplateEngine";
import {
  AppraisalTemplate,
  TemplateQuestion,
} from "../../types/performance.types";
import Toast from "../../utils/toast";
import AddEditKpiModal from "./AddEditKpiModal";
import KpiQuestionRow from "./KpiQuestionRow";
import TemplatePreviewModal from "./TemplatePreviewModal";
import { FieldShell, SoftInput } from "./performanceUi";
import { showPerformanceError } from "./performanceNotifications";
import { PAGE_PATHS } from "../../config/roles";

export default function TemplateFormDesign() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([]);
  const [editingQuestion, setEditingQuestion] =
    useState<TemplateQuestion | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteQuestion, setDeleteQuestion] = useState<TemplateQuestion | null>(
    null,
  );
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [previewTemplate, setPreviewTemplate] =
    useState<AppraisalTemplate | null>(null);
  const [templateDraft, setTemplateDraft] = useState({
    jobTitle: "",
    templateName: "",
    weight: "100",
    header: defaultPerformanceEvaluationHeader,
  });

  useEffect(() => {
    getPerformanceTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  const template = useMemo(
    () => getTemplateById(templates, templateId),
    [templates, templateId],
  );

  if (!template) {
    return (
      <Layout title="Performance / Configuration / Appraisal / Templates">
        <div className="min-h-full bg-gray-100 p-8">
          <div className="rounded-[8px] bg-white p-8 text-sm font-semibold text-slate-500">
            Loading template...
          </div>
        </div>
      </Layout>
    );
  }
  const section = template.sections[0];
  const questions = section ? sortTemplateQuestions(section) : [];
  const totalQuestionWeight = questions.reduce(
    (total, question) => total + Number(question.weight || 0),
    0,
  );
  const topPill = `${template.jobTitle} - Annual Appraisal Template - Cannyfore - Form Design`;
  const tabs = [
    {
      label: topPill,
      path: PAGE_PATHS.performanceTemplateDesign(template.id),
    },
  ];

  const updateCurrentTemplate = (nextTemplate: AppraisalTemplate) => {
    setTemplates((current) => replaceTemplate(current, nextTemplate));
  };

  const moveQuestion = async (
    question: TemplateQuestion,
    direction: "up" | "down",
  ) => {
    const previousTemplate = template;
    const nextTemplate = moveTemplateQuestion(
      template,
      section.id,
      question.id,
      direction,
    );
    updateCurrentTemplate(nextTemplate);
    try {
      await Promise.all(
        nextTemplate.sections[0].questions.map((item) =>
          updateTemplateKpi(nextTemplate.id, item.id, { order: item.order }),
        ),
      );
      Toast.success("KPI order updated successfully.");
    } catch (error) {
      updateCurrentTemplate(previousTemplate);
      showPerformanceError(error, "Unable to update KPI order.");
    }
  };

  const saveQuestion = async (
    question:
      | Omit<TemplateQuestion, "id" | "displayText" | "order">
      | TemplateQuestion,
  ) => {
    const isUpdate = "id" in question;
    try {
      const nextTemplate = isUpdate
        ? await updateTemplateKpi(template.id, question.id, question)
        : await createTemplateKpi(template.id, question);
      updateCurrentTemplate(nextTemplate);
      setEditingQuestion(null);
      setIsAdding(false);
      if (isUpdate) Toast.updated("KPI");
      else Toast.created("KPI");
    } catch (error) {
      showPerformanceError(
        error,
        isUpdate ? "Unable to update KPI." : "Unable to create KPI.",
      );
    }
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestion) return;
    try {
      updateCurrentTemplate(
        await deleteTemplateKpi(template.id, deleteQuestion.id),
      );
      setDeleteQuestion(null);
      Toast.deleted("KPI");
    } catch (error) {
      showPerformanceError(error, "Unable to delete KPI.");
    }
  };

  const cloneCurrentTemplate = async () => {
    try {
      const cloned = await clonePerformanceTemplate(template.id);
      setTemplates((current) => [...current, cloned]);
      Toast.success("Appraisal template cloned successfully.");
      navigate(PAGE_PATHS.performanceTemplateDesign(cloned.id));
    } catch (error) {
      showPerformanceError(error, "Unable to clone appraisal template.");
    }
  };

  const openTemplateEditor = () => {
    setTemplateDraft({
      jobTitle: template.jobTitle,
      templateName: template.templateName,
      weight: String(template.weight || 100),
      header: template.header || defaultPerformanceEvaluationHeader,
    });
    setIsEditingTemplate(true);
  };

  const saveTemplateSettings = async () => {
    try {
      updateCurrentTemplate(
        await updatePerformanceTemplate(template.id, {
          jobTitle: templateDraft.jobTitle,
          templateName: templateDraft.templateName,
          weight: Number(templateDraft.weight) || 100,
          header: templateDraft.header,
        }),
      );
      setIsEditingTemplate(false);
      Toast.updated("Appraisal template");
    } catch (error) {
      showPerformanceError(error, "Unable to update appraisal template.");
    }
  };

  const deleteCurrentTemplate = async () => {
    try {
      await deletePerformanceTemplate(template.id);
      const remaining = templates.filter((item) => item.id !== template.id);
      setTemplates(remaining);
      setIsDeletingTemplate(false);
      Toast.deleted("Appraisal template");
      navigate(PAGE_PATHS.performanceConfigAppraisal);
    } catch (error) {
      showPerformanceError(error, "Unable to delete appraisal template.");
    }
  };

  const saveTemplate = () => {
    const errors = validateTemplate(template);
    if (errors.length) Toast.warning(errors.join(" "));
    else Toast.saved("KPI order");
  };

  return (
    <Layout
      title="Performance / Configuration / Appraisal / Templates"
      tabs={tabs}
      activeTab={topPill}
      onFab={() => setIsAdding(true)}
    >
      <div className="min-h-full bg-gray-100 p-2">
        <Card className="relative mx-auto min-h-[640px] max-w-[1480px] px-24 py-10">
          <div className="absolute right-8 top-8 flex items-center gap-4 text-slate-500">
            <button
              type="button"
              title="Edit template"
              className="hover:text-navy-700"
              onClick={openTemplateEditor}
            >
              <Edit size={24} />
            </button>
            <button
              type="button"
              title="Clone template"
              className="hover:text-navy-700"
              onClick={cloneCurrentTemplate}
            >
              <Copy size={24} />
            </button>
            <button
              type="button"
              title="Preview template"
              className="hover:text-navy-700"
              onClick={() => setPreviewTemplate(template)}
            >
              <Eye size={24} />
            </button>
            <button
              type="button"
              title="Delete template"
              className="hover:text-navy-700"
              onClick={() => setIsDeletingTemplate(true)}
            >
              <Trash2 size={24} />
            </button>
          </div>

          <div className="max-w-[1180px]">
            <h1 className="mb-9 text-xl font-bold text-slate-600">
              {template.jobTitle} (Weight {template.weight})
            </h1>
            <div className="pl-16">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-700">KPI's</h2>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    className="px-5 py-2"
                    onClick={() => setIsAdding(true)}
                  >
                    <Plus size={16} />
                    Add KPI
                  </Button>
                  <Button className="px-5 py-2" onClick={saveTemplate}>
                    <Save size={16} />
                    Save Order
                  </Button>
                </div>
              </div>
              {questions.length ? (
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <KpiQuestionRow
                      key={question.id}
                      question={question}
                      isFirst={index === 0}
                      isLast={index === questions.length - 1}
                      onMoveUp={() => moveQuestion(question, "up")}
                      onMoveDown={() => moveQuestion(question, "down")}
                      onEdit={() => setEditingQuestion(question)}
                      onDelete={() => setDeleteQuestion(question)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[8px] border border-dashed border-slate-200 bg-[#fbf9ff] px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    No KPIs added yet.
                  </p>
                  <Button
                    className="mx-auto mt-4 px-5 py-2"
                    onClick={() => setIsAdding(true)}
                  >
                    <Plus size={16} />
                    Add KPI
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {isAdding ? (
          <AddEditKpiModal
            existingWeight={totalQuestionWeight}
            onClose={() => setIsAdding(false)}
            onSave={saveQuestion}
          />
        ) : null}
        {editingQuestion ? (
          <AddEditKpiModal
            question={editingQuestion}
            existingWeight={
              totalQuestionWeight - Number(editingQuestion.weight || 0)
            }
            onClose={() => setEditingQuestion(null)}
            onSave={saveQuestion}
          />
        ) : null}
        {deleteQuestion ? (
          <ConfirmDialog
            title="Delete KPI"
            message="Delete this KPI from the template?"
            onCancel={() => setDeleteQuestion(null)}
            onConfirm={confirmDeleteQuestion}
          />
        ) : null}
        {isEditingTemplate ? (
          <Modal
            title="Edit Appraisal Template"
            onClose={() => setIsEditingTemplate(false)}
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingTemplate(false)}
                >
                  Cancel
                </Button>
                <Button onClick={saveTemplateSettings}>Save</Button>
              </>
            }
          >
            <div className="space-y-6">
              <FieldShell label="Job Title*">
                <SoftInput
                  value={templateDraft.jobTitle}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      jobTitle: event.target.value,
                    }))
                  }
                />
              </FieldShell>
              <FieldShell label="Name*">
                <SoftInput
                  value={templateDraft.templateName}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      templateName: event.target.value,
                    }))
                  }
                />
              </FieldShell>
              <FieldShell label="Weight*">
                <SoftInput
                  type="number"
                  min="1"
                  max="100"
                  value={templateDraft.weight}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      weight: event.target.value,
                    }))
                  }
                />
              </FieldShell>
              <div className="block text-sm font-semibold text-slate-500">
                <span className="mb-2 block">Header</span>
                <RichTextEditor
                  value={templateDraft.header}
                  onChange={(header) =>
                    setTemplateDraft((current) => ({ ...current, header }))
                  }
                />
                <span className="mt-2 block text-xs font-medium text-slate-400">
                  *Attachment size should be less than{" "}
                  {richTextEditorConfig.maxImageSizeMb}MB
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTemplateDraft((current) => ({
                      ...current,
                      header: defaultPerformanceEvaluationHeader,
                    }))
                  }
                  className="mt-3 rounded-full bg-[#eeeaf3] px-4 py-2 text-xs font-bold text-navy-700"
                >
                  Use Performance Evaluation Header
                </button>
              </div>
            </div>
          </Modal>
        ) : null}
        {isDeletingTemplate ? (
          <ConfirmDialog
            title="Delete Template"
            message="Delete this appraisal template?"
            onCancel={() => setIsDeletingTemplate(false)}
            onConfirm={deleteCurrentTemplate}
          />
        ) : null}
        {previewTemplate ? (
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
          />
        ) : null}
      </div>
    </Layout>
  );
}
