import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout, { TabItem } from "../../components/Layout";
import { Employee } from "../../types";
import AddEmployeeModal from "./AddEmployeeModal";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchEmployees, setPage } from "../../store/employeeSlice";

const TABS: TabItem[] = [
  { label: "Employee List", path: "/employees" },
  { label: "My Info", path: "/my-info" },
];

const COLS = [
  "Employee Id",
  "Name",
  "Job Title",
  "Employment Status",
  "Sub Unit",
  "Location",
  "Supervisor",
];

export default function EmployeeListPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, loading, page } = useAppSelector((state) => state.employees);
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const clearSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const flash = useCallback((msg: string) => {
    setSuccess(msg);

    if (clearSuccessTimeoutRef.current) {
      clearTimeout(clearSuccessTimeoutRef.current);
    }

    clearSuccessTimeoutRef.current = setTimeout(() => {
      setSuccess("");
      clearSuccessTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (clearSuccessTimeoutRef.current) {
        clearTimeout(clearSuccessTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    dispatch(fetchEmployees(page));
  }, [dispatch, page]);

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (!message) return;

    flash(message);
    navigate(location.pathname, { replace: true });
  }, [flash, location.pathname, location.state, navigate]);

  const fetchData = (pageNum: number) => dispatch(fetchEmployees(pageNum));

  const openAdd = () => {
    setEditEmployee(null);
    setShowModal(true);
  };

  const openProfile = (emp: Employee) => {
    if (emp.id) {
      navigate(`/employees/${emp.id}/profile`);
    }
  };

  const rows = (data?.data || []).filter(
    (user) =>
      !search ||
      (user.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.employee_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.job_title || "").toLowerCase().includes(search.toLowerCase()),
  );

  const getSupervisorLabel = (emp: Employee): string => {
    if (
      !emp.supervisors ||
      !Array.isArray(emp.supervisors) ||
      emp.supervisors.length === 0
    ) {
      return "-";
    }

    return String(emp.supervisors[0]);
  };

  const getDisplayName = (emp: Employee) =>
    emp.name ||
    `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
    "-";

  const initials = (emp: Employee) => {
    const fullName = getDisplayName(emp);
    return fullName !== "-"
      ? fullName
          .split(" ")
          .map((word) => word[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "EE";
  };

  return (
    <Layout
      title="Employee Management"
      tabs={TABS}
      activeTab="Employee List"
    >
      {success && (
        <div className="mb-4 rounded-xl border-l-4 border-green-400 bg-green-50 p-3 text-sm text-green-900">
          {success}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Employee List</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            View and manage employee profile information.
          </p>
        </div>

        <div className="relative w-full md:w-80">
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
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-50"
          />
        </div>
      </div>

      <div className="relative rounded-2xl bg-white shadow-sm">
        <button
          type="button"
          onClick={openAdd}
          aria-label="Add employee"
          className="absolute right-6 top-[-1.75rem] z-20 flex h-14 w-14 items-center justify-center rounded-full border-none bg-blue-950 text-4xl leading-none text-white shadow-2xl transition hover:bg-blue-900"
        >
          +
        </button>

        <div className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                {COLS.map((header) => (
                  <th
                    key={header}
                    className="px-5 py-5 text-left text-xs font-bold text-slate-700 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={COLS.length}
                    className="py-16 text-center text-slate-400"
                  >
                    <div className="text-sm">Loading employees...</div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={COLS.length}
                    className="py-16 text-center text-slate-400"
                  >
                    <div className="text-sm">No employees found</div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => openProfile(emp)}
                    className="cursor-pointer border-b border-slate-100 bg-white transition-colors last:border-b-0 hover:bg-teal-50/60"
                  >
                    <td className="px-5 py-4 text-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-900 to-teal-600 text-xs font-bold text-white">
                          {emp.avatar ? (
                            <img
                              src={`/${emp.avatar}`}
                              className="h-full w-full object-cover"
                              alt=""
                            />
                          ) : (
                            initials(emp)
                          )}
                        </div>
                        <span className="font-medium">
                          {emp.employee_id || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {getDisplayName(emp)}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {emp.job_title || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {emp.employment_status || emp.status || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {emp.sub_unit || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {emp.location || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {getSupervisorLabel(emp)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-end">
            <span>
              Rows per page <strong className="ml-3 text-slate-700">50</strong>
            </span>
            <span className="text-slate-700">
              {(data.page - 1) * 15 + (rows.length > 0 ? 1 : 0)} -{" "}
              {(data.page - 1) * 15 + rows.length} of {data.total}
            </span>
            <button
              onClick={() => dispatch(setPage(page - 1))}
              disabled={page === 1}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => dispatch(setPage(page + 1))}
              disabled={page === data.totalPages}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
        </div>
      </div>

      {showModal && (
        <AddEmployeeModal
          employee={editEmployee}
          onClose={() => {
            setShowModal(false);
            setEditEmployee(null);
          }}
          onSaved={() => {
            fetchData(page);
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
