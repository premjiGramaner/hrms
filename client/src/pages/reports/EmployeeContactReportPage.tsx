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
import {
  REPORT_CONFIG,
  GENDER_FILTER_OPTIONS,
  EMPLOYMENT_STATUS_FILTER_OPTIONS,
  COLUMN_LABELS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  SORTABLE_COLUMN_KEYS,
  TAILWIND_CLASSES,
} from "./constants/employeeContactReport.constants";
import { SortDirection } from "./types/employeeContactReport.types";
import {
  formatEmployeeAddress,
  getEmployeeInitials,
  extractUniqueValues,
} from "./utils/employeeContactReport.utils";

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

  const [sortColumn, setSortColumn] = useState<string>(
    REPORT_CONFIG.DEFAULT_SORT_COLUMN,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    REPORT_CONFIG.DEFAULT_SORT_DIRECTION,
  );

  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedEmploymentStatus, setSelectedEmploymentStatus] = useState("");
  const [selectedSubUnit, setSelectedSubUnit] = useState("");
  const [selectedJobTitle, setSelectedJobTitle] = useState("");

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
        sub_unit: selectedSubUnit || undefined,
        job_title: selectedJobTitle || undefined,
        sort_column: sortColumn,
        sort_direction: sortDirection,
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
    selectedSubUnit,
    selectedJobTitle,
    sortColumn,
    sortDirection,
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
      sub_unit: selectedSubUnit || undefined,
      job_title: selectedJobTitle || undefined,
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

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(
        sortDirection === SortDirection.ASCENDING
          ? SortDirection.DESCENDING
          : SortDirection.ASCENDING,
      );
    } else {
      setSortColumn(columnKey);
      setSortDirection(SortDirection.ASCENDING);
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedLocation("");
    setSelectedGender("");
    setSelectedEmploymentStatus("");
    setSelectedSubUnit("");
    setSelectedJobTitle("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const formatAddress = (employee: EmployeeContactRecord): string => {
    return formatEmployeeAddress(employee);
  };

  const renderEmployeeName = (employee: EmployeeContactRecord) => (
    <div className={TAILWIND_CLASSES.NAME_CONTAINER}>
      <div className={TAILWIND_CLASSES.AVATAR_CONTAINER}>
        {getEmployeeInitials(employee.name)}
      </div>
      <span className={TAILWIND_CLASSES.EMPLOYEE_NAME_TEXT}>
        {employee.name}
      </span>
    </div>
  );

  const renderEmployeeId = (employee: EmployeeContactRecord) => (
    <span className={TAILWIND_CLASSES.EMPLOYEE_ID_TEXT}>
      {employee.employee_id || COLUMN_LABELS.NOT_AVAILABLE}
    </span>
  );

  const renderEmail = (employee: EmployeeContactRecord) => (
    <a
      href={`mailto:${employee.email}`}
      className={TAILWIND_CLASSES.EMAIL_LINK}
    >
      {employee.email}
    </a>
  );

  const renderPhone = (phoneNumber: string | null | undefined) => (
    <span className={TAILWIND_CLASSES.TEXT_SLATE}>
      {phoneNumber || COLUMN_LABELS.NOT_AVAILABLE}
    </span>
  );

  const renderDOB = (employee: EmployeeContactRecord) => (
    <span className={TAILWIND_CLASSES.TEXT_MEDIUM}>
      {employee.formatted_dob || employee.dob || COLUMN_LABELS.NOT_AVAILABLE}
    </span>
  );

  const renderSupervisors = (employee: EmployeeContactRecord) => {
    if (!employee.supervisor_names || employee.supervisor_names.length === 0) {
      return (
        <span className={TAILWIND_CLASSES.TEXT_ITALIC_SMALL}>
          {COLUMN_LABELS.NO_SUPERVISORS}
        </span>
      );
    }

    return (
      <div className={TAILWIND_CLASSES.SUPERVISOR_CONTAINER}>
        {employee.supervisor_names.map((supervisorName, supervisorIndex) => (
          <span
            key={supervisorIndex}
            className={TAILWIND_CLASSES.SUPERVISOR_TAG}
          >
            {supervisorName}
          </span>
        ))}
      </div>
    );
  };

  const tableColumns: ColumnDef<EmployeeContactRecord>[] = [
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
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_SLATE}>
          {employee.first_name || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "middle_name",
      header: COLUMN_LABELS.MIDDLE_NAME,
      width: 140,
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_SLATE}>
          {employee.middle_name || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "last_name",
      header: COLUMN_LABELS.LAST_NAME,
      width: 140,
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_SLATE}>
          {employee.last_name || COLUMN_LABELS.NOT_AVAILABLE}
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
      render: (employee) => renderPhone(employee.mobile),
    },
    {
      key: "home_tel",
      header: COLUMN_LABELS.HOME_TEL,
      width: 140,
      render: (employee) => renderPhone(employee.home_tel),
    },
    {
      key: "work_tel",
      header: COLUMN_LABELS.WORK_TEL,
      width: 140,
      render: (employee) => renderPhone(employee.work_tel),
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
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_SMALL}>
          {formatAddress(employee)}
        </span>
      ),
    },
    {
      key: "location",
      header: COLUMN_LABELS.LOCATION,
      width: 150,
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_SLATE}>
          {employee.location || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "sub_unit",
      header: COLUMN_LABELS.SUB_UNIT,
      width: 180,
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_MEDIUM}>
          {employee.sub_unit || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "job_title",
      header: COLUMN_LABELS.JOB_TITLE,
      width: 180,
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_MEDIUM}>
          {employee.job_title || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "gender",
      header: COLUMN_LABELS.GENDER,
      width: 100,
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_SLATE}>
          {employee.gender || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
    {
      key: "employment_status",
      header: COLUMN_LABELS.STATUS,
      width: 120,
      render: (employee) => (
        <span className={TAILWIND_CLASSES.TEXT_SLATE}>
          {employee.employment_status || COLUMN_LABELS.NOT_AVAILABLE}
        </span>
      ),
    },
  ];

  const uniqueLocations = useMemo(
    () => extractUniqueValues(reportData, (employee) => employee.location),
    [reportData],
  );

  const uniqueSubUnits = useMemo(
    () => extractUniqueValues(reportData, (employee) => employee.sub_unit),
    [reportData],
  );

  const uniqueJobTitles = useMemo(
    () => extractUniqueValues(reportData, (employee) => employee.job_title),
    [reportData],
  );

  const handleLocationChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedLocation(event.target.value);
    setCurrentPage(1);
  };

  const handleGenderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGender(event.target.value);
    setCurrentPage(1);
  };

  const handleEmploymentStatusChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedEmploymentStatus(event.target.value);
    setCurrentPage(1);
  };

  const handleSubUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubUnit(event.target.value);
    setCurrentPage(1);
  };

  const handleJobTitleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedJobTitle(event.target.value);
    setCurrentPage(1);
  };

  const sortableColumnsConfig = useMemo(() => {
    const sortConfig: Record<
      string,
      { dir: SortDirection; onToggle: () => void }
    > = {};
    SORTABLE_COLUMN_KEYS.forEach((columnKey) => {
      sortConfig[columnKey] = {
        dir: sortColumn === columnKey ? sortDirection : SortDirection.ASCENDING,
        onToggle: () => handleSort(columnKey),
      };
    });
    return sortConfig;
  }, [sortColumn, sortDirection]);

  const filterToolbar = (
    <div className={TAILWIND_CLASSES.FILTER_TOOLBAR}>
      <select
        value={selectedLocation}
        onChange={handleLocationChange}
        className={TAILWIND_CLASSES.SELECT_INPUT}
      >
        <option value="">All Locations</option>
        {uniqueLocations.map((locationName) => (
          <option key={locationName} value={locationName}>
            {locationName}
          </option>
        ))}
      </select>

      <select
        value={selectedSubUnit}
        onChange={handleSubUnitChange}
        className={TAILWIND_CLASSES.SELECT_INPUT}
      >
        <option value="">All Sub Units</option>
        {uniqueSubUnits.map((subUnitName) => (
          <option key={subUnitName} value={subUnitName}>
            {subUnitName}
          </option>
        ))}
      </select>

      <select
        value={selectedJobTitle}
        onChange={handleJobTitleChange}
        className={TAILWIND_CLASSES.SELECT_INPUT}
      >
        <option value="">All Job Titles</option>
        {uniqueJobTitles.map((jobTitleName) => (
          <option key={jobTitleName} value={jobTitleName}>
            {jobTitleName}
          </option>
        ))}
      </select>

      <select
        value={selectedGender}
        onChange={handleGenderChange}
        className={TAILWIND_CLASSES.SELECT_INPUT}
      >
        {GENDER_FILTER_OPTIONS.map((genderOption) => (
          <option key={genderOption.value} value={genderOption.value}>
            {genderOption.label}
          </option>
        ))}
      </select>

      <select
        value={selectedEmploymentStatus}
        onChange={handleEmploymentStatusChange}
        className={TAILWIND_CLASSES.SELECT_INPUT}
      >
        {EMPLOYMENT_STATUS_FILTER_OPTIONS.map((statusOption) => (
          <option key={statusOption.value} value={statusOption.value}>
            {statusOption.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleResetFilters}
        className={TAILWIND_CLASSES.RESET_BUTTON}
      >
        Reset Filters
      </button>

      <button
        onClick={handleExportExcel}
        className={TAILWIND_CLASSES.EXPORT_BUTTON}
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
          icon={<IconUsers size={18} />}
          rows={reportData}
          columns={tableColumns}
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
          sortableColumns={sortableColumnsConfig}
          itemLabel={REPORT_CONFIG.ITEM_LABEL}
          emptyIcon={REPORT_CONFIG.EMPTY_ICON_TEXT}
          emptyTitle={REPORT_CONFIG.EMPTY_TITLE}
          emptySubtitle={REPORT_CONFIG.EMPTY_SUBTITLE}
        />
      </div>
    </Layout>
  );
}
