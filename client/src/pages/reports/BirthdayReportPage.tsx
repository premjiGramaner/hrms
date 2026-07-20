import { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import type { BirthdayReportRecord } from "../../types";
import {
  fetchBirthdayReport,
  downloadBirthdayReportExcel,
} from "../../api/report.api";
import { PAGE_PATHS } from "../../config/roles";

const TABS: TabItem[] = [
  { label: "Birthday Report", path: PAGE_PATHS.reportsBirthday },
  { label: "Work Anniversary", path: PAGE_PATHS.reportsWorkAnniversary },
  { label: "Termination Report", path: PAGE_PATHS.reportsTermination },
  { label: "Notifications", path: PAGE_PATHS.reportsNotifications },
];

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
        sort_column: "real_dob",
        sort_direction: "asc",
      };

      const result = await fetchBirthdayReport(queryParams);
      setReportData(result.reportData);
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("Failed to load birthday report:", err);
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
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export report. Please try again.");
    }
  };

  const columns: ColumnDef<BirthdayReportRecord>[] = [
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
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
      <select
        value={selectedGender}
        onChange={(e) => setSelectedGender(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
      >
        <option value="">All Genders</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
      <select
        value={selectedMaritalStatus}
        onChange={(e) => setSelectedMaritalStatus(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 6,
          fontSize: 13,
          outline: "none",
        }}
      >
        <option value="">All Marital Status</option>
        <option value="Single">Single</option>
        <option value="Married">Married</option>
        <option value="Divorced">Divorced</option>
        <option value="Widowed">Widowed</option>
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
        Export Excel
      </button>
    </div>
  );

  return (
    <Layout
      title="Reports and Analytics"
      tabs={TABS}
      activeTab="Birthday Report"
    >
      <div style={{ padding: "20px 40px" }}>
        <DataTable
          title="Birthday Report"
          subtitle="View all employee birthdays"
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
          itemLabel="employees"
          emptyIcon="🎂"
          emptyTitle="No Birthdays Found"
          emptySubtitle="No employee birthdays match your current filters"
        />
      </div>
    </Layout>
  );
}
