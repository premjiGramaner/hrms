import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import {
  downloadLeaveByDepartmentReportPDF,
  fetchLeaveByDepartmentFilterOptions,
  fetchLeaveByDepartmentReport,
} from "../../api/report.api";
import type {
  LeaveByDepartmentRecord,
  LeaveDepartmentFilterOptions,
  LeaveDepartmentReportQuery,
} from "../../types";
import Toast from "../../utils/toast";
import { getApiErrorMessage } from "../../utils/errors";
import LeaveDepartmentReportFilters from "./components/LeaveDepartmentReportFilters";
import LeaveDepartmentReportTable from "./components/LeaveDepartmentReportTable";
import {
  DEFAULT_LEAVE_DEPARTMENT_FILTERS,
  EMPTY_LEAVE_DEPARTMENT_FILTER_OPTIONS,
  type LeaveDepartmentFilters,
} from "./leaveDepartmentReport.config";
import { REPORT_TABS } from "./reportTabs";

export default function LeaveByDepartmentReportPage() {
  const [reportData, setReportData] = useState<LeaveByDepartmentRecord[]>([]);
  const [filterOptions, setFilterOptions] =
    useState<LeaveDepartmentFilterOptions>(
      EMPTY_LEAVE_DEPARTMENT_FILTER_OPTIONS,
    );
  const [draftFilters, setDraftFilters] =
    useState<LeaveDepartmentFilters>(DEFAULT_LEAVE_DEPARTMENT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<LeaveDepartmentFilters>(DEFAULT_LEAVE_DEPARTMENT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const queryParams = useMemo<LeaveDepartmentReportQuery>(
    () => ({
      employee_scope: appliedFilters.employeeScope,
      year: appliedFilters.year || undefined,
      status: appliedFilters.status || undefined,
      department: appliedFilters.department || undefined,
      leave_type_id: appliedFilters.leaveTypeId || undefined,
      location: appliedFilters.location || undefined,
      employee_name: appliedFilters.employeeName.trim() || undefined,
      page: currentPage,
      limit: pageSize,
    }),
    [appliedFilters, currentPage, pageSize],
  );

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setFilterOptions(await fetchLeaveByDepartmentFilterOptions());
      } catch (error) {
        Toast.error(
          getApiErrorMessage(error, "Unable to load report filter options."),
        );
      }
    };
    void loadFilterOptions();
  }, []);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchLeaveByDepartmentReport(queryParams);
      setReportData(result.reportData);
      setTotalRecords(result.totalRecords);
      setTotalPages(result.totalPages);
    } catch (error) {
      setReportData([]);
      setTotalRecords(0);
      setTotalPages(1);
      Toast.error(
        getApiErrorMessage(
          error,
          "Unable to load the leave by department report.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  const updateDraftFilter = <
    FilterName extends keyof LeaveDepartmentFilters,
  >(
    filterName: FilterName,
    filterValue: LeaveDepartmentFilters[FilterName],
  ) => {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [filterName]: filterValue,
    }));
  };

  const handleGenerateReport = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const handleResetFilters = () => {
    setDraftFilters({ ...DEFAULT_LEAVE_DEPARTMENT_FILTERS });
    setAppliedFilters({ ...DEFAULT_LEAVE_DEPARTMENT_FILTERS });
    setCurrentPage(1);
  };

  const handlePdfDownload = async () => {
    setIsExporting(true);
    try {
      const exportQueryParams = {
        ...queryParams,
        page: undefined,
        limit: undefined,
      };
      await downloadLeaveByDepartmentReportPDF(exportQueryParams);
      Toast.success("Leave by department PDF downloaded successfully.");
    } catch (error) {
      Toast.error(
        getApiErrorMessage(error, "Unable to download the report PDF."),
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  return (
    <Layout
      title="Reports and Analytics"
      tabs={REPORT_TABS}
      activeTab="Leave by Department"
    >
      <LeaveDepartmentReportFilters
        draftFilters={draftFilters}
        appliedFilters={appliedFilters}
        filterOptions={filterOptions}
        isExporting={isExporting}
        onFilterChange={updateDraftFilter}
        onGenerate={handleGenerateReport}
        onReset={handleResetFilters}
        onPdfDownload={handlePdfDownload}
      />
      <LeaveDepartmentReportTable
        reportData={reportData}
        isLoading={isLoading}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </Layout>
  );
}
