import React from "react";
import LeaveLayout from "./LeaveLayout";

export default function LeaveCalendarPage() {
  return (
    <LeaveLayout>
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="text-5xl mb-4">📅</div>
        <h2 className="text-lg font-semibold text-slate-600 mb-1">Leave Calendar</h2>
        <p className="text-sm">Visual leave calendar coming soon.</p>
      </div>
    </LeaveLayout>
  );
}
