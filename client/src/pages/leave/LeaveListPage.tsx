import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchLeaves, setFilters } from "../../store/leaveSlice";
import { ChevronDown } from "lucide-react";
import LeaveActionDropdown from "./components/LeaveActionDropdown";
import LeaveConfirmationModal from "./components/LeaveConfirmationModal";
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
  PAGE_PATHS,
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

enum LeaveStatus {
  All = "All",
  Taken = "Taken",
  Approved = "Approved",
  PendingApproval = "Pending Approval",
}

enum ExportType {
  Summary = "summary",
  Detail = "detail",
}

enum ConfirmationAction {
  Approve = "approve",
  Cancel = "cancel",
}

interface ConfirmationTarget {
  leaveId: number;
  action: ConfirmationAction;
}

const ButtonStyles =
  "px-6 py-2 rounded-lg bg-gradient-to-r from-[#1b2a6b] to-[#16a085] text-white text-sm font-semibold cursor-pointer border-none hover:opacity-90 shadow-md";
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
  onConfirm: (reason: string) => void;
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
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer transition disabled:opacity-50"
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
  onChange: (employeeName: string) => void;
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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
const isCurrentUserSupervisor = (
  supervisors: LeaveRequest["supervisors"],
  currentUserId?: number,
): boolean => {
  if (!supervisors || !currentUserId) return false;

  try {
    const parsedSupervisors: unknown =
      typeof supervisors === "string" ? JSON.parse(supervisors) : supervisors;

    if (!Array.isArray(parsedSupervisors)) return false;

    return parsedSupervisors.some(
      (supervisorId) => String(supervisorId) === String(currentUserId),
    );
  } catch {
    return false;
  }
};

interface LeaveRowActionsProps {
  leaveRequest: LeaveRequest;
  currentUserId?: number;
  isAdmin: boolean;
  loading: boolean;
  onApprove: (leaveId: number) => void;
  onReject: (leaveId: number) => void;
  onCancel: (leaveId: number) => void;
}

function LeaveRowActions({
  leaveRequest,
  currentUserId,
  isAdmin,
  loading,
  onApprove,
  onReject,
  onCancel,
}: LeaveRowActionsProps) {
  const isRequester = Boolean(
    leaveRequest.user_id &&
    currentUserId &&
    String(leaveRequest.user_id) === String(currentUserId),
  );

  const isSupervisor = isCurrentUserSupervisor(
    leaveRequest.supervisors,
    currentUserId,
  );

  const isPending = leaveRequest.status === LeaveStatus.PendingApproval;

  const canApproveReject =
    (isAdmin || isSupervisor) && !isRequester && isPending;

  const canCancel = isPending && (isRequester || isAdmin || isSupervisor);

  const handleApproveClick = () => {
    onApprove(leaveRequest.id);
  };

  const handleRejectClick = () => {
    onReject(leaveRequest.id);
  };

  const handleCancelClick = () => {
    onCancel(leaveRequest.id);
  };

  return (
    <LeaveActionDropdown
      canApproveReject={canApproveReject}
      canCancel={canCancel}
      loading={loading}
      onApprove={handleApproveClick}
      onReject={handleRejectClick}
      onCancel={handleCancelClick}
    />
  );
}
export default function LeaveListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data, loading, filters } = useAppSelector((state) => state.leaves);
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = Boolean(
    (user?.role && ADMIN_ROLES.includes(user.role as UserRole)) ||
    (user?.role && SUPERVISOR_ROLES.includes(user.role as UserRole)),
  );
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
  const [confirmationTarget, setConfirmationTarget] =
    useState<ConfirmationTarget | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const handleOpenApproveConfirmation = (leaveId: number) => {
    setConfirmationTarget({
      leaveId,
      action: ConfirmationAction.Approve,
    });
  };

  const handleOpenCancelConfirmation = (leaveId: number) => {
    setConfirmationTarget({
      leaveId,
      action: ConfirmationAction.Cancel,
    });
  };

  const handleCloseConfirmation = () => {
    if (actionLoading !== null) return;
    setConfirmationTarget(null);
  };

  const handleOpenRejectModal = (leaveId: number) => {
    setRejectTarget(leaveId);
  };

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
      forms.statuses?.includes(LeaveStatus.Taken) &&
      !forms.statuses.includes(LeaveStatus.Approved)
    ) {
      forms.statuses = [...forms.statuses, LeaveStatus.Approved];
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
      const currentStatuses = prev.statuses || [];
      if (status === LeaveStatus.All)
        return {
          ...prev,
          statuses:
            currentStatuses.length === STATUS_OPTIONS.length
              ? []
              : [...STATUS_OPTIONS],
        };
      return {
        ...prev,
        statuses: currentStatuses.includes(status)
          ? currentStatuses.filter((statusItem) => statusItem !== status)
          : [...currentStatuses, status],
      };
    });
  };

  const isAllChecked = (form.statuses || []).length === STATUS_OPTIONS.length;
  const isSomeChecked = (form.statuses || []).length > 0 && !isAllChecked;

  const handleConfirmAction = useCallback(async () => {
    if (!confirmationTarget) return;

    const { leaveId, action } = confirmationTarget;
    setActionLoading(leaveId);

    try {
      if (action === ConfirmationAction.Approve) {
        await approveLeave(leaveId);
        addToast("Leave approved.", "success");
      } else {
        await cancelLeave(leaveId);
        addToast("Leave cancelled.", "success");
      }

      setConfirmationTarget(null);
      dispatch(fetchLeaves({ ...filters }));
    } catch (error: unknown) {
      const fallbackMessage =
        action === ConfirmationAction.Approve
          ? "Failed to approve."
          : "Failed to cancel.";

      addToast(getApiErrorMessage(error, fallbackMessage), "error");
      const axiosError = error as AxiosError;
      if (axiosError?.response?.status === 409) {
        dispatch(fetchLeaves({ ...filters }));
      }
    } finally {
      setActionLoading(null);
    }
  }, [confirmationTarget, filters, dispatch, addToast]);

  const handleRejectConfirm = useCallback(
    async (reason: string) => {
      if (!rejectTarget) return;
      setActionLoading(rejectTarget);
      setRejectTarget(null);
      try {
        await rejectLeave(rejectTarget, reason);
        addToast("Leave rejected.", "success");
        dispatch(fetchLeaves({ ...filters }));
      } catch (event: unknown) {
        addToast(getApiErrorMessage(event, "Failed to reject."), "error");
        const axiosError = event as AxiosError;
        if (axiosError?.response?.status === 409) {
          dispatch(fetchLeaves({ ...filters }));
        }
      } finally {
        setActionLoading(null);
      }
    },
    [rejectTarget, filters],
  );

  const handleExport = async (type: ExportType.Summary | ExportType.Detail) => {
    try {
      type === ExportType.Summary
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

  const handleFromDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFromDate = event.target.value;

    setForm((previousForm) => {
      if (
        previousForm.to_date &&
        newFromDate &&
        previousForm.to_date < newFromDate
      ) {
        return {
          ...previousForm,
          from_date: newFromDate,
          to_date: newFromDate,
        };
      }

      return {
        ...previousForm,
        from_date: newFromDate,
      };
    });
  };

  const handleToDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newToDate = event.target.value;

    setForm((previousForm) => ({
      ...previousForm,
      to_date: newToDate,
    }));
  };

  const handleEmployeeNameChange = (employeeName: string) => {
    setForm((previousForm) => ({
      ...previousForm,
      employee_name: employeeName,
    }));
  };

  const handleEmployeeSelect = (employee: EmployeeSuggestion) => {
    setForm((previousForm) => ({
      ...previousForm,
      employee_name: employee.name,
    }));
  };

  const handleSubUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSubUnit = event.target.value;

    setForm((previousForm) => ({
      ...previousForm,
      sub_unit: selectedSubUnit,
    }));
  };

  const handleLocationChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedLocation = event.target.value;

    setForm((previousForm) => ({
      ...previousForm,
      location: selectedLocation,
    }));
  };

  const handleLeaveTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedLeaveTypeId = event.target.value;

    setForm((previousForm) => ({
      ...previousForm,
      leave_type_id: selectedLeaveTypeId,
    }));
  };

  const handleJobTitleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedJobTitle = event.target.value;

    setForm((previousForm) => ({
      ...previousForm,
      job_title: selectedJobTitle,
    }));
  };

  const handleEmploymentStatusChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedEmploymentStatus = event.target.value;

    setForm((previousForm) => ({
      ...previousForm,
      employment_status: selectedEmploymentStatus,
    }));
  };

  const handleJobCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedJobCategory = event.target.value;

    setForm((previousForm) => ({
      ...previousForm,
      job_category: selectedJobCategory,
    }));
  };

  const handleAttachmentStatusChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedAttachmentStatus = event.target.value;

    setForm((previousForm) => ({
      ...previousForm,
      attachment_status: selectedAttachmentStatus,
    }));
  };

  //check box logic
  const allStatusesCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (allStatusesCheckboxRef.current) {
      allStatusesCheckboxRef.current.indeterminate = isSomeChecked;
    }
  }, [isSomeChecked]);

  const handleIncludePastChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((previousForm) => ({
      ...previousForm,
      include_past: event.target.checked,
    }));
  };

  const handleOnlySubordinatesChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((previousForm) => ({
      ...previousForm,
      only_subordinates: event.target.checked,
    }));
  };

  const handleStatusOptionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    toggleStatus(event.target.value);
  };

  //buttons
  const handleExportSummary = () => {
    handleExport(ExportType.Summary);
  };

  const handleExportDetail = () => {
    handleExport(ExportType.Detail);
  };

  const handleRejectModalCancel = () => {
    setRejectTarget(null);
  };

  const handleEmployeeFromDateChange = (value: string) => {
    setForm((previousForm) => ({
      ...previousForm,
      from_date: value,
    }));
  };

  const handleEmployeeToDateChange = (value: string) => {
    setForm((previousForm) => ({
      ...previousForm,
      to_date: value,
    }));
  };

  const handleEmployeeStatusesChange = (statuses: string[]) => {
    setForm((previousForm) => ({
      ...previousForm,
      statuses,
    }));
  };

  const handleToggleSearchPanel = () => {
    setPanelOpen((previousOpenState) => !previousOpenState);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const updatedFilters = {
      ...filters,
      limit: pageSize,
      page: 1,
    };

    dispatch(setFilters(updatedFilters));
    dispatch(fetchLeaves(updatedFilters));

    setForm((previousForm) => ({
      ...previousForm,
      limit: pageSize,
      page: 1,
    }));
  };
  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />
      {confirmationTarget && (
        <LeaveConfirmationModal
          title={
            confirmationTarget.action === ConfirmationAction.Approve
              ? "Approve Leave Request"
              : "Cancel Leave Request"
          }
          message={
            confirmationTarget.action === ConfirmationAction.Approve
              ? "Are you sure you want to approve this leave request?"
              : "Are you sure you want to cancel this leave request?"
          }
          confirmLabel={
            confirmationTarget.action === ConfirmationAction.Approve
              ? "Yes, Approve"
              : "Yes, Cancel"
          }
          cancelLabel={
            confirmationTarget.action === ConfirmationAction.Approve
              ? "No, Keep Pending"
              : "No, Keep It"
          }
          confirmButtonClassName={
            confirmationTarget.action === ConfirmationAction.Approve
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }
          loading={actionLoading === confirmationTarget.leaveId}
          onConfirm={handleConfirmAction}
          onClose={handleCloseConfirmation}
        />
      )}
      {rejectTarget && (
        <RejectModal
          leaveId={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={handleRejectModalCancel}
        />
      )}

      {!isAdmin && (
        <EmployeeLeaveFilter
          from_date={form.from_date || ""}
          to_date={form.to_date || ""}
          statuses={form.statuses || []}
          onFromDateChange={handleEmployeeFromDateChange}
          onToDateChange={handleEmployeeToDateChange}
          onStatusesChange={handleEmployeeStatusesChange}
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
              onClick={handleToggleSearchPanel}
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
                    onChange={handleFromDateChange}
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
                    onChange={handleToDateChange}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Employee
                  </label>
                  <EmployeeAutocomplete
                    value={form.employee_name || ""}
                    onChange={handleEmployeeNameChange}
                    onSelect={handleEmployeeSelect}
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
                      onChange={handleSubUnitChange}
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.sub_units.map((subUnit) => (
                        <option key={subUnit.id} value={subUnit.name}>
                          {subUnit.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Location
                  </label>
                  <div className="relative">
                    <select
                      value={form.location || ""}
                      onChange={handleLocationChange}
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Leave Type
                  </label>
                  <div className="relative">
                    <select
                      value={form.leave_type_id || ""}
                      onChange={handleLeaveTypeChange}
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {leaveTypes.map((leaveType) => (
                        <option key={leaveType.id} value={String(leaveType.id)}>
                          {leaveType.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    />
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
                      onChange={handleJobTitleChange}
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.job_titles.map((JobTitle) => (
                        <option key={JobTitle.id} value={JobTitle.name}>
                          {JobTitle.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Employment Status
                  </label>
                  <div className="relative">
                    <select
                      value={form.employment_status || ""}
                      onChange={handleEmploymentStatusChange}
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.employment_statuses.map(
                        (employmentStatus) => (
                          <option
                            key={employmentStatus}
                            value={employmentStatus}
                          >
                            {employmentStatus}
                          </option>
                        ),
                      )}
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Job Category
                  </label>
                  <div className="relative">
                    <select
                      value={form.job_category || ""}
                      onChange={handleJobCategoryChange}
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {filterOpts.job_categories.map((categories) => (
                        <option key={categories.id} value={categories.name}>
                          {categories.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    />
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
                      onChange={handleAttachmentStatusChange}
                      className={selectCls}
                    >
                      <option value="">All</option>
                      {ATTACH_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-5 mb-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.include_past || false}
                    onChange={handleIncludePastChange}
                    className="w-4 h-4 accent-blue-900"
                  />
                  Include Past Employees
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.only_subordinates || false}
                    onChange={handleOnlySubordinatesChange}
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
                      value={LeaveStatus.All}
                      ref={allStatusesCheckboxRef}
                      onChange={handleStatusOptionChange}
                      className="w-4 h-4 accent-blue-900"
                    />
                    All
                  </label>
                  {STATUS_OPTIONS.map((statusOption) => (
                    <label
                      key={statusOption}
                      className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        value={statusOption}
                        checked={(form.statuses || []).includes(statusOption)}
                        onChange={handleStatusOptionChange}
                        className="w-4 h-4 accent-blue-900"
                      />
                      {statusOption}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={handleReset} className={ButtonStyles}>
                  Reset
                </button>
                <button onClick={handleExportSummary} className={ButtonStyles}>
                  Export Summary
                </button>
                <button onClick={handleExportDetail} className={ButtonStyles}>
                  Export Detail
                </button>
                <button onClick={handleSearch} className={ButtonStyles}>
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
                ].map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 whitespace-nowrap"
                  >
                    {header}
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
                      <div className="text-sm">No leave records found</div>
                    </td>
                  </tr>
                )}
              {!loading &&
                data?.data.map((row: LeaveRequest, rowIndex: number) => {
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
                        navigate(PAGE_PATHS.leaveDetails(row.id));
                      }}
                      className={`border-b border-slate-100 hover:bg-emerald-50 transition-colors cursor-pointer ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
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
                        <LeaveRowActions
                          leaveRequest={row}
                          currentUserId={user?.id}
                          isAdmin={isAdmin}
                          loading={actionLoading === row.id}
                          onApprove={handleOpenApproveConfirmation}
                          onReject={handleOpenRejectModal}
                          onCancel={handleOpenCancelConfirmation}
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
            onPageSizeChange={handlePageSizeChange}
            itemLabel="leave records"
          />
        )}
      </div>
    </LeaveLayout>
  );
}
