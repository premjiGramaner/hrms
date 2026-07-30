import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FocusEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
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
import "./Style/LeaveListPage.css";

const ATTACH_STATUSES = ["Available", "Pending"];
const COMMENT_PREVIEW_LENGTH = 10;
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

interface CommentTooltipState {
  leaveId: number;
  top: number;
  left: number;
  showAbove: boolean;
}

const ButtonStyles = "leave-list-action-button";
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
    <div className="leave-list-modal-overlay">
      <div className="leave-list-modal">
        <h3 className="leave-list-modal-title">Reject Leave #{leaveId}</h3>
        <label className="leave-list-modal-label">
          Rejection Reason <span className="leave-list-required">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="Enter reason…"
          className="leave-list-modal-textarea"
        />
        <div className="leave-list-modal-actions">
          <button onClick={onCancel} className="leave-list-modal-cancel-button">
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            className="leave-list-modal-reject-button"
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
    <div ref={containerRef} className="leave-list-relative">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type name, ID or username…"
        className="leave-list-form-control"
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="leave-list-autocomplete-menu">
          {suggestions.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                onSelect(emp);
                setOpen(false);
                onChange(emp.name);
              }}
              className="leave-list-autocomplete-option"
            >
              <span className="leave-list-autocomplete-code">
                {emp.employee_id || emp.username}
              </span>
              <span className="leave-list-autocomplete-name">{emp.name}</span>
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
  const [commentTooltip, setCommentTooltip] =
    useState<CommentTooltipState | null>(null);

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
      } catch (event) {
        addToast(getApiErrorMessage(event, "Failed to reject."), "error");
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

  const inputCls = "leave-list-form-control";
  const selectCls = "leave-list-form-control leave-list-select";

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

  const handleCommentTooltipShow = (
    event: ReactMouseEvent<HTMLDivElement> | FocusEvent<HTMLDivElement>,
    leaveId: number,
  ) => {
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 320;
    const viewportPadding = 12;
    const estimatedTooltipHeight = 160;
    const showAbove =
      triggerRect.bottom + estimatedTooltipHeight > window.innerHeight;

    const left = Math.min(
      Math.max(viewportPadding, triggerRect.left),
      window.innerWidth - tooltipWidth - viewportPadding,
    );

    setCommentTooltip({
      leaveId,
      top: showAbove ? triggerRect.top - 8 : triggerRect.bottom + 8,
      left,
      showAbove,
    });
  };

  const handleCommentTooltipHide = () => {
    setCommentTooltip(null);
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
              ? "leave-list-confirm-button--approve"
              : "leave-list-confirm-button--cancel"
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
        <div className="leave-list-search-panel">
          <div className="leave-list-section-header">
            <span className="leave-list-section-title">
              Search{" "}
              <span className="leave-list-search-hint">
                (Please specify your search)
              </span>
            </span>
            <button
              onClick={handleToggleSearchPanel}
              className="leave-list-search-toggle"
            >
              {panelOpen ? "▲" : "▼"}
            </button>
          </div>
          {panelOpen && (
            <div className="leave-list-search-body">
              <div className="leave-list-filter-grid leave-list-filter-grid--three">
                <div>
                  <label className="leave-list-filter-label">From</label>
                  <input
                    type="date"
                    value={form.from_date || ""}
                    onChange={handleFromDateChange}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="leave-list-filter-label">To</label>
                  <input
                    type="date"
                    value={form.to_date || ""}
                    min={form.from_date || undefined}
                    onChange={handleToDateChange}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="leave-list-filter-label">Employee</label>
                  <EmployeeAutocomplete
                    value={form.employee_name || ""}
                    onChange={handleEmployeeNameChange}
                    onSelect={handleEmployeeSelect}
                  />
                </div>
              </div>
              <div className="leave-list-filter-grid leave-list-filter-grid--three">
                <div>
                  <label className="leave-list-filter-label">Sub Unit</label>
                  <div className="leave-list-relative">
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
                      className="leave-list-select-chevron"
                    />
                  </div>
                </div>
                <div>
                  <label className="leave-list-filter-label">Location</label>
                  <div className="leave-list-relative">
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
                      className="leave-list-select-chevron"
                    />
                  </div>
                </div>
                <div>
                  <label className="leave-list-filter-label">Leave Type</label>
                  <div className="leave-list-relative">
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
                      className="leave-list-select-chevron"
                    />
                  </div>
                </div>
              </div>
              <div className="leave-list-filter-grid leave-list-filter-grid--three">
                <div>
                  <label className="leave-list-filter-label">Job Title</label>
                  <div className="leave-list-relative">
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
                      className="leave-list-select-chevron"
                    />
                  </div>
                </div>
                <div>
                  <label className="leave-list-filter-label">
                    Employment Status
                  </label>
                  <div className="leave-list-relative">
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
                      className="leave-list-select-chevron"
                    />
                  </div>
                </div>
                <div>
                  <label className="leave-list-filter-label">
                    Job Category
                  </label>
                  <div className="leave-list-relative">
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
                      className="leave-list-select-chevron"
                    />
                  </div>
                </div>
              </div>
              <div className="leave-list-filter-grid leave-list-filter-grid--two">
                <div>
                  <label className="leave-list-filter-label">
                    Attachment Status
                  </label>
                  <div className="leave-list-relative">
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
                      className="leave-list-select-chevron"
                    />
                  </div>
                </div>
              </div>
              <div className="leave-list-checkbox-row">
                <label className="leave-list-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.include_past || false}
                    onChange={handleIncludePastChange}
                    className="leave-list-checkbox"
                  />
                  Include Past Employees
                </label>
                <label className="leave-list-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.only_subordinates || false}
                    onChange={handleOnlySubordinatesChange}
                    className="leave-list-checkbox"
                  />
                  Only Show My Subordinate's Leave
                </label>
              </div>
              <div className="leave-list-status-filter">
                <p className="leave-list-status-title">
                  Show Leave with Status
                </p>
                <div className="leave-list-status-options">
                  <label className="leave-list-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      value={LeaveStatus.All}
                      ref={allStatusesCheckboxRef}
                      onChange={handleStatusOptionChange}
                      className="leave-list-checkbox"
                    />
                    All
                  </label>
                  {STATUS_OPTIONS.map((statusOption) => (
                    <label
                      key={statusOption}
                      className="leave-list-checkbox-label"
                    >
                      <input
                        type="checkbox"
                        value={statusOption}
                        checked={(form.statuses || []).includes(statusOption)}
                        onChange={handleStatusOptionChange}
                        className="leave-list-checkbox"
                      />
                      {statusOption}
                    </label>
                  ))}
                </div>
              </div>
              <div className="leave-list-filter-actions">
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
      <div className="leave-list-results-card">
        <div className="leave-list-section-header">
          <span className="leave-list-section-title">
            {data
              ? `${data.total} record${data.total !== 1 ? "s" : ""}`
              : "Results"}
          </span>
        </div>
        <div className="leave-list-table-scroll">
          <table className="leave-list-results-table">
            <thead>
              <tr className="leave-list-table-head-row">
                {[
                  "Employee ID",
                  "Employee Name",
                  "Date",
                  "Applied On",
                  "Leave Type",
                  "Net Leave Balance",
                  "Requested Duration",
                  "Status",
                  "Comments",
                  "Actions",
                ].map((header) => (
                  <th key={header} className="leave-list-table-heading">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="leave-list-table-state">
                    <div className="leave-list-loading-content">
                      <div className="leave-list-spinner" />
                      <span className="leave-list-state-text">Loading…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                searchTriggered &&
                (!data || data.data.length === 0) && (
                  <tr>
                    <td colSpan={10} className="leave-list-table-state">
                      <div className="leave-list-state-text">
                        No leave records found
                      </div>
                    </td>
                  </tr>
                )}
              {!loading &&
                data?.data.map((row: LeaveRequest, rowIndex: number) => {
                  const commentText = row.comments || row.reason || "";
                  const hasLongComment =
                    commentText.length > COMMENT_PREVIEW_LENGTH;
                  const commentPreview = hasLongComment
                    ? `${commentText.slice(0, COMMENT_PREVIEW_LENGTH)}...`
                    : commentText;

                  return (
                    <tr
                      key={row.id}
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            "[data-action-cell], [data-comment-cell]",
                          )
                        )
                          return;
                        navigate(PAGE_PATHS.leaveDetails(row.id));
                      }}
                      className={`leave-list-results-row ${
                        rowIndex % 2 === 0
                          ? "leave-list-results-row--even"
                          : "leave-list-results-row--odd"
                      }`}
                    >
                      <td className="leave-list-table-cell leave-list-employee-id">
                        {row.employee_id || "—"}
                      </td>
                      <td className="leave-list-table-cell leave-list-employee-name">
                        {row.employee_name || "—"}
                      </td>
                      <td className="leave-list-table-cell leave-list-nowrap-cell">
                        {row.start_date}
                        {row.start_date !== row.end_date && (
                          <span> to {row.end_date}</span>
                        )}
                      </td>
                      <td className="leave-list-table-cell leave-list-nowrap-cell">
                        {row.applied_on ? row.applied_on.substring(0, 10) : "—"}
                      </td>
                      <td className="leave-list-table-cell leave-list-text-cell">
                        {row.leave_type}
                      </td>
                      <td className="leave-list-table-cell leave-list-balance-cell">
                        <span className="leave-list-balance-value">
                          {Number(row.net_leave_balance ?? 0).toFixed(2)} day(s)
                        </span>
                      </td>
                      <td className="leave-list-table-cell leave-list-text-cell">
                        {Number(row.requested_days).toFixed(2)} day(s)
                      </td>
                      <td className="leave-list-table-cell">
                        <div className="leave-list-status-content">
                          <StatusBadge status={row.status} />
                          <span className="leave-list-muted-text">
                            ({Number(row.requested_days).toFixed(2)} day(s))
                          </span>
                        </div>
                      </td>
                      <td
                        className="leave-list-table-cell leave-list-comments-cell"
                        data-comment-cell="true"
                      >
                        {commentText ? (
                          <div
                            tabIndex={hasLongComment ? 0 : undefined}
                            onMouseEnter={(event) =>
                              hasLongComment &&
                              handleCommentTooltipShow(event, row.id)
                            }
                            onMouseLeave={handleCommentTooltipHide}
                            onFocus={(event) =>
                              hasLongComment &&
                              handleCommentTooltipShow(event, row.id)
                            }
                            onBlur={handleCommentTooltipHide}
                            style={{
                              position: "relative",
                              display: "inline-block",
                              width: "100%",
                              maxWidth: "180px",
                              outline: "none",
                              cursor: hasLongComment ? "pointer" : "default",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                width: "100%",
                                overflow: "hidden",
                                color: "#475569",
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {commentPreview}
                            </span>

                            {hasLongComment &&
                              commentTooltip?.leaveId === row.id && (
                                <p
                                  role="tooltip"
                                  style={{
                                    position: "fixed",
                                    top: commentTooltip.top,
                                    left: commentTooltip.left,
                                    zIndex: 1000,
                                    width: "320px",
                                    maxWidth: "calc(100vw - 24px)",
                                    margin: 0,
                                    padding: "0.75rem",
                                    color: "#334155",
                                    fontSize: "13px",
                                    lineHeight: 1.4,
                                    whiteSpace: "normal",
                                    overflowWrap: "anywhere",
                                    wordBreak: "break-word",
                                    pointerEvents: "none",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "0.5rem",
                                    boxShadow:
                                      "0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)",
                                    transform: commentTooltip.showAbove
                                      ? "translateY(-100%)"
                                      : "none",
                                  }}
                                >
                                  {commentText}
                                </p>
                              )}
                          </div>
                        ) : (
                          <span className="leave-list-placeholder">—</span>
                        )}
                      </td>
                      <td
                        className="leave-list-table-cell leave-list-actions-cell"
                        data-action-cell="true"
                      >
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
