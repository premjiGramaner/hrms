import React, { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import type {
  WorkAnniversaryReportRecord,
  ReportFilterOptions,
} from "../../types";
import {
  fetchWorkAnniversaryReport,
  downloadWorkAnniversaryReportExcel,
  fetchReportFilterOptions,
} from "../../api/report.api";

const TABS: TabItem[] = [
  { label: "Birthday Report", path: "/reports/birthday" },
  { label: "Work Anniversary", path: "/reports/work-anniversary" },
  { label: "Termination Report", path: "/reports/termination" },
  { label: "Notifications", path: "/reports/notifications" },
];

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

  // Filters
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
    } catch (err) {
      console.error("Failed to load filter options:", err);
    }
  }, []);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
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

      const result = await fetchWorkAnniversaryReport(queryParams);
      setReportData(result.reportData);
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("Failed to load work anniversary report:", err);
      setReportData([]);
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
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export report. Please try again.");
    }
  };

  const columns: ColumnDef<WorkAnniversaryReportRecord>[] = [
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
          🎊 {row.formatted_anniversary || "N/A"}
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
    {
      key: "additional_months",
      header: "Tenure",
      width: 120,
      render: (row) => (
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {row.years_of_service}y {row.additional_months || 0}m
        </span>
      ),
    },
  ];

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
        📊 Export Excel
      </button>
    </div>
  );

  return (
    <Layout
      title="Reports and Analytics"
      tabs={TABS}
      activeTab="Work Anniversary"
    >
      <div style={{ padding: "20px 40px" }}>
        <DataTable
          title="Work Anniversary Report"
          subtitle="View employee work anniversaries and tenure information"
          icon="🎊"
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
          emptyIcon="🎊"
          emptyTitle="No Work Anniversaries Found"
          emptySubtitle="No employee work anniversaries match your current filters"
        />
      </div>
    </Layout>
  );
}
