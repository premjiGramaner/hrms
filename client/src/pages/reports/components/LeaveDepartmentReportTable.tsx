import { IconChart } from "../../../components/Icons";
import Pagination from "../../../components/Pagination";
import type { LeaveByDepartmentRecord } from "../../../types";

interface LeaveDepartmentReportTableProps {
  reportData: LeaveByDepartmentRecord[];
  isLoading: boolean;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function formatLeaveDate(reportRow: LeaveByDepartmentRecord) {
  if (reportRow.start_date === reportRow.end_date) return reportRow.start_date;
  return `${reportRow.start_date} to ${reportRow.end_date}`;
}

function formatHours(hours: number) {
  return Number(hours || 0).toFixed(2);
}

function getEmployeeDisplayName(reportRow: LeaveByDepartmentRecord) {
  return reportRow.employee_scope === "Past Employee"
    ? `${reportRow.employee_name} (Past Employee)`
    : reportRow.employee_name;
}

export default function LeaveDepartmentReportTable({
  reportData,
  isLoading,
  currentPage,
  pageSize,
  totalPages,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: LeaveDepartmentReportTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-6">
        <div className="flex items-center gap-2">
          <span className="text-navy-700">
            <IconChart />
          </span>
          <h2 className="text-base font-bold text-navy-800">
            Department Leave List
          </h2>
        </div>
        <span className="text-sm font-semibold text-slate-400">
          ({totalRecords}) Records Found
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-navy-800">
              <th className="w-[26%] px-6 py-4 font-bold">Employee Name</th>
              <th className="w-[28%] px-6 py-4 font-bold">Sub Unit</th>
              <th className="w-[15%] px-6 py-4 font-bold">Leave Date</th>
              <th className="w-[17%] px-6 py-4 font-bold">Leave Type</th>
              <th className="w-[14%] px-6 py-4 text-right font-bold">
                Leave Duration
                <br />
                (Hours)
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400">
                  Loading leave report...
                </td>
              </tr>
            ) : reportData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400">
                  No leave records match the applied filters.
                </td>
              </tr>
            ) : (
              reportData.map((reportRow, rowIndex) => {
                const previousReportRow = reportData[rowIndex - 1];
                const isFirstEmployeeRow =
                  !previousReportRow ||
                  previousReportRow.user_id !== reportRow.user_id;

                return (
                  <tr
                    key={reportRow.id}
                    className="border-b border-slate-200 text-slate-600 transition hover:bg-blue-50/40"
                  >
                    <td className="bg-white px-6 py-3.5 font-medium text-navy-700">
                      {isFirstEmployeeRow
                        ? getEmployeeDisplayName(reportRow)
                        : ""}
                    </td>
                    <td className="bg-slate-50/80 px-6 py-3.5">
                      {isFirstEmployeeRow ? reportRow.department : ""}
                    </td>
                    <td className="bg-white px-6 py-3.5">
                      {formatLeaveDate(reportRow)}
                    </td>
                    <td className="bg-slate-50/80 px-6 py-3.5">
                      {reportRow.leave_type}
                    </td>
                    <td className="bg-white px-6 py-3.5 text-right font-medium">
                      {formatHours(reportRow.leave_hours)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="employees"
      />
    </section>
  );
}
