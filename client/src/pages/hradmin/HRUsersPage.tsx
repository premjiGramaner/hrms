import React, { useCallback, useEffect, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  getHRUsers,
  createHRUser,
  updateHRUser,
  deleteHRUser,
  HRUser,
  CreateHRUserPayload,
  UpdateHRUserPayload,
} from "../../api/hradmin.api";
import useDebounce from "../../hooks/useDebounce";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
];

const ROLE_DISPLAY_MAP: Record<string, string> = {
  hradmin: "Default ESS, Default Supervisor, Global Admin",
  empmanager: "Default ESS, Default Supervisor",
};

const TABLE_COLUMNS = [
  "checkbox",
  "Username",
  "Employee Name",
  "Email",
  "User Role(s)",
  "Status",
  "Actions",
];

export default function HRUsersPage() {
  const [userList, setUserList] = useState<HRUser[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<HRUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<HRUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageError, setPageError] = useState("");

  const fetchUsers = useCallback(
    (page: number, size: number, search: string) => {
      setIsLoading(true);
      getHRUsers({ page, limit: size, search })
        .then((response) => {
          const { users, total, totalPages: pages } = response.data;
          setUserList(users);
          setTotalRecords(total);
          setTotalPages(pages);
        })
        .catch(() =>
          setPageError("Failed to load users. Please refresh the page."),
        )
        .finally(() => setIsLoading(false));
    },
    [],
  );

  useEffect(() => {
    fetchUsers(currentPage, pageSize, searchQuery);
  }, []);

  const debouncedSearch = useDebounce((value: string) => {
    setCurrentPage(1);
    fetchUsers(1, pageSize, value);
  }, 400);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchUsers(newPage, pageSize, searchQuery);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    fetchUsers(1, newSize, searchQuery);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteHRUser(userToDelete.id);
      setUserToDelete(null);
      const remainingOnPage = userList.length - 1;
      const targetPage =
        remainingOnPage === 0 && currentPage > 1
          ? currentPage - 1
          : currentPage;
      setCurrentPage(targetPage);
      fetchUsers(targetPage, pageSize, searchQuery);
    } catch {
      setPageError("Failed to delete user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUserSaved = () => {
    setShowAddModal(false);
    setUserToEdit(null);
    fetchUsers(currentPage, pageSize, searchQuery);
  };

  const firstRowIndex =
    totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRowIndex = Math.min(currentPage * pageSize, totalRecords);

  return (
    <Layout
      title="HR Administration"
      tabs={TABS}
      activeTab="Users"
      onFab={() => setShowAddModal(true)}
    >
      {pageError && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            color: "#dc2626",
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {pageError}
          <button
            onClick={() => setPageError("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#dc2626",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ position: "relative", width: 300 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by name, username or email…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 13.5,
              outline: "none",
              background: "#fff",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}
          >
            Rows per page:
          </span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            style={{
              padding: "7px 28px 7px 10px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
              background: "#fff",
              appearance: "none",
              cursor: "pointer",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%2394a3b8' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              {TABLE_COLUMNS.map((columnHeader, colIndex) => (
                <th
                  key={colIndex}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "#94a3b8",
                    whiteSpace: "nowrap",
                  }}
                >
                  {colIndex === 0 ? (
                    <input
                      type="checkbox"
                      style={{ accentColor: "#1b2a6b", width: 14, height: 14 }}
                    />
                  ) : (
                    columnHeader
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      style={{ animation: "spin 1s linear infinite" }}
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Loading users…
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && userList.length === 0 && (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}
                >
                  {searchQuery
                    ? `No users matching "${searchQuery}"`
                    : "No users found"}
                </td>
              </tr>
            )}

            {!isLoading &&
              userList.map((user, rowIndex) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: "1px solid #f8fafc",
                    background: rowIndex % 2 === 0 ? "#fff" : "#fafbff",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      "#f0f9ff")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      rowIndex % 2 === 0 ? "#fff" : "#fafbff")
                  }
                >
                  <td style={{ padding: "12px 16px" }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: "#1b2a6b", width: 14, height: 14 }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#1e293b",
                    }}
                  >
                    {user.username}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#374151" }}>
                    {user.name || "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#64748b",
                      fontSize: 12.5,
                    }}
                  >
                    {user.email || "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#64748b",
                      fontSize: 12.5,
                    }}
                  >
                    {ROLE_DISPLAY_MAP[user.role] ?? "Default ESS"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: user.is_active ? "#dcfce7" : "#f1f5f9",
                        color: user.is_active ? "#16a34a" : "#94a3b8",
                      }}
                    >
                      {user.is_active ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setUserToEdit(user)}
                        title="Edit user"
                        style={{
                          background: "#eff6ff",
                          border: "none",
                          cursor: "pointer",
                          color: "#1b2a6b",
                          fontSize: 13,
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => setUserToDelete(user)}
                        title="Delete user"
                        style={{
                          background: "#fff1f2",
                          border: "none",
                          cursor: "pointer",
                          color: "#e11d48",
                          fontSize: 13,
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {!isLoading && totalRecords > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderTop: "1px solid #f1f5f9",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span
              style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}
            >
              Showing{" "}
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                {firstRowIndex}–{lastRowIndex}
              </span>{" "}
              of{" "}
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                {totalRecords}
              </span>{" "}
              users &nbsp;·&nbsp; Page{" "}
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                {currentPage}
              </span>{" "}
              of{" "}
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                {totalPages}
              </span>
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <NavBtn
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                ««
              </NavBtn>

              <NavBtn
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous page"
              >
                ‹
              </NavBtn>

              {buildPageNumbers(currentPage, totalPages).map(
                (pageEntry, idx) =>
                  pageEntry === "ellipsis" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{
                        minWidth: 32,
                        height: 32,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        color: "#94a3b8",
                        userSelect: "none",
                        letterSpacing: 1,
                      }}
                    >
                      ···
                    </span>
                  ) : (
                    <NavBtn
                      key={pageEntry}
                      onClick={() => handlePageChange(pageEntry as number)}
                      disabled={false}
                      active={pageEntry === currentPage}
                    >
                      {pageEntry}
                    </NavBtn>
                  ),
              )}

              <NavBtn
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next page"
              >
                ›
              </NavBtn>

              <NavBtn
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                »»
              </NavBtn>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <UserFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={handleUserSaved}
          onError={(msg) => setPageError(msg)}
        />
      )}

      {userToEdit && (
        <UserFormModal
          mode="edit"
          user={userToEdit}
          onClose={() => setUserToEdit(null)}
          onSaved={handleUserSaved}
          onError={(msg) => setPageError(msg)}
        />
      )}

      {userToDelete && (
        <DeleteConfirmModal
          userName={userToDelete.name || userToDelete.username}
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}

function buildPageNumbers(
  activePage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (activePage > 3) pages.push("ellipsis");

  const rangeStart = Math.max(2, activePage - 1);
  const rangeEnd = Math.min(totalPages - 1, activePage + 1);
  for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);

  if (activePage < totalPages - 2) pages.push("ellipsis");

  pages.push(totalPages);
  return pages;
}

interface NavBtnProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  active?: boolean;
  title?: string;
}

function NavBtn({
  children,
  onClick,
  disabled,
  active = false,
  title,
}: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 32,
        height: 32,
        padding: "0 7px",
        borderRadius: 6,
        border: active ? "1.5px solid #1b2a6b" : "1.5px solid #e2e8f0",
        background: active ? "#1b2a6b" : disabled ? "transparent" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
        fontSize: active ? 13 : 13,
        fontWeight: active ? 700 : 400,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border-color 0.15s, background 0.15s, color 0.15s",
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#94a3b8";
          (e.currentTarget as HTMLButtonElement).style.color = "#1b2a6b";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
          (e.currentTarget as HTMLButtonElement).style.color = "#374151";
        }
      }}
    >
      {children}
    </button>
  );
}

interface UserFormModalProps {
  mode: "add" | "edit";
  user?: HRUser;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

function UserFormModal({
  mode,
  user,
  onClose,
  onSaved,
  onError,
}: UserFormModalProps) {
  const [formData, setFormData] = useState({
    employee_name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "empmanager",
    status: user?.is_active === false ? "Disabled" : "Enabled",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  };

  const handleSubmit = async () => {
    if (!formData.employee_name.trim()) {
      setFormError("Employee name is required.");
      return;
    }
    if (
      !formData.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      setFormError("A valid email address is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (mode === "add") {
        const payload: CreateHRUserPayload = {
          employee_name: formData.employee_name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          status: formData.status,
        };
        await createHRUser(payload);
      } else if (mode === "edit" && user) {
        const payload: UpdateHRUserPayload = {
          employee_name: formData.employee_name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          status: formData.status,
        };
        await updateHRUser(user.id, payload);
      }
      onSaved();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        `Failed to ${mode === "add" ? "create" : "update"} user. Please try again.`;
      setFormError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#1b2a6b",
            }}
          >
            {mode === "add" ? "Add User" : "Edit User"}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#f1f5f9",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {formError && (
            <div
              style={{
                padding: "8px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#dc2626",
                fontSize: 13,
              }}
            >
              {formError}
            </div>
          )}

          <FormRow>
            <FormField label="Employee Name" required>
              <FormInput
                value={formData.employee_name}
                placeholder="Full name"
                onChange={(value) => handleFieldChange("employee_name", value)}
              />
            </FormField>
            <FormField label="Email Address" required>
              <FormInput
                value={formData.email}
                placeholder="user@example.com"
                onChange={(value) => handleFieldChange("email", value)}
              />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField label="User Role" required>
              <FormSelect
                value={formData.role}
                options={[
                  { value: "empmanager", label: "Employee Manager" },
                  { value: "hradmin", label: "HR Administrator" },
                ]}
                onChange={(value) => handleFieldChange("role", value)}
              />
            </FormField>
            <FormField label="Status">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  paddingTop: 8,
                }}
              >
                {(["Enabled", "Disabled"] as const).map((statusOption) => (
                  <label
                    key={statusOption}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13.5,
                      cursor: "pointer",
                      color: "#374151",
                    }}
                  >
                    <input
                      type="radio"
                      name="user_status"
                      value={statusOption}
                      checked={formData.status === statusOption}
                      onChange={() => handleFieldChange("status", statusOption)}
                      style={{ accentColor: "#1b2a6b", width: 15, height: 15 }}
                    />
                    {statusOption}
                  </label>
                ))}
              </div>
            </FormField>
          </FormRow>
        </div>

        <div
          style={{
            padding: "14px 24px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            <span style={{ color: "#ef4444" }}>*</span> Required
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 22px",
                borderRadius: 999,
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
                padding: "9px 28px",
                borderRadius: 999,
                border: "none",
                background: isSaving
                  ? "#94a3b8"
                  : "linear-gradient(90deg,#1b2a6b,#16a085)",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              {isSaving
                ? "Saving…"
                : mode === "add"
                  ? "Add User"
                  : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  userName: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({
  userName,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
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
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          padding: "28px 28px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#fff1f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 22,
          }}
        >
          🗑
        </div>
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 17,
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          Delete User
        </h3>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 14,
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          Are you sure you want to delete{" "}
          <strong style={{ color: "#1e293b" }}>{userName}</strong>? This action
          cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: "9px 24px",
              borderRadius: 999,
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
              padding: "9px 24px",
              borderRadius: 999,
              border: "none",
              background: isLoading ? "#94a3b8" : "#e11d48",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {children}
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "#4a5568" }}>
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FormInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1.5px solid #e2e8f0",
        borderRadius: 10,
        fontSize: 13.5,
        outline: "none",
        background: "#fff",
        boxSizing: "border-box",
      }}
    />
  );
}

function FormSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 32px 10px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 13.5,
          outline: "none",
          appearance: "none",
          background: "#fff",
          boxSizing: "border-box",
          cursor: "pointer",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "#94a3b8",
          fontSize: 11,
        }}
      >
        ▼
      </span>
    </div>
  );
}
