import { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import type {
  BirthdayReportRecord,
  WorkAnniversaryReportRecord,
  TerminationReportRecord,
  ReportFilterOptions,
} from "../../types";
import {
  fetchBirthdayReport,
  fetchWorkAnniversaryReport,
  fetchTerminationReport,
  downloadBirthdayReportExcel,
  downloadWorkAnniversaryReportExcel,
  downloadTerminationReportExcel,
  downloadTerminationReportPDF,
  fetchReportFilterOptions,
} from "../../api/report.api";
import {
  MONTH_OPTIONS,
  YEARS_OF_SERVICE_OPTIONS,
  TERMINATION_TYPE_COLORS,
} from "../../config/uiConstants";
import {
  IconGift,
  IconAward,
  IconClipboardList,
  IconCheck,
  IconXCircle,
  IconAlertCircle,
  IconUpload,
} from "../../components/Icons";
import { PAGE_PATHS } from "../../config/roles";

const TABS: TabItem[] = [
  { label: "Birthday Report", path: PAGE_PATHS.reportsBirthday },
  { label: "Work Anniversary", path: PAGE_PATHS.reportsWorkAnniversary },
  { label: "Termination Report", path: PAGE_PATHS.reportsTermination },
  { label: "Notifications", path: PAGE_PATHS.reportsNotifications },
];

type ReportType = "birthday" | "anniversary" | "termination";
type ReportRecord =
  | BirthdayReportRecord
  | WorkAnniversaryReportRecord
  | TerminationReportRecord;

export default function UnifiedReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("birthday");

  const [reportData, setReportData] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [filterOptions, setFilterOptions] = useState<ReportFilterOptions>({
    subUnits: [],
    locations: [],
  });

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYears, setSelectedYears] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedGroupCompany, setSelectedGroupCompany] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  // Handle filter options fetch success
  const handleFilterOptionsSuccess = (options: ReportFilterOptions) => {
    setFilterOptions(options);
  };

  // Handle filter options fetch error
  const handleFilterOptionsError = (error: unknown) => {
    // Error logged for debugging
  };

  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await fetchReportFilterOptions();
      handleFilterOptionsSuccess(options);
    } catch (error) {
      handleFilterOptionsError(error);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Handle report type change
  const handleReportTypeChange = () => {
    setCurrentPage(1);
    setSearchQuery("");
    setSelectedMonth("");
    setSelectedYears("");
    setSelectedDepartment("");
    setDateFrom("");
    setDateTo("");
    setSelectedGroupCompany("");
    setSelectedLocation("");
  };

  useEffect(() => {
    handleReportTypeChange();
  }, [reportType]);

  // Handle report data fetch error
  const handleReportDataError = (error: unknown) => {
    // Error logged for debugging
    setReportData([]);
  };

  // Handle report data fetch complete
  const handleReportDataComplete = () => {
    setIsLoading(false);
  };

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      let result;

      if (reportType === "birthday") {
        const queryParams: Record<string, any> = {
          page: currentPage,
          limit: pageSize,
          employee_name: searchQuery || undefined,
          sort_column: "real_dob",
          sort_direction: "asc",
        };
        result = await fetchBirthdayReport(queryParams);
      } else if (reportType === "anniversary") {
        const queryParams: Record<string, any> = {
          page: currentPage,
          limit: pageSize,
          employee_name: searchQuery || undefined,
          month: selectedMonth || undefined,
          years_of_service: selectedYears || undefined,
          department: selectedDepartment || undefined,
          sort_column: "joined_date",
          sort_direction: "asc",
        };
        result = await fetchWorkAnniversaryReport(queryParams);
      } else if (reportType === "termination") {
        const queryParams: Record<string, any> = {
          page: currentPage,
          limit: pageSize,
          employee_name: searchQuery || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          group_company: selectedGroupCompany || undefined,
          location: selectedLocation || undefined,
          sort_column: "updated_at",
          sort_direction: "desc",
        };
        result = await fetchTerminationReport(queryParams);
      }

      setReportData(result?.reportData || []);
      setTotalRecords(result?.totalRecords || 0);
      setTotalPages(result?.totalPages || 1);
    } catch (error) {
      handleReportDataError(error);
    } finally {
      handleReportDataComplete();
    }
  }, [
    reportType,
    currentPage,
    pageSize,
    searchQuery,
    selectedMonth,
    selectedYears,
    selectedDepartment,
    dateFrom,
    dateTo,
    selectedGroupCompany,
    selectedLocation,
  ]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Handle export error
  const handleExportError = (error: unknown) => {
    // Error logged for debugging
    alert("Failed to export report. Please try again.");
  };

  const handleExportExcel = async () => {
    try {
      if (reportType === "birthday") {
        const queryParams = {
          employee_name: searchQuery || undefined,
        };
        await downloadBirthdayReportExcel(queryParams);
      } else if (reportType === "anniversary") {
        const queryParams = {
          employee_name: searchQuery || undefined,
          month: selectedMonth || undefined,
          years_of_service: selectedYears || undefined,
          department: selectedDepartment || undefined,
        };
        await downloadWorkAnniversaryReportExcel(queryParams);
      } else if (reportType === "termination") {
        const queryParams = {
          employee_name: searchQuery || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          group_company: selectedGroupCompany || undefined,
          location: selectedLocation || undefined,
        };
        await downloadTerminationReportExcel(queryParams);
      }
    } catch (error) {
      handleExportError(error);
    }
  };

  const handleExportPDF = async () => {
    if (reportType !== "termination") return;

    const queryParams = {
      employee_name: searchQuery || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      group_company: selectedGroupCompany || undefined,
      location: selectedLocation || undefined,
    };

    try {
      await downloadTerminationReportPDF(queryParams);
    } catch (error) {
      handleExportError(error);
    }
  };

  const getBirthdayColumns = (): ColumnDef<BirthdayReportRecord>[] => [
    {
      key: "employee_id",
      header: "Employee ID",
      width: 130,
      render: (row) => (
        <span className="font-semibold text-[#1B2A6B]">
          {row.employee_id || "N/A"}
        </span>
      ),
    },
    {
      key: "first_name",
      header: "First Name",
      width: 150,
    },
    {
      key: "last_name",
      header: "Last Name",
      width: 150,
    },
    {
      key: "full_name",
      header: "Full Name",
      width: 200,
      render: (row) => <span className="font-medium">{row.full_name}</span>,
    },
    {
      key: "formatted_birthday",
      header: "Birthday Date",
      width: 150,
      render: (row) => (
        <span className="font-semibold text-orange-500 flex items-center gap-1.5">
          <IconGift size={14} />
          {row.formatted_birthday || "N/A"}
        </span>
      ),
    },
    {
      key: "gender",
      header: "Gender",
      width: 100,
    },
    {
      key: "marital_status",
      header: "Marital Status",
      width: 140,
    },
  ];

  const getAnniversaryColumns =
    (): ColumnDef<WorkAnniversaryReportRecord>[] => [
      {
        key: "employee_id",
        header: "Employee ID",
        width: 130,
        render: (row) => (
          <span className="font-semibold text-[#1B2A6B]">
            {row.employee_id || "N/A"}
          </span>
        ),
      },
      {
        key: "employee_name",
        header: "Employee Name",
        width: 200,
        render: (row) => (
          <span className="font-medium">{row.employee_name}</span>
        ),
      },
      {
        key: "designation",
        header: "Designation",
        width: 180,
      },
      {
        key: "department",
        header: "Department",
        width: 150,
      },
      {
        key: "location",
        header: "Location",
        width: 140,
      },
      {
        key: "date_of_joining",
        header: "Date of Joining",
        width: 140,
      },
      {
        key: "formatted_anniversary",
        header: "Anniversary Date",
        width: 150,
        render: (row) => (
          <span className="font-semibold text-purple-600">
            {row.formatted_anniversary || "N/A"}
          </span>
        ),
      },
      {
        key: "years_of_service",
        header: "Years of Service",
        width: 140,
        render: (row) => (
          <span className="px-3 py-1.5 rounded-md text-xs font-bold bg-[#16A085] text-white">
            {row.years_of_service} Year{row.years_of_service !== 1 ? "s" : ""}
          </span>
        ),
      },
    ];

  const getTerminationColumns = (): ColumnDef<TerminationReportRecord>[] => [
    {
      key: "emp_id",
      header: "Employee ID",
      width: 140,
      render: (row) => (
        <span className="font-semibold text-[#1B2A6B] block py-2 px-3 bg-indigo-100 rounded-lg text-center text-sm">
          {row.emp_id || "N/A"}
        </span>
      ),
    },
    {
      key: "employee_name",
      header: "Employee Name",
      width: 250,
      render: (row) => (
        <span className="font-semibold text-[15px] text-slate-800 block py-2.5 px-3.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 whitespace-nowrap overflow-hidden text-ellipsis">
          {row.employee_name || "N/A"}
        </span>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      width: 180,
      render: (row) => (
        <span className="whitespace-normal break-words text-[13px]">
          {row.designation || "N/A"}
        </span>
      ),
    },
    {
      key: "termination_type",
      header: "Termination Type",
      width: 150,
      render: (row) => {
        return (
          <span
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white inline-block whitespace-nowrap text-center"
            style={{
              background:
                TERMINATION_TYPE_COLORS[row.termination_type || ""] ||
                "#94A3B8",
            }}
          >
            {row.termination_type || "N/A"}
          </span>
        );
      },
    },
    {
      key: "termination_reason",
      header: "Termination Reason",
      width: 250,
      render: (row) => (
        <span className="text-[13px] whitespace-normal break-words leading-relaxed">
          {row.termination_reason || "N/A"}
        </span>
      ),
    },
    {
      key: "date_of_joining",
      header: "Join Date",
      width: 140,
      render: (row) => (
        <span className="whitespace-nowrap font-semibold text-sm block py-1.5 px-2.5 bg-green-50 rounded-md text-center">
          {row.date_of_joining || "N/A"}
        </span>
      ),
    },
    {
      key: "date_of_exit",
      header: "Exit Date",
      width: 140,
      render: (row) => (
        <span className="text-red-600 font-bold whitespace-nowrap text-sm block py-5 px-2.5 bg-red-100 rounded-md text-center">
          {row.date_of_exit || "N/A"}
        </span>
      ),
    },
    {
      key: "last_working_day",
      header: "Last Working Day",
      width: 160,
      render: (row) => (
        <span className="font-semibold whitespace-nowrap text-sm block py-1.5 px-2.5 bg-amber-100 rounded-md text-center">
          {row.last_working_day || "N/A"}
        </span>
      ),
    },
    {
      key: "notice_period_days",
      header: "Notice Period",
      width: 120,
      render: (row) => (
        <span className="text-[13px]">
          {row.notice_period_days ? `${row.notice_period_days} days` : "N/A"}
        </span>
      ),
    },
    {
      key: "exit_interview_completed",
      header: "Exit Interview",
      width: 130,
      render: (row) => (
        <span
          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap ${
            row.exit_interview_completed
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.exit_interview_completed ? (
            <>
              <IconCheck size={12} /> Done
            </>
          ) : (
            <>
              <IconXCircle size={12} /> Pending
            </>
          )}
        </span>
      ),
    },
    {
      key: "rehire_eligible",
      header: "Rehire Eligible",
      width: 130,
      render: (row) => (
        <span
          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap ${
            row.rehire_eligible
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.rehire_eligible ? (
            <>
              <IconCheck size={12} /> Yes
            </>
          ) : (
            <>
              <IconXCircle size={12} /> No
            </>
          )}
        </span>
      ),
    },
    {
      key: "actual_supervisor",
      header: "Supervisor",
      width: 220,
      render: (row) => {
        const isDeleted = row.is_user_deleted === true;
        return (
          <span
            className={`text-sm font-semibold text-slate-800 flex items-center gap-1.5 py-2.5 px-3.5 rounded-lg whitespace-nowrap overflow-hidden text-ellipsis ${
              isDeleted
                ? "bg-red-300 border border-red-400"
                : "bg-amber-200 border border-amber-300"
            }`}
          >
            {row.actual_supervisor || "N/A"}
            {isDeleted && <IconAlertCircle size={14} color="#dc2626" />}
          </span>
        );
      },
    },
    {
      key: "terminated_by",
      header: "Terminated By",
      width: 200,
      render: (row) => {
        const isDeleted = row.is_user_deleted === true;
        return (
          <span
            className={`text-sm font-semibold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1.5 py-2.5 px-3.5 rounded-lg ${
              isDeleted
                ? "bg-orange-200 border border-orange-300"
                : "bg-indigo-100 border border-indigo-200"
            }`}
          >
            {row.terminated_by || "N/A"}
            {isDeleted && <IconAlertCircle size={14} color="#ea580c" />}
          </span>
        );
      },
    },
  ];

  const columns: ColumnDef<ReportRecord>[] =
    reportType === "birthday"
      ? (getBirthdayColumns() as ColumnDef<ReportRecord>[])
      : reportType === "anniversary"
        ? (getAnniversaryColumns() as ColumnDef<ReportRecord>[])
        : (getTerminationColumns() as ColumnDef<ReportRecord>[]);

  const renderBirthdayFilters = () => <></>;

  const renderAnniversaryFilters = () => (
    <>
      <select
        value={selectedMonth}
        onChange={(event) => setSelectedMonth(event.target.value)}
        className="px-3 py-2 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none"
      >
        <option value="">All Months</option>
        {MONTH_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        value={selectedYears}
        onChange={(event) => setSelectedYears(event.target.value)}
        className="px-3 py-2 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none"
      >
        <option value="">All Years</option>
        {YEARS_OF_SERVICE_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y} Year{y !== 1 ? "s" : ""}
          </option>
        ))}
      </select>
      <select
        value={selectedDepartment}
        onChange={(event) => setSelectedDepartment(event.target.value)}
        className="px-3 py-2 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none"
      >
        <option value="">All Departments</option>
        {filterOptions.subUnits.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    </>
  );

  const renderTerminationFilters = () => (
    <>
      <input
        type="date"
        value={dateFrom}
        onChange={(event) => setDateFrom(event.target.value)}
        placeholder="From Date"
        className="px-3 py-2 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none"
      />
      <input
        type="date"
        value={dateTo}
        onChange={(event) => setDateTo(event.target.value)}
        placeholder="To Date"
        className="px-3 py-2 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none"
      />
      <select
        value={selectedGroupCompany}
        onChange={(event) => setSelectedGroupCompany(event.target.value)}
        className="px-3 py-2 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none"
      >
        <option value="">All Companies</option>
        {filterOptions.subUnits.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
      <select
        value={selectedLocation}
        onChange={(event) => setSelectedLocation(event.target.value)}
        className="px-3 py-2 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none"
      >
        <option value="">All Locations</option>
        {filterOptions.locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
    </>
  );

  const filterToolbar = (
    <div className="flex gap-3 flex-wrap items-center">
      <select
        value={reportType}
        onChange={(event) => setReportType(event.target.value as ReportType)}
        className="py-2 px-4 border-2 border-[#1B2A6B] rounded-md text-sm font-semibold outline-none bg-white text-[#1B2A6B] cursor-pointer"
      >
        <option value="birthday"> All Employee Birthday Details</option>
        <option value="anniversary"> All Employee Anniversary Details</option>
        <option value="termination"> Termination Employee Details</option>
        {/* {(userRole === 'hradmin' || userRole === 'empmanager') && (
        )} */}
      </select>

      {/* Divider */}
      <div className="w-px h-8 bg-slate-200" />

      {/* Dynamic filters based on report type */}
      {reportType === "birthday" && renderBirthdayFilters()}
      {reportType === "anniversary" && renderAnniversaryFilters()}
      {reportType === "termination" && renderTerminationFilters()}

      {/* Export buttons */}
      <button
        onClick={handleExportExcel}
        className="py-2 px-4 bg-[#16A085] text-white border-0 rounded-md text-[13px] font-semibold cursor-pointer"
      >
        Export Excel
      </button>
      {reportType === "termination" && (
        <button
          onClick={handleExportPDF}
          className="py-2 px-4 bg-gradient-to-br from-[#172554] to-[#14b8a6] text-white border-0 rounded-md text-[13px] font-semibold cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <IconUpload size={14} />
          Export PDF
        </button>
      )}
    </div>
  );

  const reportTitles = {
    birthday: "Birthday Report",
    anniversary: "Work Anniversary Report",
    termination: "Termination Report",
  };

  const reportSubtitles = {
    birthday: "View all employee birthdays",
    anniversary: "View employee work anniversaries and tenure information",
    termination: "View and export terminated employee records",
  };

  const reportIcons = {
    birthday: <IconGift size={18} />,
    anniversary: <IconAward size={18} />,
    termination: <IconClipboardList size={18} />,
  };

  const emptyMessages = {
    birthday: {
      title: "No Birthdays Found",
      subtitle: "No employee birthdays match your current filters",
    },
    anniversary: {
      title: "No Work Anniversaries Found",
      subtitle: "No employee work anniversaries match your current filters",
    },
    termination: {
      title: "No Terminated Employees",
      subtitle: "No records match your current filters",
    },
  };

  return (
    <Layout title="Reports and Analytics" tabs={TABS} activeTab="Reports">
      <div className="py-5 px-10">
        <DataTable
          title={reportTitles[reportType]}
          subtitle={reportSubtitles[reportType]}
          icon={reportIcons[reportType]}
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
          searchPlaceholder="Search by employee name..."
          onSearchChange={setSearchQuery}
          extraToolbar={filterToolbar}
          itemLabel="employees"
          emptyIcon={reportIcons[reportType]}
          emptyTitle={emptyMessages[reportType].title}
          emptySubtitle={emptyMessages[reportType].subtitle}
        />
      </div>
    </Layout>
  );
}
