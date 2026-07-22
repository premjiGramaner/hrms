import { useEffect, useMemo, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  getJobCategories,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  JobCategory,
  CreateJobCategoryPayload,
  UpdateJobCategoryPayload,
} from "../../api/hradmin.api";
import useDebounce from "../../hooks/useDebounce";
import {
  EditIcon,
  DeleteIcon,
  IconPlusCircle,
  IconEdit,
  IconGrid,
  IconAlertCircle,
  IconX,
} from "../../components/Icons";
import DataTable, { ColumnDef, ActionDef } from "../../components/DataTable";
import Toast from "../../utils/toast";
import Alert from "../../utils/alert";
import Button from "../../components/common/Button";
import { PAGE_PATHS } from "../../config/roles";

enum FormMode {
  ADD = "add",
  EDIT = "edit",
}

const TABS: TabItem[] = [
  { label: "Job Titles", path: PAGE_PATHS.hradminJobTitles },
  { label: "Job Categories", path: PAGE_PATHS.hradminJobCategories },
  { label: "Sub Units", path: PAGE_PATHS.hradminSubUnits },
  { label: "Role Access", path: PAGE_PATHS.hradminRoleAccess },
  { label: "Audit Trail", path: PAGE_PATHS.hradminAuditTrail },
];

export default function JobCategoriesPage() {
  const [categoryList, setCategoryList] = useState<JobCategory[]>([]);
  const [filteredList, setFilteredList] = useState<JobCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<JobCategory | null>(
    null,
  );
  const [pageError, setPageError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchCategories = () => {
    setIsLoading(true);
    getJobCategories()
      .then((res) => {
        setCategoryList(res.data);
        setFilteredList(res.data);
        setSearchQuery("");
      })
      .catch(() =>
        setPageError("Failed to load job categories. Please refresh."),
      )
      .finally(() => setIsLoading(false));
  };
  useEffect(fetchCategories, []);

  const debouncedFilter = useDebounce((value: string) => {
    const term = value.toLowerCase();
    setFilteredList(
      categoryList.filter(
        (category) =>
          category.category.toLowerCase().includes(term) ||
          (category.description || "").toLowerCase().includes(term),
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

  const handleDeleteConfirm = async (category: JobCategory) => {
    const confirmed = await Alert.confirmDelete(category.category);
    if (!confirmed) return;

    try {
      await deleteJobCategory(category.id);
      Toast.deleted("Job Category");
      fetchCategories();
    } catch {
      Toast.error("Failed to delete job category. Please try again.");
    }
  };

  const handleSaved = () => {
    setShowAddModal(false);
    setCategoryToEdit(null);
    fetchCategories();
  };

  const columns: ColumnDef<JobCategory>[] = [
    {
      key: "category",
      header: "Category Name",
      render: (row) => (
        <div className="flex items-center gap-[10px]">
          <div className="w-9 h-9 rounded-[10px] flex-shrink-0 bg-gradient-to-br from-[#172554] to-[#14b8a6] flex items-center justify-center text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(27,42,107,0.2)]">
            {row.category.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-[14px]">
              {row.category}
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

  const actions: ActionDef<JobCategory>[] = [
    {
      label: "Edit",
      icon: EditIcon,
      color: "#1b2a6b",
      bg: "#eff6ff",
      bgHover: "#dbeafe",
      borderColor: "#bfdbfe",
      borderColorHover: "#93c5fd",
      onClick: (row) => setCategoryToEdit(row),
      title: "Edit category",
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
      title: "Delete category",
    },
  ];

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Job Categories">
      {pageError && (
        <div className="mb-4 p-3 px-[18px] bg-gradient-to-br from-red-50 to-white border border-red-200 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] flex items-center justify-between shadow-[0_2px_8px_rgba(239,68,68,0.08)]">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={16} />
            {pageError}
          </span>
          <button
            onClick={() => setPageError("")}
            className="bg-transparent border-0 cursor-pointer text-red-600 text-lg p-0 hover:opacity-70 transition-opacity"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      <DataTable<JobCategory>
        title="Job Categories"
        subtitle="Manage your organisation's job categories"
        icon={<IconGrid />}
        rows={pagedList}
        isLoading={isLoading}
        columns={columns}
        actions={actions}
        getKey={(row) => row.id}
        emptyIcon=""
        emptyTitle={
          searchQuery
            ? `No results for "${searchQuery}"`
            : "No job categories yet"
        }
        emptySubtitle={
          searchQuery
            ? "Try a different search term"
            : "Click 'Add Job Category' to create one"
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
        itemLabel="categories"
        searchQuery={searchQuery}
        searchPlaceholder="Search categories or description…"
        onSearchChange={handleSearchChange}
        addLabel="Add Job Category"
        onAdd={() => setShowAddModal(true)}
      />

      {showAddModal && (
        <JobCategoryFormModal
          mode={FormMode.ADD}
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
          onError={(m) => setPageError(m)}
        />
      )}
      {categoryToEdit && (
        <JobCategoryFormModal
          mode={FormMode.EDIT}
          jobCategory={categoryToEdit}
          onClose={() => setCategoryToEdit(null)}
          onSaved={handleSaved}
          onError={(m) => setPageError(m)}
        />
      )}
    </Layout>
  );
}

interface JobCategoryFormModalProps {
  mode: FormMode;
  jobCategory?: JobCategory;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

function JobCategoryFormModal({
  mode,
  jobCategory,
  onClose,
  onSaved,
  onError,
}: JobCategoryFormModalProps) {
  const [categoryName, setCategoryName] = useState(jobCategory?.category || "");
  const [description, setDescription] = useState(
    jobCategory?.description || "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      setFormError("Category name is required.");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === FormMode.ADD) {
        await createJobCategory({
          category: categoryName.trim(),
          description: description.trim() || undefined,
        } as CreateJobCategoryPayload);
        Toast.created("Job Category");
      } else if (mode === FormMode.EDIT && jobCategory) {
        await updateJobCategory(jobCategory.id, {
          category: categoryName.trim(),
          description: description.trim() || undefined,
        } as UpdateJobCategoryPayload);
        Toast.updated("Job Category");
      }
      onSaved();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        `Failed to ${mode === FormMode.ADD ? "create" : "update"} job category.`;
      setFormError(msg);
      onError(msg);
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
        {/* Header */}
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
                {isAddMode ? "Add Job Category" : "Edit Job Category"}
              </h2>
              <p className="m-0 text-xs text-white/70 mt-[2px]">
                {isAddMode
                  ? "Create a new job category"
                  : "Update category details"}
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
            <label className="text-[12.5px] font-semibold text-gray-600">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              value={categoryName}
              onChange={(event) => {
                setCategoryName(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. Delivery Team"
              className="w-full p-[10px_12px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white box-border focus:border-[#172554] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-gray-600">
              Description{" "}
              <span className="text-[11px] font-normal text-slate-400">
                (optional)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief description of this category…"
              rows={3}
              className="w-full p-[10px_12px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white box-border resize-y font-[inherit] focus:border-[#172554] transition-colors"
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
              {isAddMode ? "Add Category" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
