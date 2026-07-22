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
import { getMyInfo } from "../../api/employee.api";
import LeaveLayout from "./LeaveLayout";
import Toast, { useToast } from "../../components/Toast";
import UserAvatar from "../../components/UserAvatar";
import { PAGE_PATHS } from "../../config/roles";
import { PartialDays, DayHalf } from "./components/leave";
import HalfDaySelect from "./components/HalfDaySelect";

// Helper function to calculate working days (excluding weekends)
function calculateWorkingDays(fromDate: string, toDate: string): number {
  if (!fromDate || !toDate) return 0;

  const startDate = new Date(fromDate + "T00:00:00");
  const endDate = new Date(toDate + "T00:00:00");

  if (startDate > endDate) return 0;

  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
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
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [existingLeaves, setExistingLeaves] = useState<LeaveRequest[]>([]);
  const [employeeGender, setEmployeeGender] = useState<string>("");
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partialDays, setPartialDays] = useState<PartialDays>(PartialDays.None);
  const [startDayHalf, setStartDayHalf] = useState<DayHalf>("First Half");
  const [endDayHalf, setEndDayHalf] = useState<DayHalf>("First Half");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() >= 3 ? currentYear + 1 : currentYear;

  const isValidUser = (user?.id ?? 0) > 0;
  const fetchData = async () => {
    setLoadingTypes(true);
    try {
      const [types, balances, leaveData, allLeavesData, employeeData] =
        await Promise.all([
          getLeaveTypes(),
          isValidUser
            ? getLeaveBalance(user!.id, financialYear)
            : Promise.resolve([]),

          isValidUser
            ? getLeaves({
                page: 1,
                limit: 1,
                statuses: [],
                own_employee_id: user!.id,
              })
            : Promise.resolve({ data: [] }),
          isValidUser
            ? getLeaves({
                page: 1,
                limit: 1000,
                statuses: ["Pending Approval", "Approved", "Scheduled"],
                own_employee_id: user!.id,
              })
            : Promise.resolve({ data: [] }),
          isValidUser ? getMyInfo() : Promise.resolve({ data: {} }),
        ]);
      setLeaveTypes(types);
      setBalances(balances as LeaveBalance[]);
      const leavePage = leaveData as { data: LeaveRequest[] };
      const ownLeave =
        leavePage.data?.find((l) => Number(l.user_id) === Number(user?.id)) ??
        null;
      setLatestLeave(ownLeave);
      const existingLeavesData = allLeavesData as { data: LeaveRequest[] };
      setExistingLeaves(existingLeavesData.data || []);
      const empData = employeeData as { data: { gender?: string } };
      setEmployeeGender(empData.data?.gender || "");
    } catch (error) {
      console.error("Failed to load leave data:", error);
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    if (isValidUser) {
      fetchData();
    }
  }, [user?.id, financialYear]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user?.id) {
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

  // Filter leave types based on gender
  const getFilteredLeaveTypes = (): LeaveType[] => {
    if (!employeeGender) return leaveTypes;

    const genderLower = employeeGender.toLowerCase();

    // For males: show all leaves except Maternity Leave
    if (genderLower === "male") {
      return leaveTypes.filter((leave) => {
        const code = leave.code?.toUpperCase() || "";
        return code !== "ML"; // Exclude Maternity Leave for males
      });
    }

    // For females: show all leaves except Paternity Leave
    if (genderLower === "female") {
      return leaveTypes.filter((leave) => {
        const code = leave.code?.toUpperCase() || "";
        return code !== "PTL"; // Exclude Paternity Leave for females
      });
    }

    return leaveTypes;
  };

  const filteredLeaveTypes = getFilteredLeaveTypes();

  const getBalance = (typeId: number): number => {
    const balance = balances.find((bal) => bal.leave_type_id === typeId);
    return balance ? Number(balance.net_balance) : 0;
  };

  // Calculate total duration based on working days and partial days
  const calculateTotalDuration = (): number => {
    if (!startDate) return 0;

    const effectiveEndDate = endDate || startDate;
    let workingDays = calculateWorkingDays(startDate, effectiveEndDate);

    if (workingDays === 0) return 0;

    // Apply partial day reductions
    if (partialDays === PartialDays.AllDays) {
      return workingDays * 0.5; // All working days counted as half days
    } else if (
      partialDays === PartialDays.StartDayOnly ||
      partialDays === PartialDays.EndDayOnly
    ) {
      workingDays -= 0.5;
    } else if (partialDays === PartialDays.StartAndEndDay) {
      workingDays -= 1.0; // 0.5 from start + 0.5 from end
    }

    return Math.max(0, workingDays);
  };

  const totalDuration = calculateTotalDuration();

  const workingDaysInRange =
    startDate && endDate ? calculateWorkingDays(startDate, endDate) : 0;

  const isMultipleDayRange = workingDaysInRange > 1;
  const selectedBalance = selectedTypeId ? getBalance(selectedTypeId) : 0;
  const isFormComplete = selectedTypeId && startDate && totalDuration > 0;
  const effectiveEndDateForCheck = endDate || startDate;

  const hasDateOverlap = checkDateOverlap(
    startDate,
    effectiveEndDateForCheck,
    existingLeaves,
  );

  useEffect(() => {
    if (
      !isMultipleDayRange &&
      (partialDays === PartialDays.StartAndEndDay ||
        partialDays === PartialDays.AllDays)
    ) {
      setPartialDays(PartialDays.None);
    }
  }, [isMultipleDayRange, partialDays]);

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

    if (totalDuration <= 0) {
      addToast(
        "The selected date range does not contain any working days.",
        "error",
      );
      return;
    }

    if (hasDateOverlap) {
      addToast(
        "A leave request already exists for the selected date(s).",
        "error",
      );
      return;
    }

    if (selectedBalance < totalDuration) {
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
        end_date: endDate || startDate,
        requested_days: totalDuration,
        comments: comments || undefined,
      });
      addToast("Leave application submitted successfully.", "success");
      setTimeout(() => navigate(PAGE_PATHS.myLeaveDetail(result.id)), 1500);
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
            <UserAvatar size={64} className="border-2 border-white shadow" />
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
          ) : filteredLeaveTypes.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-5 px-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <svg
                className="w-4 h-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              No leave types available.
            </div>
          ) : (
            <div className="relative mb-6">
              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-1 scroll-smooth "
                style={{ scrollbarWidth: "none" }}
              >
                {filteredLeaveTypes.map((leaveType) => {
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

              {filteredLeaveTypes.length > 4 && (
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

          {!selectedTypeId &&
            !loadingTypes &&
            filteredLeaveTypes.length > 0 && (
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
                    if (endDate && event.target.value > endDate) {
                      setEndDate("");
                    }
                  }}
                  placeholder="yyyy-mm-dd"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  To Date
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

            {startDate && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Partial Days
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.None}
                        checked={partialDays === PartialDays.None}
                        onChange={() => setPartialDays(PartialDays.None)}
                        className="w-4 h-4 text-blue-600 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700">None</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 ${
                        !isMultipleDayRange
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.AllDays}
                        checked={partialDays === PartialDays.AllDays}
                        onChange={() => setPartialDays(PartialDays.AllDays)}
                        disabled={!isMultipleDayRange}
                        className="w-4 h-4 text-blue-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-slate-700">All Days</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.StartDayOnly}
                        checked={partialDays === PartialDays.StartDayOnly}
                        onChange={() =>
                          setPartialDays(PartialDays.StartDayOnly)
                        }
                        className="w-4 h-4 text-blue-600 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700">
                        Start Day Only
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.EndDayOnly}
                        checked={partialDays === PartialDays.EndDayOnly}
                        onChange={() => setPartialDays(PartialDays.EndDayOnly)}
                        className="w-4 h-4 text-blue-600 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700">
                        End Day Only
                      </span>
                    </label>
                    <label
                      className={`flex items-center gap-2 ${
                        !isMultipleDayRange
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.StartAndEndDay}
                        checked={partialDays === PartialDays.StartAndEndDay}
                        onChange={() =>
                          setPartialDays(PartialDays.StartAndEndDay)
                        }
                        disabled={!isMultipleDayRange}
                        className="w-4 h-4 text-blue-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-slate-700">
                        Start and End Day
                      </span>
                    </label>
                  </div>
                </div>

                {(partialDays === PartialDays.StartDayOnly ||
                  partialDays === PartialDays.StartAndEndDay) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Start Day <span className="text-red-500">*</span>
                    </label>
                    <HalfDaySelect
                      value={startDayHalf}
                      onChange={setStartDayHalf}
                    />
                  </div>
                )}

                {(partialDays === PartialDays.EndDayOnly ||
                  partialDays === PartialDays.StartAndEndDay) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      End Day <span className="text-red-500">*</span>
                    </label>
                    <HalfDaySelect
                      value={endDayHalf}
                      onChange={setEndDayHalf}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Total Duration
                  </label>
                  <div className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700">
                    {totalDuration.toFixed(2)} Day(s)
                  </div>
                  {totalDuration === 0 &&
                    workingDaysInRange === 0 &&
                    startDate && (
                      <p className="text-xs text-red-600 mt-1">
                        The selected date range does not contain any working
                        days.
                      </p>
                    )}
                </div>
              </>
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
                    navigate(PAGE_PATHS.myLeaveDetail(latestLeave.id))
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
