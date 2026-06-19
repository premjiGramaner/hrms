import React, { useEffect, useState } from "react";
import {
  getMyEntitlements,
  MyEntitlementRecord,
} from "../../../api/entitlement.api";
import { getApiErrorMessage } from "../../../utils/errors";
import Toast, { useToast } from "../../../components/Toast";
import EntitlementsLayout from "./EntitlementsLayout";

export default function MyEntitlementsPage() {
  const { toasts, addToast, removeToast } = useToast();
  const [records, setRecords] = useState<MyEntitlementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyEntitlements()
      .then(setRecords)
      .catch((err) =>
        addToast(
          getApiErrorMessage(err, "Failed to load entitlements."),
          "error",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const grandTotal = records.reduce(
    (sum, record) => sum + Number(record.leave_entitlement),
    0,
  );

  return (
    <EntitlementsLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">
                Loading entitlements…
              </span>
            </div>
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="text-4xl mb-3">🌴</div>
            <p className="text-sm font-medium text-slate-500">
              No entitlement records found.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Entitlements assigned to you will appear here.
            </p>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  {[
                    "Leave Type",
                    "Entitlement Type",
                    "Credited On",
                    "Valid From",
                    "Valid To",
                    "Expired",
                    "Leave Entitlement",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-slate-800">
                      {record.leave_type}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {record.entitlement_type}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {record.credited_on || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {record.valid_from}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {record.valid_to}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {record.expired ? (
                        <span className="text-red-500 font-medium">Yes</span>
                      ) : (
                        <span className="text-slate-500">No</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {Number(record.leave_entitlement).toFixed(2)} day(s)
                    </td>
                  </tr>
                ))}

                <tr className="bg-slate-50 border-t border-slate-200">
                  <td
                    colSpan={6}
                    className="px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    Total
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-900">
                    {grandTotal.toFixed(2)} day(s)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EntitlementsLayout>
  );
}
