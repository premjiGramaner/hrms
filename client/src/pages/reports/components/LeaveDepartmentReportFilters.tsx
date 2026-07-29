import { IconSearch } from "../../../components/Icons";
import type {
  LeaveDepartmentFilterOptions,
  LeaveEmployeeScope,
} from "../../../types";
import {
  CURRENT_REPORT_YEAR,
  DEFAULT_LEAVE_STATUS,
  REPORT_FILTER_CONTROL_CLASSES,
  getEmployeeScopeLabel,
  type LeaveDepartmentFilterChangeHandler,
  type LeaveDepartmentFilters,
} from "../leaveDepartmentReport.config";

interface LeaveDepartmentReportFiltersProps {
  draftFilters: LeaveDepartmentFilters;
  appliedFilters: LeaveDepartmentFilters;
  filterOptions: LeaveDepartmentFilterOptions;
  isExporting: boolean;
  onFilterChange: LeaveDepartmentFilterChangeHandler;
  onGenerate: () => void;
  onReset: () => void;
  onPdfDownload: () => void;
}

export default function LeaveDepartmentReportFilters({
  draftFilters,
  appliedFilters,
  filterOptions,
  isExporting,
  onFilterChange,
  onGenerate,
  onReset,
  onPdfDownload,
}: LeaveDepartmentReportFiltersProps) {
  const availableYears = [
    ...new Set([CURRENT_REPORT_YEAR, ...filterOptions.years]),
  ];
  const availableStatuses = [
    ...new Set([DEFAULT_LEAVE_STATUS, ...filterOptions.statuses]),
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-navy-800">
            Current Year's Leave Taken by Department
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Configure the filters, generate the report, and export the same
            result as PDF.
          </p>
        </div>
        <button
          type="button"
          disabled={isExporting}
          onClick={onPdfDownload}
          className="rounded-full bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? "Preparing PDF..." : "PDF"}
        </button>
      </div>

      <div className="grid gap-x-5 gap-y-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Employee Status
          </span>
          <select
            value={draftFilters.employeeScope}
            onChange={(event) =>
              onFilterChange(
                "employeeScope",
                event.target.value as LeaveEmployeeScope,
              )
            }
            className={REPORT_FILTER_CONTROL_CLASSES}
          >
            <option value="current">Current Employees Only</option>
            <option value="past">Past Employees Only</option>
            <option value="all">Current and Past Employees</option>
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Leave Date - Year
          </span>
          <select
            value={draftFilters.year}
            onChange={(event) =>
              onFilterChange(
                "year",
                event.target.value ? Number(event.target.value) : "",
              )
            }
            className={REPORT_FILTER_CONTROL_CLASSES}
          >
            <option value="">All Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Leave Status
          </span>
          <select
            value={draftFilters.status}
            onChange={(event) => onFilterChange("status", event.target.value)}
            className={REPORT_FILTER_CONTROL_CLASSES}
          >
            <option value="">All Leave Statuses</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Sub Unit
          </span>
          <select
            value={draftFilters.department}
            onChange={(event) =>
              onFilterChange("department", event.target.value)
            }
            className={REPORT_FILTER_CONTROL_CLASSES}
          >
            <option value="">All Sub Units</option>
            {filterOptions.departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Leave Type
          </span>
          <select
            value={draftFilters.leaveTypeId}
            onChange={(event) =>
              onFilterChange(
                "leaveTypeId",
                event.target.value ? Number(event.target.value) : "",
              )
            }
            className={REPORT_FILTER_CONTROL_CLASSES}
          >
            <option value="">All Leave Types</option>
            {filterOptions.leaveTypes.map((leaveType) => (
              <option key={leaveType.id} value={leaveType.id}>
                {leaveType.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Location
          </span>
          <select
            value={draftFilters.location}
            onChange={(event) => onFilterChange("location", event.target.value)}
            className={REPORT_FILTER_CONTROL_CLASSES}
          >
            <option value="">All Locations</option>
            {filterOptions.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Employee
          </span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch size={15} />
            </span>
            <input
              value={draftFilters.employeeName}
              onChange={(event) =>
                onFilterChange("employeeName", event.target.value)
              }
              placeholder="Name or employee ID"
              className={`${REPORT_FILTER_CONTROL_CLASSES} !pl-10 pr-3.5`}
            />
          </span>
        </label>

        <div className="flex items-end justify-end gap-3">
          <button
            type="button"
            onClick={onReset}
            className="h-11 rounded-full border border-navy-700 bg-white px-6 text-sm font-semibold text-navy-700 transition hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="h-11 rounded-full bg-gradient-to-r from-navy-700 to-teal-600 px-7 text-sm font-bold text-white shadow-md transition hover:opacity-90"
          >
            Generate
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
        <span className="font-semibold text-navy-700">Applied:</span>
        <span>{getEmployeeScopeLabel(appliedFilters.employeeScope)}</span>
        <span aria-hidden="true">•</span>
        <span>{appliedFilters.year || "All Years"}</span>
        <span aria-hidden="true">•</span>
        <span>{appliedFilters.status || "All Statuses"}</span>
      </div>
    </section>
  );
}
