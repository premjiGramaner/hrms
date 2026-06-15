import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaveTypes, applyLeave } from "../../api/leave.api";
import { LeaveType } from "../../types";
import { getApiErrorMessage } from "../../utils/errors";
import LeaveLayout from "./LeaveLayout";
import Toast, { useToast } from "../../components/Toast";

export default function ApplyLeavePage() {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    requested_days: "1",
    reason: "",
    comments: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLeaveTypes().then(setLeaveTypes).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.start_date && form.end_date) {
      const diff =
        (new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) /
          (1000 * 60 * 60 * 24) + 1;
      if (diff > 0) setForm((p) => ({ ...p, requested_days: String(diff) }));
    }
  }, [form.start_date, form.end_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      addToast("Please fill in all required fields.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await applyLeave({
        leave_type_id: parseInt(form.leave_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        requested_days: parseFloat(form.requested_days),
        reason: form.reason,
        comments: form.comments,
      });
      addToast("Leave application submitted successfully.", "success");
      setTimeout(() => navigate("/leave/my_leave"), 1500);
    } catch (e) {
      addToast(getApiErrorMessage(e, "Failed to submit leave."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition";

  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-800 mb-5">Apply for Leave</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.leave_type_id}
                onChange={(e) => setForm((p) => ({ ...p, leave_type_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Select leave type…</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={String(lt.id)}>{lt.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Number of Days</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.requested_days}
                onChange={(e) => setForm((p) => ({ ...p, requested_days: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Reason</label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Enter reason for leave…"
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Comments</label>
              <textarea
                rows={2}
                value={form.comments}
                onChange={(e) => setForm((p) => ({ ...p, comments: e.target.value }))}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate("/leave/view_leave_list")}
                className="px-5 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-900 to-teal-600 text-white font-semibold cursor-pointer hover:opacity-90 transition disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </LeaveLayout>
  );
}
