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
import {
  BASIC_SUPERVISOR_ROLES,
  PAGE_PATHS,
  ROLES,
} from "../../config/roles";
import { ROLE_OPTIONS } from "../../config/uiConstants";
import {
  IconX,
  IconAlertCircle,
  IconShield,
  IconUsers,
  IconUser,
  IconSettings,
} from "../../components/Icons";
import { ERROR_MESSAGES } from "../../constants/messages";

// Tab configuration for HR Administration pages
const TABS: TabItem[] = [
  { label: "Job Titles", path: PAGE_PATHS.hradminJobTitles },
  { label: "Job Categories", path: PAGE_PATHS.hradminJobCategories },
  { label: "Sub Units", path: PAGE_PATHS.hradminSubUnits },
  { label: "Role Access", path: PAGE_PATHS.hradminRoleAccess },
  { label: "Audit Trail", path: PAGE_PATHS.hradminAuditTrail },
] as const;

// Page configuration
const PAGE_CONFIG = {
  TITLE: "Role Access Management",
  SUBTITLE: "View and manage user roles across the system",
  ITEM_LABEL: "users",
  INITIAL_PAGE_SIZE: 10,
} as const;

// Search configuration
const SEARCH_CONFIG = {
  PLACEHOLDER: "Search by name, username, email, employee ID…",
  DEBOUNCE_DELAY: 350,
} as const;

// Filter configuration
const FILTER_CONFIG = {
  ROLE_PLACEHOLDER: "All Roles",
  GENDER_PLACEHOLDER: "All Genders",
  CLEAR_BUTTON: "Clear",
  MIN_WIDTH_STANDARD: 130,
  MIN_WIDTH_COMPACT: 120,
} as const;

// Role filter options
const ROLE_FILTER_OPTIONS = [
  { value: ROLES.EMPLOYEE, label: "Employee" },
  { value: ROLES.SUPERVISOR, label: "Supervisor" },
  { value: ROLES.HR_ADMIN, label: "Global Admin" },
] as const;

// Gender filter options
const GENDER_FILTER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
] as const;

// Empty state messages
const EMPTY_STATE = {
  ICON: "👥",
  NO_USERS_TITLE: "No users found",
  NO_USERS_SUBTITLE: "Users will appear here once created",
  NO_FILTERED_TITLE: "No users match the current filters",
  NO_FILTERED_SUBTITLE: "Try adjusting or clearing the filters",
} as const;

// Column headers
const COLUMN_HEADERS = {
  EMPLOYEE: "Employee",
  EMPLOYEE_ID: "Employee ID",
  EMAIL: "Email",
  GENDER: "Gender",
  ROLE: "Role",
} as const;

// Stat card labels
const STAT_LABELS = {
  TOTAL_USERS: "Total Users",
  EMPLOYEES: "Employees",
  SUPERVISORS: "Supervisors",
  GLOBAL_ADMIN: "Global Admin",
} as const;

// Stat card colors
const STAT_COLORS = {
  TOTAL_USERS: {
    color: "#1b2a6b",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  EMPLOYEES: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  SUPERVISORS: {
    color: "#0369a1",
    bg: "#e0f2fe",
    border: "#7dd3fc",
  },
  GLOBAL_ADMIN: {
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#c4b5fd",
  },
} as const;

// Role badge styling
const ROLE_BADGE_STYLES = {
  [ROLES.EMPLOYEE]: {
    border: "border-[#bbf7d0]",
    bg: "bg-[#dcfce7]",
    text: "text-[#16a34a]",
  },
  [ROLES.SUPERVISOR]: {
    border: "border-[#bae6fd]",
    bg: "bg-[#e0f2fe]",
    text: "text-[#075985]",
  },
  [ROLES.HR_ADMIN]: {
    border: "border-[#c4b5fd]",
    bg: "bg-[#ede9fe]",
    text: "text-[#7c3aed]",
  },
  DEFAULT: {
    border: "border-slate-200",
    bg: "bg-slate-100",
    text: "text-slate-600",
  },
} as const;

// UI text constants
const UI_TEXT = {
  EMPTY_VALUE: "—",
  USERNAME_PREFIX: "@",
  LOADING_INDICATOR: "…",
  DROPDOWN_INDICATOR: "▼",
  ROLE_UPDATED: (roleLabel: string) => `Role updated to ${roleLabel}`,
  ROLE_UPDATE_FAILED: "Failed to update user role",
} as const;

// Toast messages
const TOAST_MESSAGES = {
  ROLE_UPDATED: (roleLabel: string) => UI_TEXT.ROLE_UPDATED(roleLabel),
  UPDATE_FAILED: UI_TEXT.ROLE_UPDATE_FAILED,
} as const;

// Confirmation messages
const CONFIRMATION_MESSAGES = {
  CHANGE_ROLE_TITLE: "Change User Role",
  CHANGE_ROLE_MESSAGE: (
    userName: string,
    currentRole: string,
    newRole: string,
  ) =>
    `Are you sure you want to change ${userName}'s role from ${currentRole} to ${newRole}?`,
  CONFIRM_BUTTON: "Yes, Change Role",
  CANCEL_BUTTON: "Cancel",
} as const;

/**
 * Normalize role value (convert manager roles to their equivalents)
 */
function normalizeRoleValue(role: string): string {
  if (role === ROLES.MANAGER) return ROLES.SUPERVISOR;
  if (role === ROLES.EMP_MANAGER) return ROLES.HR_ADMIN;
  return role;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Get role badge styling
 */
function getRoleBadgeStyles(role: string) {
  const normalizedRole = normalizeRoleValue(role);
  return (
    ROLE_BADGE_STYLES[normalizedRole as keyof typeof ROLE_BADGE_STYLES] ||
    ROLE_BADGE_STYLES.DEFAULT
  );
}

/**
 * Get role label from role value
 */
function getRoleLabel(roleValue: string): string {
  const roleOption = ROLE_OPTIONS.find((role) => role.value === roleValue);
  return roleOption?.label || roleValue;
}

/**
 * Check if user is employee
 */
function isEmployeeRole(role: string): boolean {
  return role === ROLES.EMPLOYEE;
}

/**
 * Check if user is supervisor
 */
function isSupervisorRole(role: string): boolean {
  return BASIC_SUPERVISOR_ROLES.includes(role as UserRole);
}

/**
 * Check if user is global admin
 */
function isGlobalAdminRole(role: string): boolean {
  return role === ROLES.HR_ADMIN || role === ROLES.EMP_MANAGER;
}

/**
 * Count users by role predicate
 */
function countUsersByPredicate(
  users: RoleAccessUser[],
  predicate: (role: string) => boolean,
): number {
  return users.filter((user) => predicate(user.role)).length;
}

function RoleDropdown({
  user,
  onRoleChange,
}: {
  user: RoleAccessUser;
  onRoleChange: (userId: number, newRole: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  // Handle role change confirmation
  const handleRoleChangeConfirmation = async (
    newRoleLabel: string,
    currentRoleLabel: string,
  ): Promise<boolean> => {
    return await Alert.confirm({
      title: CONFIRMATION_MESSAGES.CHANGE_ROLE_TITLE,
      message: CONFIRMATION_MESSAGES.CHANGE_ROLE_MESSAGE(
        user.name,
        currentRoleLabel,
        newRoleLabel,
      ),
      confirmText: CONFIRMATION_MESSAGES.CONFIRM_BUTTON,
      cancelText: CONFIRMATION_MESSAGES.CANCEL_BUTTON,
      type: "warning",
    });
  };

  // Update user role API call
  const updateRole = async (newRole: string, newRoleLabel: string) => {
    try {
      await updateUserRole(user.id, newRole);
      onRoleChange(user.id, newRole);
      Toast.success(TOAST_MESSAGES.ROLE_UPDATED(newRoleLabel));
    } catch {
      Toast.error(TOAST_MESSAGES.UPDATE_FAILED);
      throw new Error("Update failed");
    }
  };

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value;
    const normalizedCurrentRole = normalizeRoleValue(user.role);

    if (newRole === normalizedCurrentRole) return;

    const newRoleLabel = getRoleLabel(newRole);
    const currentRoleLabel = getRoleLabel(normalizedCurrentRole);

    const confirmed = await handleRoleChangeConfirmation(
      newRoleLabel,
      currentRoleLabel,
    );

    if (!confirmed) {
      event.target.value = normalizedCurrentRole;
      return;
    }

    setSaving(true);
    try {
      await updateRole(newRole, newRoleLabel);
    } catch {
      event.target.value = normalizedCurrentRole;
    } finally {
      setSaving(false);
    }
  };

  const normalizedRole = normalizeRoleValue(user.role);
  const styles = getRoleBadgeStyles(normalizedRole);

  const renderOption = (option: { value: string; label: string }) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  );

  return (
    <div className="relative inline-block">
      <select
        value={normalizedRole}
        onChange={handleChange}
        disabled={saving}
        className={`py-1 pr-7 pl-2.5 rounded-lg text-xs font-bold outline-none appearance-none transition-all border-[1.5px] ${styles.border} ${styles.bg} ${styles.text} ${
          saving ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        {ROLE_OPTIONS.map(renderOption)}
      </select>
      <span
        className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] ${styles.text}`}
      >
        {saving ? UI_TEXT.LOADING_INDICATOR : UI_TEXT.DROPDOWN_INDICATOR}
      </span>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  minWidth = FILTER_CONFIG.MIN_WIDTH_STANDARD,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  minWidth?: number;
}) {
  const getWidthClass = () => {
    if (minWidth === FILTER_CONFIG.MIN_WIDTH_COMPACT) return "min-w-[120px]";
    if (minWidth === FILTER_CONFIG.MIN_WIDTH_STANDARD) return "min-w-[130px]";
    return "min-w-[130px]";
  };

  const widthClass = getWidthClass();

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  // Render option
  const renderOption = (option: { value: string; label: string }) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  );

  return (
    <div className="relative">
      <select
        value={value}
        onChange={handleSelectChange}
        className={`py-2.5 pr-8 pl-3 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] outline-none appearance-none bg-white cursor-pointer shadow-sm transition-colors focus:border-[#1b2a6b] ${widthClass}`}
      >
        <option value="">{placeholder}</option>
        {options.map(renderOption)}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[11px]">
        {UI_TEXT.DROPDOWN_INDICATOR}
      </span>
    </div>
  );
}

export default function RoleAccessPage() {
  const [users, setUsers] = useState<RoleAccessUser[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    PAGE_CONFIG.INITIAL_PAGE_SIZE,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  const handleFetchSuccess = (response: {
    data: {
      users: RoleAccessUser[];
      total: number;
      totalPages: number;
      page: number;
    };
  }) => {
    setUsers(response.data.users);
    setTotalRecords(response.data.total);
    setTotalPages(response.data.totalPages);
    setCurrentPage(response.data.page);
  };

  const handleFetchError = () => {
    setPageError(ERROR_MESSAGES.LOAD_ROLE_ACCESS_FAILED);
  };

  const handleFetchComplete = () => {
    setIsLoading(false);
  };

  // Fetch data from API
  const fetchData = useCallback(
    async (
      page: number,
      limit: number,
      search: string,
      role: string,
      gender: string,
    ) => {
      setIsLoading(true);
      try {
        const response = await getRoleAccess({
          page,
          limit,
          search,
          role,
          gender,
        });
        handleFetchSuccess(response);
      } catch {
        handleFetchError();
      } finally {
        handleFetchComplete();
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(1, pageSize, "", "", "");
  }, []);

  useEffect(() => {
    fetchData(1, pageSize, searchQuery, roleFilter, genderFilter);
  }, [roleFilter, genderFilter]);

  // Handle debounced search
  const handleDebouncedSearch = (query: string) => {
    fetchData(1, pageSize, query, roleFilter, genderFilter);
  };

  const debouncedFetch = useDebounce(
    handleDebouncedSearch,
    SEARCH_CONFIG.DEBOUNCE_DELAY,
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    debouncedFetch(value);
  };

  const handlePageChange = (page: number) => {
    fetchData(page, pageSize, searchQuery, roleFilter, genderFilter);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    fetchData(1, size, searchQuery, roleFilter, genderFilter);
  };

  const handleRoleChange = (userId: number, newRole: string) => {
    setUsers((previousUsers) =>
      previousUsers.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user,
      ),
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
    setGenderFilter("");
    fetchData(1, pageSize, "", "", "");
  };

  const hasFilters =
    searchQuery !== "" || roleFilter !== "" || genderFilter !== "";

  const employeeCount = users.filter((u) => u.role === ROLES.EMPLOYEE).length;
  const supervisorCount = users.filter((userRecord) =>
    BASIC_SUPERVISOR_ROLES.some(
      (supervisorRole) => supervisorRole === userRecord.role,
    ),
  ).length;
  const globalCount = users.filter((userRecord) =>
    [ROLES.HR_ADMIN, ROLES.EMP_MANAGER].some(
      (adminRole) => adminRole === userRecord.role,
    ),
  ).length;

  const stats: StatCard[] = [
    {
      label: STAT_LABELS.TOTAL_USERS,
      value: totalRecords,
      icon: <IconUsers size={20} />,
      ...STAT_COLORS.TOTAL_USERS,
    },
    {
      label: STAT_LABELS.EMPLOYEES,
      value: employeeCount,
      icon: <IconUser size={20} />,
      ...STAT_COLORS.EMPLOYEES,
    },
    {
      label: STAT_LABELS.SUPERVISORS,
      value: supervisorCount,
      icon: <IconShield size={20} />,
      ...STAT_COLORS.SUPERVISORS,
    },
    {
      label: STAT_LABELS.GLOBAL_ADMIN,
      value: globalCount,
      icon: <IconSettings size={20} />,
      ...STAT_COLORS.GLOBAL_ADMIN,
    },
  ];

  // Render employee avatar or initials
  const renderEmployeeAvatar = (row: RoleAccessUser) => {
    if (row.avatar) {
      return (
        <img
          src={row.avatar}
          alt={row.name}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-slate-200"
        />
      );
    }
    return (
      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-md bg-gradient-to-br from-[#1b2a6b] to-[#16a085]">
        {getInitials(row.name)}
      </div>
    );
  };

  // Render employee column
  const renderEmployeeColumn = (row: RoleAccessUser) => (
    <div className="flex items-center gap-2.5">
      {renderEmployeeAvatar(row)}
      <div>
        <div className="font-bold text-slate-800 text-[13.5px]">
          {row.name || UI_TEXT.EMPTY_VALUE}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {UI_TEXT.USERNAME_PREFIX}
          {row.username}
        </div>
      </div>
    </div>
  );

  // Render employee ID column
  const renderEmployeeIdColumn = (row: RoleAccessUser) => (
    <span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded-md text-slate-600 border border-slate-200">
      {row.employee_id || UI_TEXT.EMPTY_VALUE}
    </span>
  );

  // Render email column
  const renderEmailColumn = (row: RoleAccessUser) => (
    <span className="text-xs text-slate-600">{row.email}</span>
  );

  // Render gender column
  const renderGenderColumn = (row: RoleAccessUser) => (
    <span className="text-xs text-slate-600 capitalize">
      {row.gender || UI_TEXT.EMPTY_VALUE}
    </span>
  );

  // Render role column
  const renderRoleColumn = (row: RoleAccessUser) => (
    <RoleDropdown user={row} onRoleChange={handleRoleChange} />
  );

  const columns: ColumnDef<RoleAccessUser>[] = [
    {
      key: "name",
      header: COLUMN_HEADERS.EMPLOYEE,
      render: renderEmployeeColumn,
    },
    {
      key: "employee_id",
      header: COLUMN_HEADERS.EMPLOYEE_ID,
      render: renderEmployeeIdColumn,
    },
    {
      key: "email",
      header: COLUMN_HEADERS.EMAIL,
      render: renderEmailColumn,
    },
    {
      key: "gender",
      header: COLUMN_HEADERS.GENDER,
      width: 100,
      render: renderGenderColumn,
    },
    {
      key: "role",
      header: COLUMN_HEADERS.ROLE,
      width: 160,
      render: renderRoleColumn,
    },
  ];

  const extraToolbar = (
    <>
      <FilterSelect
        value={roleFilter}
        onChange={setRoleFilter}
        options={ROLE_FILTER_OPTIONS}
        placeholder={FILTER_CONFIG.ROLE_PLACEHOLDER}
        minWidth={FILTER_CONFIG.MIN_WIDTH_STANDARD}
      />
      <FilterSelect
        value={genderFilter}
        onChange={setGenderFilter}
        options={GENDER_FILTER_OPTIONS}
        placeholder={FILTER_CONFIG.GENDER_PLACEHOLDER}
        minWidth={FILTER_CONFIG.MIN_WIDTH_STANDARD}
      />
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="py-2.5 px-3.5 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] bg-white cursor-pointer text-slate-500 flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors focus:border-[#1b2a6b]"
        >
          <IconX size={14} />
          {FILTER_CONFIG.CLEAR_BUTTON}
        </button>
      )}
    </>
  );

  // Clear page error
  const handleClearPageError = () => {
    setPageError("");
  };

  // Get row key
  const getRowKey = (row: RoleAccessUser): number => row.id;

  // Get empty title
  const getEmptyTitle = (): string => {
    return hasFilters
      ? EMPTY_STATE.NO_FILTERED_TITLE
      : EMPTY_STATE.NO_USERS_TITLE;
  };

  // Get empty subtitle
  const getEmptySubtitle = (): string => {
    return hasFilters
      ? EMPTY_STATE.NO_FILTERED_SUBTITLE
      : EMPTY_STATE.NO_USERS_SUBTITLE;
  };

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Role Access">
      {pageError && (
        <div className="mb-4 py-3 px-4.5 bg-gradient-to-br from-red-50 to-white border border-red-200 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={18} />
            {pageError}
          </span>
          <button
            onClick={handleClearPageError}
            className="bg-none border-none cursor-pointer text-red-600 p-0 hover:text-red-700 transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      <DataTable<RoleAccessUser>
        title={PAGE_CONFIG.TITLE}
        subtitle={PAGE_CONFIG.SUBTITLE}
        icon={<IconShield />}
        rows={users}
        isLoading={isLoading}
        columns={columns}
        actions={[]}
        getKey={getRowKey}
        emptyIcon={EMPTY_STATE.ICON}
        emptyTitle={getEmptyTitle()}
        emptySubtitle={getEmptySubtitle()}
        stats={stats}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel={PAGE_CONFIG.ITEM_LABEL}
        searchQuery={searchQuery}
        searchPlaceholder={SEARCH_CONFIG.PLACEHOLDER}
        onSearchChange={handleSearch}
        extraToolbar={extraToolbar}
      />
    </Layout>
  );
}
