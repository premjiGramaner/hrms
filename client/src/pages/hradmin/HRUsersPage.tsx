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
import { EMAIL_PATTERN } from "../../constants/validationPatterns";
import Button, { ActionButton } from "../../components/common/Button";
import { PAGE_PATHS, ROLES } from "../../config/roles";
import { IconAlertCircle, IconEdit, IconX } from "../../components/Icons";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;
const TABS: TabItem[] = [
  { label: "Job Titles", path: PAGE_PATHS.hradminJobTitles },
  { label: "Job Categories", path: PAGE_PATHS.hradminJobCategories },
  { label: "Sub Units", path: PAGE_PATHS.hradminSubUnits },
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
  "User Roles",
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
        <div className="mb-3 flex items-center justify-between rounded-[10px] border border-red-200 bg-red-50 px-4 py-[10px] text-[13.5px] text-red-600">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={16} />
            {pageError}
          </span>
          <button
            onClick={() => setPageError("")}
            className="bg-transparent border-0 cursor-pointer text-red-600 hover:opacity-70 transition-opacity"
          >
            <IconX size={18} />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-[10px]">
        <div className="relative w-[300px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
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
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full border border-[1.5px] border-slate-200 rounded-[10px] py-[9px] pr-3 pl-[34px] text-[13.5px] bg-white box-border outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-slate-500 whitespace-nowrap">
            Rows per page:
          </span>
          <select
            value={pageSize}
            onChange={(event) =>
              handlePageSizeChange(Number(event.target.value))
            }
            className="py-[7px] pl-[10px] pr-7 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none bg-white appearance-none cursor-pointer bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2710%27%20height=%276%27%20viewBox=%270%200%2010%206%27%3E%3Cpath%20fill=%27%2394a3b8%27%20d=%27M0%200l5%206%205-6z%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_8px_center]"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-slate-100">
              {TABLE_COLUMNS.map((columnHeader, colIndex) => (
                <th
                  key={colIndex}
                  className="p-3 px-4 text-left text-[11.5px] font-semibold text-slate-400 whitespace-nowrap"
                >
                  {colIndex === 0 ? (
                    <input
                      type="checkbox"
                      className="accent-[#1b2a6b] w-[14px] h-[14px]"
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
                  className="text-center p-12 text-slate-400"
                >
                  <div className="inline-flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      className="animate-spin"
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
                  className="text-center p-12 text-slate-400"
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
                  className={`border-b border-slate-50 transition-colors hover:bg-sky-50 ${rowIndex % 2 === 0 ? "bg-white" : "bg-[#fafbff]"
                    }`}
                >
                  <td className="p-3 px-4">
                    <input
                      type="checkbox"
                      className="accent-[#1b2a6b] w-[14px] h-[14px]"
                    />
                  </td>
                  <td className="p-3 px-4 font-medium text-slate-800">
                    {user.username}
                  </td>
                  <td className="p-3 px-4 text-gray-700">{user.name || "—"}</td>
                  <td className="p-3 px-4 text-slate-500 text-[12.5px]">
                    {user.email || "—"}
                  </td>
                  <td className="p-3 px-4 text-slate-500 text-[12.5px]">
                    {ROLE_DISPLAY_MAP[user.role] ?? "Default ESS"}
                  </td>
                  <td className="p-3 px-4">
                    <div className="flex gap-[6px]">
                      <ActionButton
                        label="Edit"
                        icon={<IconEdit size={13} />}
                        variant="edit"
                        onClick={() => setUserToEdit(user)}
                        title="Edit user"
                      />
                      <ActionButton
                        label="Delete"
                        icon={<IconX size={13} />}
                        variant="delete"
                        onClick={() => setUserToDelete(user)}
                        title="Delete user"
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {!isLoading && totalRecords > 0 && (
          <div className="flex items-center justify-between p-[14px_20px] border-t border-slate-100 flex-wrap gap-3">
            <span className="text-[13px] text-slate-500 whitespace-nowrap">
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {firstRowIndex}–{lastRowIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {totalRecords}
              </span>{" "}
              users &nbsp;·&nbsp; Page{" "}
              <span className="font-semibold text-slate-800">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>

            <div className="flex items-center gap-[2px]">
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
                      className="min-w-[32px] h-8 inline-flex items-center justify-center text-[13px] text-slate-400 select-none tracking-wide"
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
      className={`
        min-w-[32px] h-8 px-[7px] rounded-md inline-flex items-center justify-center
        text-[13px] leading-none transition-all
        ${active
          ? "border-[1.5px] border-[#1b2a6b] bg-[#1b2a6b] text-white font-bold"
          : disabled
            ? "border-[1.5px] border-slate-200 bg-transparent text-gray-300 cursor-not-allowed"
            : "border-[1.5px] border-slate-200 bg-white text-gray-700 cursor-pointer hover:border-slate-400 hover:text-[#1b2a6b]"
        }
      `}
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
    role: user?.role || ROLES.EMP_MANAGER,
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
    if (!formData.email.trim() || !EMAIL_PATTERN.test(formData.email)) {
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
        };
        await createHRUser(payload);
      } else if (mode === "edit" && user) {
        const payload: UpdateHRUserPayload = {
          employee_name: formData.employee_name.trim(),
          email: formData.email.trim(),
          role: formData.role,
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
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[20px] w-full max-w-[560px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="pt-5 px-6 pb-0 flex items-center justify-between">
          <h2 className="m-0 text-lg font-bold text-[#1b2a6b]">
            {mode === "add" ? "Add User" : "Edit User"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 border-0 cursor-pointer text-sm text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="p-5 px-6 flex flex-col gap-4">
          {formError && (
            <div className="p-2 px-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[13px]">
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
                  { value: ROLES.EMP_MANAGER, label: "Employee Manager" },
                  { value: ROLES.HR_ADMIN, label: "HR Administrator" },
                ]}
                onChange={(value) => handleFieldChange("role", value)}
              />
            </FormField>
          </FormRow>
        </div>

        <div className="py-[14px_24px_20px] border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            <span className="text-red-500">*</span> Required
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
              {mode === "add" ? "Add User" : "Save Changes"}
            </Button>
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
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-[28px_28px_24px] text-center">
        <div className="w-[52px] h-[52px] rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <IconAlertCircle size={28} color="#f43f5e" />
        </div>
        <h3 className="m-0 mb-2 text-[17px] font-bold text-slate-800">
          Delete User
        </h3>
        <p className="m-0 mb-6 text-sm text-slate-500 leading-relaxed">
          Are you sure you want to delete{" "}
          <strong className="text-slate-800">{userName}</strong>? This action
          cannot be undone.
        </p>
        <div className="flex gap-[10px] justify-center">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
            loading={isLoading}
          >
            Delete User
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
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
    <div className="flex flex-col gap-[5px]">
      <label className="text-[12.5px] font-semibold text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-[2px]">*</span>}
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
      onChange={(event) => onChange(event.target.value)}
      className="w-full p-[10px_12px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white box-border"
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
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full p-[10px_32px_10px_12px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none appearance-none bg-white box-border cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-[10px] top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M0 0l5 6 5-6z" />
      </svg>
    </div>
  );
}
