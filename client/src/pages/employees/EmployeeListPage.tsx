import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IconUsers, IconUser, IconEye } from "../../components/Icons";
import { ShieldCheck } from "lucide-react";
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
import Toast from "../../utils/toast";
import {
  BASIC_SUPERVISOR_ROLES,
  PAGE_PATHS,
  ROLES,
  type UserRole,
} from "../../config/roles";

const THEME_COLORS = {
  navy: {
    primary: "#1b2a6b",
    dark: "#162058",
  },
  teal: {
    primary: "#16a085",
    dark: "#117a62",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
  },
  green: {
    50: "#f0fdf4",
    500: "#22c55e",
    600: "#16a34a",
    border: "#bbf7d0",
    bg: "#dcfce7",
  },
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    500: "#0284c7",
    600: "#075985",
    bg: "#e0f2fe",
    border: "#bae6fd",
  },
  white: "#fff",
  gradient: {
    primary: "linear-gradient(135deg, #1b2a6b, #16a085)",
  },
} as const;

const TABS: TabItem[] = [
  { label: "Employee List", path: PAGE_PATHS.employees },
  { label: "Superior Section", path: PAGE_PATHS.employeesSuperior },
  { label: "My Info", path: PAGE_PATHS.myInfo },
];

export const getDisplayName = (employe: Employee) =>
  employe.name ||
  `${employe.first_name || ""} ${employe.last_name || ""}`.trim() ||
  "—";

const getInitials = (employee: Employee) => {
  const employeName = getDisplayName(employee);
  return employeName !== "—"
    ? employeName
        .split(" ")
        .map((employee) => employee[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "EE";
};

const getSupervisor = (employee: Employee): string => {
  if (employee.supervisor_names) {
    const names = Array.isArray(employee.supervisor_names)
      ? employee.supervisor_names
      : [];
    return names.length > 0 ? names.join(", ") : "—";
  }

  if (employee.supervisors) {
    const names = Array.isArray(employee.supervisors)
      ? employee.supervisors
      : [];
    return names.length > 0 ? names.join(", ") : "—";
  }

  return "—";
};

export default function EmployeeListPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, loading, page, limit, search } = useAppSelector(
    (state) => state.employees,
  );

  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    dispatch(fetchEmployees({ page, limit, search }));
  }, [dispatch, page, limit, search]);

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (!message) return;
    Toast.success(message);
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate]);

  const allRows = data?.data || [];

  const employeeCount = allRows.filter(
    (event) => event.role === ROLES.EMPLOYEE || !event.role,
  ).length;
  const supervisorCount = allRows.filter((event) =>
    BASIC_SUPERVISOR_ROLES.includes((event.role || "") as UserRole),
  ).length;

  const stats: StatCard[] = [
    {
      label: "Total",
      value: data?.total || 0,
      icon: <IconUsers size={20} />,
      color: THEME_COLORS.navy.primary,
      bg: THEME_COLORS.blue[50],
      border: THEME_COLORS.blue[200],
    },
    {
      label: "Employees",
      value: employeeCount,
      icon: <IconUser size={20} />,
      color: THEME_COLORS.green[600],
      bg: THEME_COLORS.green[50],
      border: THEME_COLORS.green.border,
    },
    {
      label: "Supervisors",
      value: supervisorCount,
      icon: <ShieldCheck size={20} />,
      color: THEME_COLORS.blue[600],
      bg: THEME_COLORS.blue.bg,
      border: THEME_COLORS.blue.border,
    },
  ];

  const columns: ColumnDef<Employee>[] = [
    {
      key: "employee_id",
      header: "Employee ID",
      render: (employee) => (
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1b2a6b] to-[#16a085] shadow-[0_2px_6px_rgba(27,42,107,0.18)]">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <span className="text-white text-[11px] font-bold">
                {getInitials(employee)}
              </span>
            )}
          </div>
          <span className="font-mono text-xs bg-slate-50 px-[7px] py-0.5 rounded-md text-slate-600 border border-slate-200">
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
          <div className="font-bold text-slate-800 text-[13.5px]">
            {getDisplayName(employee)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {employee.email}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      width: 130,
      render: (employee) => {
        const isSupervisor = BASIC_SUPERVISOR_ROLES.includes(
          (employee.role || "") as UserRole,
        );
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isSupervisor
                ? "bg-[#e0f2fe] text-[#075985] border-[#bae6fd]"
                : "bg-[#dcfce7] text-[#16a34a] border-[#bbf7d0]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSupervisor ? "bg-[#0284c7]" : "bg-[#22c55e]"
              }`}
            />
            {isSupervisor ? "Supervisor" : "Employee"}
          </span>
        );
      },
    },
    {
      key: "job_title",
      header: "Job Title",
      render: (employee) => (
        <span className="text-slate-600 text-[13px]">
          {employee.job_title || "—"}
        </span>
      ),
    },
    {
      key: "sub_unit",
      header: "Sub Unit",
      render: (employee) => (
        <span className="text-[13px] text-slate-500">
          {employee.sub_unit || "—"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (employee) => (
        <span className="text-[13px] text-slate-500">
          {employee.location || "—"}
        </span>
      ),
    },
    {
      key: "supervisors",
      header: "Supervisor",
      render: (employee) => (
        <span className="text-[13px] text-slate-500">
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
            color: THEME_COLORS.navy.primary,
            bg: THEME_COLORS.blue[50],
            bgHover: THEME_COLORS.blue[100],
            borderColor: THEME_COLORS.blue[200],
            borderColorHover: THEME_COLORS.blue[300],
            icon: <IconEye size={13} />,
            onClick: (employee) =>
              employee.id && navigate(PAGE_PATHS.employeeProfile(employee.id)),
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
          }}
        />
      )}
    </Layout>
  );
}
