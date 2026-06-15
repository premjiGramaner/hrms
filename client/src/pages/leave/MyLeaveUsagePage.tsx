import React, { useEffect, useState } from "react";
import { getLeaveBalance } from "../../api/leave.api";
import { LeaveBalance } from "../../types";
import { useAppSelector } from "../../app/hooks";
import LeaveLayout from "./LeaveLayout";

export default function MyLeaveUsagePage() {
  const user = useAppSelector((s) => s.auth.user);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getLeaveBalance(user.id, new Date().getFullYear())
        .then(setBalances)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <LeaveLayout>
      <div className="max-w-2xl">
        <h2 className="text-base font-bold text-slate-800 mb-4">
          My Leave Usage — {new Date().getFullYear()}
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : balances.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No entitlement data found for this year.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  {["Leave Type", "Total Days", "Used", "Carried", "Net Balance"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balances.map((b, i) => (
                  <tr
                    key={b.leave_type_id}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">{b.leave_type_name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{Number(b.total_days).toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{Number(b.used_days).toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{Number(b.carried_days).toFixed(1)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${Number(b.net_balance) > 0 ? "text-green-600" : "text-red-500"}`}>
                        {Number(b.net_balance).toFixed(1)}
                      </span>
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
