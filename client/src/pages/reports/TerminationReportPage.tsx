import React, { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import type { TerminationReportRecord, ReportFilterOptions } from "../../types";
import {
  fetchTerminationReport,
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

export default function TerminationReportPage() {
  const [reportData, setReportData] = useState<TerminationReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
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
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        group_company: selectedGroupCompany || undefined,
        location: selectedLocation || undefined,
        sort_column: "updated_at",
        sort_direction: "desc",
      };

      const result = await fetchTerminationReport(queryParams);
      setReportData(result.reportData);
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("Failed to load termination report:", err);
      setReportData([]);
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
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export report. Please try again.");
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
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export report. Please try again.");
    }
  };

  const columns: ColumnDef<TerminationReportRecord>[] = [
    {
      key: "emp_id",
      header: "EMP ID",
      width: 100,
      render: (row) => (
        <span style={{ fontWeight: 600, color: "#1B2A6B" }}>
          {row.emp_id || "N/A"}
        </span>
      ),
    },
    {
      key: "employee_name",
      header: "Name",
      width: 180,
      render: (row) => (
        <span style={{ fontWeight: 500 }}>{row.employee_name || "N/A"}</span>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      width: 150,
    },
    {
      key: "termination_type",
      header: "Termination Type",
      width: 140,
      render: (row) => (
        <span
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor:
              row.termination_type === "Voluntary"
                ? "#E8F5E9"
                : row.termination_type === "Involuntary"
                  ? "#FFEBEE"
                  : "#FFF3E0",
            color:
              row.termination_type === "Voluntary"
                ? "#2E7D32"
                : row.termination_type === "Involuntary"
                  ? "#C62828"
                  : "#E65100",
          }}
        >
          {row.termination_type || "N/A"}
        </span>
      ),
    },
    {
      key: "termination_reason",
      header: "Reason",
      width: 200,
      render: (row) => (
        <span style={{ fontSize: 13 }}>{row.termination_reason || "N/A"}</span>
      ),
    },
    {
      key: "date_of_joining",
      header: "Join Date",
      width: 120,
    },
    {
      key: "date_of_exit",
      header: "Exit Date",
      width: 120,
      render: (row) => (
        <span style={{ color: "#E53E3E", fontWeight: 600 }}>
          {row.date_of_exit || "N/A"}
        </span>
      ),
    },
    {
      key: "last_working_day",
      header: "Last Working Day",
      width: 140,
      render: (row) => (
        <span style={{ fontWeight: 500 }}>{row.last_working_day || "N/A"}</span>
      ),
    },
    {
      key: "notice_period_days",
      header: "Notice Period",
      width: 120,
      render: (row) => (
        <span>
          {row.notice_period_days !== undefined
            ? `${row.notice_period_days} days`
            : "N/A"}
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
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: row.rehire_eligible ? "#E8F5E9" : "#FFEBEE",
            color: row.rehire_eligible ? "#2E7D32" : "#C62828",
          }}
        >
          {row.rehire_eligible ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "termination_notes",
      header: "Notes",
      width: 200,
      render: (row) => (
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {row.termination_notes || "-"}
        </span>
      ),
    },
    {
      key: "reporting_manager",
      header: "Manager",
      width: 160,
      render: (row) => (
        <span style={{ fontSize: 13 }}>{row.reporting_manager || "N/A"}</span>
      ),
    },
    {
      key: "terminated_by",
      header: "Terminated By",
      width: 150,
      render: (row) => (
        <span style={{ fontSize: 13, fontStyle: "italic" }}>
          {row.terminated_by || "N/A"}
        </span>
      ),
    },
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
      <button
        onClick={handleExportPDF}
        style={{
          padding: "8px 16px",
          background: "#E53E3E",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        📄 Export PDF
      </button>
    </div>
  );

  return (
    <Layout
      title="Reports and Analytics"
      tabs={TABS}
      activeTab="Termination Report"
    >
      <div style={{ padding: "20px 40px" }}>
        <DataTable
          title="Termination Report"
          subtitle="Comprehensive termination history with exit details and rehire eligibility"
          icon=""
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
          itemLabel="terminated employees"
          emptyIcon="📋"
          emptyTitle="No Terminated Employees"
          emptySubtitle="No records match your current filters"
        />
      </div>
    </Layout>
  );
}
