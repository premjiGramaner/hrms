import {
  CalendarDays,
  ClipboardCheck,
  Download,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import ProgressCircle from "../../components/common/ProgressCircle";
import SearchInput from "../../components/common/SearchInput";
import StatusBadge from "../../components/common/StatusBadge";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import {
  downloadAppraisalPdf,
  getAppraisalCycles,
  getAppraisals,
  getMyAppraisals,
} from "../../api/performance.api";
import { useAppSelector } from "../../app/hooks";
import { isAdminRole } from "../../config/roles";
import {
  Appraisal,
  AppraisalCycle,
  AppraisalStatus,
} from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";
import { IconButton } from "./performanceUi";

// ─── types ────────────────────────────────────────────────────────────────────
interface FilterState {
  from: string;
  to: string;
  cycleId: string; // "" | "open" | "<uuid>"
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

// ─── small sub-components ─────────────────────────────────────────────────────

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <input
          ref={ref}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-600 outline-none focus:border-teal-400 [&::-webkit-calendar-picker-indicator]:hidden"
          style={{
            colorScheme: "light",
          }}
        />
        <button
          type="button"
          onClick={() => ref.current?.showPicker?.()}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#f4f1f8] text-slate-500 hover:bg-[#e8e3f0] transition-colors"
        >
          <CalendarDays size={17} />
        </button>
      </div>
    </div>
  );
}

function CycleDropdown({
  cycles,
  value,
  onChange,
}: {
  cycles: AppraisalCycle[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label =
    value === ""
      ? "All Appraisal Cycles"
      : value === "open"
        ? "All Open Appraisal Cycles"
        : (cycles.find((c) => c.id === value)?.name ?? "Select…");

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-500">
        Appraisal Cycle
      </label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none"
        >
          <span className="truncate">{label}</span>
          <span className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#f4f1f8] text-slate-500">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <DropOption
              label="All Open Appraisal Cycles"
              selected={value === "open"}
              onClick={() => select("open")}
            />
            <DropOption
              label="All Appraisal Cycles"
              selected={value === ""}
              onClick={() => select("")}
            />
            {cycles.map((c) => (
              <DropOption
                key={c.id}
                label={c.name}
                selected={value === c.id}
                onClick={() => select(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DropOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${selected ? "font-semibold text-teal-600" : "text-slate-700"}`}
    >
      {label}
    </button>
  );
}

function StatusTagInput({
  value,
  onChange,
}: {
  value: AppraisalStatus[];
  onChange: (v: AppraisalStatus[]) => void;
}) {
  const [hint, setHint] = useState("");
  const filtered = ALL_STATUSES.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(hint.toLowerCase()),
  );

  const add = (s: AppraisalStatus) => {
    onChange([...value, s]);
    setHint("");
  };
  const remove = (s: AppraisalStatus) => onChange(value.filter((x) => x !== s));

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-500">
        Appraisal Status
      </label>
      <div className="relative">
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Type for hints..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-teal-400"
        />
        {hint && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {STATUS_HINTS[s] ?? s}
              </button>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {value.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {STATUS_HINTS[s] ?? s}
              <button
                type="button"
                onClick={() => remove(s)}
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

// ─── Filter Modal ─────────────────────────────────────────────────────────────

function FilterModal({
  cycles,
  initialFilter,
  showCycleFilter,
  onSearch,
  onClose,
}: {
  cycles: AppraisalCycle[];
  initialFilter: FilterState;
  showCycleFilter: boolean;
  onSearch: (f: FilterState) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FilterState>(initialFilter);
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    setDraft((prev) => ({ ...prev, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
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
            onChange={(v) => set("from", v)}
          />
          <DateField
            label="To"
            value={draft.to}
            onChange={(v) => set("to", v)}
          />

          <StatusTagInput
            value={draft.statuses}
            onChange={(v) => set("statuses", v)}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppraisalList() {
  const [query, setQuery] = useState("");
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(EMPTY_FILTER);

  const navigate = useNavigate();
  const location = useLocation();
  const role = useAppSelector((state) => state.auth.user?.role);
  const isAdmin = isAdminRole(role);

  const isMyAppraisals = location.pathname.includes("my_appraisals");
  const isTeamAppraisals = location.pathname.includes("team_appraisals");

  const fetchAppraisals = (f: FilterState = EMPTY_FILTER) => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (f.from) params.from = f.from;
    if (f.to) params.to = f.to;
    if (f.cycleId) params.cycleId = f.cycleId;
    if (f.statuses.length > 0) params.status = f.statuses.join(",");

    (isMyAppraisals ? getMyAppraisals(params) : getAppraisals(params))
      .then(setAppraisals)
      .catch(() => setAppraisals([]))
      .finally(() => setLoading(false));
  };

  // Initial fetch
  useEffect(() => {
    fetchAppraisals(appliedFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyAppraisals]);

  // Fetch cycles for admin filter dropdown
  useEffect(() => {
    if (!isAdmin) return;
    getAppraisalCycles()
      .then(setCycles)
      .catch(() => setCycles([]));
  }, [isAdmin]);

  // Client-side search only (admin, by name — no round-trip needed)
  const rows = useMemo(() => {
    if (!isAdmin || !query.trim()) return appraisals;
    const q = query.trim().toLowerCase();
    return appraisals.filter((a) => a.employeeName.toLowerCase().includes(q));
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
    setSelectedIds((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    );
  const openAppraisal = (id: string) =>
    navigate(`/performance/appraisals/${id}/view`);
  const openReview = (id: string) =>
    navigate(`/performance/appraisals/${id}/review`);

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
            onSelectAll={() =>
              setSelectedIds(
                selectedIds.length === rows.length ? [] : rows.map((r) => r.id),
              )
            }
            onRowClick={(row) => openAppraisal(row.id)}
            actions={(row) => (
              <div className="flex justify-end gap-2">
                <IconButton title="Review" onClick={() => openReview(row.id)}>
                  <ClipboardCheck size={17} />
                </IconButton>
                <IconButton
                  title="Download"
                  onClick={() => downloadAppraisalPdf(row.id, row.employeeName)}
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
          cycles={cycles}
          initialFilter={appliedFilter}
          showCycleFilter={isAdmin}
          onSearch={(f) => {
            setAppliedFilter(f);
            setShowFilter(false);
            fetchAppraisals(f);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </>
  );
}
