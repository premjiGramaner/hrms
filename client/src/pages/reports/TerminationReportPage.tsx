import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import type {
  ReportFilterOptions,
  ReportQueryParams,
  TerminationReportRecord,
} from "../../types";
import {
  fetchTerminationReport,
  downloadTerminationReportExcel,
  downloadTerminationReportPDF,
  fetchReportFilterOptions,
} from "../../api/report.api";
import { IconClipboardList } from "../../components/Icons";
import { FileText } from "lucide-react";
import Toast from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/errors";

const REPORT_CONFIG = {
  TITLE: "Termination Report",
  SUBTITLE:
    "Comprehensive termination history with exit details and rehire eligibility",
  SEARCH_PLACEHOLDER: "Search by employee name...",
  ITEM_LABEL: "terminated employees",
  EMPTY_TITLE: "No Terminated Employees",
  EMPTY_SUBTITLE: "No records match your current filters",
  EXPORT_EXCEL_LABEL: "Export Excel",
  EXPORT_PDF_LABEL: "Export PDF",
  DEFAULT_SORT_COLUMN: "updated_at",
  DEFAULT_SORT_DIRECTION: "desc" as const,
} as const;

const TERMINATION_TYPE_CLASSES = {
  Voluntary: "bg-green-50 text-green-700",
  Involuntary: "bg-red-50 text-red-700",
  Retirement: "bg-orange-50 text-orange-700",
} as const;

const REHIRE_STATUS_CONFIG = {
  eligible: {
    className: "bg-green-50 text-green-700",
    label: "Yes",
  },
  notEligible: {
    className: "bg-red-50 text-red-700",
    label: "No",
  },
} as const;

const COLUMN_LABELS = {
  EMP_ID: "EMP ID",
  NAME: "Name",
  DESIGNATION: "Designation",
  TERMINATION_TYPE: "Termination Type",
  REASON: "Reason",
  JOIN_DATE: "Join Date",
  EXIT_DATE: "Exit Date",
  LAST_WORKING_DAY: "Last Working Day",
  NOTICE_PERIOD: "Notice Period",
  REHIRE_ELIGIBLE: "Rehire Eligible",
  NOTES: "Notes",
  SUPERVISOR: "Supervisor",
  TERMINATED_BY: "Terminated By",
  NOT_AVAILABLE: "N/A",
  NO_NOTES: "-",
  DAYS_SUFFIX: "days",
} as const;

const FILTER_LABELS = {
  ALL_COMPANIES: "All Companies",
  ALL_LOCATIONS: "All Locations",
  FROM_DATE_PLACEHOLDER: "From Date",
  TO_DATE_PLACEHOLDER: "To Date",
} as const;
import { REPORT_TABS } from "./reportTabs";

export default function TerminationReportPage() {
  const [reportData, setReportData] = useState<TerminationReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedGroupCompany, setSelectedGroupCompany] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
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
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        group_company: selectedGroupCompany || undefined,
        location: selectedLocation || undefined,
        sort_column: REPORT_CONFIG.DEFAULT_SORT_COLUMN,
        sort_direction: REPORT_CONFIG.DEFAULT_SORT_DIRECTION,
      };

      const result = await fetchTerminationReport(queryParams);
      setReportData(result.reportData);
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (error) {
      setReportData([]);
      Toast.error(
        getApiErrorMessage(error, "Failed to load the termination report."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchQuery,
    dateFrom,
    dateTo,
    selectedGroupCompany,
    selectedLocation,
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
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      group_company: selectedGroupCompany || undefined,
      location: selectedLocation || undefined,
    };
    try {
      await downloadTerminationReportExcel(queryParams);
      Toast.success("Termination report spreadsheet downloaded.");
    } catch (error) {
      Toast.error(getApiErrorMessage(error, "Failed to export the report."));
    }
  };

  const handleExportPDF = async () => {
    const queryParams = {
      employee_name: searchQuery || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      group_company: selectedGroupCompany || undefined,
      location: selectedLocation || undefined,
    };
    try {
      await downloadTerminationReportPDF(queryParams);
      Toast.success("Termination report PDF downloaded.");
    } catch (error) {
      Toast.error(getApiErrorMessage(error, "Failed to export the report."));
    }
  };

  const columns: ColumnDef<TerminationReportRecord>[] = [
    {
      key: "emp_id",
      header: COLUMN_LABELS.EMP_ID,
      width: 100,
      render: (row) => (
        <span className="font-semibold text-navy-700">
          {row.emp_id || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "employee_name",
      header: COLUMN_LABELS.NAME,
      width: 180,
      render: (row) => (
        <span className="font-medium">
          {row.employee_name || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "designation",
      header: COLUMN_LABELS.DESIGNATION,
      width: 150,
    },
    {
      key: "termination_type",
      header: COLUMN_LABELS.TERMINATION_TYPE,
      width: 140,
      render: (row) => {
        const terminationType =
          row.termination_type as keyof typeof TERMINATION_TYPE_CLASSES;
        const terminationTypeClass =
          TERMINATION_TYPE_CLASSES[terminationType] ||
          TERMINATION_TYPE_CLASSES.Retirement;
        return (
          <span
            className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${terminationTypeClass}`}
          >
            {row.termination_type || COLUMN_LABELS.NOT_AVAILABLE}
          </span>
        );
      },
    },
    {
      key: "termination_reason",
      header: COLUMN_LABELS.REASON,
      width: 200,
      render: (row) => (
        <span className="text-[13px]">
          {row.termination_reason || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "date_of_joining",
      header: COLUMN_LABELS.JOIN_DATE,
      width: 140,
    },
    {
      key: "date_of_exit",
      header: COLUMN_LABELS.EXIT_DATE,
      width: 140,
      render: (row) => (
        <span className="text-red-600 font-semibold">
          {row.date_of_exit || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "last_working_day",
      header: COLUMN_LABELS.LAST_WORKING_DAY,
      width: 140,
      render: (row) => (
        <span className="font-medium">
          {row.last_working_day || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "notice_period_days",
      header: COLUMN_LABELS.NOTICE_PERIOD,
      width: 120,
      render: (row) => (
        <span>
          {row.notice_period_days !== undefined
            ? `${row.notice_period_days} ${COLUMN_LABELS.DAYS_SUFFIX}`
            : COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "rehire_eligible",
      header: COLUMN_LABELS.REHIRE_ELIGIBLE,
      width: 130,
      render: (row) => {
        const statusConfig = row.rehire_eligible
          ? REHIRE_STATUS_CONFIG.eligible
          : REHIRE_STATUS_CONFIG.notEligible;
        return (
          <span
            className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        );
      },
    },
    {
      key: "termination_notes",
      header: COLUMN_LABELS.NOTES,
      width: 200,
      render: (row) => (
        <span className="text-[13px] text-slate-500">
          {row.termination_notes || COLUMN_LABELS.NO_NOTES}
        </span>
      ),
    },
    {
      key: "actual_supervisor",
      header: COLUMN_LABELS.SUPERVISOR,
      width: 160,
      render: (row) => (
        <span className="text-[13px]">
          {row.actual_supervisor || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "terminated_by",
      header: COLUMN_LABELS.TERMINATED_BY,
      width: 150,
      render: (row) => (
        <span className="text-[13px] italic">
          {row.terminated_by || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
  ];

  const filterToolbar = (
    <div className="flex gap-3 flex-wrap items-center">
      <input
        type="date"
        value={dateFrom}
        onChange={(event) => setDateFrom(event.target.value)}
        placeholder={FILTER_LABELS.FROM_DATE_PLACEHOLDER}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      />

      <input
        type="date"
        value={dateTo}
        onChange={(event) => setDateTo(event.target.value)}
        placeholder={FILTER_LABELS.TO_DATE_PLACEHOLDER}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      />

      <select
        value={selectedGroupCompany}
        onChange={(event) => setSelectedGroupCompany(event.target.value)}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      >
        <option value="">{FILTER_LABELS.ALL_COMPANIES}</option>
        {filterOptions.subUnits.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>

      <select
        value={selectedLocation}
        onChange={(event) => setSelectedLocation(event.target.value)}
        className="py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#1b2a6b] transition-colors"
      >
        <option value="">{FILTER_LABELS.ALL_LOCATIONS}</option>
        {filterOptions.locations.map((location) => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
      </select>

      <button
        onClick={handleExportExcel}
        className="py-2 px-4 bg-[#16A085] text-white border-none rounded-md text-[13px] font-semibold cursor-pointer hover:bg-[#138f72] transition-colors"
      >
        Export Excel
      </button>

      <button
        onClick={handleExportPDF}
        className="py-2 px-4 bg-[#21088dff] text-white border-none rounded-md text-[13px] font-semibold cursor-pointer hover:bg-[#1a0670] transition-colors"
      >
        Export PDF
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
          icon={<IconClipboardList size={18} />}
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
          emptyIcon={<FileText size={48} className="text-slate-400" />}
          emptyTitle={REPORT_CONFIG.EMPTY_TITLE}
          emptySubtitle={REPORT_CONFIG.EMPTY_SUBTITLE}
        />
      </div>
    </Layout>
  );
}
