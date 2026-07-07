import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShieldCheck, Crown, UserCheck } from "lucide-react";
import Layout, { TabItem } from "../../components/Layout";
import DataTable, { ColumnDef, StatCard } from "../../components/DataTable";
import useDebounce from "../../hooks/useDebounce";
import { getSuperiorEmployees } from "../../api/employee.api";
import { Employee, PaginatedResponse } from "../../types";

const TABS: TabItem[] = [
  { label: "Employee List", path: "/employees" },
  { label: "Superior Section", path: "/employees/superior-section" },
  { label: "My Info", path: "/my-info" },
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
  return employee.avatar.startsWith("uploads/")
    ? `/${employee.avatar}`
    : `/uploads/${employee.avatar}`;
}

function displayRole(role: string) {
  if (role === "supervisor" || role === "manager") return "Supervisor";
  if (role === "hradmin" || role === "empmanager") return "Global Admin";
  return "Employee";
}

function roleBadge(role: string) {
  if (role === "hradmin" || role === "empmanager") {
    return { bg: "#ede9fe", color: "#7c3aed", border: "#c4b5fd" };
  }
  return { bg: "#e0f2fe", color: "#075985", border: "#bae6fd" };
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  minWidth = 140,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  minWidth?: number;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          padding: "9px 32px 9px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 13,
          outline: "none",
          appearance: "none",
          background: "#fff",
          cursor: "pointer",
          minWidth,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
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
  const [statusFilter, setStatusFilter] = useState("");

  const loadRows = useCallback(
    async (
      nextPage = page,
      nextPageSize = pageSize,
      nextSearch = search,
      nextRole = roleFilter,
      nextStatus = statusFilter,
    ) => {
      setIsLoading(true);
      try {
        const response = await getSuperiorEmployees({
          page: nextPage,
          limit: nextPageSize,
          search: nextSearch,
          role: nextRole,
          status: nextStatus,
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
    [page, pageSize, search, roleFilter, statusFilter],
  );

  useEffect(() => {
    loadRows(1, pageSize, "", "", "");
  }, []);

  const debouncedSearch = useDebounce((value: string) => {
    loadRows(1, pageSize, value, roleFilter, statusFilter);
  }, 350);

  const handleSearch = (value: string) => {
    setSearch(value);
    debouncedSearch(value);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    loadRows(1, pageSize, search, value, statusFilter);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    loadRows(1, pageSize, search, roleFilter, value);
  };

  const handlePageChange = (nextPage: number) => {
    loadRows(nextPage, pageSize, search, roleFilter, statusFilter);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    loadRows(1, nextPageSize, search, roleFilter, statusFilter);
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
    loadRows(1, pageSize, "", "", "");
  };

  const supervisorCount = rows.filter((row) =>
    ["supervisor", "manager"].includes(row.role),
  ).length;
  const globalAdminCount = rows.filter((row) =>
    ["hradmin", "empmanager"].includes(row.role),
  ).length;
  const activeCount = rows.filter((row) => row.is_active !== false).length;

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
    {
      label: "Active",
      value: activeCount,
      icon: <UserCheck size={26} />,
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
  ];

  const columns: ColumnDef<Employee>[] = [
    {
      key: "employee_id",
      header: "Employee ID",
      render: (employee) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              flexShrink: 0,
              background: "linear-gradient(135deg,#1b2a6b,#16a085)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 2px 6px rgba(27,42,107,0.18)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {employee.avatar ? (
              <img
                src={avatarSrc(employee)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt=""
              />
            ) : (
              initials(employee)
            )}
          </div>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 12.5,
              background: "#f8fafc",
              padding: "2px 7px",
              borderRadius: 6,
              color: "#475569",
              border: "1px solid #e2e8f0",
            }}
          >
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
          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13.5 }}>
            {displayName(employee)}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
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
        const badge = roleBadge(employee.role);
        return (
          <span
            style={{
              display: "inline-flex",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
            }}
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
        <span style={{ fontSize: 13, color: "#475569" }}>
          {employee.job_title || "-"}
        </span>
      ),
    },
    {
      key: "sub_unit",
      header: "Sub Unit",
      render: (employee) => (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {employee.sub_unit || "-"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (employee) => (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {employee.location || "-"}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      width: 110,
      render: (employee) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 999,
            background: employee.is_active !== false ? "#dcfce7" : "#f1f5f9",
            color: employee.is_active !== false ? "#16a34a" : "#94a3b8",
            border: `1px solid ${employee.is_active !== false ? "#bbf7d0" : "#e2e8f0"}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: employee.is_active !== false ? "#22c55e" : "#cbd5e1",
            }}
          />
          {employee.is_active !== false ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  const hasFilters = Boolean(search || roleFilter || statusFilter);
  const extraToolbar = (
    <>
      <FilterSelect
        value={roleFilter}
        onChange={handleRoleFilter}
        placeholder="All Roles"
        minWidth={140}
        options={[
          { value: "supervisor", label: "Supervisor" },
          { value: "hradmin", label: "Global Admin" },
        ]}
      />
      <FilterSelect
        value={statusFilter}
        onChange={handleStatusFilter}
        placeholder="All Status"
        minWidth={130}
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
      {hasFilters && (
        <button
          onClick={clearFilters}
          style={{
            padding: "9px 14px",
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            fontSize: 13,
            background: "#fff",
            cursor: "pointer",
            color: "#64748b",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
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
            boxShadow: "0 2px 8px rgba(239,68,68,0.08)",
          }}
        >
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
              employee.id && navigate(`/employees/${employee.id}/profile`),
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
