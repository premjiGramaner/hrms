import React, { useEffect, useMemo, useState } from "react";
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
import useDebounce from "../../hooks/useDebounce";
import DataTable, {
  ColumnDef,
  ActionDef,
  StatCard,
  EditIcon,
  DeleteIcon,
} from "../../components/DataTable";

const TABS: TabItem[] = [
  { label: "Job Titles",     path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units",      path: "/hradmin/sub-units" },
  { label: "Audit Trail",    path: "/hradmin/audit-trail" },
];

export default function JobTitlesPage() {
  const [jobTitleList, setJobTitleList] = useState<JobTitle[]>([]);
  const [filteredList, setFilteredList] = useState<JobTitle[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [searchQuery, setSearchQuery]   = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [titleToEdit, setTitleToEdit]   = useState<JobTitle | null>(null);
  const [titleToDelete, setTitleToDelete] = useState<JobTitle | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [pageError, setPageError]       = useState("");
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(10);

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
  const pagedList  = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  /* ── CRUD handlers ── */
  const handleDeleteConfirm = async () => {
    if (!titleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteJobTitle(titleToDelete.id);
      setTitleToDelete(null);
      fetchJobTitles();
    } catch {
      setPageError("Failed to delete job title. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
  const handleSaved = () => {
    setShowAddModal(false);
    setTitleToEdit(null);
    fetchJobTitles();
  };

  const activeCount = jobTitleList.filter((j) => j.is_active).length;

  const stats: StatCard[] = [
    { label: "Total Titles", value: jobTitleList.length, icon: "🏷️", color: "#1b2a6b", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Active",       value: activeCount,          icon: "✅",  color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  ];

  const columns: ColumnDef<JobTitle>[] = [
    {
      key: "title",
      header: "Job Title",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#1b2a6b,#16a085)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 700,
            boxShadow: "0 2px 8px rgba(27,42,107,0.18)",
          }}>
            {row.title.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{row.title}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>ID #{row.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) =>
        row.description ? (
          <span style={{
            color: "#475569", fontSize: 13,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}>
            {row.description}
          </span>
        ) : (
          <span style={{ color: "#cbd5e1", fontSize: 12.5, fontStyle: "italic" }}>
            No description
          </span>
        ),
    },
    {
      key: "is_active",
      header: "Status",
      width: 120,
      render: (row) => (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 12, fontWeight: 600, padding: "4px 12px",
          borderRadius: 999,
          background: row.is_active ? "#dcfce7" : "#f1f5f9",
          color:      row.is_active ? "#16a34a" : "#94a3b8",
          border:    `1px solid ${row.is_active ? "#bbf7d0" : "#e2e8f0"}`,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: row.is_active ? "#22c55e" : "#cbd5e1",
          }}/>
          {row.is_active ? "Active" : "Inactive"}
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
      onClick: (row) => setTitleToDelete(row),
      title: "Delete job title",
    },
  ];

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Job Titles">
      {pageError && (
        <div style={{
          marginBottom: 16, padding: "12px 18px",
          background: "linear-gradient(135deg,#fff5f5,#fff)",
          border: "1px solid #fecaca", borderLeft: "4px solid #ef4444",
          borderRadius: 12, color: "#dc2626", fontSize: 13.5,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(239,68,68,0.08)",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠</span>{pageError}
          </span>
          <button onClick={() => setPageError("")} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#dc2626", fontSize: 18, padding: 0, lineHeight: 1,
          }}>✕</button>
        </div>
      )}

      <DataTable<JobTitle>
        title="Job Titles"
        subtitle="Manage your organisation's job titles"
        rows={pagedList}
        isLoading={isLoading}
        columns={columns}
        actions={actions}
        getKey={(row) => row.id}        emptyTitle={searchQuery ? `No results for "${searchQuery}"` : "No job titles yet"}
        emptySubtitle={searchQuery ? "Try a different search term" : "Click 'Add Job Title' to create one"}
        stats={stats}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={filteredList.length}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
        itemLabel="titles"
        searchQuery={searchQuery}
        searchPlaceholder="Search job titles or description…"
        onSearchChange={handleSearchChange}
        addLabel="Add Job Title"
        onAdd={() => setShowAddModal(true)}
      />

      {/* Modals */}
      {showAddModal && (
        <JobTitleFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
          onError={(msg) => setPageError(msg)}
        />
      )}
      {titleToEdit && (
        <JobTitleFormModal
          mode="edit"
          jobTitle={titleToEdit}
          onClose={() => setTitleToEdit(null)}
          onSaved={handleSaved}
          onError={(msg) => setPageError(msg)}
        />
      )}
      {titleToDelete && (
        <DeleteConfirmModal
          titleName={titleToDelete.title}
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setTitleToDelete(null)}
        />
      )}
    </Layout>
  );
}

interface JobTitleFormModalProps {
  mode: "add" | "edit";
  jobTitle?: JobTitle;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

function JobTitleFormModal({ mode, jobTitle, onClose, onSaved, onError }: JobTitleFormModalProps) {
  const [title, setTitle]             = useState(jobTitle?.title || "");
  const [description, setDescription] = useState(jobTitle?.description || "");
  const [isActive, setIsActive]       = useState(jobTitle?.is_active !== false);
  const [isSaving, setIsSaving]       = useState(false);
  const [formError, setFormError]     = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) { setFormError("Job title name is required."); return; }
    setIsSaving(true);
    try {
      if (mode === "add") {
        await createJobTitle({ title: title.trim(), description: description.trim() || undefined } as CreateJobTitlePayload);
      } else if (mode === "edit" && jobTitle) {
        await updateJobTitle(jobTitle.id, { title: title.trim(), description: description.trim() || undefined, is_active: isActive } as UpdateJobTitlePayload);
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message || `Failed to ${mode === "add" ? "create" : "update"} job title.`;
      setFormError(msg); onError(msg);
    } finally { setIsSaving(false); }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500,
        boxShadow: "0 24px 80px rgba(0,0,0,0.22)", overflow: "hidden",
      }}>
        <div style={{
          padding: "22px 26px 18px",
          background: "linear-gradient(135deg,#1b2a6b 0%,#16a085 100%)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>
              {mode === "add" ? "➕" : "✏️"}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff" }}>
                {mode === "add" ? "Add Job Title" : "Edit Job Title"}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                {mode === "add" ? "Create a new job title" : "Update job title details"}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)", border: "none",
            cursor: "pointer", fontSize: 16, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          {formError && (
            <div style={{
              padding: "10px 14px", background: "#fef2f2",
              border: "1px solid #fecaca", borderLeft: "4px solid #ef4444",
              borderRadius: 10, color: "#dc2626", fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
            }}>⚠ {formError}</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
              Job Title Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setFormError(""); }}
              placeholder="e.g. Software Engineer"
              style={{
                padding: "11px 14px", border: "1.5px solid #e2e8f0",
                borderRadius: 10, fontSize: 13.5, outline: "none", background: "#fff",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1b2a6b")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
              Description <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role…"
              rows={3}
              style={{
                padding: "11px 14px", border: "1.5px solid #e2e8f0",
                borderRadius: 10, fontSize: 13.5, outline: "none",
                background: "#fff", resize: "vertical", fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1b2a6b")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>

          {mode === "edit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Status</label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["Active", "Inactive"] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => setIsActive(opt === "Active")} style={{
                    flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${isActive === (opt === "Active") ? (opt === "Active" ? "#22c55e" : "#94a3b8") : "#e2e8f0"}`,
                    background: isActive === (opt === "Active") ? (opt === "Active" ? "#f0fdf4" : "#f8fafc") : "#fff",
                    color: isActive === (opt === "Active") ? (opt === "Active" ? "#16a34a" : "#64748b") : "#94a3b8",
                    fontWeight: 600, fontSize: 13.5,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 0.15s",
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt === "Active" ? "#22c55e" : "#94a3b8" }}/>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: "16px 26px 22px", borderTop: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fafbff",
        }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            <span style={{ color: "#ef4444" }}>*</span> Required fields
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              padding: "10px 22px", borderRadius: 10,
              border: "1.5px solid #e2e8f0", background: "#fff",
              fontSize: 13.5, fontWeight: 600, cursor: "pointer", color: "#64748b",
            }}>Cancel</button>
            <button onClick={handleSubmit} disabled={isSaving} style={{
              padding: "10px 28px", borderRadius: 10, border: "none",
              background: isSaving ? "#94a3b8" : "linear-gradient(135deg,#1b2a6b,#16a085)",
              color: "#fff", fontSize: 13.5, fontWeight: 700,
              cursor: isSaving ? "not-allowed" : "pointer",
              boxShadow: isSaving ? "none" : "0 2px 10px rgba(27,42,107,0.25)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {isSaving ? "Saving…" : mode === "add" ? "Add Title" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

interface DeleteConfirmModalProps {
  titleName: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ titleName, isLoading, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 80px rgba(0,0,0,0.22)", overflow: "hidden",
      }}>
        <div style={{
          background: "linear-gradient(135deg,#fff1f2,#fff5f5)",
          borderBottom: "1px solid #fecdd3",
          padding: "24px 28px 20px", textAlign: "center",
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "linear-gradient(135deg,#fee2e2,#fecdd3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px", fontSize: 26,
            boxShadow: "0 4px 16px rgba(239,68,68,0.2)",
          }}>🗑</div>
          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
            Delete Job Title
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>This action cannot be undone</p>
        </div>

        <div style={{ padding: "20px 28px" }}>
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 12, padding: "14px 16px",
            fontSize: 14, color: "#64748b", lineHeight: 1.6,
          }}>
            Are you sure you want to delete{" "}
            <strong style={{ color: "#1e293b", background: "#fee2e2", padding: "1px 6px", borderRadius: 4 }}>
              "{titleName}"
            </strong>?
            <br/>
            <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
              Employees with this title will keep it, but it won't appear in new records.
            </span>
          </div>
        </div>

        <div style={{ padding: "0 28px 24px", display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={isLoading} style={{
            flex: 1, padding: "11px", borderRadius: 10,
            border: "1.5px solid #e2e8f0", background: "#fff",
            fontSize: 13.5, fontWeight: 600, cursor: "pointer", color: "#64748b",
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} style={{
            flex: 1, padding: "11px", borderRadius: 10, border: "none",
            background: isLoading ? "#94a3b8" : "linear-gradient(135deg,#dc2626,#e11d48)",
            color: "#fff", fontSize: 13.5, fontWeight: 700,
            cursor: isLoading ? "not-allowed" : "pointer",
            boxShadow: isLoading ? "none" : "0 2px 10px rgba(220,38,38,0.3)",
          }}>
            {isLoading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
