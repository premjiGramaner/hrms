import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShieldCheck, Crown } from "lucide-react";
import Layout, { TabItem } from "../../components/Layout";
import DataTable, { ColumnDef, StatCard } from "../../components/DataTable";
import useDebounce from "../../hooks/useDebounce";
import { getSuperiorEmployees } from "../../api/employee.api";
import { Employee, PaginatedResponse } from "../../types";
import {
  BASIC_SUPERVISOR_ROLES,
  PAGE_PATHS,
  ROLES,
  isAdminRole,
  type UserRole,
} from "../../config/roles";

const TABS: TabItem[] = [
  { label: "Employee List", path: PAGE_PATHS.employees },
  { label: "Superior Section", path: PAGE_PATHS.employeesSuperior },
  { label: "My Info", path: PAGE_PATHS.myInfo },
];

function displayName(employee: Employee) {
  return (
    employee.name ||
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    "-"
  );
}

function initials(employee: Employee) {
  return displayName(employee)
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarSrc(employee: Employee) {
  if (!employee.avatar) return "";
  return employee.avatar;
}

function displayRole(role: string) {
  if (role === ROLES.SUPERVISOR || role === ROLES.MANAGER) return "Supervisor";
  if (isAdminRole(role)) return "Global Admin";
  return "Employee";
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="py-[9px] pr-8 pl-3 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] outline-none appearance-none bg-white cursor-pointer shadow-sm min-w-[140px]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="absolute right-[10px] top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[11px]">
        v
      </span>
    </div>
  );
}

export default function SuperiorSectionPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Employee[]>([]);
  const [pageData, setPageData] = useState<PaginatedResponse<Employee> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const loadRows = useCallback(
    async (
      nextPage = page,
      nextPageSize = pageSize,
      nextSearch = search,
      nextRole = roleFilter,
    ) => {
      setIsLoading(true);
      try {
        const response = await getSuperiorEmployees({
          page: nextPage,
          limit: nextPageSize,
          search: nextSearch,
          role: nextRole,
        });
        setRows(response.data.data);
        setPageData(response.data);
        setPage(response.data.page);
        setPageError("");
      } catch {
        setPageError("Failed to load superior users. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, search, roleFilter],
  );

  useEffect(() => {
    loadRows(1, pageSize, "", "");
  }, []);

  const debouncedSearch = useDebounce((value: string) => {
    loadRows(1, pageSize, value, roleFilter);
  }, 350);

  const handleSearch = (value: string) => {
    setSearch(value);
    debouncedSearch(value);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    loadRows(1, pageSize, search, value);
  };

  const handlePageChange = (nextPage: number) => {
    loadRows(nextPage, pageSize, search, roleFilter);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    loadRows(1, nextPageSize, search, roleFilter);
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    loadRows(1, pageSize, "", "");
  };

  const supervisorCount = rows.filter((row) =>
    BASIC_SUPERVISOR_ROLES.includes(row.role as UserRole),
  ).length;
  const globalAdminCount = rows.filter((row) => isAdminRole(row.role)).length;

  const stats: StatCard[] = [
    {
      label: "Total",
      value: pageData?.total ?? 0,
      icon: <Users size={26} />,
      color: "#1b2a6b",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Supervisors",
      value: supervisorCount,
      icon: <ShieldCheck size={26} />,
      color: "#075985",
      bg: "#e0f2fe",
      border: "#bae6fd",
    },
    {
      label: "Global Admins",
      value: globalAdminCount,
      icon: <Crown size={26} />,
      color: "#7c3aed",
      bg: "#ede9fe",
      border: "#c4b5fd",
    },
  ];

  const columns: ColumnDef<Employee>[] = [
    {
      key: "employee_id",
      header: "Employee ID",
      render: (employee) => (
        <div className="flex items-center gap-[10px]">
          <div className="w-[34px] h-[34px] rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-white text-[11px] font-bold shadow-[0_2px_6px_rgba(27,42,107,0.18)] bg-gradient-to-br from-[#1b2a6b] to-[#16a085]">
            {employee.avatar ? (
              <img
                src={avatarSrc(employee)}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              initials(employee)
            )}
          </div>
          <span className="font-mono text-[12.5px] bg-slate-50 px-[7px] py-[2px] rounded-md text-slate-600 border border-slate-200">
            {employee.employee_id || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (employee) => (
        <div>
          <div className="font-bold text-slate-800 text-[13.5px]">
            {displayName(employee)}
          </div>
          <div className="text-[11px] text-slate-400 mt-[1px]">
            {employee.email}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: 140,
      render: (employee) => {
        const isGlobalAdmin = isAdminRole(employee.role);
        return (
          <span
            className={`inline-flex text-xs font-bold px-[10px] py-1 rounded-full ${
              isGlobalAdmin
                ? "bg-violet-50 text-violet-600 border border-violet-200"
                : "bg-sky-50 text-sky-700 border border-sky-200"
            }`}
          >
            {displayRole(employee.role)}
          </span>
        );
      },
    },
    {
      key: "job_title",
      header: "Job Title",
      render: (employee) => (
        <span className="text-[13px] text-slate-600">
          {employee.job_title || "-"}
        </span>
      ),
    },
    {
      key: "sub_unit",
      header: "Sub Unit",
      render: (employee) => (
        <span className="text-[13px] text-slate-500">
          {employee.sub_unit || "-"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (employee) => (
        <span className="text-[13px] text-slate-500">
          {employee.location || "-"}
        </span>
      ),
    },
  ];

  const hasFilters = Boolean(search || roleFilter);
  const extraToolbar = (
    <>
      <FilterSelect
        value={roleFilter}
        onChange={handleRoleFilter}
        placeholder="All Roles"
        options={[
          { value: ROLES.SUPERVISOR, label: "Supervisor" },
          { value: ROLES.HR_ADMIN, label: "Global Admin" },
        ]}
      />
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="py-[9px] px-[14px] border-[1.5px] border-slate-200 rounded-[10px] text-[13px] bg-white cursor-pointer text-slate-500 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Clear
        </button>
      )}
    </>
  );

  return (
    <Layout
      title="Employee Management"
      tabs={TABS}
      activeTab="Superior Section"
    >
      {pageError && (
        <div className="mb-4 px-[18px] py-3 border border-red-300 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] shadow-[0_2px_8px_rgba(239,68,68,0.08)] bg-gradient-to-br from-red-50 to-white">
          {pageError}
        </div>
      )}

      <DataTable<Employee>
        title="Superior Section"
        subtitle="Supervisors and global admins available for reporting relationships"
        icon=""
        rows={rows}
        isLoading={isLoading}
        columns={columns}
        actions={[
          {
            label: "View",
            color: "#1b2a6b",
            bg: "#eff6ff",
            bgHover: "#dbeafe",
            borderColor: "#bfdbfe",
            borderColorHover: "#93c5fd",
            onClick: (employee) =>
              employee.id && navigate(PAGE_PATHS.employeeProfile(employee.id)),
            title: "View profile",
          },
        ]}
        getKey={(employee) => employee.id}
        emptyIcon="S"
        emptyTitle={
          hasFilters
            ? "No superior users match the current filters"
            : "No superior users found"
        }
        emptySubtitle={
          hasFilters
            ? "Try adjusting or clearing the filters"
            : "Assign Supervisor or Global Admin roles to show users here"
        }
        stats={stats}
        currentPage={page}
        totalPages={pageData?.totalPages ?? 1}
        totalRecords={pageData?.total ?? 0}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="superior users"
        searchQuery={search}
        searchPlaceholder="Search by name, email, role, job title..."
        onSearchChange={handleSearch}
        extraToolbar={extraToolbar}
      />
    </Layout>
  );
}
