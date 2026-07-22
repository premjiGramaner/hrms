import { useEffect, useMemo, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import { getAuditTrail } from "../../api/hradmin.api";
import useDebounce from "../../hooks/useDebounce";
import DataTable, { ColumnDef, StatCard } from "../../components/DataTable";
import { getAvatarSrc, getInitials } from "../../utils/avatar";
import { ScrollText, FileText } from "lucide-react";
import {
  IconActivity,
  IconPlusCircle,
  IconEdit,
  IconXCircle,
  IconAlertCircle,
  IconX,
} from "../../components/Icons";
import { ACTION_COLORS } from "../../config/uiConstants";
import { PAGE_PATHS } from "../../config/roles";
const TABS: TabItem[] = [
  { label: "Job Titles", path: PAGE_PATHS.hradminJobTitles },
  { label: "Job Categories", path: PAGE_PATHS.hradminJobCategories },
  { label: "Sub Units", path: PAGE_PATHS.hradminSubUnits },
  { label: "Role Access", path: PAGE_PATHS.hradminRoleAccess },
  { label: "Audit Trail", path: PAGE_PATHS.hradminAuditTrail },
];
interface AuditRecord {
  id: number;
  employee_id?: number | null;
  employee_code?: string | null;
  action_owner: string;
  action_owner_username: string;
  action_owner_avatar?: string | null;
  employee: string;
  employee_username: string;
  section: string;
  action: string;
  source: string;
  performed_screen: string;
  action_description: string;
  notes: string;
  event_time: string;
  created_at: string;
}
function formatDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}
function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  minWidth = 140,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  minWidth?: number;
}) {
  const widthClass = minWidth === 150 ? "min-w-[150px]" : "min-w-[140px]";

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`py-[9px] pl-3 pr-8 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] outline-none appearance-none bg-white cursor-pointer shadow-sm ${widthClass}`}
      >
        <option value="all">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[11px]">
        ▼
      </span>
    </div>
  );
}
export default function AuditTrailPage() {
  const [allRecords, setAllRecords] = useState<AuditRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setIsLoading(true);
    getAuditTrail(1, 10000)
      .then((res) => {
        setAllRecords(res.data);
        setFilteredRecords(res.data);
      })
      .catch(() => setPageError("Failed to load audit trail. Please refresh."))
      .finally(() => setIsLoading(false));
  }, []);
  const uniqueActions = [
    ...new Set(allRecords.map((allRecord) => allRecord.action).filter(Boolean)),
  ];
  const uniqueSections = [
    ...new Set(
      allRecords.map((allRecord) => allRecord.section).filter(Boolean),
    ),
  ];
  const applyFilters = (search: string, action: string, section: string) => {
    const term = search.toLowerCase();
    setFilteredRecords(
      allRecords.filter((allRecord) => {
        const matchesSearch =
          !term ||
          allRecord.action_owner.toLowerCase().includes(term) ||
          allRecord.employee.toLowerCase().includes(term) ||
          (allRecord.action_owner_username || "")
            .toLowerCase()
            .includes(term) ||
          (allRecord.employee_username || "").toLowerCase().includes(term) ||
          allRecord.section.toLowerCase().includes(term) ||
          allRecord.action_description.toLowerCase().includes(term) ||
          (allRecord.notes || "").toLowerCase().includes(term) ||
          allRecord.performed_screen.toLowerCase().includes(term);
        return (
          matchesSearch &&
          (action === "all" || allRecord.action === action) &&
          (section === "all" || allRecord.section === section)
        );
      }),
    );
    setCurrentPage(1);
  };
  const debouncedSearch = useDebounce(
    (value: string) => applyFilters(value, actionFilter, sectionFilter),
    300,
  );
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };
  const handleAction = (value: string) => {
    setActionFilter(value);
    applyFilters(searchQuery, value, sectionFilter);
  };
  const handleSection = (value: string) => {
    setSectionFilter(value);
    applyFilters(searchQuery, actionFilter, value);
  };
  const handleClear = () => {
    setSearchQuery("");
    setActionFilter("all");
    setSectionFilter("all");
    setFilteredRecords(allRecords);
    setCurrentPage(1);
  };
  const hasFilters =
    searchQuery !== "" || actionFilter !== "all" || sectionFilter !== "all";

  const pagedRecords = useMemo(() => {
    const sorted = [...filteredRecords].sort((a, b) => {
      const diff =
        new Date(a.event_time).getTime() - new Date(b.event_time).getTime();
      return dateSort === "desc" ? -diff : diff;
    });
    return sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredRecords, currentPage, pageSize, dateSort]);
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const createCount = allRecords.filter(
    (Record) => Record.action === "CREATE",
  ).length;
  const updateCount = allRecords.filter(
    (Record) => Record.action === "UPDATE",
  ).length;
  const terminateCount = allRecords.filter(
    (Record) => Record.action === "TERMINATE",
  ).length;

  const stats: StatCard[] = [
    {
      label: "Total Events",
      value: allRecords.length,
      icon: <IconActivity size={20} />,
      color: "#1b2a6b",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Created",
      value: createCount,
      icon: <IconPlusCircle size={20} />,
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    {
      label: "Updated",
      value: updateCount,
      icon: <IconEdit size={20} />,
      color: "#a16207",
      bg: "#fefce8",
      border: "#fde68a",
    },
    {
      label: "Terminated",
      value: terminateCount,
      icon: <IconXCircle size={20} />,
      color: "#9d174d",
      bg: "#fdf2f8",
      border: "#fbcfe8",
    },
  ];
  const columns: ColumnDef<AuditRecord>[] = [
    {
      key: "event_time",
      header: "Date",
      render: (row) => (
        <span className="text-slate-600 text-[12.5px] whitespace-nowrap">
          {formatDateTime(row.event_time)}
        </span>
      ),
    },
    {
      key: "action_owner",
      header: "Action Owner",
      render: (row) => {
        const avatarSrc = getAvatarSrc(row.action_owner_avatar);

        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#1b2a6b] to-[#16a085] flex items-center justify-center text-white text-[11px] font-bold shadow-[0_2px_6px_rgba(27,42,107,0.2)]">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={row.action_owner || "Action owner"}
                  className="w-full h-full object-cover block"
                />
              ) : (
                getInitials(row.action_owner)
              )}
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-[13px]">
                {row.action_owner || "—"}
              </div>
              <div className="text-slate-400 text-[11px]">
                {row.action_owner_username || ""}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      width: 110,
      render: (row) => {
        const actionColors = ACTION_COLORS[
          row.action as keyof typeof ACTION_COLORS
        ] ?? {
          backgroundColor: "#f1f5f9",
          textColor: "#64748b",
          indicatorColor: "#94a3b8",
        };

        const bgClass =
          row.action === "CREATE"
            ? "bg-[#dcfce7]"
            : row.action === "UPDATE"
              ? "bg-[#fef9c3]"
              : row.action === "DELETE"
                ? "bg-[#fee2e2]"
                : row.action === "TERMINATE"
                  ? "bg-[#fce7f3]"
                  : "bg-slate-100";

        const colorClass =
          row.action === "CREATE"
            ? "text-[#16a34a]"
            : row.action === "UPDATE"
              ? "text-[#a16207]"
              : row.action === "DELETE"
                ? "text-[#dc2626]"
                : row.action === "TERMINATE"
                  ? "text-[#9d174d]"
                  : "text-slate-600";

        const dotBgClass =
          row.action === "CREATE"
            ? "bg-[#22c55e]"
            : row.action === "UPDATE"
              ? "bg-[#eab308]"
              : row.action === "DELETE"
                ? "bg-[#ef4444]"
                : row.action === "TERMINATE"
                  ? "bg-[#ec4899]"
                  : "bg-slate-400";

        return (
          <span
            className={`inline-flex items-center gap-[5px] text-[11.5px] font-bold px-2.5 py-1 rounded-full tracking-wide border ${bgClass} ${colorClass}`}
            style={{ borderColor: actionColors.backgroundColor }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotBgClass}`}
            />
            {row.action}
          </span>
        );
      },
    },
    {
      key: "employee",
      header: "Employee",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800 text-[13px]">
            {row.employee || "—"}
          </div>
          {row.employee_username && (
            <div className="text-[11px] text-slate-400 mt-px">
              @{row.employee_username}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "employee_code",
      header: "Employee ID",
      width: 120,
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-200">
          {row.employee_code || "—"}
        </span>
      ),
    },
    {
      key: "section",
      header: "Section",
      width: 120,
      render: (row) => (
        <span className="px-2.5 py-[3px] rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
          {row.section || "—"}
        </span>
      ),
    },
    {
      key: "performed_screen",
      header: "Performed Screen",
      render: (row) => (
        <span className="text-slate-500 text-[12.5px]">
          {row.performed_screen || "—"}
        </span>
      ),
    },
    {
      key: "action_description",
      header: "Action Description",
      render: (row) => (
        <span className="text-slate-500 text-[12.5px] line-clamp-2 max-w-[260px]">
          {row.action_description || "—"}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => (
        <span className="text-slate-500 text-[12.5px] line-clamp-2 max-w-[240px]">
          {row.notes || "—"}
        </span>
      ),
    },
  ];
  const extraToolbar = (
    <>
      <FilterSelect
        value={actionFilter}
        onChange={handleAction}
        options={uniqueActions}
        placeholder="All Actions"
        minWidth={140}
      />
      <FilterSelect
        value={sectionFilter}
        onChange={handleSection}
        options={uniqueSections}
        placeholder="All Sections"
        minWidth={150}
      />
      {hasFilters && (
        <button
          onClick={handleClear}
          className="py-[9px] px-3.5 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] bg-white cursor-pointer text-slate-500 flex items-center gap-[5px] shadow-sm"
        >
          <IconX size={14} /> Clear
        </button>
      )}
    </>
  );

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Audit Trail">
      {pageError && (
        <div className="mb-4 py-3 px-[18px] bg-gradient-to-br from-red-50 to-white border border-red-200 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] flex items-center justify-between shadow-[0_2px_8px_rgba(239,68,68,0.08)]">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={18} />
            {pageError}
          </span>
          <button
            onClick={() => setPageError("")}
            className="bg-transparent border-0 cursor-pointer text-red-600 text-lg p-0 leading-none"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      <DataTable<AuditRecord>
        title="Audit Trail"
        subtitle="Full history of all user & employee actions"
        icon={<ScrollText size={20} />}
        rows={pagedRecords}
        isLoading={isLoading}
        columns={columns}
        actions={[]}
        getKey={(row, idx) => `${row.id}-${idx}`}
        emptyIcon={<FileText size={32} />}
        emptyTitle={
          hasFilters
            ? "No records match the current filters"
            : "No audit trail records found"
        }
        emptySubtitle={
          hasFilters
            ? "Try adjusting or clearing the filters"
            : "Actions will appear here once users make changes"
        }
        stats={stats}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={filteredRecords.length}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
        itemLabel="records"
        searchQuery={searchQuery}
        searchPlaceholder="Search by owner, employee, action…"
        onSearchChange={handleSearch}
        extraToolbar={extraToolbar}
        sortableColumns={{
          event_time: {
            dir: dateSort,
            onToggle: () => {
              setDateSort((p) => (p === "desc" ? "asc" : "desc"));
              setCurrentPage(1);
            },
          },
        }}
      />
    </Layout>
  );
}
