import React, { useEffect, useMemo, useState } from "react";
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
import { EditIcon, DeleteIcon } from "../../components/Icons";
import DataTable, {
  ColumnDef,
  ActionDef,
  StatCard,
} from "../../components/DataTable";
import { inputStyle, labelStyle } from "../../constants/styles";

const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
  { label: "Audit Trail", path: "/hradmin/audit-trail" },
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
  const [categoryToDelete, setCategoryToDelete] = useState<JobCategory | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteJobCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      fetchCategories();
    } catch {
      setPageError("Failed to delete job category. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaved = () => {
    setShowAddModal(false);
    setCategoryToEdit(null);
    fetchCategories();
  };

  const activeCount = categoryList.filter((c) => c.is_active).length;

  const columns: ColumnDef<JobCategory>[] = [
    {
      key: "category",
      header: "Category Name",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
            }}
          >
            {row.category.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>
              {row.category}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
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
          <span
            style={{
              color: "#475569",
              fontSize: 13,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {row.description}
          </span>
        ) : (
          <span
            style={{ color: "#cbd5e1", fontSize: 12.5, fontStyle: "italic" }}
          >
            No description
          </span>
        ),
    },
    {
      key: "is_active",
      header: "Status",
      width: 120,
      render: (row) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 999,
            background: row.is_active ? "#dcfce7" : "#f1f5f9",
            color: row.is_active ? "#16a34a" : "#94a3b8",
            border: `1px solid ${row.is_active ? "#bbf7d0" : "#e2e8f0"}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              flexShrink: 0,
              background: row.is_active ? "#22c55e" : "#cbd5e1",
            }}
          />
          {row.is_active ? "Active" : "Inactive"}
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
      onClick: (row) => setCategoryToDelete(row),
      title: "Delete category",
    },
  ];

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Job Categories">
      {pageError && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 18px",
            background: "linear-gradient(135deg,#fff5f5,#fff)",
            border: "1px solid #fecaca",
            borderLeft: "4px solid #ef4444",
            borderRadius: 12,
            color: "#dc2626",
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(239,68,68,0.08)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠</span>
            {pageError}
          </span>
          <button
            onClick={() => setPageError("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#dc2626",
              fontSize: 18,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <DataTable<JobCategory>
        title="Job Categories"
        subtitle="Manage your organisation's job categories"
        icon=""
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
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
          onError={(m) => setPageError(m)}
        />
      )}
      {categoryToEdit && (
        <JobCategoryFormModal
          mode="edit"
          jobCategory={categoryToEdit}
          onClose={() => setCategoryToEdit(null)}
          onSaved={handleSaved}
          onError={(m) => setPageError(m)}
        />
      )}
      {categoryToDelete && (
        <DeleteConfirmModal
          categoryName={categoryToDelete.category}
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setCategoryToDelete(null)}
        />
      )}
    </Layout>
  );
}


interface JobCategoryFormModalProps {
  mode: "add" | "edit";
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
  const [isActive, setIsActive] = useState(jobCategory?.is_active !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      setFormError("Category name is required.");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "add") {
        await createJobCategory({
          category: categoryName.trim(),
          description: description.trim() || undefined,
        } as CreateJobCategoryPayload);
      } else if (mode === "edit" && jobCategory) {
        await updateJobCategory(jobCategory.id, {
          category: categoryName.trim(),
          description: description.trim() || undefined,
          is_active: isActive,
        } as UpdateJobCategoryPayload);
      }
      onSaved();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        `Failed to ${mode === "add" ? "create" : "update"} job category.`;
      setFormError(msg);
      onError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 500,
          boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 26px 18px",
            background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {mode === "add" ? "➕" : "✏️"}
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {mode === "add" ? "Add Job Category" : "Edit Job Category"}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 2,
                }}
              >
                {mode === "add"
                  ? "Create a new job category"
                  : "Update category details"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "22px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {formError && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderLeft: "4px solid #ef4444",
                borderRadius: 10,
                color: "#dc2626",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⚠ {formError}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>
              Category Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setFormError("");
              }}
              placeholder="e.g. Delivery Team"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#7c3aed")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>
              Description{" "}
              <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>
                (optional)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category…"
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#7c3aed")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>
          {mode === "edit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Status</label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["Active", "Inactive"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIsActive(opt === "Active")}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `2px solid ${isActive === (opt === "Active") ? (opt === "Active" ? "#22c55e" : "#94a3b8") : "#e2e8f0"}`,
                      background:
                        isActive === (opt === "Active")
                          ? opt === "Active"
                            ? "#f0fdf4"
                            : "#f8fafc"
                          : "#fff",
                      color:
                        isActive === (opt === "Active")
                          ? opt === "Active"
                            ? "#16a34a"
                            : "#64748b"
                          : "#94a3b8",
                      fontWeight: 600,
                      fontSize: 13.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: opt === "Active" ? "#22c55e" : "#94a3b8",
                      }}
                    />
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 26px 22px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafbff",
          }}
        >
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            <span style={{ color: "#ef4444" }}>*</span> Required fields
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 22px",
                borderRadius: 10,
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              style={{
                padding: "10px 28px",
                borderRadius: 10,
                border: "none",
                background: isSaving
                  ? "#94a3b8"
                  : "linear-gradient(135deg,#7c3aed,#a78bfa)",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
                boxShadow: isSaving
                  ? "none"
                  : "0 2px 10px rgba(124,58,237,0.25)",
              }}
            >
              {isSaving
                ? "Saving…"
                : mode === "add"
                  ? "Add Category"
                  : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  categoryName: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({
  categoryName,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg,#fff1f2,#fff5f5)",
            borderBottom: "1px solid #fecdd3",
            padding: "24px 28px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#fee2e2,#fecdd3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              fontSize: 26,
              boxShadow: "0 4px 16px rgba(239,68,68,0.2)",
            }}
          >
            🗑
          </div>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: 18,
              fontWeight: 800,
              color: "#1e293b",
            }}
          >
            Delete Job Category
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            This action cannot be undone
          </p>
        </div>
        <div style={{ padding: "20px 28px" }}>
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 14,
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            Are you sure you want to delete{" "}
            <strong
              style={{
                color: "#1e293b",
                background: "#fee2e2",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              "{categoryName}"
            </strong>
            ?
            <br />
            <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
              Employees with this category will keep it, but it won't appear in
              new records.
            </span>
          </div>
        </div>
        <div style={{ padding: "0 28px 24px", display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 10,
              border: "none",
              background: isLoading
                ? "#94a3b8"
                : "linear-gradient(135deg,#dc2626,#e11d48)",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              boxShadow: isLoading ? "none" : "0 2px 10px rgba(220,38,38,0.3)",
            }}
          >
            {isLoading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
