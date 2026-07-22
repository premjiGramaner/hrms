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
import { ERROR_MESSAGES } from "../../constants/messages";

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
] as const;

const PAGE_CONFIG = {
  TITLE: "Job Categories",
  SUBTITLE: "Manage your organisation's job categories",
  ADD_BUTTON_LABEL: "Add Job Category",
  ITEM_LABEL: "categories",
  INITIAL_PAGE_SIZE: 10,
} as const;

const SEARCH_CONFIG = {
  PLACEHOLDER: "Search categories or description…",
  DEBOUNCE_DELAY: 300,
} as const;

const EMPTY_STATE = {
  NO_CATEGORIES_TITLE: "No job categories yet",
  NO_CATEGORIES_SUBTITLE: "Click 'Add Job Category' to create one",
  NO_RESULTS_TITLE: (query: string) => `No results for "${query}"`,
  NO_RESULTS_SUBTITLE: "Try a different search term",
} as const;

const COLUMN_CONFIG = {
  CATEGORY_NAME: "Category Name",
  DESCRIPTION: "Description",
  NO_DESCRIPTION: "No description",
  ID_PREFIX: "ID #",
} as const;

const ACTION_CONFIG = {
  EDIT: {
    LABEL: "Edit",
    TITLE: "Edit category",
    COLOR: "#1b2a6b",
    BG: "#eff6ff",
    BG_HOVER: "#dbeafe",
    BORDER: "#bfdbfe",
    BORDER_HOVER: "#93c5fd",
  },
  DELETE: {
    LABEL: "Delete",
    TITLE: "Delete category",
    COLOR: "#e11d48",
    BG: "#fff1f2",
    BG_HOVER: "#ffe4e6",
    BORDER: "#fecdd3",
    BORDER_HOVER: "#fda4af",
  },
} as const;

// Modal configuration
const MODAL_CONFIG = {
  ADD_TITLE: "Add Job Category",
  ADD_SUBTITLE: "Create a new job category",
  EDIT_TITLE: "Edit Job Category",
  EDIT_SUBTITLE: "Update category details",
  CATEGORY_LABEL: "Category Name",
  DESCRIPTION_LABEL: "Description",
  DESCRIPTION_OPTIONAL: "(optional)",
  CATEGORY_PLACEHOLDER: "e.g. Delivery Team",
  DESCRIPTION_PLACEHOLDER: "Brief description of this category…",
  REQUIRED_INDICATOR: "Required fields",
  CANCEL_BUTTON: "Cancel",
  ADD_BUTTON: "Add Category",
  SAVE_BUTTON: "Save Changes",
  DESCRIPTION_ROWS: 3,
} as const;

// Validation messages
const VALIDATION_MESSAGES = {
  CATEGORY_REQUIRED: "Category name is required.",
} as const;

// Toast messages
const TOAST_MESSAGES = {
  CREATED: "Job Category",
  UPDATED: "Job Category",
  DELETED: "Job Category",
  DELETE_FAILED: "Failed to delete job category. Please try again.",
} as const;

// Avatar styling
const AVATAR_CONFIG = {
  SIZE: "w-9 h-9",
  BORDER_RADIUS: "rounded-[10px]",
  GRADIENT: "bg-gradient-to-br from-[#172554] to-[#14b8a6]",
  TEXT_SIZE: "text-[13px]",
  SHADOW: "shadow-[0_2px_8px_rgba(27,42,107,0.2)]",
} as const;

// Get first character uppercase
function getFirstCharUppercase(text: string): string {
  return text.charAt(0).toUpperCase();
}

// Check if category matches search term
function categoryMatchesSearch(category: JobCategory, term: string): boolean {
  if (!term) return true;
  
  const lowerTerm = term.toLowerCase();
  const categoryName = category.category.toLowerCase();
  const categoryDescription = (category.description || "").toLowerCase();
  
  return categoryName.includes(lowerTerm) || categoryDescription.includes(lowerTerm);
}

// Filter categories by search term
function filterCategoriesBySearch(
  categories: JobCategory[],
  searchTerm: string,
): JobCategory[] {
  return categories.filter((category) =>
    categoryMatchesSearch(category, searchTerm),
  );
}

// Calculate total pages
function calculateTotalPages(totalRecords: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalRecords / pageSize));
}

// Paginate categories
function paginateCategories(
  categories: JobCategory[],
  currentPage: number,
  pageSize: number,
): JobCategory[] {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return categories.slice(startIndex, endIndex);
}

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
  const [pageSize, setPageSize] = useState<number>(PAGE_CONFIG.INITIAL_PAGE_SIZE);

  // Handle successful categories fetch
  const handleFetchSuccess = (response: { data: JobCategory[] }) => {
    setCategoryList(response.data);
    setFilteredList(response.data);
    setSearchQuery("");
  };

  // Handle categories fetch error
  const handleFetchError = () => {
    setPageError(ERROR_MESSAGES.LOAD_JOB_CATEGORIES_FAILED);
  };

  // Handle categories fetch complete
  const handleFetchComplete = () => {
    setIsLoading(false);
  };

  // Fetch categories from API
  const fetchCategories = () => {
    setIsLoading(true);
    getJobCategories()
      .then(handleFetchSuccess)
      .catch(handleFetchError)
      .finally(handleFetchComplete);
  };

  useEffect(fetchCategories, []);

  // Handle debounced filter
  const handleDebouncedFilter = (value: string) => {
    const filtered = filterCategoriesBySearch(categoryList, value);
    setFilteredList(filtered);
    setCurrentPage(1);
  };

  const debouncedFilter = useDebounce(
    handleDebouncedFilter,
    SEARCH_CONFIG.DEBOUNCE_DELAY,
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedFilter(value);
  };

  const totalPages = calculateTotalPages(filteredList.length, pageSize);
  
  const pagedList = useMemo(() => {
    return paginateCategories(filteredList, currentPage, pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Handle delete success
  const handleDeleteSuccess = () => {
    Toast.deleted(TOAST_MESSAGES.DELETED);
    fetchCategories();
  };

  // Handle delete error
  const handleDeleteError = () => {
    Toast.error(TOAST_MESSAGES.DELETE_FAILED);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async (category: JobCategory) => {
    const confirmed = await Alert.confirmDelete(category.category);
    if (!confirmed) return;

    try {
      await deleteJobCategory(category.id);
      handleDeleteSuccess();
    } catch {
      handleDeleteError();
    }
  };

  const handleSaved = () => {
    setShowAddModal(false);
    setCategoryToEdit(null);
    fetchCategories();
  };

  // Render category avatar
  const renderCategoryAvatar = (categoryName: string) => (
    <div
      className={`${AVATAR_CONFIG.SIZE} ${AVATAR_CONFIG.BORDER_RADIUS} flex-shrink-0 ${AVATAR_CONFIG.GRADIENT} flex items-center justify-center text-white ${AVATAR_CONFIG.TEXT_SIZE} font-bold ${AVATAR_CONFIG.SHADOW}`}
    >
      {getFirstCharUppercase(categoryName)}
    </div>
  );

  // Render category name column
  const renderCategoryNameColumn = (row: JobCategory) => (
    <div className="flex items-center gap-[10px]">
      {renderCategoryAvatar(row.category)}
      <div>
        <div className="font-bold text-slate-800 text-[14px]">
          {row.category}
        </div>
        <div className="text-[11px] text-slate-400 mt-[1px]">
          {COLUMN_CONFIG.ID_PREFIX}
          {row.id}
        </div>
      </div>
    </div>
  );

  // Render description column
  const renderDescriptionColumn = (row: JobCategory) => {
    if (row.description) {
      return (
        <span className="text-slate-600 text-[13px] line-clamp-2">
          {row.description}
        </span>
      );
    }
    return (
      <span className="text-slate-300 text-[12.5px] italic">
        {COLUMN_CONFIG.NO_DESCRIPTION}
      </span>
    );
  };

  const columns: ColumnDef<JobCategory>[] = [
    {
      key: "category",
      header: COLUMN_CONFIG.CATEGORY_NAME,
      render: renderCategoryNameColumn,
    },
    {
      key: "description",
      header: COLUMN_CONFIG.DESCRIPTION,
      render: renderDescriptionColumn,
    },
  ];

  // Handle edit action
  const handleEdit = (row: JobCategory) => {
    setCategoryToEdit(row);
  };

  const actions: ActionDef<JobCategory>[] = [
    {
      label: ACTION_CONFIG.EDIT.LABEL,
      icon: EditIcon,
      color: ACTION_CONFIG.EDIT.COLOR,
      bg: ACTION_CONFIG.EDIT.BG,
      bgHover: ACTION_CONFIG.EDIT.BG_HOVER,
      borderColor: ACTION_CONFIG.EDIT.BORDER,
      borderColorHover: ACTION_CONFIG.EDIT.BORDER_HOVER,
      onClick: handleEdit,
      title: ACTION_CONFIG.EDIT.TITLE,
    },
    {
      label: ACTION_CONFIG.DELETE.LABEL,
      icon: DeleteIcon,
      color: ACTION_CONFIG.DELETE.COLOR,
      bg: ACTION_CONFIG.DELETE.BG,
      bgHover: ACTION_CONFIG.DELETE.BG_HOVER,
      borderColor: ACTION_CONFIG.DELETE.BORDER,
      borderColorHover: ACTION_CONFIG.DELETE.BORDER_HOVER,
      onClick: handleDeleteConfirm,
      title: ACTION_CONFIG.DELETE.TITLE,
    },
  ];

  // Clear page error
  const handleClearPageError = () => {
    setPageError("");
  };

  // Open add modal
  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  // Close add modal
  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setCategoryToEdit(null);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Get row key
  const getRowKey = (row: JobCategory): number => row.id;

  // Get empty title
  const getEmptyTitle = (): string => {
    return searchQuery
      ? EMPTY_STATE.NO_RESULTS_TITLE(searchQuery)
      : EMPTY_STATE.NO_CATEGORIES_TITLE;
  };

  // Get empty subtitle
  const getEmptySubtitle = (): string => {
    return searchQuery
      ? EMPTY_STATE.NO_RESULTS_SUBTITLE
      : EMPTY_STATE.NO_CATEGORIES_SUBTITLE;
  };

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Job Categories">
      {pageError && (
        <div className="mb-4 p-3 px-[18px] bg-gradient-to-br from-red-50 to-white border border-red-200 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] flex items-center justify-between shadow-[0_2px_8px_rgba(239,68,68,0.08)]">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={16} />
            {pageError}
          </span>
          <button
            onClick={handleClearPageError}
            className="bg-transparent border-0 cursor-pointer text-red-600 text-lg p-0 hover:opacity-70 transition-opacity"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      <DataTable<JobCategory>
        title={PAGE_CONFIG.TITLE}
        subtitle={PAGE_CONFIG.SUBTITLE}
        icon={<IconGrid />}
        rows={pagedList}
        isLoading={isLoading}
        columns={columns}
        actions={actions}
        getKey={getRowKey}
        emptyIcon=""
        emptyTitle={getEmptyTitle()}
        emptySubtitle={getEmptySubtitle()}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={filteredList.length}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        itemLabel={PAGE_CONFIG.ITEM_LABEL}
        searchQuery={searchQuery}
        searchPlaceholder={SEARCH_CONFIG.PLACEHOLDER}
        onSearchChange={handleSearchChange}
        addLabel={PAGE_CONFIG.ADD_BUTTON_LABEL}
        onAdd={handleOpenAddModal}
      />

      {showAddModal && (
        <JobCategoryFormModal
          mode={FormMode.ADD}
          onClose={handleCloseAddModal}
          onSaved={handleSaved}
          onError={setPageError}
        />
      )}
      {categoryToEdit && (
        <JobCategoryFormModal
          mode={FormMode.EDIT}
          jobCategory={categoryToEdit}
          onClose={handleCloseEditModal}
          onSaved={handleSaved}
          onError={setPageError}
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

  const isAddMode = mode === FormMode.ADD;

  // Validate form
  const validateForm = (): boolean => {
    if (!categoryName.trim()) {
      setFormError(VALIDATION_MESSAGES.CATEGORY_REQUIRED);
      return false;
    }
    return true;
  };

  // Trim form data
  const getTrimmedFormData = (): {
    category: string;
    description: string | undefined;
  } => {
    return {
      category: categoryName.trim(),
      description: description.trim() || undefined,
    };
  };

  // Handle add category success
  const handleAddSuccess = () => {
    Toast.created(TOAST_MESSAGES.CREATED);
    onSaved();
  };

  // Handle update category success
  const handleUpdateSuccess = () => {
    Toast.updated(TOAST_MESSAGES.UPDATED);
    onSaved();
  };

  // Handle submit error
  const handleSubmitError = (error: any) => {
    const errorMessage =
      error?.response?.data?.message ||
      ERROR_MESSAGES.SAVE_FAILED(
        isAddMode ? "create" : "update",
        "job category",
      );
    setFormError(errorMessage);
    onError(errorMessage);
  };

  // Handle submit complete
  const handleSubmitComplete = () => {
    setIsSaving(false);
  };

  // Create new category
  const createCategory = async (payload: CreateJobCategoryPayload) => {
    await createJobCategory(payload);
    handleAddSuccess();
  };

  // Update existing category
  const updateCategory = async (
    categoryId: number,
    payload: UpdateJobCategoryPayload,
  ) => {
    await updateJobCategory(categoryId, payload);
    handleUpdateSuccess();
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const formData = getTrimmedFormData();
    setIsSaving(true);

    try {
      if (isAddMode) {
        await createCategory(formData as CreateJobCategoryPayload);
      } else if (jobCategory) {
        await updateCategory(
          jobCategory.id,
          formData as UpdateJobCategoryPayload,
        );
      }
    } catch (error) {
      handleSubmitError(error);
    } finally {
      handleSubmitComplete();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Handle category name change
  const handleCategoryNameChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCategoryName(event.target.value);
    setFormError("");
  };

  // Handle description change
  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setDescription(event.target.value);
  };

  // Get modal title
  const getModalTitle = (): string => {
    return isAddMode ? MODAL_CONFIG.ADD_TITLE : MODAL_CONFIG.EDIT_TITLE;
  };

  // Get modal subtitle
  const getModalSubtitle = (): string => {
    return isAddMode ? MODAL_CONFIG.ADD_SUBTITLE : MODAL_CONFIG.EDIT_SUBTITLE;
  };

  // Get submit button label
  const getSubmitButtonLabel = (): string => {
    return isAddMode ? MODAL_CONFIG.ADD_BUTTON : MODAL_CONFIG.SAVE_BUTTON;
  };

  // Render modal icon
  const renderModalIcon = () => {
    if (isAddMode) {
      return <IconPlusCircle size={18} color="#fff" />;
    }
    return <IconEdit size={18} color="#fff" />;
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
    >
      <div className="bg-white rounded-[20px] w-full max-w-[500px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] overflow-hidden">
        {/* Header */}
        <div className="p-[22px_26px_18px] bg-gradient-to-br from-[#172554] to-[#14b8a6] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="w-9 h-9 rounded-[10px] bg-white/18 flex items-center justify-center">
              {renderModalIcon()}
            </div>
            <div>
              <h2 className="m-0 text-[17px] font-bold text-white">
                {getModalTitle()}
              </h2>
              <p className="m-0 text-xs text-white/70 mt-[2px]">
                {getModalSubtitle()}
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
              {MODAL_CONFIG.CATEGORY_LABEL}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              value={categoryName}
              onChange={handleCategoryNameChange}
              placeholder={MODAL_CONFIG.CATEGORY_PLACEHOLDER}
              className="w-full p-[10px_12px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white box-border focus:border-[#172554] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-gray-600">
              {MODAL_CONFIG.DESCRIPTION_LABEL}{" "}
              <span className="text-[11px] font-normal text-slate-400">
                {MODAL_CONFIG.DESCRIPTION_OPTIONAL}
              </span>
            </label>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              placeholder={MODAL_CONFIG.DESCRIPTION_PLACEHOLDER}
              rows={MODAL_CONFIG.DESCRIPTION_ROWS}
              className="w-full p-[10px_12px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white box-border resize-y font-[inherit] focus:border-[#172554] transition-colors"
            />
          </div>
        </div>

        <div className="p-[16px_26px_22px] border-t border-slate-100 flex items-center justify-between bg-[#fafbff]">
          <span className="text-xs text-slate-400">
            <span className="text-red-500">*</span>{" "}
            {MODAL_CONFIG.REQUIRED_INDICATOR}
          </span>
          <div className="flex gap-[10px]">
            <Button variant="secondary" onClick={onClose}>
              {MODAL_CONFIG.CANCEL_BUTTON}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSaving}
              loading={isSaving}
            >
              {getSubmitButtonLabel()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
