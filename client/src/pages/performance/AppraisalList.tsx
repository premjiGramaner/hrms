import {
  CalendarDays,
  ClipboardCheck,
  Download,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import ProgressCircle from "../../components/common/ProgressCircle";
import SearchInput from "../../components/common/SearchInput";
import StatusBadge from "../../components/common/StatusBadge";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import {
  downloadAppraisalPdf,
  getAppraisals,
  getMyAppraisals,
} from "../../api/performance.api";
import { useAppSelector } from "../../app/hooks";
import { PAGE_PATHS, isAdminRole } from "../../config/roles";
import { Appraisal, AppraisalStatus } from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";
import Toast from "../../utils/toast";
import { IconButton } from "./performanceUi";
import { showPerformanceError } from "./performanceNotifications";

interface FilterState {
  from: string;
  to: string;
  cycleId: string;
  statuses: AppraisalStatus[];
}

const EMPTY_FILTER: FilterState = {
  from: "",
  to: "",
  cycleId: "",
  statuses: [],
};

const ALL_STATUSES: AppraisalStatus[] = [
  "INITIATED",
  "CREATED",
  "NOT_CREATED",
  "COMPLETED",
];

const STATUS_HINTS: Record<string, string> = {
  INITIATED: "INITIATED",
  CREATED: "CREATED",
  NOT_CREATED: "NOT CREATED",
  COMPLETED: "COMPLETED",
};

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-600 outline-none focus:border-teal-400 [&::-webkit-calendar-picker-indicator]:hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.showPicker?.()}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#f4f1f8] text-slate-500 hover:bg-[#e8e3f0] transition-colors"
        >
          <CalendarDays size={17} />
        </button>
      </div>
    </div>
  );
}

function StatusTagInput({
  value,
  onChange,
}: {
  value: AppraisalStatus[];
  onChange: (value: AppraisalStatus[]) => void;
}) {
  const [hint, setHint] = useState("");
  const filtered = ALL_STATUSES.filter(
    (status) =>
      !value.includes(status) &&
      status.toLowerCase().includes(hint.toLowerCase()),
  );

  const addStatus = (status: AppraisalStatus) => {
    onChange([...value, status]);
    setHint("");
  };
  const removeStatus = (status: AppraisalStatus) =>
    onChange(value.filter((selectedStatus) => selectedStatus !== status));

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-500">
        Appraisal Status
      </label>
      <div className="relative">
        <input
          type="text"
          value={hint}
          onChange={(event) => setHint(event.target.value)}
          placeholder="Type for hints..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-teal-400"
        />
        {hint && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {filtered.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => addStatus(status)}
                className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {STATUS_HINTS[status] ?? status}
              </button>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {value.map((status) => (
            <span
              key={status}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {STATUS_HINTS[status] ?? status}
              <button
                type="button"
                onClick={() => removeStatus(status)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterModal({
  initialFilter,
  showCycleFilter,
  onSearch,
  onClose,
}: {
  initialFilter: FilterState;
  showCycleFilter: boolean;
  onSearch: (filter: FilterState) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FilterState>(initialFilter);
  const updateDraftFilter = <FilterKey extends keyof FilterState>(
    key: FilterKey,
    value: FilterState[FilterKey],
  ) => setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-5">
          <h2 className="text-lg font-bold text-slate-800">
            Filter Appraisals By
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Reset filters"
              onClick={() => setDraft(EMPTY_FILTER)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div
          className={`grid ${showCycleFilter ? "grid-cols-2" : "grid-cols-1"} gap-x-6 gap-y-5 px-8 pb-6`}
        >
          <DateField
            label="From"
            value={draft.from}
            onChange={(fromDate) => updateDraftFilter("from", fromDate)}
          />
          <DateField
            label="To"
            value={draft.to}
            onChange={(toDate) => updateDraftFilter("to", toDate)}
          />

          <StatusTagInput
            value={draft.statuses}
            onChange={(statuses) => updateDraftFilter("statuses", statuses)}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-slate-300 px-8 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSearch(draft)}
            className="h-11 rounded-full bg-[#1e2a4a] px-10 text-sm font-semibold text-white transition hover:bg-[#263258]"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppraisalList() {
  const [query, setQuery] = useState("");
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(EMPTY_FILTER);

  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAppSelector((state) => state.auth.user);
  const isAdmin = isAdminRole(currentUser?.role);

  const isMyAppraisals = location.pathname.includes("my_appraisals");
  const isTeamAppraisals = location.pathname.includes("team_appraisals");

  const fetchAppraisals = useCallback(
    (filter: FilterState = EMPTY_FILTER) => {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filter.from) params.from = filter.from;
      if (filter.to) params.to = filter.to;
      if (filter.cycleId) params.cycleId = filter.cycleId;
      if (filter.statuses.length > 0) {
        params.status = filter.statuses.join(",");
      }
      (isMyAppraisals ? getMyAppraisals(params) : getAppraisals(params))
        .then(setAppraisals)
        .catch(() => setAppraisals([]))
        .finally(() => setLoading(false));
    },
    [isMyAppraisals],
  );

  useEffect(() => {
    fetchAppraisals();
  }, [fetchAppraisals]);

  const rows = useMemo(() => {
    if (!isAdmin || !query.trim()) return appraisals;
    const normalizedQuery = query.trim().toLowerCase();
    return appraisals.filter((appraisal) =>
      appraisal.employeeName.toLowerCase().includes(normalizedQuery),
    );
  }, [appraisals, query, isAdmin]);

  const hasActiveFilter =
    appliedFilter.from !== "" ||
    appliedFilter.to !== "" ||
    appliedFilter.cycleId !== "" ||
    appliedFilter.statuses.length > 0;

  const columns: DataTableColumn<Appraisal>[] = [
    {
      key: "employeeName",
      header: "Employee Name",
      sortable: true,
      width: "190px",
    },
    { key: "from", header: "From", sortable: true },
    { key: "to", header: "To", sortable: true },
    { key: "dueDate", header: "Due Date" },
    { key: "description", header: "Description", width: "270px" },
    {
      key: "status",
      header: "Appraisal Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "reviewProgress",
      header: "Review Progress",
      render: (row) => <ProgressCircle value={row.reviewProgress} />,
    },
    {
      key: "finalRating",
      header: "Final Rating",
      render: (row) => row.finalRating ?? "-",
    },
  ];

  const toggle = (id: string) =>
    setSelectedIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((selectedId) => selectedId !== id)
        : [...currentIds, id],
    );
  const openAppraisal = (id: string) =>
    navigate(PAGE_PATHS.performanceAppraisalView(id));
  const openReview = (id: string) =>
    navigate(PAGE_PATHS.performanceAppraisalReview(id));
  const downloadAppraisal = async (row: Appraisal) => {
    try {
      await downloadAppraisalPdf(row.id, row.employeeName);
      Toast.success("Appraisal downloaded successfully.");
    } catch (error) {
      showPerformanceError(error, "Unable to download appraisal.");
    }
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === rows.length
        ? []
        : rows.map((appraisal) => appraisal.id),
    );
  };

  const applyFilters = (filter: FilterState) => {
    setAppliedFilter(filter);
    setShowFilter(false);
    fetchAppraisals(filter);
  };

  const activeTab = isMyAppraisals
    ? "My Appraisals"
    : isTeamAppraisals
      ? "Team Appraisals"
      : "Appraisal List";

  return (
    <>
      <PerformanceLayout activeTab={activeTab}>
        <div className="rounded-[8px] bg-white p-8">
          <div className="mb-7 flex items-center justify-end gap-3">
            {isAdmin && (
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search Employee Name"
                className="w-80"
              />
            )}
            <div className="relative">
              <IconButton title="Filter" onClick={() => setShowFilter(true)}>
                <Filter size={17} />
              </IconButton>
              {hasActiveFilter && (
                <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-teal-500 ring-2 ring-white" />
              )}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={rows}
            loading={loading}
            getRowId={(row) => row.id}
            onSelectRow={toggle}
            onSelectAll={toggleSelectAll}
            onRowClick={(row) => openAppraisal(row.id)}
            actions={(row) => (
              <div className="flex justify-end gap-2">
                {!isAdmin ? (
                  <IconButton title="Review" onClick={() => openReview(row.id)}>
                    <ClipboardCheck size={17} />
                  </IconButton>
                ) : null}
                <IconButton
                  title="Download"
                  onClick={() => downloadAppraisal(row)}
                >
                  <Download size={17} />
                </IconButton>
              </div>
            )}
          />
        </div>
      </PerformanceLayout>

      {showFilter && (
        <FilterModal
          initialFilter={appliedFilter}
          showCycleFilter={isAdmin}
          onSearch={applyFilters}
          onClose={() => setShowFilter(false)}
        />
      )}
    </>
  );
}
