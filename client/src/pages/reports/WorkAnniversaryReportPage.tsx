import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import type {
  WorkAnniversaryReportRecord,
  ReportFilterOptions,
  ReportQueryParams,
} from "../../types";
import {
  fetchWorkAnniversaryReport,
  downloadWorkAnniversaryReportExcel,
  fetchReportFilterOptions,
} from "../../api/report.api";
import { IconAward } from "../../components/Icons";
import { PartyPopper } from "lucide-react";
import Toast from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/errors";
import { MONTH_OPTIONS, YEARS_OF_SERVICE_OPTIONS } from "../../config/uiConstants";

const REPORT_CONFIG = {
  TITLE: "Work Anniversary Report",
  SUBTITLE: "View employee work anniversaries and tenure information",
  SEARCH_PLACEHOLDER: "Search by employee name...",
  ITEM_LABEL: "employees",
  EMPTY_TITLE: "No Work Anniversaries Found",
  EMPTY_SUBTITLE: "No employee work anniversaries match your current filters",
  EXPORT_BUTTON_LABEL: "Export Excel",
  DEFAULT_SORT_COLUMN: "joined_date",
  DEFAULT_SORT_DIRECTION: "asc" as const,
} as const;

const FILTER_OPTIONS = {
  MONTHS: MONTH_OPTIONS,
  SERVICE_YEARS: YEARS_OF_SERVICE_OPTIONS,
} as const;

const COLUMN_LABELS = {
  EMPLOYEE_ID: "Employee ID",
  EMPLOYEE_NAME: "Employee Name",
  DESIGNATION: "Designation",
  DEPARTMENT: "Department",
  LOCATION: "Location",
  DATE_OF_JOINING: "Date of Joining",
  ANNIVERSARY_DATE: "Anniversary Date",
  YEARS_OF_SERVICE: "Years of Service",
  TENURE: "Tenure",
  NOT_AVAILABLE: "N/A",
  YEAR_SUFFIX: "Year",
  YEARS_SUFFIX: "Years",
  YEAR_LABEL: "y",
  MONTH_LABEL: "m",
} as const;

const FILTER_LABELS = {
  ALL_MONTHS: "All Months",
  ALL_YEARS: "All Years",
  ALL_DEPARTMENTS: "All Departments",
} as const;
import { REPORT_TABS } from "./reportTabs";

export default function WorkAnniversaryReportPage() {
  const [reportData, setReportData] = useState<WorkAnniversaryReportRecord[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYears, setSelectedYears] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [filterOptions, setFilterOptions] = useState<ReportFilterOptions>({
    subUnits: [],
    locations: [],
  });

  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await fetchReportFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      Toast.error(
        getApiErrorMessage(error, "Failed to load report filter options."),
      );
    }
  }, []);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams: ReportQueryParams = {
        page: currentPage,
        limit: pageSize,
        employee_name: searchQuery || undefined,
        month: selectedMonth || undefined,
        years_of_service: selectedYears || undefined,
        department: selectedDepartment || undefined,
        sort_column: REPORT_CONFIG.DEFAULT_SORT_COLUMN,
        sort_direction: REPORT_CONFIG.DEFAULT_SORT_DIRECTION,
      };

      const result = await fetchWorkAnniversaryReport(queryParams);
      setReportData(result.reportData);
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (error) {
      setReportData([]);
      Toast.error(
        getApiErrorMessage(
          error,
          "Failed to load the work anniversary report.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchQuery,
    selectedMonth,
    selectedYears,
    selectedDepartment,
  ]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleExportExcel = async () => {
    const queryParams = {
      employee_name: searchQuery || undefined,
      month: selectedMonth || undefined,
      years_of_service: selectedYears || undefined,
      department: selectedDepartment || undefined,
    };
    try {
      await downloadWorkAnniversaryReportExcel(queryParams);
      Toast.success("Work anniversary report downloaded successfully.");
    } catch (error) {
      Toast.error(getApiErrorMessage(error, "Failed to export the report."));
    }
  };

  const columns: ColumnDef<WorkAnniversaryReportRecord>[] = [
    {
      key: "employee_id",
      header: COLUMN_LABELS.EMPLOYEE_ID,
      width: 130,
      render: (row) => (
        <span className="font-semibold text-navy-700">
          {row.employee_id || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "employee_name",
      header: COLUMN_LABELS.EMPLOYEE_NAME,
      width: 200,
      render: (row) => <span className="font-medium">{row.employee_name}</span>,
    },
    {
      key: "designation",
      header: COLUMN_LABELS.DESIGNATION,
      width: 180,
    },
    {
      key: "department",
      header: COLUMN_LABELS.DEPARTMENT,
      width: 150,
    },
    {
      key: "location",
      header: COLUMN_LABELS.LOCATION,
      width: 140,
    },
    {
      key: "date_of_joining",
      header: COLUMN_LABELS.DATE_OF_JOINING,
      width: 140,
    },
    {
      key: "formatted_anniversary",
      header: COLUMN_LABELS.ANNIVERSARY_DATE,
      width: 150,
      render: (row) => (
        <span className="font-semibold text-violet-600">
          {row.formatted_anniversary || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "years_of_service",
      header: COLUMN_LABELS.YEARS_OF_SERVICE,
      width: 140,
      render: (row) => (
        <span className="py-1.5 px-3 rounded-md text-xs font-bold bg-[#16A085] text-white">
          {row.years_of_service}{" "}
          {row.years_of_service !== 1
            ? COLUMN_LABELS.YEARS_SUFFIX
            : COLUMN_LABELS.YEAR_SUFFIX}
        </span>
      ),
    },
    {
      key: "additional_months",
      header: COLUMN_LABELS.TENURE,
      width: 120,
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.years_of_service}
          {COLUMN_LABELS.YEAR_LABEL} {row.additional_months || 0}
          {COLUMN_LABELS.MONTH_LABEL}
        </span>
      ),
    },
  ];

  const filterToolbar = (
    <div className="flex gap-3 flex-wrap items-center">
      <select
        value={selectedMonth}
        onChange={(event) => setSelectedMonth(event.target.value)}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      >
        <option value="">{FILTER_LABELS.ALL_MONTHS}</option>
        {FILTER_OPTIONS.MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>

      <select
        value={selectedYears}
        onChange={(event) => setSelectedYears(event.target.value)}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      >
        <option value="">{FILTER_LABELS.ALL_YEARS}</option>
        {FILTER_OPTIONS.SERVICE_YEARS.map((yearValue) => (
          <option key={yearValue} value={yearValue}>
            {yearValue}{" "}
            {yearValue !== 1
              ? COLUMN_LABELS.YEARS_SUFFIX
              : COLUMN_LABELS.YEAR_SUFFIX}
          </option>
        ))}
      </select>

      <select
        value={selectedDepartment}
        onChange={(event) => setSelectedDepartment(event.target.value)}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      >
        <option value="">{FILTER_LABELS.ALL_DEPARTMENTS}</option>
        {filterOptions.subUnits.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
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
      tabs={REPORT_TABS}
      activeTab={REPORT_CONFIG.TITLE}
    >
      <div className="py-5 px-10">
        <DataTable
          title={REPORT_CONFIG.TITLE}
          subtitle={REPORT_CONFIG.SUBTITLE}
          icon={<IconAward size={18} />}
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
          emptyIcon={<PartyPopper size={48} className="text-slate-400" />}
          emptyTitle={REPORT_CONFIG.EMPTY_TITLE}
          emptySubtitle={REPORT_CONFIG.EMPTY_SUBTITLE}
        />
      </div>
    </Layout>
  );
}
