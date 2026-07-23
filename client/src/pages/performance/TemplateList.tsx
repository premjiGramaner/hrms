import { Copy, Edit, FileText, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clonePerformanceTemplate,
  createPerformanceTemplate,
  getPerformanceTemplates,
} from "../../api/performance.api";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import RichTextEditor from "../../components/common/RichTextEditor";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { defaultPerformanceEvaluationHeader } from "../../config/performanceTemplates";
import { richTextEditorConfig } from "../../config/richTextEditor";
import { AppraisalTemplate } from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";
import { htmlToPreview } from "../../utils/htmlPreview";
import Toast from "../../utils/toast";
import TemplatePreviewModal from "./TemplatePreviewModal";
import { FieldShell, IconButton, SoftInput } from "./performanceUi";
import { showPerformanceError } from "./performanceNotifications";
import { PAGE_PATHS } from "../../config/roles";

export default function TemplateList() {
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] =
    useState<AppraisalTemplate | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({
    jobTitle: "",
    templateName: "",
    weight: "100",
    header: defaultPerformanceEvaluationHeader,
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const resetAddDraft = () => {
    setError("");
    setDraft({
      jobTitle: "",
      templateName: "",
      weight: "100",
      header: defaultPerformanceEvaluationHeader,
    });
  };

  const openAddModal = () => {
    resetAddDraft();
    setIsAdding(true);
  };

  useEffect(() => {
    getPerformanceTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const columns: DataTableColumn<AppraisalTemplate>[] = [
    { key: "templateName", header: "Name", width: "320px", sortable: true },
    { key: "description", header: "Description", render: () => "" },
    {
      key: "isDefault",
      header: "Is Default",
      width: "120px",
      render: (row) => (row.isDefault ? "Yes" : "No"),
    },
    {
      key: "header",
      header: "Header",
      render: (row) => (
        <span className="line-clamp-2">{htmlToPreview(row.header)}</span>
      ),
    },
  ];

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const clone = async (template: AppraisalTemplate) => {
    try {
      setError("");
      const cloned = await clonePerformanceTemplate(template.id);
      setTemplates((current) => [
        ...current.filter((item) => item.id !== cloned.id),
        cloned,
      ]);
      Toast.success("Appraisal template cloned successfully.");
      navigate(PAGE_PATHS.performanceTemplateDesign(cloned.id));
    } catch (error) {
      setError("Unable to clone template. Please try again.");
      showPerformanceError(error, "Unable to clone appraisal template.");
    }
  };

  const saveTemplate = async () => {
    if (!draft.jobTitle.trim() || !draft.templateName.trim()) {
      setError("Job title and template name are required.");
      Toast.warning("Job title and template name are required.");
      return;
    }
    try {
      const created = await createPerformanceTemplate({
        jobTitle: draft.jobTitle.trim(),
        templateName: draft.templateName.trim(),
        weight: Number(draft.weight) || 100,
        header: draft.header.trim(),
      });
      setTemplates((current) => [...current, created]);
      setIsAdding(false);
      resetAddDraft();
      Toast.created("Appraisal template");
      navigate(PAGE_PATHS.performanceTemplateDesign(created.id));
    } catch (error) {
      showPerformanceError(error, "Unable to create appraisal template.");
    }
  };

  return (
    <PerformanceLayout title="Performance" activeTab="Templates">
      <div className="min-h-full bg-[#fbf6ff] p-2">
        <div className="rounded-[8px] bg-white p-8">
          <div className="mb-6 flex justify-end">
            <Button onClick={openAddModal}>
              <Plus size={16} />
              Add Appraisal Template
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={templates}
            loading={loading}
            getRowId={(row) => row.id}
            onSelectRow={toggleSelect}
            onSelectAll={() =>
              setSelectedIds(
                selectedIds.length === templates.length
                  ? []
                  : templates.map((row) => row.id),
              )
            }
            actions={(row) => (
              <div className="flex justify-end gap-3">
                <IconButton
                  title="Edit Template"
                  onClick={() =>
                    navigate(PAGE_PATHS.performanceTemplateDesign(row.id))
                  }
                >
                  <Edit size={18} />
                </IconButton>
                <IconButton
                  title="Preview Template"
                  onClick={() => setPreviewTemplate(row)}
                >
                  <FileText size={18} />
                </IconButton>
                <IconButton title="Clone Template" onClick={() => clone(row)}>
                  <Copy size={18} />
                </IconButton>
              </div>
            )}
          />
          {error ? (
            <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>
          ) : null}
        </div>
        {previewTemplate ? (
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
          />
        ) : null}
        {isAdding ? (
          <Modal
            title="Add Appraisal Template"
            onClose={() => {
              setIsAdding(false);
              resetAddDraft();
            }}
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsAdding(false);
                    resetAddDraft();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveTemplate}>Save</Button>
              </>
            }
          >
            <div className="space-y-6">
              <FieldShell label="Job Title*">
                <SoftInput
                  value={draft.jobTitle}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      jobTitle: event.target.value,
                    }))
                  }
                />
              </FieldShell>
              <FieldShell label="Template Name*">
                <SoftInput
                  value={draft.templateName}
                  onChange={(event) =>
                    setDraft((current) => ({
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
                  value={draft.weight}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      weight: event.target.value,
                    }))
                  }
                />
              </FieldShell>
              <div className="block text-sm font-semibold text-slate-500">
                <span className="mb-2 block">Header</span>
                <RichTextEditor
                  value={draft.header}
                  onChange={(header) =>
                    setDraft((current) => ({ ...current, header }))
                  }
                />
                <span className="mt-2 block text-xs font-medium text-slate-400">
                  *Attachment size should be less than{" "}
                  {richTextEditorConfig.maxImageSizeMb}MB
                </span>
              </div>
              {error ? (
                <p className="text-sm font-semibold text-red-500">{error}</p>
              ) : null}
            </div>
          </Modal>
        ) : null}
      </div>
    </PerformanceLayout>
  );
}
