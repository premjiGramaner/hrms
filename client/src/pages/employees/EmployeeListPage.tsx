import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout, { TabItem } from "../../components/Layout";
import { Employee } from "../../types";
import AddEmployeeModal from "./AddEmployeeModal";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchEmployees,
  setPage,
  setLimit,
  setSearch,
} from "../../store/employeeSlice";
import DataTable, { ColumnDef, StatCard } from "../../components/DataTable";

const TABS: TabItem[] = [
  { label: "Employee List", path: "/employees" },
  { label: "Superior Section", path: "/employees/superior-section" },
  { label: "My Info", path: "/my-info" },
];

const getDisplayName = (employe: Employee) =>
  employe.name ||
  `${employe.first_name || ""} ${employe.last_name || ""}`.trim() ||
  "—";

const getInitials = (employee: Employee) => {
  const employeName = getDisplayName(employee);
  return employeName !== "—"
    ? employeName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "EE";
};

const getSupervisor = (employee: Employee): string => {
  // Check for supervisor_names first (new field with actual names)
  if (employee.supervisor_names) {
    const names = Array.isArray(employee.supervisor_names)
      ? employee.supervisor_names
      : [];
    return names.length > 0 ? names.join(", ") : "—";
  }

  // Fallback to old supervisors field if it exists
  if (
    !employee.supervisors ||
    !Array.isArray(employee.supervisors) ||
    employee.supervisors.length === 0
  )
    return "—";

  return String(employee.supervisors[0]);
};

export default function EmployeeListPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, loading, page, limit, search } = useAppSelector(
    (state) => state.employees,
  );

  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string) => {
    setSuccess(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSuccess("");
      timerRef.current = null;
    }, 3000);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    dispatch(fetchEmployees({ page, limit, search }));
  }, [dispatch, page, limit, search]);

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (!message) return;
    flash(message);
    navigate(location.pathname, { replace: true });
  }, [flash, location.pathname, location.state, navigate]);

  const allRows = data?.data || [];

  const activeCount = allRows.filter((e) => e.is_active !== false).length;
  const inactiveCount = allRows.length - activeCount;

  const stats: StatCard[] = [
    {
      label: "Total",
      value: data?.total ?? 0,
      icon: "👥",
      color: "#1b2a6b",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Active",
      value: activeCount,
      icon: "✅",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      icon: "⏸",
      color: "#94a3b8",
      bg: "#f8fafc",
      border: "#e2e8f0",
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
            }}
          >
            {employee.avatar ? (
              <img
                src={`/${employee.avatar}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt=""
              />
            ) : (
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
                {getInitials(employee)}
              </span>
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
            {employee.employee_id || "—"}
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
            {getDisplayName(employee)}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
            {employee.email}
          </div>
        </div>
      ),
    },
    {
      key: "job_title",
      header: "Job Title",
      render: (employee) => (
        <span style={{ fontSize: 13, color: "#475569" }}>
          {employee.job_title || "—"}
        </span>
      ),
    },
    {
      key: "employment_status",
      header: "Employment Status",
      render: (employee) => {
        const status = employee.employment_status || employee.status || "";
        return status ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              background: "#f1f5f9",
              color: "#475569",
              border: "1px solid #e2e8f0",
            }}
          >
            {status}
          </span>
        ) : (
          <span style={{ color: "#cbd5e1" }}>—</span>
        );
      },
    },
    {
      key: "sub_unit",
      header: "Sub Unit",
      render: (employee) => (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {employee.sub_unit || "—"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (employee) => (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {employee.location || "—"}
        </span>
      ),
    },
    {
      key: "supervisors",
      header: "Supervisor",
      render: (employee) => (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {getSupervisor(employee)}
        </span>
      ),
    },
  ];

  const totalPages = data?.totalPages ?? 1;
  const totalRecords = data?.total ?? 0;

  const handlePageChange = (page: number) => dispatch(setPage(page));
  const handlePageSizeChange = (size: number) => dispatch(setLimit(size));

  return (
    <Layout title="Employee Management" tabs={TABS} activeTab="Employee List">
      {success && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 18px",
            background: "linear-gradient(135deg,#f0fdf4,#fff)",
            border: "1px solid #bbf7d0",
            borderLeft: "4px solid #22c55e",
            borderRadius: 12,
            color: "#15803d",
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 8px rgba(34,197,94,0.08)",
          }}
        >
          ✓ {success}
        </div>
      )}

      <DataTable<Employee>
        title="Employee List"
        subtitle="View and manage employee profile information"
        icon="👥"
        rows={allRows}
        isLoading={loading}
        columns={columns}
        actions={[
          {
            label: "View",
            color: "#1b2a6b",
            bg: "#eff6ff",
            bgHover: "#dbeafe",
            borderColor: "#bfdbfe",
            borderColorHover: "#93c5fd",
            icon: (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ),
            onClick: (employee) =>
              employee.id && navigate(`/employees/${employee.id}/profile`),
            title: "View profile",
          },
        ]}
        getKey={(employee) => employee.id}
        emptyIcon="👤"
        emptyTitle={
          search ? `No results for "${search}"` : "No employees found"
        }
        emptySubtitle={
          search
            ? "Try a different search term"
            : "Click 'Add Employee' to get started"
        }
        stats={stats}
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={limit}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="employees"
        searchQuery={search}
        searchPlaceholder="Search by name, ID, email, job title…"
        onSearchChange={(value) => dispatch(setSearch(value))}
        addLabel="Add Employee"
        onAdd={() => {
          setEditEmployee(null);
          setShowModal(true);
        }}
      />

      {showModal && (
        <AddEmployeeModal
          employee={editEmployee}
          onClose={() => {
            setShowModal(false);
            setEditEmployee(null);
          }}
          onSaved={() => {
            dispatch(fetchEmployees({ page, limit, search }));
            flash(
              editEmployee
                ? "Employee updated successfully."
                : "Employee created successfully.",
            );
          }}
        />
      )}
    </Layout>
  );
}
