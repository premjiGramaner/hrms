import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLeaveTypes,
  getLeaveBalance,
  applyLeave,
  getLeaves,
} from "../../api/leave.api";
import { LeaveType, LeaveBalance, LeaveRequest } from "../../types";
import { getApiErrorMessage } from "../../utils/errors";
import { useAppSelector } from "../../app/hooks";
import LeaveLayout from "./LeaveLayout";
import Toast, { useToast } from "../../components/Toast";
import UserAvatar from "../../components/UserAvatar";

function initials(name = "") {
  return (
    name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff =
    (new Date(end).getTime() - new Date(start).getTime()) /
      (1000 * 60 * 60 * 24) +
    1;
  return diff > 0 ? diff : 0;
}

function checkDateOverlap(
  startDate: string,
  endDate: string,
  existingLeaves: LeaveRequest[],
): boolean {
  if (!startDate || !endDate) return false;

  for (const leave of existingLeaves) {
    const leaveStart = leave.start_date;
    const leaveEnd = leave.end_date;

    // Check if dates overlap
    if (startDate <= leaveEnd && endDate >= leaveStart) {
      return true;
    }
  }
  return false;
}

export default function ApplyLeavePage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { toasts, addToast, removeToast } = useToast();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [latestLeave, setLatestLeave] = useState<LeaveRequest | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [existingLeaves, setExistingLeaves] = useState<LeaveRequest[]>([]);

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() >= 3 ? currentYear + 1 : currentYear;

  const fetchData = async () => {
    console.log("🔍 ApplyLeavePage fetchData - user?.id:", user?.id, "user:", user);
    setLoadingTypes(true);
    try {
      const [types, balances, leaveData, allLeavesData] = await Promise.all([
        getLeaveTypes(),
        user?.id && user.id > 0
          ? getLeaveBalance(user.id, financialYear)
          : Promise.resolve([]),
        getLeaves({ page: 1, limit: 1, statuses: [] }),
        getLeaves({
          page: 1,
          limit: 1000,
          statuses: ["Pending Approval", "Approved", "Scheduled", "Taken"],
        }),
      ]);
      
      console.log("🔍 ApplyLeavePage - fetched balances:", balances);
      setLeaveTypes(types);
      setBalances(balances as LeaveBalance[]);
      const leavePage = leaveData as { data: LeaveRequest[] };
      if (leavePage.data?.length) setLatestLeave(leavePage.data[0]);

      const allLeavesPage = allLeavesData as { data: LeaveRequest[] };
      if (allLeavesPage.data) {
        setExistingLeaves(allLeavesPage.data);
      }
    } catch (error) {
      console.error("Failed to load leave data:", error);
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is available and has an ID
    if (user?.id && user.id > 0) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, financialYear]); // Re-fetch when user ID changes or financial year changes

  // Refetch balance when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user?.id) {
        // Refetch only the balance (not all data) when page becomes visible
        getLeaveBalance(user.id, financialYear)
          .then((balances) => setBalances(balances as LeaveBalance[]))
          .catch((error) => console.error("Failed to refresh balance:", error));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id, financialYear]);

  const getBalance = (typeId: number): number => {
    const balance = balances.find((bal) => bal.leave_type_id === typeId);
    return balance ? Number(balance.net_balance) : 0;
  };

  const calculateDaysForDuration = (fullDays: number, dur: string): number => {
    if (dur === "First Half" || dur === "Second Half") return 0.5;
    return fullDays;
  };

  const isHalfDay = duration === "First Half" || duration === "Second Half";
  const fullDays =
    duration === "Full Day" ? daysBetween(startDate, endDate) : 1;
  const requestedDays = calculateDaysForDuration(fullDays, duration);
  const selectedBalance = selectedTypeId ? getBalance(selectedTypeId) : 0;
  const isFormComplete =
    selectedTypeId &&
    startDate &&
    duration &&
    (duration !== "Full Day" || endDate) &&
    (duration !== "Full Day" || fullDays > 0);

  // Check for overlap - use endDate for Full Day, startDate for Half Day
  const checkDateForApply = duration === "Full Day" ? endDate : startDate;
  const hasDateOverlap = checkDateOverlap(
    startDate,
    checkDateForApply,
    existingLeaves,
  );

  const scrollCards = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "right" ? 160 : -160,
        behavior: "smooth",
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTypeId) {
      addToast("Please select a leave type.", "error");
      return;
    }
    if (!startDate) {
      addToast("Please select From date.", "error");
      return;
    }
    if (!duration) {
      addToast("Please select a duration.", "error");
      return;
    }
    if (duration === "Full Day" && !endDate) {
      addToast("Please select To date for Full Day leave.", "error");
      return;
    }
    if (duration === "Full Day" && fullDays <= 0) {
      addToast("End date must be on or after start date.", "error");
      return;
    }
    if (hasDateOverlap) {
      addToast(
        "A leave request already exists for the selected date(s).",
        "error",
      );
      return;
    }
    if (selectedBalance < requestedDays) {
      addToast(
        `Insufficient balance. Available: ${selectedBalance.toFixed(2)} day(s).`,
        "error",
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await applyLeave({
        leave_type_id: selectedTypeId,
        start_date: startDate,
        end_date: duration === "Full Day" ? endDate : startDate,
        requested_days: requestedDays,
        comments: comments || undefined,
      });
      addToast("Leave application submitted successfully.", "success");
      setTimeout(
        () => navigate(`/view_my_leave_list/detail/${result.id}/my`),
        1500,
      );
    } catch (err) {
      addToast(getApiErrorMessage(err, "Failed to submit leave."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="max-w-6xl  mx-auto">
        <h2 className="text-base font-bold text-slate-800 mb-5">Apply Leave</h2>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-start gap-5 mb-6">
            {/* Reusable UserAvatar component */}
            <UserAvatar
              size={64}
              className="border-2 border-white shadow"
            />
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {user?.name || "Employee"}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {user?.role || ""}
              </p>
            </div>
          </div>

          {loadingTypes ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">
                Loading leave types…
              </span>
            </div>
          ) : (
            <div className="relative mb-6">
              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-1 scroll-smooth "
                style={{ scrollbarWidth: "none" }}
              >
                {leaveTypes.map((leaveType) => {
                  const balance = getBalance(leaveType.id);
                  const active = selectedTypeId === leaveType.id;
                  return (
                    <button
                      key={leaveType.id}
                      type="button"
                      onClick={() =>
                        setSelectedTypeId(active ? null : leaveType.id)
                      }
                      className={`flex-shrink-0 w-36 rounded-xl border-2 px-3 py-3 text-left cursor-pointer transition text-center
                        ${
                          active
                            ? "border-blue-700 bg-blue-950 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                      <p
                        className={`text-sm font-bold  leading-tight mb-1 ${active ? "text-white" : "text-slate-700"}`}
                      >
                        {leaveType.name}
                      </p>
                      <p
                        className={`text-2xl font-bold leading-none ${active ? "text-white" : "text-slate-800"}`}
                      >
                        {balance.toFixed(2)}
                      </p>
                      <p className="text-xs text-white mt-0.5">
                        Balance Day(s)
                      </p>
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
                  <svg
                    className="w-3.5 h-3.5 text-slate-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {!selectedTypeId && !loadingTypes && (
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-5 px-1">
              <svg
                className="w-4 h-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
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
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    if (!duration && event.target.value) {
                      setDuration("Full Day");
                    }
                  }}
                  placeholder="yyyy-mm-dd"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  To Date{" "}
                  {duration === "Full Day" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  placeholder="yyyy-mm-dd"
                  disabled={isHalfDay}
                  className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition ${
                    isHalfDay ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            </div>

            {startDate && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Duration <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition appearance-none pr-8 cursor-pointer"
                  >
                    <option value="Full Day">Full Day</option>
                    <option value="First Half">First Half</option>
                    <option value="Second Half">Second Half</option>
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▾
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {requestedDays.toFixed(2)} day(s) will be deducted
                </p>
              </div>
            )}

            {startDate && (
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
            )}

            {hasDateOverlap && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <svg
                  className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-xs text-red-700">
                  A leave request already exists for the selected date(s).
                </p>
              </div>
            )}

            {startDate && (
              <p className="text-xs text-slate-400">* Required field</p>
            )}

            <div className="flex items-center justify-between mt-2">
              {latestLeave ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/view_my_leave_list/detail/${latestLeave.id}/my`)
                  }
                  className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-left hover:bg-slate-100 transition cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-slate-400 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
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
                      {latestLeave.leave_type} ·{" "}
                      {Number(latestLeave.requested_days).toFixed(2)} day(s)
                    </p>
                  </div>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={submitting || !isFormComplete || hasDateOverlap}
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
