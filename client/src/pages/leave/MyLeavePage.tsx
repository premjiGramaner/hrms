import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchLeaves, setFilters } from "../../store/leaveSlice";
import { LeaveRequest } from "../../types";
import LeaveLayout from "./LeaveLayout";
import Toast, { useToast } from "../../components/Toast";
import { cancelLeave } from "../../api/leave.api";
import { getApiErrorMessage } from "../../utils/errors";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Pending Approval": "bg-amber-50 text-amber-700 border-amber-200",
    "Approved":         "bg-green-50 text-green-700 border-green-200",
    "Scheduled":        "bg-blue-50 text-blue-700 border-blue-200",
    "Taken":            "bg-purple-50 text-purple-700 border-purple-200",
    "Rejected":         "bg-red-50 text-red-700 border-red-200",
    "Cancelled":        "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
      {status}
    </span>
  );
}

export default function MyLeavePage() {
  const dispatch = useAppDispatch();
  const { data, loading } = useAppSelector((s) => s.leaves);
  const { toasts, addToast, removeToast } = useToast();

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const f = {
      from_date: `${currentYear}-01-01`,
      to_date: `${currentYear}-12-31`,
      page: 1,
      limit: 50,
    };
    dispatch(setFilters(f));
    dispatch(fetchLeaves(f));
  }, []);

  const handleCancel = async (id: number) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      await cancelLeave(id);
      addToast("Leave cancelled.", "success");
      dispatch(fetchLeaves({
        from_date: `${currentYear}-01-01`,
        to_date: `${currentYear}-12-31`,
        page: 1,
        limit: 50,
      }));
    } catch (e) {
      addToast(getApiErrorMessage(e, "Failed to cancel."), "error");
    }
  };

  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />
      <div className="max-w-4xl">
        <h2 className="text-base font-bold text-slate-800 mb-4">My Leave — {currentYear}</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-3xl mb-2">🌴</div>
              <p className="text-sm">No leave requests found for this year.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  {["Leave Type", "Start", "End", "Days", "Applied On", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((row: LeaveRequest, i: number) => (
                  <tr key={row.id} className={`border-b border-slate-100 hover:bg-emerald-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                    <td className="px-4 py-2.5 text-slate-700">{row.leave_type}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{row.start_date}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{row.end_date}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{Number(row.requested_days).toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {row.applied_on ? row.applied_on.substring(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-2.5">
                      {!["Cancelled", "Rejected"].includes(row.status) && (
                        <button
                          onClick={() => handleCancel(row.id)}
                          className="text-xs text-red-600 hover:text-red-800 cursor-pointer bg-transparent border-none transition"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </LeaveLayout>
  );
}
