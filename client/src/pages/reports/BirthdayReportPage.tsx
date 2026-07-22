import { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import type { BirthdayReportRecord } from "../../types";
import {
  fetchBirthdayReport,
  downloadBirthdayReportExcel,
} from "../../api/report.api";
import { IconGift } from "../../components/Icons";
import { ERROR_MESSAGES } from "../../constants/messages";
import { COLORS } from "../../styles/theme";

const REPORT_CONFIG = {
  TITLE: "Birthday Report",
  SUBTITLE: "View all employee birthdays",
  SEARCH_PLACEHOLDER: "Search by employee name...",
  ITEM_LABEL: "employees",
  EMPTY_ICON_TEXT: "🎂",
  EMPTY_TITLE: "No Birthdays Found",
  EMPTY_SUBTITLE: "No employee birthdays match your current filters",
  EXPORT_BUTTON_LABEL: "Export Excel",
  DEFAULT_SORT_COLUMN: "real_dob",
  DEFAULT_SORT_DIRECTION: "asc" as const,
} as const;

const FILTER_OPTIONS = {
  MONTHS: [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ],
  GENDERS: [
    { value: "", label: "All Genders" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ],
  MARITAL_STATUS: [
    { value: "", label: "All Marital Status" },
    { value: "Single", label: "Single" },
    { value: "Married", label: "Married" },
    { value: "Divorced", label: "Divorced" },
    { value: "Widowed", label: "Widowed" },
  ],
} as const;

const TABS: TabItem[] = [
  { label: "Birthday Report", path: "/reports/birthday" },
  { label: "Work Anniversary", path: "/reports/work-anniversary" },
  { label: "Termination Report", path: "/reports/termination" },
  { label: "Notifications", path: "/reports/notifications" },
];

const COLUMN_LABELS = {
  EMPLOYEE_ID: "Employee ID",
  FIRST_NAME: "First Name",
  LAST_NAME: "Last Name",
  FULL_NAME: "Full Name",
  BIRTHDAY_DATE: "Birthday Date",
  GENDER: "Gender",
  MARITAL_STATUS: "Marital Status",
  NOT_AVAILABLE: "N/A",
} as const;

export default function BirthdayReportPage() {
  const [reportData, setReportData] = useState<BirthdayReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState("");

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        employee_name: searchQuery || undefined,
        month: selectedMonth || undefined,
        gender: selectedGender || undefined,
        marital_status: selectedMaritalStatus || undefined,
        sort_column: REPORT_CONFIG.DEFAULT_SORT_COLUMN,
        sort_direction: REPORT_CONFIG.DEFAULT_SORT_DIRECTION,
      };

      const result = await fetchBirthdayReport(queryParams);
      setReportData(result.reportData);
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Failed to load birthday report:", error);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchQuery,
    selectedMonth,
    selectedGender,
    selectedMaritalStatus,
  ]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleExportExcel = async () => {
    const queryParams = {
      employee_name: searchQuery || undefined,
      month: selectedMonth || undefined,
      gender: selectedGender || undefined,
      marital_status: selectedMaritalStatus || undefined,
    };
    try {
      await downloadBirthdayReportExcel(queryParams);
    } catch (error) {
      console.error("Export failed:", error);
      alert(ERROR_MESSAGES.EXPORT_FAILED);
    }
  };

  const columns: ColumnDef<BirthdayReportRecord>[] = [
    {
      key: "employee_id",
      header: COLUMN_LABELS.EMPLOYEE_ID,
      width: 130,
      render: (row) => (
        <span className="font-semibold" style={{ color: COLORS.primary.navy }}>
          {row.employee_id || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "first_name",
      header: COLUMN_LABELS.FIRST_NAME,
      width: 150,
    },
    {
      key: "last_name",
      header: COLUMN_LABELS.LAST_NAME,
      width: 150,
    },
    {
      key: "full_name",
      header: COLUMN_LABELS.FULL_NAME,
      width: 200,
      render: (row) => <span className="font-medium">{row.full_name}</span>,
    },
    {
      key: "formatted_birthday",
      header: COLUMN_LABELS.BIRTHDAY_DATE,
      width: 150,
      render: (row) => (
        <span className="font-semibold text-orange-500">
          {row.formatted_birthday || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "gender",
      header: COLUMN_LABELS.GENDER,
      width: 100,
    },
    {
      key: "marital_status",
      header: COLUMN_LABELS.MARITAL_STATUS,
      width: 140,
    },
  ];

  const filterToolbar = (
    <div className="flex gap-3 flex-wrap items-center">
      <select
        value={selectedMonth}
        onChange={(event) => setSelectedMonth(event.target.value)}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      >
        <option value="">All Months</option>
        {FILTER_OPTIONS.MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>

      <select
        value={selectedGender}
        onChange={(event) => setSelectedGender(event.target.value)}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      >
        {FILTER_OPTIONS.GENDERS.map((gender) => (
          <option key={gender.value} value={gender.value}>
            {gender.label}
          </option>
        ))}
      </select>

      <select
        value={selectedMaritalStatus}
        onChange={(event) => setSelectedMaritalStatus(event.target.value)}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      >
        {FILTER_OPTIONS.MARITAL_STATUS.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleExportExcel}
        className="py-2 px-4 bg-[#16A085] text-white border-none rounded-md text-[13px] font-semibold cursor-pointer hover:bg-[#138f72] transition-colors"
      >
        {REPORT_CONFIG.EXPORT_BUTTON_LABEL}
      </button>
    </div>
  );

  return (
    <Layout
      title="Reports and Analytics"
      tabs={TABS}
      activeTab={REPORT_CONFIG.TITLE}
    >
      <div className="py-5 px-10">
        <DataTable
          title={REPORT_CONFIG.TITLE}
          subtitle={REPORT_CONFIG.SUBTITLE}
          icon={<IconGift size={18} />}
          rows={reportData}
          columns={columns}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          pageSizeOptions={[10, 15, 20, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          searchQuery={searchQuery}
          searchPlaceholder={REPORT_CONFIG.SEARCH_PLACEHOLDER}
          onSearchChange={setSearchQuery}
          extraToolbar={filterToolbar}
          itemLabel={REPORT_CONFIG.ITEM_LABEL}
          emptyIcon={REPORT_CONFIG.EMPTY_ICON_TEXT}
          emptyTitle={REPORT_CONFIG.EMPTY_TITLE}
          emptySubtitle={REPORT_CONFIG.EMPTY_SUBTITLE}
        />
      </div>
    </Layout>
  );
}
