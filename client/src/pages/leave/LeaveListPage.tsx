import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchLeaves, setFilters } from "../../store/leaveSlice";
import {
  getLeaveTypes,
  getLeaveFilterOptions,
  searchLeaveEmployees,
  approveLeave,
  rejectLeave,
  cancelLeave,
  exportSummaryExcel,
  exportDetailExcel,
} from "../../api/leave.api";
import { LeaveType, LeaveRequest, LeaveFilters } from "../../types";
import { getApiErrorMessage } from "../../utils/errors";
import LeaveLayout from "./LeaveLayout";
import Toast, { useToast } from "../../components/Toast";
import EmployeeLeaveFilter from "./components/EmployeeLeaveFilter";
import Pagination from "../../components/Pagination";
import {
  ADMIN_ROLES,
  SUPERVISOR_ROLES,
  type UserRole,
} from "../../config/roles";

const ATTACH_STATUSES = ["Available", "Pending"];
const STATUS_OPTIONS = [
  "Cancelled",
  "Pending Approval",
  "Scheduled",
  "Rejected",
  "Approved",
];

const today = new Date();

const fromDate = new Date(today.getFullYear(), today.getMonth(), 21);

const toDate = new Date(today.getFullYear(), today.getMonth() + 1, 20);

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const from_date = formatDate(fromDate);
const to_date = formatDate(toDate);

const EMPTY_FORM: LeaveFilters = {
  from_date: from_date,
  to_date: to_date,
  employee_name: "",
  sub_unit: "",
  location: "",
  leave_type_id: "",
  job_title: "",
  employment_status: "",
  job_category: "",
  attachment_status: "",
  include_past: false,
  only_subordinates: false,
  statuses: [],
  page: 1,
  limit: 10,
};

interface EmployeeSuggestion {
  id: number;
  employee_id: string;
  name: string;
  username: string;
}

interface FilterOption {
  id: number;
  name: string;
}

interface FilterOptions {
  sub_units: FilterOption[];
  locations: string[];
  job_titles: FilterOption[];
  employment_statuses: string[];
  job_categories: FilterOption[];
}

function RejectModal({
  leaveId,
  onConfirm,
  onCancel,
}: {
  leaveId: number;
  onConfirm: (r: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4">
          Reject Leave #{leaveId}
        </h3>
        <label className="block text-sm text-slate-600 mb-1">
          Rejection Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="Enter reason…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-blue-400 transition"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span>{status}</span>;
}

function EmployeeAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (emp: EmployeeSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<EmployeeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      const results = await searchLeaveEmployees(value).catch(() => []);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 250);
  }, [value]);

  useEffect(() => {
    const h = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type name, ID or username…"
        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 bg-white transition"
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto">
          {suggestions.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                onSelect(emp);
                setOpen(false);
                onChange(emp.name);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer transition flex items-center gap-2"
            >
              <span className="font-mono text-xs text-slate-400 w-20 flex-shrink-0">
                {emp.employee_id || emp.username}
              </span>
              <span className="text-slate-700">{emp.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeaveListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data, loading, filters } = useAppSelector((s) => s.leaves);
  const user = useAppSelector((s) => s.auth.user);

  const isAdmin =
    ADMIN_ROLES.includes((user?.role || "") as UserRole) ||
    SUPERVISOR_ROLES.includes((user?.role || "") as UserRole);
  const { toasts, addToast, removeToast } = useToast();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [filterOpts, setFilterOpts] = useState<FilterOptions>({
    sub_units: [],
    locations: [],
    job_titles: [],
    employment_statuses: [],
    job_categories: [],
  });
  const [form, setForm] = useState<LeaveFilters>({ ...EMPTY_FORM });
  const [panelOpen, setPanelOpen] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        getLeaveTypes().catch(() => []),
        getLeaveFilterOptions().catch(() => ({
          sub_units: [],
          locations: [],
          job_titles: [],
          employment_statuses: [],
          job_categories: [],
        })),
      ]).then(([types, opts]) => {
        setLeaveTypes(types as LeaveType[]);
        setFilterOpts(opts as FilterOptions);
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    const init = isAdmin
      ? { ...EMPTY_FORM, page: 1 }
      : { from_date: "", to_date: "", statuses: [], page: 1, limit: 10 };
    dispatch(setFilters(init));
    dispatch(fetchLeaves(init));
    setSearchTriggered(true);
  }, []);

  const handleSearch = () => {
    const forms = { ...form, page: 1 };
    if (
      forms.statuses?.includes("Taken") &&
      !forms.statuses.includes("Approved")
    ) {
      forms.statuses = [...forms.statuses, "Approved"];
    }
    dispatch(setFilters(forms));
    dispatch(fetchLeaves(forms));
    setSearchTriggered(true);
  };

  const handleReset = () => {
    const init = isAdmin
      ? { ...EMPTY_FORM }
      : { from_date: "", to_date: "", statuses: [], page: 1, limit: 10 };
    setForm(init);
    setPanelOpen(true);
    dispatch(setFilters(init));
    dispatch(fetchLeaves(init));
    setSearchTriggered(true);
  };

  const handlePageChange = (newPage: number) => {
    const filter = { ...filters, page: newPage };
    dispatch(setFilters(filter));
    dispatch(fetchLeaves(filter));
    setForm((prev) => ({ ...prev, page: newPage }));
  };

  const toggleStatus = (status: string) => {
    setForm((prev) => {
      const s = prev.statuses || [];
      if (status === "All")
        return {
          ...prev,
          statuses:
            s.length === STATUS_OPTIONS.length ? [] : [...STATUS_OPTIONS],
        };
      return {
        ...prev,
        statuses: s.includes(status)
          ? s.filter((x) => x !== status)
          : [...s, status],
      };
    });
  };

  const isAllChecked = (form.statuses || []).length === STATUS_OPTIONS.length;
  const isSomeChecked = (form.statuses || []).length > 0 && !isAllChecked;

  const handleApprove = useCallback(
    async (id: number) => {
      setActionLoading(id);
      try {
        await approveLeave(id);
        addToast("Leave approved.", "success");
        dispatch(fetchLeaves({ ...filters }));
      } catch (event) {
        addToast(getApiErrorMessage(event, "Failed to approve."), "error");
      } finally {
        setActionLoading(null);
      }
    },
    [filters],
  );

  const handleRejectConfirm = useCallback(
    async (reason: string) => {
      if (!rejectTarget) return;
      setActionLoading(rejectTarget);
      setRejectTarget(null);
      try {
        await rejectLeave(rejectTarget, reason);
        addToast("Leave rejected.", "success");
        dispatch(fetchLeaves({ ...filters }));
      } catch (event) {
        addToast(getApiErrorMessage(event, "Failed to reject."), "error");
      } finally {
        setActionLoading(null);
      }
    },
    [rejectTarget, filters],
  );

  const handleCancel = useCallback(
    async (id: number) => {
      if (!window.confirm("Cancel this leave request?")) return;
      setActionLoading(id);
      try {
        await cancelLeave(id);
        addToast("Leave cancelled.", "success");
        dispatch(fetchLeaves({ ...filters }));
      } catch (event) {
        addToast(getApiErrorMessage(event, "Failed to cancel."), "error");
      } finally {
        setActionLoading(null);
      }
    },
    [filters],
  );

  const handleExport = async (type: "summary" | "detail") => {
    try {
      type === "summary"
        ? await exportSummaryExcel(filters)
        : await exportDetailExcel(filters);
    } catch (event) {
      addToast(getApiErrorMessage(event, "Export failed."), "error");
    }
  };

  const inputCls =
    "w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 bg-white transition";
  const selectCls =
    "w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 bg-white transition appearance-none cursor-pointer";
  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />
      {rejectTarget && (
        <RejectModal
          leaveId={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {!isAdmin && (
        <EmployeeLeaveFilter
          from_date={form.from_date || ""}
          to_date={form.to_date || ""}
          statuses={form.statuses || []}
          onFromDateChange={(value) =>
            setForm((p) => ({ ...p, from_date: value }))
          }
          onToDateChange={(value) => setForm((p) => ({ ...p, to_date: value }))}
          onStatusesChange={(statuses) => setForm((p) => ({ ...p, statuses }))}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      )}

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-5">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">
              Search{" "}
              <span className="text-xs text-slate-400 font-normal ml-1">
                (Please specify your search)
              </span>
            </span>
            <button
              onClick={() => setPanelOpen((o) => !o)}
              className="text-slate-400 hover:text-slate-600 text-base leading-none cursor-pointer bg-transparent border-none select-none"
            >
              {panelOpen ? "▲" : "▼"}
            </button>
          </div>
          {panelOpen && (
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={form.from_date || ""}
                    onChange={(event) => {
                      const newFromDate = event.target.value;
                      setForm((p) => {
                        if (
                          p.to_date &&
                          newFromDate &&
                          p.to_date < newFromDate
                        ) {
                          return {
                            ...p,
                            from_date: newFromDate,
                            to_date: newFromDate,
                          };
                        }
                        return { ...p, from_date: newFromDate };
                      });
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={form.to_date || ""}
                    min={form.from_date || undefined}
                    onChange={(event) =>
                      setForm((p) => ({ ...p, to_date: event.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Employee
                  </label>
                  <EmployeeAutocomplete
                    value={form.employee_name || ""}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, employee_name: v }))
                    }
                    onSelect={(emp) =>
                      setForm((p) => ({ ...p, employee_name: emp.name }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Sub Unit
                  </label>
                  <div className="relative">
                    <select
                      value={form.sub_unit || ""}
                      onChange={(event) =>
                        setForm((p) => ({ ...p, sub_unit: event.target.value }))
                      }
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.sub_units.map((units) => (
                        <option key={units.id} value={units.name}>
                          {units.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▾
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Location
                  </label>
                  <div className="relative">
                    <select
                      value={form.location || ""}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          location: event.target.value,
                        }))
                      }
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▾
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Leave Type
                  </label>
                  <div className="relative">
                    <select
                      value={form.leave_type_id || ""}
                      onChange={(event) =>
                        setForm((p) => ({
                          ...p,
                          leave_type_id: event.target.value,
                        }))
                      }
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {leaveTypes.map((leaveType) => (
                        <option key={leaveType.id} value={String(leaveType.id)}>
                          {leaveType.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▾
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Job Title
                  </label>
                  <div className="relative">
                    <select
                      value={form.job_title || ""}
                      onChange={(event) =>
                        setForm((p) => ({
                          ...p,
                          job_title: event.target.value,
                        }))
                      }
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.job_titles.map((JobTitle) => (
                        <option key={JobTitle.id} value={JobTitle.name}>
                          {JobTitle.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▾
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Employment Status
                  </label>
                  <div className="relative">
                    <select
                      value={form.employment_status || ""}
                      onChange={(event) =>
                        setForm((p) => ({
                          ...p,
                          employment_status: event.target.value,
                        }))
                      }
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.employment_statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▾
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Job Category
                  </label>
                  <div className="relative">
                    <select
                      value={form.job_category || ""}
                      onChange={(event) =>
                        setForm((p) => ({
                          ...p,
                          job_category: event.target.value,
                        }))
                      }
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.job_categories.map((categories) => (
                        <option key={categories.id} value={categories.name}>
                          {categories.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▾
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Attachment Status
                  </label>
                  <div className="relative">
                    <select
                      value={form.attachment_status || ""}
                      onChange={(event) =>
                        setForm((p) => ({
                          ...p,
                          attachment_status: event.target.value,
                        }))
                      }
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {ATTACH_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▾
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-5 mb-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.include_past || false}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        include_past: event.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-blue-900"
                  />
                  Include Past Employees
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.only_subordinates || false}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        only_subordinates: event.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-blue-900"
                  />
                  Only Show My Subordinate's Leave
                </label>
              </div>
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Show Leave with Status
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeChecked;
                      }}
                      onChange={() => toggleStatus("All")}
                      className="w-4 h-4 accent-blue-900"
                    />
                    All
                  </label>
                  {STATUS_OPTIONS.map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(form.statuses || []).includes(s)}
                        onChange={() => toggleStatus(s)}
                        className="w-4 h-4 accent-blue-900"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={handleReset}
                  className="px-5 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium cursor-pointer hover:bg-slate-700 transition"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleExport("summary")}
                  className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium cursor-pointer hover:bg-teal-700 transition"
                >
                  Export Summary
                </button>
                <button
                  onClick={() => handleExport("detail")}
                  className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium cursor-pointer hover:bg-teal-700 transition"
                >
                  Export Detail
                </button>
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-semibold cursor-pointer hover:opacity-90 transition"
                >
                  Search
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {data
              ? `${data.total} record${data.total !== 1 ? "s" : ""}`
              : "Results"}
          </span>
          {isAdmin && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded border border-slate-200 hover:bg-slate-200 transition cursor-pointer">
              ⚙ Save
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100">
                {[
                  "Employee ID",
                  "Employee Name",
                  "Date",
                  "Applied On",
                  "Leave Type",
                  "Net Leave Balance",
                  "Requested Duration",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                searchTriggered &&
                (!data || data.data.length === 0) && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-16 text-slate-400"
                    >
                      <div className="text-3xl mb-2">📋</div>
                      <div className="text-sm">No leave records found</div>
                    </td>
                  </tr>
                )}
              {!loading &&
                data?.data.map((row: LeaveRequest, i: number) => {
                  const isRequester = !!(
                    row.user_id &&
                    user?.id &&
                    String(row.user_id) === String(user.id)
                  );
                  return (
                    <tr
                      key={row.id}
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            "[data-action-cell]",
                          )
                        )
                          return;
                        navigate(`/leave/view_leave_list/details/${row.id}`);
                      }}
                      className={`border-b border-slate-100 hover:bg-emerald-50 transition-colors cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                    >
                      <td className="px-3 py-2.5 text-xs font-mono text-slate-700">
                        {row.employee_id || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-800 font-medium whitespace-nowrap">
                        {row.employee_name || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                        {row.start_date}
                        {row.start_date !== row.end_date && (
                          <span> to {row.end_date}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                        {row.applied_on ? row.applied_on.substring(0, 10) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">
                        {row.leave_type}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className="text-blue-700 font-semibold">
                          {Number(row.net_leave_balance ?? 0).toFixed(2)} day(s)
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">
                        {Number(row.requested_days).toFixed(2)} day(s)
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={row.status} />
                          <span className="text-xs text-slate-400">
                            ({Number(row.requested_days).toFixed(2)} day(s))
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5" data-action-cell="true">
                        <ActionDropdown
                          row={row}
                          isAdmin={isAdmin}
                          isRequester={isRequester}
                          loading={actionLoading === row.id}
                          onApprove={() => handleApprove(row.id)}
                          onReject={() => setRejectTarget(row.id)}
                          onCancel={() => handleCancel(row.id)}
                          currentUserId={user?.id}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && (
          <Pagination
            currentPage={data.page}
            totalPages={data.totalPages}
            totalRecords={data.total}
            pageSize={filters.limit || 10}
            onPageChange={(page) => {
              handlePageChange(page);
            }}
            onPageSizeChange={(size) => {
              const filter = { ...filters, limit: size, page: 1 };
              dispatch(setFilters(filter));
              dispatch(fetchLeaves(filter));
              setForm((prev) => ({ ...prev, limit: size, page: 1 }));
            }}
            itemLabel="leave records"
          />
        )}
      </div>
    </LeaveLayout>
  );
}
function ActionDropdown({
  row,
  isAdmin,
  isRequester,
  loading,
  onApprove,
  onReject,
  onCancel,
  currentUserId,
}: {
  row: LeaveRequest;
  isAdmin: boolean;
  isRequester: boolean;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  currentUserId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top: r.bottom + window.scrollY + 4,
        left: r.right + window.scrollX,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const h = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener("scroll", h, true);
    return () => window.removeEventListener("scroll", h, true);
  }, [open]);

  if (loading)
    return (
      <div className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-2" />
    );

  const isPending = row.status === "Pending Approval";

  let isSupervisor = false;
  if (currentUserId && row.supervisors) {
    try {
      const supervisorArray =
        typeof row.supervisors === "string"
          ? JSON.parse(row.supervisors)
          : row.supervisors;
      isSupervisor =
        Array.isArray(supervisorArray) &&
        supervisorArray.includes(String(currentUserId));
    } catch (e) {
      isSupervisor = false;
    }
  }

  const canApproveReject =
    (isAdmin || isSupervisor) && !isRequester && isPending;
  const canCancel = isPending && (isRequester || isAdmin || isSupervisor);

  if (!canApproveReject && !canCancel) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition whitespace-nowrap"
      >
        Select Action
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translateX(-100%)",
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-36"
        >
          {canApproveReject && (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  onApprove();
                }}
                className="w-full text-left px-4 py-2 text-xs text-green-700 hover:bg-green-50 transition cursor-pointer"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onReject();
                }}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                ✕ Reject
              </button>
            </>
          )}
          {canCancel && (
            <button
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              ⊘ Cancel
            </button>
          )}
        </div>
      )}
    </>
  );
}
