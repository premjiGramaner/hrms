import { useEffect, useMemo, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import { getAuditTrail } from "../../api/hradmin.api";
import useDebounce from "../../hooks/useDebounce";
import DataTable, { ColumnDef, StatCard } from "../../components/DataTable";
import { getAvatarSrc, getInitials } from "../../utils/avatar";
import { FileText } from "lucide-react";
import {
  IconActivity,
  IconPlusCircle,
  IconEdit,
  IconXCircle,
  IconAlertCircle,
  IconX,
  IconClipboardList,
} from "../../components/Icons";
import { ACTION_COLORS } from "../../config/uiConstants";
import { PAGE_PATHS } from "../../config/roles";
import { ERROR_MESSAGES } from "../../constants/messages";

const TABS: TabItem[] = [
  { label: "Job Titles", path: PAGE_PATHS.hradminJobTitles },
  { label: "Job Categories", path: PAGE_PATHS.hradminJobCategories },
  { label: "Sub Units", path: PAGE_PATHS.hradminSubUnits },
  { label: "Role Access", path: PAGE_PATHS.hradminRoleAccess },
  { label: "Audit Trail", path: PAGE_PATHS.hradminAuditTrail },
] as const;

const PAGE_CONFIG = {
  TITLE: "Audit Trail",
  SUBTITLE: "Full history of all user & employee actions",
  INITIAL_PAGE_SIZE: 50,
  LARGE_FETCH_SIZE: 10000,
} as const;

const FILTER_CONFIG = {
  ALL_VALUE: "all",
  PLACEHOLDERS: {
    ACTION: "All Actions",
    SECTION: "All Sections",
  },
  MIN_WIDTHS: {
    ACTION: 140,
    SECTION: 150,
  },
} as const;

const STAT_LABELS = {
  TOTAL_EVENTS: "Total Events",
  CREATED: "Created",
  UPDATED: "Updated",
  TERMINATED: "Terminated",
} as const;

const ACTION_TYPES = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  TERMINATE: "TERMINATE",
  DELETE: "DELETE",
} as const;

const COLUMN_CONFIG = {
  WIDTHS: {
    ACTION: 110,
    EMPLOYEE_ID: 120,
    SECTION: 120,
  },
  LABELS: {
    DATE: "Date",
    ACTION_OWNER: "Action Owner",
    ACTION: "Action",
    EMPLOYEE: "Employee",
    EMPLOYEE_ID: "Employee ID",
    SECTION: "Section",
    PERFORMED_SCREEN: "Performed Screen",
    ACTION_DESCRIPTION: "Action Description",
    NOTES: "Notes",
  },
  MAX_WIDTHS: {
    ACTION_DESCRIPTION: "max-w-[260px]",
    NOTES: "max-w-[240px]",
  },
} as const;

const EMPTY_STATE = {
  ICON_SIZE: 32,
  NO_RECORDS_TITLE: "No audit trail records found",
  NO_RECORDS_SUBTITLE: "Actions will appear here once users make changes",
  NO_FILTERED_TITLE: "No records match the current filters",
  NO_FILTERED_SUBTITLE: "Try adjusting or clearing the filters",
} as const;

const SEARCH_CONFIG = {
  PLACEHOLDER: "Search by owner, employee, action…",
  DEBOUNCE_DELAY: 300,
} as const;

const UI_TEXT = {
  CLEAR_BUTTON: "Clear",
  EMPTY_VALUE: "—",
  USERNAME_PREFIX: "@",
  RESULT_SINGULAR: "result",
  RESULT_PLURAL: "results",
} as const;

const ACTION_BADGE_STYLES = {
  [ACTION_TYPES.CREATE]: {
    bg: "bg-[#dcfce7]",
    text: "text-[#16a34a]",
    dot: "bg-[#22c55e]",
  },
  [ACTION_TYPES.UPDATE]: {
    bg: "bg-[#fef9c3]",
    text: "text-[#a16207]",
    dot: "bg-[#eab308]",
  },
  [ACTION_TYPES.DELETE]: {
    bg: "bg-[#fee2e2]",
    text: "text-[#dc2626]",
    dot: "bg-[#ef4444]",
  },
  [ACTION_TYPES.TERMINATE]: {
    bg: "bg-[#fce7f3]",
    text: "text-[#9d174d]",
    dot: "bg-[#ec4899]",
  },
  DEFAULT: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
} as const;

const STAT_COLORS = {
  TOTAL_EVENTS: {
    color: "#1b2a6b",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  CREATED: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  UPDATED: {
    color: "#a16207",
    bg: "#fefce8",
    border: "#fde68a",
  },
  TERMINATED: {
    color: "#9d174d",
    bg: "#fdf2f8",
    border: "#fbcfe8",
  },
} as const;

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
  if (!iso) return UI_TEXT.EMPTY_VALUE;
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
  minWidth = FILTER_CONFIG.MIN_WIDTHS.ACTION,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  minWidth?: number;
}) {
  const widthClass =
    minWidth === FILTER_CONFIG.MIN_WIDTHS.SECTION
      ? "min-w-[150px]"
      : "min-w-[140px]";

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  const renderOption = (option: string) => (
    <option key={option} value={option}>
      {option}
    </option>
  );

  return (
    <div className="relative">
      <select
        value={value}
        onChange={handleSelectChange}
        className={`py-[9px] pl-3 pr-8 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] outline-none appearance-none bg-white cursor-pointer shadow-sm transition-colors focus:border-[#1b2a6b] ${widthClass}`}
      >
        <option value={FILTER_CONFIG.ALL_VALUE}>{placeholder}</option>
        {options.map(renderOption)}
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
  const [actionFilter, setActionFilter] = useState<string>(
    FILTER_CONFIG.ALL_VALUE,
  );
  const [sectionFilter, setSectionFilter] = useState<string>(
    FILTER_CONFIG.ALL_VALUE,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    PAGE_CONFIG.INITIAL_PAGE_SIZE,
  );
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc");

  const handleAuditTrailSuccess = (response: { data: AuditRecord[] }) => {
    setAllRecords(response.data);
    setFilteredRecords(response.data);
  };

  const handleAuditTrailError = () => {
    setPageError(ERROR_MESSAGES.LOAD_FAILED("audit trail"));
  };

  const handleAuditTrailComplete = () => {
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    getAuditTrail(1, PAGE_CONFIG.LARGE_FETCH_SIZE)
      .then(handleAuditTrailSuccess)
      .catch(handleAuditTrailError)
      .finally(handleAuditTrailComplete);
  }, []);

  const getRecordAction = (record: AuditRecord): string => record.action;

  const getRecordSection = (record: AuditRecord): string => record.section;

  const getUniqueActions = (records: AuditRecord[]): string[] => {
    return [...new Set(records.map(getRecordAction).filter(Boolean))];
  };

  const getUniqueSections = (records: AuditRecord[]): string[] => {
    return [...new Set(records.map(getRecordSection).filter(Boolean))];
  };

  const uniqueActions = getUniqueActions(allRecords);
  const uniqueSections = getUniqueSections(allRecords);

  const recordMatchesSearch = (record: AuditRecord, term: string): boolean => {
    if (!term) return true;

    const searchableFields = [
      record.action_owner,
      record.employee,
      record.action_owner_username || "",
      record.employee_username || "",
      record.section,
      record.action_description,
      record.notes || "",
      record.performed_screen,
    ];

    const fieldMatchesTerm = (field: string) =>
      field.toLowerCase().includes(term);

    return searchableFields.some(fieldMatchesTerm);
  };

  const recordMatchesAction = (
    record: AuditRecord,
    action: string,
  ): boolean => {
    return action === FILTER_CONFIG.ALL_VALUE || record.action === action;
  };

  const recordMatchesSection = (
    record: AuditRecord,
    section: string,
  ): boolean => {
    return section === FILTER_CONFIG.ALL_VALUE || record.section === section;
  };

  const createRecordFilterPredicate =
    (term: string, action: string, section: string) =>
    (record: AuditRecord): boolean => {
      return (
        recordMatchesSearch(record, term) &&
        recordMatchesAction(record, action) &&
        recordMatchesSection(record, section)
      );
    };

  const applyFilters = (search: string, action: string, section: string) => {
    const term = search.toLowerCase();
    const filterPredicate = createRecordFilterPredicate(term, action, section);
    const filtered = allRecords.filter(filterPredicate);
    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const handleDebouncedSearch = (value: string) => {
    applyFilters(value, actionFilter, sectionFilter);
  };

  const debouncedSearch = useDebounce(
    handleDebouncedSearch,
    SEARCH_CONFIG.DEBOUNCE_DELAY,
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
    setActionFilter(FILTER_CONFIG.ALL_VALUE);
    setSectionFilter(FILTER_CONFIG.ALL_VALUE);
    setFilteredRecords(allRecords);
    setCurrentPage(1);
  };

  const hasFilters =
    searchQuery !== "" ||
    actionFilter !== FILTER_CONFIG.ALL_VALUE ||
    sectionFilter !== FILTER_CONFIG.ALL_VALUE;

  const sortRecordsByDate = (
    first: AuditRecord,
    second: AuditRecord,
    direction: "asc" | "desc",
  ): number => {
    const diff =
      new Date(first.event_time).getTime() -
      new Date(second.event_time).getTime();
    return direction === "desc" ? -diff : diff;
  };

  const createDateSortComparator =
    (direction: "asc" | "desc") =>
    (first: AuditRecord, second: AuditRecord): number => {
      return sortRecordsByDate(first, second, direction);
    };

  const paginateRecords = (
    records: AuditRecord[],
    page: number,
    size: number,
  ): AuditRecord[] => {
    const startIndex = (page - 1) * size;
    const endIndex = page * size;
    return records.slice(startIndex, endIndex);
  };

  const calculatePagedRecords = (
    records: AuditRecord[],
    sortDirection: "asc" | "desc",
    page: number,
    size: number,
  ): AuditRecord[] => {
    const sortComparator = createDateSortComparator(sortDirection);
    const sorted = [...records].sort(sortComparator);
    return paginateRecords(sorted, page, size);
  };

  const pagedRecords = useMemo(() => {
    return calculatePagedRecords(
      filteredRecords,
      dateSort,
      currentPage,
      pageSize,
    );
  }, [filteredRecords, currentPage, pageSize, dateSort]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);

  const countRecordsByAction = (
    records: AuditRecord[],
    actionType: string,
  ): number => {
    const matchesActionType = (record: AuditRecord) =>
      record.action === actionType;
    return records.filter(matchesActionType).length;
  };

  const createCount = countRecordsByAction(allRecords, ACTION_TYPES.CREATE);
  const updateCount = countRecordsByAction(allRecords, ACTION_TYPES.UPDATE);
  const terminateCount = countRecordsByAction(
    allRecords,
    ACTION_TYPES.TERMINATE,
  );

  const stats: StatCard[] = [
    {
      label: STAT_LABELS.TOTAL_EVENTS,
      value: allRecords.length,
      icon: <IconActivity size={20} />,
      ...STAT_COLORS.TOTAL_EVENTS,
    },
    {
      label: STAT_LABELS.CREATED,
      value: createCount,
      icon: <IconPlusCircle size={20} />,
      ...STAT_COLORS.CREATED,
    },
    {
      label: STAT_LABELS.UPDATED,
      value: updateCount,
      icon: <IconEdit size={20} />,
      ...STAT_COLORS.UPDATED,
    },
    {
      label: STAT_LABELS.TERMINATED,
      value: terminateCount,
      icon: <IconXCircle size={20} />,
      ...STAT_COLORS.TERMINATED,
    },
  ];

  const renderDateColumn = (row: AuditRecord) => (
    <span className="text-slate-600 text-[12.5px] whitespace-nowrap">
      {formatDateTime(row.event_time)}
    </span>
  );

  const renderActionOwnerAvatar = (
    avatarSrc: string | null,
    actionOwnerName: string,
  ) => {
    if (avatarSrc) {
      return (
        <img
          src={avatarSrc}
          alt={actionOwnerName || "Action owner"}
          className="w-full h-full object-cover block"
        />
      );
    }
    return getInitials(actionOwnerName);
  };

  const renderActionOwnerColumn = (row: AuditRecord) => {
    const avatarSrc = getAvatarSrc(row.action_owner_avatar);

    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#1b2a6b] to-[#16a085] flex items-center justify-center text-white text-[11px] font-bold shadow-[0_2px_6px_rgba(27,42,107,0.2)]">
          {renderActionOwnerAvatar(avatarSrc, row.action_owner)}
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-[13px]">
            {row.action_owner || UI_TEXT.EMPTY_VALUE}
          </div>
          <div className="text-slate-400 text-[11px]">
            {row.action_owner_username || ""}
          </div>
        </div>
      </div>
    );
  };

  const getActionBadgeStyles = (action: string) => {
    return (
      ACTION_BADGE_STYLES[action as keyof typeof ACTION_BADGE_STYLES] ??
      ACTION_BADGE_STYLES.DEFAULT
    );
  };

  const getActionColors = (action: string) => {
    return (
      ACTION_COLORS[action as keyof typeof ACTION_COLORS] ?? {
        backgroundColor: "#f1f5f9",
        textColor: "#64748b",
        indicatorColor: "#94a3b8",
      }
    );
  };

  // Render action column
  const renderActionColumn = (row: AuditRecord) => {
    const actionColors = getActionColors(row.action);
    const styles = getActionBadgeStyles(row.action);

    return (
      <span
        className={`inline-flex items-center gap-[5px] text-[11.5px] font-bold px-2.5 py-1 rounded-full tracking-wide border ${styles.bg} ${styles.text}`}
        style={{ borderColor: actionColors.backgroundColor }}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`}
        />
        {row.action}
      </span>
    );
  };

  const renderEmployeeColumn = (row: AuditRecord) => (
    <div>
      <div className="font-semibold text-slate-800 text-[13px]">
        {row.employee || UI_TEXT.EMPTY_VALUE}
      </div>
      {row.employee_username && (
        <div className="text-[11px] text-slate-400 mt-px">
          {UI_TEXT.USERNAME_PREFIX}
          {row.employee_username}
        </div>
      )}
    </div>
  );

  const renderEmployeeCodeColumn = (row: AuditRecord) => (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-200">
      {row.employee_code || UI_TEXT.EMPTY_VALUE}
    </span>
  );

  const renderSectionColumn = (row: AuditRecord) => (
    <span className="px-2.5 py-[3px] rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
      {row.section || UI_TEXT.EMPTY_VALUE}
    </span>
  );

  const renderPerformedScreenColumn = (row: AuditRecord) => (
    <span className="text-slate-500 text-[12.5px]">
      {row.performed_screen || UI_TEXT.EMPTY_VALUE}
    </span>
  );

  const renderActionDescriptionColumn = (row: AuditRecord) => (
    <span
      className={`text-slate-500 text-[12.5px] line-clamp-2 ${COLUMN_CONFIG.MAX_WIDTHS.ACTION_DESCRIPTION}`}
    >
      {row.action_description || UI_TEXT.EMPTY_VALUE}
    </span>
  );

  const renderNotesColumn = (row: AuditRecord) => (
    <span
      className={`text-slate-500 text-[12.5px] line-clamp-2 ${COLUMN_CONFIG.MAX_WIDTHS.NOTES}`}
    >
      {row.notes || UI_TEXT.EMPTY_VALUE}
    </span>
  );

  const columns: ColumnDef<AuditRecord>[] = [
    {
      key: "event_time",
      header: COLUMN_CONFIG.LABELS.DATE,
      render: renderDateColumn,
    },
    {
      key: "action_owner",
      header: COLUMN_CONFIG.LABELS.ACTION_OWNER,
      render: renderActionOwnerColumn,
    },
    {
      key: "action",
      header: COLUMN_CONFIG.LABELS.ACTION,
      width: COLUMN_CONFIG.WIDTHS.ACTION,
      render: renderActionColumn,
    },
    {
      key: "employee",
      header: COLUMN_CONFIG.LABELS.EMPLOYEE,
      render: renderEmployeeColumn,
    },
    {
      key: "employee_code",
      header: COLUMN_CONFIG.LABELS.EMPLOYEE_ID,
      width: COLUMN_CONFIG.WIDTHS.EMPLOYEE_ID,
      render: renderEmployeeCodeColumn,
    },
    {
      key: "section",
      header: COLUMN_CONFIG.LABELS.SECTION,
      width: COLUMN_CONFIG.WIDTHS.SECTION,
      render: renderSectionColumn,
    },
    {
      key: "performed_screen",
      header: COLUMN_CONFIG.LABELS.PERFORMED_SCREEN,
      render: renderPerformedScreenColumn,
    },
    {
      key: "action_description",
      header: COLUMN_CONFIG.LABELS.ACTION_DESCRIPTION,
      render: renderActionDescriptionColumn,
    },
    {
      key: "notes",
      header: COLUMN_CONFIG.LABELS.NOTES,
      render: renderNotesColumn,
    },
  ];

  const extraToolbar = (
    <>
      <FilterSelect
        value={actionFilter}
        onChange={handleAction}
        options={uniqueActions}
        placeholder={FILTER_CONFIG.PLACEHOLDERS.ACTION}
        minWidth={FILTER_CONFIG.MIN_WIDTHS.ACTION}
      />
      <FilterSelect
        value={sectionFilter}
        onChange={handleSection}
        options={uniqueSections}
        placeholder={FILTER_CONFIG.PLACEHOLDERS.SECTION}
        minWidth={FILTER_CONFIG.MIN_WIDTHS.SECTION}
      />
      {hasFilters && (
        <button
          onClick={handleClear}
          className="py-[9px] px-3.5 border-[1.5px] border-slate-200 rounded-[10px] text-[13px] bg-white cursor-pointer text-slate-500 flex items-center gap-[5px] shadow-sm transition-colors hover:bg-slate-50 focus:border-[#1b2a6b]"
        >
          <IconX size={14} /> {UI_TEXT.CLEAR_BUTTON}
        </button>
      )}
    </>
  );

  const handleClearPageError = () => {
    setPageError("");
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const toggleDateSort = () => {
    setDateSort((previous) => (previous === "desc" ? "asc" : "desc"));
    setCurrentPage(1);
  };

  const generateRowKey = (row: AuditRecord, index: number): string => {
    return `${row.id}-${index}`;
  };

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Audit Trail">
      {pageError && (
        <div className="mb-4 py-3 px-[18px] bg-gradient-to-br from-red-50 to-white border border-red-200 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] flex items-center justify-between shadow-[0_2px_8px_rgba(239,68,68,0.08)]">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={18} />
            {pageError}
          </span>
          <button
            onClick={handleClearPageError}
            className="bg-transparent border-0 cursor-pointer text-red-600 text-lg p-0 leading-none hover:text-red-700 transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      <DataTable<AuditRecord>
        title={PAGE_CONFIG.TITLE}
        subtitle={PAGE_CONFIG.SUBTITLE}
        icon={<IconClipboardList size={20} />}
        rows={pagedRecords}
        isLoading={isLoading}
        columns={columns}
        actions={[]}
        getKey={generateRowKey}
        emptyIcon={<FileText size={EMPTY_STATE.ICON_SIZE} />}
        emptyTitle={
          hasFilters
            ? EMPTY_STATE.NO_FILTERED_TITLE
            : EMPTY_STATE.NO_RECORDS_TITLE
        }
        emptySubtitle={
          hasFilters
            ? EMPTY_STATE.NO_FILTERED_SUBTITLE
            : EMPTY_STATE.NO_RECORDS_SUBTITLE
        }
        stats={stats}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={filteredRecords.length}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="records"
        searchQuery={searchQuery}
        searchPlaceholder={SEARCH_CONFIG.PLACEHOLDER}
        onSearchChange={handleSearch}
        extraToolbar={extraToolbar}
        sortableColumns={{
          event_time: {
            dir: dateSort,
            onToggle: toggleDateSort,
          },
        }}
      />
    </Layout>
  );
}
