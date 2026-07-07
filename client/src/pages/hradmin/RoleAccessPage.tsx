import React, { useCallback, useEffect, useRef, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  getRoleAccess,
  updateUserRole,
  RoleAccessUser,
} from "../../api/hradmin.api";
import DataTable, { ColumnDef, StatCard } from "../../components/DataTable";
import useDebounce from "../../hooks/useDebounce";

const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
  { label: "Role Access", path: "/hradmin/role-access" },
  { label: "Audit Trail", path: "/hradmin/audit-trail" },
];

const ROLE_OPTIONS = [
  {
    value: "employee",
    label: "Employee",
    color: "#16a34a",
    bg: "#dcfce7",
    border: "#bbf7d0",
  },
  {
    value: "supervisor",
    label: "Supervisor",
    color: "#075985",
    bg: "#e0f2fe",
    border: "#bae6fd",
  },
  {
    value: "hradmin",
    label: "Global Admin",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#c4b5fd",
  },
];

function roleValue(role: string) {
  if (role === "manager") return "supervisor";
  if (role === "empmanager") return "hradmin";
  return role;
}

function getRoleStyle(role: string) {
  return (
    ROLE_OPTIONS.find((r) => r.value === roleValue(role)) ?? {
      color: "#64748b",
      bg: "#f1f5f9",
      border: "#e2e8f0",
      label: role,
    }
  );
}

function getInitials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
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
  const rs = getRoleStyle(user.role);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    if (newRole === user.role) return;
    setSaving(true);
    try {
      await updateUserRole(user.id, newRole);
      onRoleChange(user.id, newRole);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={roleValue(user.role)}
        onChange={handleChange}
        disabled={saving}
        style={{
          padding: "5px 28px 5px 10px",
          border: `1.5px solid ${rs.border}`,
          borderRadius: 8,
          background: rs.bg,
          color: rs.color,
          fontSize: 12.5,
          fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer",
          appearance: "none",
          outline: "none",
          opacity: saving ? 0.6 : 1,
          transition: "all 0.15s",
        }}
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: rs.color,
          fontSize: 10,
        }}
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
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "9px 30px 9px 12px",
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
        {options.map((ooption) => (
          <option key={ooption.value} value={ooption.value}>
            {ooption.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 9,
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
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
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
    ["supervisor", "manager"].includes(u.role),
  ).length;
  const globalCount = users.filter((u) =>
    ["hradmin", "empmanager"].includes(u.role),
  ).length;

  const stats: StatCard[] = [
    {
      label: "Total Users",
      value: totalRecords,
      icon: "👥",
      color: "#1b2a6b",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Employees",
      value: employeeCount,
      icon: "👤",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    {
      label: "Supervisors",
      value: supervisorCount,
      icon: "🛡️",
      color: "#0369a1",
      bg: "#e0f2fe",
      border: "#7dd3fc",
    },
    {
      label: "Global Admin",
      value: globalCount,
      icon: "⚙️",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {row.avatar ? (
            <img
              src={`/uploads/${row.avatar}`}
              alt={row.name}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                border: "2px solid #e2e8f0",
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg,#1b2a6b,#16a085)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(27,42,107,0.2)",
              }}
            >
              {getInitials(row.name)}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13.5 }}>
              {row.name || "—"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
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
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 12.5,
            background: "#f8fafc",
            padding: "3px 8px",
            borderRadius: 6,
            color: "#475569",
            border: "1px solid #e2e8f0",
          }}
        >
          {row.employee_id || "—"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => (
        <span style={{ fontSize: 12.5, color: "#475569" }}>{row.email}</span>
      ),
    },
    {
      key: "gender",
      header: "Gender",
      width: 100,
      render: (row) => (
        <span
          style={{
            fontSize: 12.5,
            color: "#64748b",
            textTransform: "capitalize",
          }}
        >
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 10px",
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
          style={{
            padding: "9px 14px",
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            fontSize: 13,
            background: "#fff",
            cursor: "pointer",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: 5,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          ✕ Clear
        </button>
      )}
    </>
  );

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Role Access">
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

      <DataTable<RoleAccessUser>
        title="Role Access Management"
        subtitle="View and manage user roles across the system"
        icon="🔐"
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
