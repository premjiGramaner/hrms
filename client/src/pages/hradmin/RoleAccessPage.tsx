import { useCallback, useEffect, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  getRoleAccess,
  updateUserRole,
  RoleAccessUser,
} from "../../api/hradmin.api";
import DataTable, { ColumnDef, StatCard } from "../../components/DataTable";
import useDebounce from "../../hooks/useDebounce";
import Toast from "../../utils/toast";
import Alert from "../../utils/alert";
import { BASIC_SUPERVISOR_ROLES, type UserRole } from "../../config/roles";
import { ROLE_OPTIONS } from "../../config/uiConstants";
import {
  IconX,
  IconAlertCircle,
  IconShield,
  IconUsers,
  IconUser,
  IconSettings,
} from "../../components/Icons";

const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
  { label: "Role Access", path: "/hradmin/role-access" },
  { label: "Audit Trail", path: "/hradmin/audit-trail" },
];

function roleValue(role: string) {
  if (role === "manager") return "supervisor";
  if (role === "empmanager") return "hradmin";
  return role;
}



function getInitials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function RoleDropdown({
  user,
  onRoleChange,
}: {
  user: RoleAccessUser;
  onRoleChange: (userId: number, newRole: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    if (newRole === user.role) return;

    const newRoleLabel =
      ROLE_OPTIONS.find((role) => role.value === newRole)?.label || newRole;
    const currentRoleLabel =
      ROLE_OPTIONS.find((role) => role.value === roleValue(user.role))?.label ||
      user.role;

    const confirmed = await Alert.confirm({
      title: "Change User Role",
      message: `Are you sure you want to change ${user.name}'s role from ${currentRoleLabel} to ${newRoleLabel}?`,
      confirmText: "Yes, Change Role",
      cancelText: "Cancel",
      type: "warning",
    });

    if (!confirmed) {
      e.target.value = roleValue(user.role);
      return;
    }

    setSaving(true);
    try {
      await updateUserRole(user.id, newRole);
      onRoleChange(user.id, newRole);
      Toast.success(`Role updated to ${newRoleLabel}`);
    } catch {
      Toast.error("Failed to update user role");
      e.target.value = roleValue(user.role);
    } finally {
      setSaving(false);
    }
  };

  // Get border color class based on role
  const getBorderClass = (role: string) => {
    const val = roleValue(role);
    if (val === "employee") return "border-[#bbf7d0]";
    if (val === "supervisor") return "border-[#bae6fd]";
    if (val === "hradmin") return "border-[#c4b5fd]";
    return "border-slate-200";
  };

  // Get background color class based on role
  const getBgClass = (role: string) => {
    const val = roleValue(role);
    if (val === "employee") return "bg-[#dcfce7]";
    if (val === "supervisor") return "bg-[#e0f2fe]";
    if (val === "hradmin") return "bg-[#ede9fe]";
    return "bg-slate-100";
  };

  // Get text color class based on role
  const getTextClass = (role: string) => {
    const val = roleValue(role);
    if (val === "employee") return "text-[#16a34a]";
    if (val === "supervisor") return "text-[#075985]";
    if (val === "hradmin") return "text-[#7c3aed]";
    return "text-slate-600";
  };

  return (
    <div className="relative inline-block">
      <select
        value={roleValue(user.role)}
        onChange={handleChange}
        disabled={saving}
        className={`py-1 pr-7 pl-2.5 rounded-lg text-xs font-bold outline-none appearance-none transition-all border-[1.5px] ${getBorderClass(user.role)} ${getBgClass(user.role)} ${getTextClass(user.role)} ${
          saving ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] ${getTextClass(user.role)}`}
      >
        {saving ? "…" : "▼"}
      </span>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  minWidth = 130,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  minWidth?: number;
}) {
  const widthClass =
    minWidth === 120
      ? "min-w-[120px]"
      : minWidth === 130
        ? "min-w-[130px]"
        : "min-w-[130px]";

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`py-2.5 pr-8 pl-3 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] outline-none appearance-none bg-white cursor-pointer shadow-sm ${widthClass}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[11px]">
        ▼
      </span>
    </div>
  );
}

export default function RoleAccessPage() {
  const [users, setUsers] = useState<RoleAccessUser[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(
    async (
      page: number,
      limit: number,
      search: string,
      role: string,
      gender: string,
      status: string,
    ) => {
      setIsLoading(true);
      try {
        const res = await getRoleAccess({
          page,
          limit,
          search,
          role,
          gender,
          status,
        });
        setUsers(res.data.users);
        setTotalRecords(res.data.total);
        setTotalPages(res.data.totalPages);
        setCurrentPage(res.data.page);
      } catch {
        setPageError("Failed to load users. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(1, pageSize, "", "", "", "");
  }, []);

  useEffect(() => {
    fetchData(1, pageSize, searchQuery, roleFilter, genderFilter, statusFilter);
  }, [roleFilter, genderFilter, statusFilter]);

  const debouncedFetch = useDebounce((query: string) => {
    fetchData(1, pageSize, query, roleFilter, genderFilter, statusFilter);
  }, 350);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    debouncedFetch(value);
  };

  const handlePageChange = (page: number) => {
    fetchData(
      page,
      pageSize,
      searchQuery,
      roleFilter,
      genderFilter,
      statusFilter,
    );
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    fetchData(1, size, searchQuery, roleFilter, genderFilter, statusFilter);
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user,
      ),
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
    setGenderFilter("");
    setStatusFilter("");
    fetchData(1, pageSize, "", "", "", "");
  };

  const hasFilters =
    searchQuery !== "" ||
    roleFilter !== "" ||
    genderFilter !== "" ||
    statusFilter !== "";

  const employeeCount = users.filter((u) => u.role === "employee").length;
  const supervisorCount = users.filter((u) =>
    BASIC_SUPERVISOR_ROLES.includes(u.role as UserRole),
  ).length;
  const globalCount = users.filter((u) =>
    ["hradmin", "empmanager"].includes(u.role),
  ).length;

  const stats: StatCard[] = [
    {
      label: "Total Users",
      value: totalRecords,
      icon: <IconUsers size={20} />,
      color: "#1b2a6b",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Employees",
      value: employeeCount,
      icon: <IconUser size={20} />,
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    {
      label: "Supervisors",
      value: supervisorCount,
      icon: <IconShield size={20} />,
      color: "#0369a1",
      bg: "#e0f2fe",
      border: "#7dd3fc",
    },
    {
      label: "Global Admin",
      value: globalCount,
      icon: <IconSettings size={20} />,
      color: "#7c3aed",
      bg: "#f5f3ff",
      border: "#c4b5fd",
    },
  ];

  const columns: ColumnDef<RoleAccessUser>[] = [
    {
      key: "name",
      header: "Employee",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.avatar ? (
            <img
              src={row.avatar}
              alt={row.name}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-slate-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-md bg-gradient-to-br from-[#1b2a6b] to-[#16a085]">
              {getInitials(row.name)}
            </div>
          )}
          <div>
            <div className="font-bold text-slate-800 text-[13.5px]">
              {row.name || "—"}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              @{row.username}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "employee_id",
      header: "Employee ID",
      render: (row) => (
        <span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded-md text-slate-600 border border-slate-200">
          {row.employee_id || "—"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => (
        <span className="text-xs text-slate-600">{row.email}</span>
      ),
    },
    {
      key: "gender",
      header: "Gender",
      width: 100,
      render: (row) => (
        <span className="text-xs text-slate-600 capitalize">
          {row.gender || "—"}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      width: 110,
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            row.is_active
              ? "bg-green-100 text-green-600 border-green-200"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              row.is_active ? "bg-green-500" : "bg-slate-300"
            }`}
          />
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: 160,
      render: (row) => (
        <RoleDropdown user={row} onRoleChange={handleRoleChange} />
      ),
    },
  ];

  const extraToolbar = (
    <>
      <FilterSelect
        value={roleFilter}
        onChange={setRoleFilter}
        options={[
          { value: "employee", label: "Employee" },
          { value: "supervisor", label: "Supervisor" },
          { value: "hradmin", label: "Global Admin" },
        ]}
        placeholder="All Roles"
        minWidth={130}
      />
      <FilterSelect
        value={genderFilter}
        onChange={setGenderFilter}
        options={[
          { value: "Male", label: "Male" },
          { value: "Female", label: "Female" },
          { value: "Other", label: "Other" },
        ]}
        placeholder="All Genders"
        minWidth={130}
      />
      <FilterSelect
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        placeholder="All Status"
        minWidth={120}
      />
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="py-2.5 px-3.5 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] bg-white cursor-pointer text-slate-500 flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <IconX size={14} />
          Clear
        </button>
      )}
    </>
  );

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Role Access">
      {pageError && (
        <div className="mb-4 py-3 px-4.5 bg-gradient-to-br from-red-50 to-white border border-red-200 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={18} />
            {pageError}
          </span>
          <button
            onClick={() => setPageError("")}
            className="bg-none border-none cursor-pointer text-red-600 p-0 hover:text-red-700 transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      <DataTable<RoleAccessUser>
        title="Role Access Management"
        subtitle="View and manage user roles across the system"
        icon="🛡️"
        rows={users}
        isLoading={isLoading}
        columns={columns}
        actions={[]}
        getKey={(row) => row.id}
        emptyIcon="👥"
        emptyTitle={
          hasFilters ? "No users match the current filters" : "No users found"
        }
        emptySubtitle={
          hasFilters
            ? "Try adjusting or clearing the filters"
            : "Users will appear here once created"
        }
        stats={stats}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="users"
        searchQuery={searchQuery}
        searchPlaceholder="Search by name, username, email, employee ID…"
        onSearchChange={handleSearch}
        extraToolbar={extraToolbar}
      />
    </Layout>
  );
}
