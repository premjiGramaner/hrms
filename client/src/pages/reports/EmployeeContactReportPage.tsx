import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../../components/Layout";
import DataTable, { ColumnDef } from "../../components/DataTable";
import type { EmployeeContactRecord, ReportQueryParams } from "../../types";
import {
  fetchEmployeeContactReport,
  downloadEmployeeContactReportExcel,
} from "../../api/report.api";
import { IconUsers } from "../../components/Icons";
import Toast from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/errors";
import { REPORT_TABS } from "./reportTabs";

const REPORT_CONFIG = {
  TITLE: "Employee Contact",
  SUBTITLE: "View all employee contact details and addresses",
  SEARCH_PLACEHOLDER: "Search by name, email, phone, or address...",
  ITEM_LABEL: "employees",
  EMPTY_ICON_TEXT: "👤",
  EMPTY_TITLE: "No Employees Found",
  EMPTY_SUBTITLE: "No employee records match your current filters",
  EXPORT_BUTTON_LABEL: "Export Excel",
  DEFAULT_SORT_COLUMN: "name",
  DEFAULT_SORT_DIRECTION: "asc" as const,
  INITIAL_PAGE_SIZE: 15,
  PAGE_SIZE_OPTIONS: [10, 15, 20, 50, 100],
} as const;

const FILTER_OPTIONS = {
  LOCATIONS: [] as string[],
  GENDERS: [
    { value: "", label: "All Genders" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ],
  EMPLOYMENT_STATUS: [
    { value: "", label: "All Status" },
    { value: "Full-Time", label: "Full-Time" },
    { value: "Part-Time", label: "Part-Time" },
    { value: "Contract", label: "Contract" },
    { value: "Probation", label: "Probation" },
  ],
} as const;

const COLUMN_LABELS = {
  EMPLOYEE_ID: "Employee ID",
  FIRST_NAME: "First Name",
  MIDDLE_NAME: "Middle Name",
  LAST_NAME: "Last Name",
  NAME: "Name",
  EMAIL: "Email",
  MOBILE: "Mobile",
  HOME_TEL: "Home Phone",
  WORK_TEL: "Work Phone",
  DOB: "Date of Birth",
  SUPERVISORS: "Supervisors",
  ADDRESS: "Address",
  LOCATION: "Location",
  GENDER: "Gender",
  STATUS: "Status",
  NOT_AVAILABLE: "N/A",
  NO_SUPERVISORS: "No Supervisors",
} as const;

const ERROR_MESSAGES = {
  LOAD_FAILED: "Failed to load the employee contact report.",
  EXPORT_FAILED: "Failed to export the report.",
} as const;

const SUCCESS_MESSAGES = {
  EXPORT_SUCCESS: "Employee contact report downloaded successfully.",
} as const;

const FILTER_TOOLBAR_CLASS = "flex gap-3 flex-wrap items-center";
const SELECT_CLASS =
  "py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#172554] transition-colors bg-white";
const EXPORT_BUTTON_CLASS =
  "py-2 px-4 bg-[#16A085] text-white border-none rounded-md text-[13px] font-semibold cursor-pointer hover:bg-[#138f72] transition-colors";

export default function EmployeeContactReportPage() {
  const [reportData, setReportData] = useState<EmployeeContactRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    REPORT_CONFIG.INITIAL_PAGE_SIZE,
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedEmploymentStatus, setSelectedEmploymentStatus] = useState("");

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams: ReportQueryParams = {
        page: currentPage,
        limit: pageSize,
        search: searchQuery || undefined,
        location: selectedLocation || undefined,
        gender: selectedGender || undefined,
        employment_status: selectedEmploymentStatus || undefined,
        sort_column: REPORT_CONFIG.DEFAULT_SORT_COLUMN,
        sort_direction: REPORT_CONFIG.DEFAULT_SORT_DIRECTION,
      };

      const result = await fetchEmployeeContactReport(queryParams);
      setReportData(result.reportData);
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (error) {
      setReportData([]);
      Toast.error(getApiErrorMessage(error, ERROR_MESSAGES.LOAD_FAILED));
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchQuery,
    selectedLocation,
    selectedGender,
    selectedEmploymentStatus,
  ]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleExportExcel = async () => {
    const queryParams = {
      search: searchQuery || undefined,
      location: selectedLocation || undefined,
      gender: selectedGender || undefined,
      employment_status: selectedEmploymentStatus || undefined,
    };
    try {
      await downloadEmployeeContactReportExcel(queryParams);
      Toast.success(SUCCESS_MESSAGES.EXPORT_SUCCESS);
    } catch (error) {
      Toast.error(getApiErrorMessage(error, ERROR_MESSAGES.EXPORT_FAILED));
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const formatAddress = (row: EmployeeContactRecord): string => {
    const addressParts = [
      row.address1,
      row.address2,
      row.city,
      row.state,
      row.country,
      row.zip,
    ].filter(Boolean);

    return addressParts.length > 0
      ? addressParts.join(", ")
      : COLUMN_LABELS.NOT_AVAILABLE;
  };

  const renderEmployeeName = (row: EmployeeContactRecord) => (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-[#172554] to-[#14b8a6] flex items-center justify-center text-white text-xs font-bold">
        {row.name
          .split(" ")
          .map((word) => word[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </div>
      <span className="font-semibold text-slate-800">{row.name}</span>
    </div>
  );

  const renderEmployeeId = (row: EmployeeContactRecord) => (
    <span className="font-semibold text-navy-700">
      {row.employee_id || COLUMN_LABELS.NOT_AVAILABLE}
    </span>
  );

  const renderEmail = (row: EmployeeContactRecord) => (
    <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline">
      {row.email}
    </a>
  );

  const renderPhone = (phone: string | null | undefined) => (
    <span className="text-slate-700">
      {phone || COLUMN_LABELS.NOT_AVAILABLE}
    </span>
  );

  const renderDOB = (row: EmployeeContactRecord) => (
    <span className="text-slate-700 font-medium">
      {row.formatted_dob || row.dob || COLUMN_LABELS.NOT_AVAILABLE}
    </span>
  );

  const renderSupervisors = (row: EmployeeContactRecord) => {
    if (!row.supervisor_names || row.supervisor_names.length === 0) {
      return (
        <span className="text-slate-400 italic text-xs">
          {COLUMN_LABELS.NO_SUPERVISORS}
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {row.supervisor_names.map((supervisor, index) => (
          <span
            key={index}
            className="text-xs text-slate-700 bg-blue-50 px-2 py-1 rounded-md inline-block"
          >
            {supervisor}
          </span>
        ))}
      </div>
    );
  };

  const columns: ColumnDef<EmployeeContactRecord>[] = [
    {
      key: "employee_id",
      header: COLUMN_LABELS.EMPLOYEE_ID,
      width: 130,
      render: renderEmployeeId,
    },
    {
      key: "first_name",
      header: COLUMN_LABELS.FIRST_NAME,
      width: 140,
      render: (row) => (
        <span className="text-slate-700">
          {row.first_name || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "middle_name",
      header: COLUMN_LABELS.MIDDLE_NAME,
      width: 140,
      render: (row) => (
        <span className="text-slate-700">
          {row.middle_name || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "last_name",
      header: COLUMN_LABELS.LAST_NAME,
      width: 140,
      render: (row) => (
        <span className="text-slate-700">
          {row.last_name || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "name",
      header: COLUMN_LABELS.NAME,
      width: 200,
      render: renderEmployeeName,
    },
    {
      key: "dob",
      header: COLUMN_LABELS.DOB,
      width: 130,
      render: renderDOB,
    },
    {
      key: "email",
      header: COLUMN_LABELS.EMAIL,
      width: 220,
      render: renderEmail,
    },
    {
      key: "mobile",
      header: COLUMN_LABELS.MOBILE,
      width: 140,
      render: (row) => renderPhone(row.mobile),
    },
    {
      key: "home_tel",
      header: COLUMN_LABELS.HOME_TEL,
      width: 140,
      render: (row) => renderPhone(row.home_tel),
    },
    {
      key: "work_tel",
      header: COLUMN_LABELS.WORK_TEL,
      width: 140,
      render: (row) => renderPhone(row.work_tel),
    },
    {
      key: "supervisors",
      header: COLUMN_LABELS.SUPERVISORS,
      width: 200,
      render: renderSupervisors,
    },
    {
      key: "address",
      header: COLUMN_LABELS.ADDRESS,
      width: 300,
      render: (row) => (
        <span className="text-slate-700 text-xs">{formatAddress(row)}</span>
      ),
    },
    {
      key: "location",
      header: COLUMN_LABELS.LOCATION,
      width: 150,
      render: (row) => (
        <span className="text-slate-700">
          {row.location || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "gender",
      header: COLUMN_LABELS.GENDER,
      width: 100,
      render: (row) => (
        <span className="text-slate-700">
          {row.gender || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "employment_status",
      header: COLUMN_LABELS.STATUS,
      width: 120,
      render: (row) => (
        <span className="text-slate-700">
          {row.employment_status || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
  ];

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    reportData.forEach((employee) => {
      if (employee.location) {
        locations.add(employee.location);
      }
    });
    return Array.from(locations).sort();
  }, [reportData]);

  const handleLocationChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedLocation(event.target.value);
  };

  const handleGenderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGender(event.target.value);
  };

  const handleEmploymentStatusChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedEmploymentStatus(event.target.value);
  };

  const filterToolbar = (
    <div className={FILTER_TOOLBAR_CLASS}>
      <select
        value={selectedLocation}
        onChange={handleLocationChange}
        className={SELECT_CLASS}
      >
        <option value="">All Locations</option>
        {uniqueLocations.map((location) => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
      </select>

      <select
        value={selectedGender}
        onChange={handleGenderChange}
        className={SELECT_CLASS}
      >
        {FILTER_OPTIONS.GENDERS.map((gender) => (
          <option key={gender.value} value={gender.value}>
            {gender.label}
          </option>
        ))}
      </select>

      <select
        value={selectedEmploymentStatus}
        onChange={handleEmploymentStatusChange}
        className={SELECT_CLASS}
      >
        {FILTER_OPTIONS.EMPLOYMENT_STATUS.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      <button onClick={handleExportExcel} className={EXPORT_BUTTON_CLASS}>
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
          icon={<IconUsers size={18} />}
          rows={reportData}
          columns={columns}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          pageSizeOptions={REPORT_CONFIG.PAGE_SIZE_OPTIONS}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
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
