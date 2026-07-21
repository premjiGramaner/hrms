import { useEffect, useMemo, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  getJobTitles,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle,
  JobTitle,
  CreateJobTitlePayload,
  UpdateJobTitlePayload,
} from "../../api/hradmin.api";
import {
  EditIcon,
  DeleteIcon,
  IconPlusCircle,
  IconEdit,
  IconBriefcase,
  IconAlertCircle,
  IconX,
} from "../../components/Icons";
import useDebounce from "../../hooks/useDebounce";
import DataTable, { ColumnDef, ActionDef } from "../../components/DataTable";
import Toast from "../../utils/toast";
import Alert from "../../utils/alert";
import Button from "../../components/common/Button";

enum FormMode {
  ADD = "add",
  EDIT = "edit",
}

const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
  { label: "Role Access", path: "/hradmin/role-access" },
  { label: "Audit Trail", path: "/hradmin/audit-trail" },
];

export default function JobTitlesPage() {
  const [jobTitleList, setJobTitleList] = useState<JobTitle[]>([]);
  const [filteredList, setFilteredList] = useState<JobTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [titleToEdit, setTitleToEdit] = useState<JobTitle | null>(null);
  const [pageError, setPageError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchJobTitles = () => {
    setIsLoading(true);
    getJobTitles()
      .then((res) => {
        setJobTitleList(res.data);
        setFilteredList(res.data);
        setSearchQuery("");
      })
      .catch(() => setPageError("Failed to load job titles. Please refresh."))
      .finally(() => setIsLoading(false));
  };
  useEffect(fetchJobTitles, []);

  const debouncedFilter = useDebounce((value: string) => {
    const term = value.toLowerCase();
    setFilteredList(
      jobTitleList.filter(
        (jt) =>
          jt.title.toLowerCase().includes(term) ||
          (jt.description || "").toLowerCase().includes(term),
      ),
    );
    setCurrentPage(1);
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedFilter(value);
  };

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleDeleteConfirm = async (title: JobTitle) => {
    const confirmed = await Alert.confirmDelete(title.title);
    if (!confirmed) return;

    try {
      await deleteJobTitle(title.id);
      Toast.deleted("Job Title");
      fetchJobTitles();
    } catch {
      Toast.error("Failed to delete job title. Please try again.");
    }
  };
  const handleSaved = () => {
    setShowAddModal(false);
    setTitleToEdit(null);
    fetchJobTitles();
  };

  const columns: ColumnDef<JobTitle>[] = [
    {
      key: "title",
      header: "Job Title",
      render: (row) => (
        <div className="flex items-center gap-[10px]">
          <div className="w-9 h-9 rounded-[10px] flex-shrink-0 bg-gradient-to-br from-[#1b2a6b] to-[#16a085] flex items-center justify-center text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(27,42,107,0.18)]">
            {row.title.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-[14px]">
              {row.title}
            </div>
            <div className="text-[11px] text-slate-400 mt-[1px]">
              ID #{row.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) =>
        row.description ? (
          <span className="text-slate-600 text-[13px] line-clamp-2">
            {row.description}
          </span>
        ) : (
          <span className="text-slate-300 text-[12.5px] italic">
            No description
          </span>
        ),
    },
  ];

  const actions: ActionDef<JobTitle>[] = [
    {
      label: "Edit",
      icon: EditIcon,
      color: "#1b2a6b",
      bg: "#eff6ff",
      bgHover: "#dbeafe",
      borderColor: "#bfdbfe",
      borderColorHover: "#93c5fd",
      onClick: (row) => setTitleToEdit(row),
      title: "Edit job title",
    },
    {
      label: "Delete",
      icon: DeleteIcon,
      color: "#e11d48",
      bg: "#fff1f2",
      bgHover: "#ffe4e6",
      borderColor: "#fecdd3",
      borderColorHover: "#fda4af",
      onClick: (row) => handleDeleteConfirm(row),
      title: "Delete job title",
    },
  ];

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Job Titles">
      {pageError && (
        <div className="mb-4 p-3 px-[18px] bg-gradient-to-br from-red-50 to-white border border-red-200 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] flex items-center justify-between shadow-[0_2px_8px_rgba(239,68,68,0.08)]">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={16} />
            {pageError}
          </span>
          <button
            onClick={() => setPageError("")}
            className="bg-transparent border-0 cursor-pointer text-red-600 text-lg p-0 leading-none hover:opacity-70 transition-opacity"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      <DataTable<JobTitle>
        title="Job Titles"
        subtitle="Manage your organisation's job titles"
        icon={<IconBriefcase />}
        rows={pagedList}
        isLoading={isLoading}
        columns={columns}
        actions={actions}
        getKey={(row) => row.id}
        emptyTitle={
          searchQuery ? `No results for "${searchQuery}"` : "No job titles yet"
        }
        emptySubtitle={
          searchQuery
            ? "Try a different search term"
            : "Click 'Add Job Title' to create one"
        }
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={filteredList.length}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
        itemLabel="titles"
        searchQuery={searchQuery}
        searchPlaceholder="Search job titles or description…"
        onSearchChange={handleSearchChange}
        addLabel="Add Job Title"
        onAdd={() => setShowAddModal(true)}
      />
      {showAddModal && (
        <JobTitleFormModal
          mode={FormMode.ADD}
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
          onError={(message) => setPageError(message)}
        />
      )}
      {titleToEdit && (
        <JobTitleFormModal
          mode={FormMode.EDIT}
          jobTitle={titleToEdit}
          onClose={() => setTitleToEdit(null)}
          onSaved={handleSaved}
          onError={(message) => setPageError(message)}
        />
      )}
    </Layout>
  );
}

interface JobTitleFormModalProps {
  mode: FormMode;
  jobTitle?: JobTitle;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

function JobTitleFormModal({
  mode,
  jobTitle,
  onClose,
  onSaved,
  onError,
}: JobTitleFormModalProps) {
  const [titleName, setTitleName] = useState(jobTitle?.title || "");
  const [description, setDescription] = useState(jobTitle?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    if (!titleName.trim()) {
      setFormError("Job title name is required.");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === FormMode.ADD) {
        await createJobTitle({
          title: titleName.trim(),
          description: description.trim() || undefined,
        } as CreateJobTitlePayload);
        Toast.created("Job Title");
      } else if (mode === FormMode.EDIT && jobTitle) {
        await updateJobTitle(jobTitle.id, {
          title: titleName.trim(),
          description: description.trim() || undefined,
        } as UpdateJobTitlePayload);
        Toast.updated("Job Title");
      }
      onSaved();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        `Failed to ${mode === FormMode.ADD ? "create" : "update"} job title.`;
      setFormError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const isAddMode = mode === FormMode.ADD;

  return (
    <div
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
    >
      <div className="bg-white rounded-[20px] w-full max-w-[500px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] overflow-hidden">
        <div className="p-[22px_26px_18px] bg-gradient-to-br from-[#172554] to-[#14b8a6] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="w-9 h-9 rounded-[10px] bg-white/18 flex items-center justify-center">
              {isAddMode ? (
                <IconPlusCircle size={18} color="#fff" />
              ) : (
                <IconEdit size={18} color="#fff" />
              )}
            </div>
            <div>
              <h2 className="m-0 text-[17px] font-bold text-white">
                {isAddMode ? "Add Job Title" : "Edit Job Title"}
              </h2>
              <p className="m-0 text-xs text-white/70 mt-[2px]">
                {isAddMode
                  ? "Create a new job title"
                  : "Update job title details"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/18 border-0 cursor-pointer text-base text-white flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <IconX size={16} color="#fff" />
          </button>
        </div>

        <div className="p-[22px_26px] flex flex-col gap-4">
          {formError && (
            <div className="p-[10px_14px] bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-[10px] text-red-600 text-[13px] flex items-center gap-2">
              <IconAlertCircle size={14} color="#dc2626" />
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-gray-700">
              Job Title Name <span className="text-red-500">*</span>
            </label>
            <input
              value={titleName}
              onChange={(event) => {
                setTitleName(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. Software Engineer"
              className="p-[11px_14px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white transition-colors focus:border-[#1b2a6b]"
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-gray-700">
              Description{" "}
              <span className="text-[11px] font-normal text-slate-400">
                (optional)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief description of this role…"
              rows={3}
              className="p-[11px_14px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white resize-y font-[inherit] transition-colors focus:border-[#1b2a6b]"
            />
          </div>
        </div>

        <div className="p-[16px_26px_22px] border-t border-slate-100 flex items-center justify-between bg-[#fafbff]">
          <span className="text-xs text-slate-400">
            <span className="text-red-500">*</span> Required fields
          </span>
          <div className="flex gap-[10px]">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSaving}
              loading={isSaving}
            >
              {isAddMode ? "Add Title" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
