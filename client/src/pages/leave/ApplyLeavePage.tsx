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
import "./Style/ApplyLeavePage.css";

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

      <div className="apply-leave-page">
        <h2 className="apply-leave-page__title">Apply Leave</h2>

        <div className="apply-leave-card">
          <div className="employee-summary">
            {/* Reusable UserAvatar component */}
            <UserAvatar size={64} className="employee-summary__avatar" />
            <div>
              <p className="employee-summary__name">
                {user?.name || "Employee"}
              </p>
              <p className="employee-summary__role">{user?.role || ""}</p>
            </div>
          </div>

          {loadingTypes ? (
            <div className="leave-loading">
              <div className="leave-loading__spinner" />
              <span className="leave-loading__text">Loading leave types…</span>
            </div>
          ) : filteredLeaveTypes.length === 0 ? (
            <div className="leave-empty-state">
              <svg
                className="leave-icon"
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
            <div className="leave-types">
              <div ref={scrollRef} className="leave-type-scroll">
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
                      className={`leave-type-card ${
                        active
                          ? "leave-type-card--active"
                          : "leave-type-card--inactive"
                      }`}
                    >
                      <p className="leave-type-card__name">{leaveType.name}</p>
                      <p className="leave-type-card__balance">
                        {balance.toFixed(2)}
                      </p>
                      <p className="leave-type-card__label">Balance Day(s)</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!selectedTypeId &&
            !loadingTypes &&
            filteredLeaveTypes.length > 0 && (
              <div className="leave-selection-hint">
                <svg
                  className="leave-icon"
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

          <form onSubmit={handleSubmit} className="apply-leave-form">
            <div className="apply-leave-form__date-grid">
              <div>
                <label className="apply-leave-form__label">
                  From Date{" "}
                  <span className="apply-leave-form__required">*</span>
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
                  className="apply-leave-form__control"
                />
              </div>
              <div>
                <label className="apply-leave-form__label">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  placeholder="yyyy-mm-dd"
                  className="apply-leave-form__control"
                />
              </div>
            </div>

            {startDate && (
              <>
                <div>
                  <label className="apply-leave-form__label apply-leave-form__label--spaced">
                    Partial Days
                  </label>
                  <div className="partial-day-options">
                    <label className="partial-day-option">
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.None}
                        checked={partialDays === PartialDays.None}
                        onChange={() => setPartialDays(PartialDays.None)}
                        className="partial-day-option__radio"
                      />
                      <span className="partial-day-option__text">None</span>
                    </label>
                    <label
                      className={`partial-day-option ${
                        !isMultipleDayRange
                          ? "partial-day-option--disabled"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.AllDays}
                        checked={partialDays === PartialDays.AllDays}
                        onChange={() => setPartialDays(PartialDays.AllDays)}
                        disabled={!isMultipleDayRange}
                        className="partial-day-option__radio"
                      />
                      <span className="partial-day-option__text">All Days</span>
                    </label>
                    <label className="partial-day-option">
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.StartDayOnly}
                        checked={partialDays === PartialDays.StartDayOnly}
                        onChange={() =>
                          setPartialDays(PartialDays.StartDayOnly)
                        }
                        className="partial-day-option__radio"
                      />
                      <span className="partial-day-option__text">
                        Start Day Only
                      </span>
                    </label>
                    <label className="partial-day-option">
                      <input
                        type="radio"
                        name="partialDays"
                        value={PartialDays.EndDayOnly}
                        checked={partialDays === PartialDays.EndDayOnly}
                        onChange={() => setPartialDays(PartialDays.EndDayOnly)}
                        className="partial-day-option__radio"
                      />
                      <span className="partial-day-option__text">
                        End Day Only
                      </span>
                    </label>
                    <label
                      className={`partial-day-option ${
                        !isMultipleDayRange
                          ? "partial-day-option--disabled"
                          : ""
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
                        className="partial-day-option__radio"
                      />
                      <span className="partial-day-option__text">
                        Start and End Day
                      </span>
                    </label>
                  </div>
                </div>

                {(partialDays === PartialDays.StartDayOnly ||
                  partialDays === PartialDays.StartAndEndDay) && (
                  <div>
                    <label className="apply-leave-form__label">
                      Start Day{" "}
                      <span className="apply-leave-form__required">*</span>
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
                    <label className="apply-leave-form__label">
                      End Day{" "}
                      <span className="apply-leave-form__required">*</span>
                    </label>
                    <HalfDaySelect
                      value={endDayHalf}
                      onChange={setEndDayHalf}
                    />
                  </div>
                )}

                <div>
                  <label className="apply-leave-form__label">
                    Total Duration
                  </label>
                  <div className="apply-leave-form__duration">
                    {totalDuration.toFixed(2)} Day(s)
                  </div>
                  {totalDuration === 0 &&
                    workingDaysInRange === 0 &&
                    startDate && (
                      <p className="apply-leave-form__validation">
                        The selected date range does not contain any working
                        days.
                      </p>
                    )}
                </div>
              </>
            )}

            {startDate && (
              <div>
                <label className="apply-leave-form__label">Comments</label>
                <textarea
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  rows={4}
                  placeholder="Add your comments here"
                  className="apply-leave-form__control apply-leave-form__textarea"
                />
              </div>
            )}

            {hasDateOverlap && (
              <div className="date-overlap-alert">
                <svg
                  className="date-overlap-alert__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="date-overlap-alert__text">
                  A leave request already exists for the selected date(s).
                </p>
              </div>
            )}

            {startDate && (
              <p className="apply-leave-form__required-note">
                * Required field
              </p>
            )}

            <div className="apply-leave-actions">
              {latestLeave ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(PAGE_PATHS.myLeaveDetail(latestLeave.id))
                  }
                  className="latest-leave-button"
                >
                  <svg
                    className="latest-leave-button__icon"
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
                    <p className="latest-leave-button__title">
                      Last leave taken on {latestLeave.start_date}
                    </p>
                    <p className="latest-leave-button__meta">
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
                className="apply-leave-submit"
              >
                {submitting && <div className="apply-leave-submit__spinner" />}
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>
    </LeaveLayout>
  );
}
