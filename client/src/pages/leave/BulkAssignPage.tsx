import React from "react";
import LeaveLayout from "./LeaveLayout";

export default function BulkAssignPage() {
  return (
    <LeaveLayout>
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-lg font-semibold text-slate-600 mb-1">Bulk Assign Leave</h2>
        <p className="text-sm">Assign leave entitlements in bulk.</p>
      </div>
    </LeaveLayout>
  );
}
