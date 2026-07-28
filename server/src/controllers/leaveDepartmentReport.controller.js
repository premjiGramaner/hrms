import {
  getLeaveByDepartmentFilterOptions,
  getLeaveByDepartmentReport as findLeaveByDepartmentReport,
} from "../models/leaveDepartmentReport.model.js";
import { writeLeaveDepartmentReportPdf } from "../services/leaveDepartmentReportPdf.service.js";
import { success } from "../utils/response.js";

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 100;
const PDF_FILE_NAME = "Current Year's Leave Taken by Department.pdf";

function parsePositiveInteger(value, fallbackValue, maximumValue) {
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) return fallbackValue;
  return Math.min(parsedValue, maximumValue);
}

function buildFilterCriteria(query, pageSizeLimit = MAX_PAGE_SIZE) {
  return {
    employeeScope: query.employee_scope || "current",
    year: query.year ? Number(query.year) : null,
    status: query.status || null,
    department: query.department || null,
    leaveTypeId: query.leave_type_id || null,
    location: query.location || null,
    employeeName: query.employee_name || null,
    page: parsePositiveInteger(query.page, 1, Number.MAX_SAFE_INTEGER),
    limit: parsePositiveInteger(
      query.limit,
      DEFAULT_PAGE_SIZE,
      pageSizeLimit,
    ),
  };
}

async function getLeaveByDepartmentReport(request, response, next) {
  try {
    const reportResult = await findLeaveByDepartmentReport(
      buildFilterCriteria(request.query),
    );
    return success(response, reportResult);
  } catch (error) {
    next(error);
  }
}

async function getLeaveByDepartmentReportFilterOptions(
  _request,
  response,
  next,
) {
  try {
    const filterOptions = await getLeaveByDepartmentFilterOptions();
    return success(response, filterOptions);
  } catch (error) {
    next(error);
  }
}

async function exportLeaveByDepartmentReportPdf(request, response, next) {
  try {
    const filterCriteria = buildFilterCriteria({
      ...request.query,
      page: 1,
      limit: 1,
    });
    const reportPreview = await findLeaveByDepartmentReport(filterCriteria);
    const reportResult =
      reportPreview.totalPages > 1
        ? await findLeaveByDepartmentReport({
            ...filterCriteria,
            limit: reportPreview.totalRecords,
          })
        : reportPreview;

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${PDF_FILE_NAME}"`,
    );
    writeLeaveDepartmentReportPdf(response, {
      reportData: reportResult.reportData,
      summary: reportResult.summary,
    });
  } catch (error) {
    next(error);
  }
}

export {
  exportLeaveByDepartmentReportPdf,
  getLeaveByDepartmentReport,
  getLeaveByDepartmentReportFilterOptions,
};
