import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaveTypes, getLeaveBalance, applyLeave, getLeaves } from "../../api/leave.api";
import { LeaveType, LeaveBalance, LeaveRequest } from "../../types";
import { getApiErrorMessage } from "../../utils/errors";
import { useAppSelector } from "../../app/hooks";
import LeaveLayout from "./LeaveLayout";
import Toast, { useToast } from "../../components/Toast";

function initials(name = "") {
  return name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24) + 1;
  return diff > 0 ? diff : 0;
}

export default function ApplyLeavePage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { toasts, addToast, removeToast } = useToast();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [latestLeave, setLatestLeave] = useState<LeaveRequest | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const financialYear = new Date().getMonth() >= 3 ? currentYear + 1 : currentYear;

  useEffect(() => {
    Promise.all([
      getLeaveTypes(),
      user?.id && user.id > 0 ? getLeaveBalance(user.id, financialYear) : Promise.resolve([]),
      getLeaves({ page: 1, limit: 1, statuses: [] }),
    ])
      .then(([types, balances, leaveData]) => {
        setLeaveTypes(types);
        setBalances(balances as LeaveBalance[]);
        const leavePage = leaveData as { data: LeaveRequest[] };
        if (leavePage.data?.length) setLatestLeave(leavePage.data[0]);
      })
      .catch(() => { })
      .finally(() => setLoadingTypes(false));
  }, []);

  const getBalance = (typeId: number): number => {
    const balance = balances.find((bal) => bal.leave_type_id === typeId);
    return balance ? Number(balance.net_balance) : 0;
  };

  const requestedDays = daysBetween(startDate, endDate);
  const selectedBalance = selectedTypeId ? getBalance(selectedTypeId) : 0;

  const scrollCards = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "right" ? 160 : -160, behavior: "smooth" });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTypeId) { addToast("Please select a leave type.", "error"); return; }
    if (!startDate || !endDate) { addToast("Please select From and To dates.", "error"); return; }
    if (requestedDays <= 0) { addToast("End date must be on or after start date.", "error"); return; }
    if (selectedBalance < requestedDays) {
      addToast(`Insufficient balance. Available: ${selectedBalance.toFixed(2)} day(s).`, "error");
      return;
    }
    setSubmitting(true);
    try {
      const result = await applyLeave({
        leave_type_id: selectedTypeId,
        start_date: startDate,
        end_date: endDate,
        requested_days: requestedDays,
        comments: comments || undefined,
      });
      addToast("Leave application submitted successfully.", "success");
      setTimeout(() => navigate(`/view_my_leave_list/detail/${result.id}/my`), 1500);
    } catch (err) {
      addToast(getApiErrorMessage(err, "Failed to submit leave."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="max-w-3xl mx-auto">
        <h2 className="text-base font-bold text-slate-800 mb-5">Apply Leave</h2>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-900 to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden border-2 border-white shadow">
              {user?.avatar ? (
                <img src={`/uploads/${user.avatar}`} className="w-full h-full object-cover" alt="" />
              ) : (
                initials(user?.name || "")
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{user?.name || "Employee"}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || ""}</p>
            </div>
          </div>

          {loadingTypes ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading leave types…</span>
            </div>
          ) : (
            <div className="relative mb-6">
              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-1 scroll-smooth"
                style={{ scrollbarWidth: "none" }}
              >
                {leaveTypes.map((leaveType) => {
                  const balance = getBalance(leaveType.id);
                  const active = selectedTypeId === leaveType.id;
                  return (
                    <button
                      key={leaveType.id}
                      type="button"
                      onClick={() => setSelectedTypeId(active ? null : leaveType.id)}
                      className={`flex-shrink-0 w-36 rounded-xl border-2 px-3 py-3 text-left cursor-pointer transition
                        ${active
                          ? "border-blue-700 bg-blue-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <p className={`text-xs font-semibold leading-tight mb-1 ${active ? "text-blue-800" : "text-slate-700"}`}>
                        {leaveType.name}
                      </p>
                      <p className={`text-2xl font-bold leading-none ${active ? "text-blue-900" : "text-slate-800"}`}>
                        {balance.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Balance Day(s)</p>
                    </button>
                  );
                })}
              </div>

              {leaveTypes.length > 4 && (
                <button
                  type="button"
                  onClick={() => scrollCards("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-slate-200 rounded-full shadow flex items-center justify-center cursor-pointer hover:bg-slate-50 transition z-10"
                >
                  <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {!selectedTypeId && !loadingTypes && (
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-5 px-1">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Select a Leave Type to Proceed
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  placeholder="yyyy-mm-dd"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  To Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  placeholder="yyyy-mm-dd"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Comments
              </label>
              <textarea
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                rows={4}
                placeholder="Add your comments here"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition resize-none"
              />
            </div>

            <p className="text-xs text-slate-400">* Required</p>

            <div className="flex items-center justify-between mt-2">
              {latestLeave ? (
                <button
                  type="button"
                  onClick={() => navigate(`/view_my_leave_list/detail/${latestLeave.id}/my`)}
                  className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-left hover:bg-slate-100 transition cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      Last leave taken on {latestLeave.start_date}
                    </p>
                    <p className="text-xs text-slate-500">
                      {latestLeave.leave_type} · {Number(latestLeave.requested_days).toFixed(2)} day(s)
                    </p>
                  </div>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={submitting || !selectedTypeId}
                className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-bold cursor-pointer hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>
    </LeaveLayout>
  );
}
