import React, { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import { useAppSelector } from "../../app/hooks";
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

const TABS: TabItem[] = [
  { label: "Birthday Report", path: "/reports/birthday" },
  { label: "Work Anniversary", path: "/reports/work-anniversary" },
  { label: "Termination Report", path: "/reports/termination" },
  { label: "Notifications", path: "/reports/notifications" },
];

type ReportType = "birthday" | "anniversary" | "termination";
type ReportRecord =
  | BirthdayReportRecord
  | WorkAnniversaryReportRecord
  | TerminationReportRecord;

export default function UnifiedReportsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || "employee";

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

  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await fetchReportFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error("Failed to load filter options:", err);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
    // Reset all filters when switching report types
    setSelectedMonth("");
    setSelectedYears("");
    setSelectedDepartment("");
    setDateFrom("");
    setDateTo("");
    setSelectedGroupCompany("");
    setSelectedLocation("");
  }, [reportType]);

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
    } catch (err) {
      console.error("Failed to load report:", err);
      setReportData([]);
    } finally {
      setIsLoading(false);
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

  const handleExportExcel = async () => {
    const currentYear = new Date().getFullYear();
    let filename = "";

    try {
      if (reportType === "birthday") {
        const queryParams = {
          employee_name: searchQuery || undefined,
        };
        filename = `Birthday_Report_${currentYear}.xlsx`;
        await downloadBirthdayReportExcel(queryParams);
      } else if (reportType === "anniversary") {
        const queryParams = {
          employee_name: searchQuery || undefined,
          month: selectedMonth || undefined,
          years_of_service: selectedYears || undefined,
          department: selectedDepartment || undefined,
        };
        filename = `Work_Anniversary_Report_${currentYear}.xlsx`;
        await downloadWorkAnniversaryReportExcel(queryParams);
      } else if (reportType === "termination") {
        const queryParams = {
          employee_name: searchQuery || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          group_company: selectedGroupCompany || undefined,
          location: selectedLocation || undefined,
        };
        filename = `Termination_Report_${currentYear}.xlsx`;
        await downloadTerminationReportExcel(queryParams);
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export report. Please try again.");
    }
  };

  const handleExportPDF = async () => {
    if (reportType !== "termination") return;

    const currentYear = new Date().getFullYear();
    const queryParams = {
      employee_name: searchQuery || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      group_company: selectedGroupCompany || undefined,
      location: selectedLocation || undefined,
    };

    try {
      await downloadTerminationReportPDF(queryParams);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export PDF. Please try again.");
    }
  };

  const getBirthdayColumns = (): ColumnDef<BirthdayReportRecord>[] => [
    {
      key: "employee_id",
      header: "Employee ID",
      width: 130,
      render: (row) => (
        <span style={{ fontWeight: 600, color: "#1B2A6B" }}>
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
      render: (row) => <span style={{ fontWeight: 500 }}>{row.full_name}</span>,
    },
    {
      key: "formatted_birthday",
      header: "Birthday Date",
      width: 150,
      render: (row) => (
        <span style={{ fontWeight: 600, color: "#F97316" }}>
          🎂 {row.formatted_birthday || "N/A"}
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
          <span style={{ fontWeight: 600, color: "#1B2A6B" }}>
            {row.employee_id || "N/A"}
          </span>
        ),
      },
      {
        key: "employee_name",
        header: "Employee Name",
        width: 200,
        render: (row) => (
          <span style={{ fontWeight: 500 }}>{row.employee_name}</span>
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
          <span style={{ fontWeight: 600, color: "#7C3AED" }}>
            {row.formatted_anniversary || "N/A"}
          </span>
        ),
      },
      {
        key: "years_of_service",
        header: "Years of Service",
        width: 140,
        render: (row) => (
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              background: "#16A085",
              color: "#fff",
            }}
          >
            {row.years_of_service} Year{row.years_of_service !== 1 ? "s" : ""}
          </span>
        ),
      },
    ];

  const getTerminationColumns = (): ColumnDef<TerminationReportRecord>[] => [
    {
      key: "emp_id",
      header: "EMP ID",
      width: 140,
      render: (row) => (
        <span
          style={{
            fontWeight: 600,
            color: "#1B2A6B",
            display: "block",
            padding: "8px 12px",
            background: "#E0E7FF",
            borderRadius: 8,
            textAlign: "center",
            fontSize: 14,
          }}
        >
          {row.emp_id || "N/A"}
        </span>
      ),
    },
    {
      key: "employee_name",
      header: "Employee Name",
      width: 250,
      render: (row) => (
        <span
          style={{
            fontWeight: 600,
            fontSize: 15,
            color: "#1e293b",
            display: "block",
            padding: "10px 14px",
            background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
            borderRadius: 8,
            border: "1px solid #BFDBFE",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {row.employee_name || "N/A"}
        </span>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      width: 180,
      render: (row) => (
        <span
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            fontSize: 13,
          }}
        >
          {row.designation || "N/A"}
        </span>
      ),
    },
    {
      key: "termination_type",
      header: "Termination Type",
      width: 150,
      render: (row) => {
        const typeColors: Record<string, string> = {
          Voluntary: "#16A085",
          Involuntary: "#E53E3E",
          Retirement: "#7C3AED",
          Layoff: "#F97316",
          "End of Contract": "#3B82F6",
        };
        return (
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              background: typeColors[row.termination_type || ""] || "#94A3B8",
              color: "#fff",
              display: "inline-block",
              whiteSpace: "nowrap",
              textAlign: "center",
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
        <span
          style={{
            fontSize: 13,
            whiteSpace: "normal",
            wordBreak: "break-word",
            lineHeight: "1.5",
          }}
        >
          {row.termination_reason || "N/A"}
        </span>
      ),
    },
    {
      key: "date_of_joining",
      header: "Join Date",
      width: 140,
      render: (row) => (
        <span
          style={{
            whiteSpace: "nowrap",
            fontWeight: 600,
            fontSize: 14,
            display: "block",
            padding: "6px 10px",
            background: "#F0FDF4",
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          {row.date_of_joining || "N/A"}
        </span>
      ),
    },
    {
      key: "date_of_exit",
      header: "Exit Date",
      width: 140,
      render: (row) => (
        <span
          style={{
            color: "#DC2626",
            fontWeight: 700,
            whiteSpace: "nowrap",
            fontSize: 14,
            display: "block",
            padding: "20px 10px",
            background: "#FEE2E2",
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          {row.date_of_exit || "N/A"}
        </span>
      ),
    },
    {
      key: "last_working_day",
      header: "Last Working Day",
      width: 160,
      render: (row) => (
        <span
          style={{
            fontWeight: 600,
            whiteSpace: "nowrap",
            fontSize: 14,
            display: "block",
            padding: "6px 10px",
            background: "#FEF3C7",
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          {row.last_working_day || "N/A"}
        </span>
      ),
    },
    {
      key: "notice_period_days",
      header: "Notice Period",
      width: 120,
      render: (row) => (
        <span style={{ fontSize: 13 }}>
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
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: row.exit_interview_completed ? "#D1FAE5" : "#FEE2E2",
            color: row.exit_interview_completed ? "#065F46" : "#991B1B",
            display: "inline-block",
            whiteSpace: "nowrap",
          }}
        >
          {row.exit_interview_completed ? "✓ Done" : "✗ Pending"}
        </span>
      ),
    },
    {
      key: "rehire_eligible",
      header: "Rehire Eligible",
      width: 130,
      render: (row) => (
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: row.rehire_eligible ? "#D1FAE5" : "#FEE2E2",
            color: row.rehire_eligible ? "#065F46" : "#991B1B",
            display: "inline-block",
            whiteSpace: "nowrap",
          }}
        >
          {row.rehire_eligible ? "✓ Yes" : "✗ No"}
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
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
              display: "block",
              padding: "10px 14px",
              background: isDeleted ? "#FCA5A5" : "#FDE68A",
              borderRadius: 8,
              border: isDeleted ? "1px solid #F87171" : "1px solid #FCD34D",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row.actual_supervisor || "N/A"}
            {isDeleted && " 🔴"}
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
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
              padding: "10px 14px",
              background: isDeleted ? "#FED7AA" : "#E0E7FF",
              borderRadius: 8,
              border: isDeleted ? "1px solid #FB923C" : "1px solid #C7D2FE",
            }}
          >
            {row.terminated_by || "N/A"}
            {isDeleted && " 🔴"}
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

  const months = [
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
  ];

  const renderAnniversaryFilters = () => (
    <>
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
      >
        <option value="">All Months</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        value={selectedYears}
        onChange={(e) => setSelectedYears(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
      >
        <option value="">All Years</option>
        {[1, 2, 3, 5, 10, 15, 20, 25].map((y) => (
          <option key={y} value={y}>
            {y} Year{y !== 1 ? "s" : ""}
          </option>
        ))}
      </select>
      <select
        value={selectedDepartment}
        onChange={(e) => setSelectedDepartment(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
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
        onChange={(e) => setDateFrom(e.target.value)}
        placeholder="From Date"
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        placeholder="To Date"
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
      />
      <select
        value={selectedGroupCompany}
        onChange={(e) => setSelectedGroupCompany(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
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
        onChange={(e) => setSelectedLocation(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
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
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <select
        value={reportType}
        onChange={(e) => setReportType(e.target.value as ReportType)}
        style={{
          padding: "8px 16px",
          border: "2px solid #1B2A6B",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          outline: "none",
          background: "#fff",
          color: "#1B2A6B",
          cursor: "pointer",
        }}
      >
        <option value="birthday"> All Employee Birthday Details</option>
        <option value="anniversary"> All Employee Anniversary Details</option>
        <option value="termination"> Termination Employee Details</option>
        {/* {(userRole === 'hradmin' || userRole === 'empmanager') && (
        )} */}
      </select>

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: "#e2e8f0" }} />

      {/* Dynamic filters based on report type */}
      {reportType === "birthday" && renderBirthdayFilters()}
      {reportType === "anniversary" && renderAnniversaryFilters()}
      {reportType === "termination" && renderTerminationFilters()}

      {/* Export buttons */}
      <button
        onClick={handleExportExcel}
        style={{
          padding: "8px 16px",
          background: "#16A085",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Export Excel
      </button>
      {reportType === "termination" && (
        <button
          onClick={handleExportPDF}
          style={{
            padding: "8px 16px",
            background: "linear-gradient(135deg, #172554, #14b8a6)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          📄 Export PDF
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
    birthday: "🎂",
    anniversary: "🎊",
    termination: "📋",
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
      <div style={{ padding: "20px 40px" }}>
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
