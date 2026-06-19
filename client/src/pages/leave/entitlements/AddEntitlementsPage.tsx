import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getEntitlementEmployees,
  getEntitlementLeaveTypes,
  createEntitlements,
  EmployeeOption,
} from "../../../api/entitlement.api";
import { LeaveType } from "../../../types";
import { getApiErrorMessage } from "../../../utils/errors";
import Toast, { useToast } from "../../../components/Toast";
import EntitlementsLayout from "./EntitlementsLayout";

function buildPeriods(): { label: string; start: string; end: string }[] {
  const periods = [];
  const now = new Date();
  const baseYear = now.getFullYear() - 2;
  for (let year = baseYear; year <= baseYear + 4; year++) {
    const start = `${year}-04-01`;
    const end = `${year + 1}-03-31`;
    periods.push({ label: `${start} to ${end}`, start, end });
  }
  return periods;
}

const PERIODS = buildPeriods();
function defaultPeriod() {
  const now = new Date();
  const currentYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${currentYear}-04-01`;
}

interface EmpSearchProps {
  selected: EmployeeOption[];
  multi: boolean;
  onAdd: (emp: EmployeeOption) => void;
  onRemove: (id: number) => void;
}
function EmployeeSearch({ selected, multi, onAdd, onRemove }: EmpSearchProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await getEntitlementEmployees(query);
        setOptions(data);
        setOpen(true);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const isSelected = (id: number) => selected.some((emp) => emp.id === id);

  const handleSelect = (emp: EmployeeOption) => {
    if (isSelected(emp.id)) return;
    onAdd(emp);
    if (!multi) {
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((emp) => (
            <span
              key={emp.id}
              className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {emp.employee_id ? `${emp.employee_id} - ` : ""}
              {emp.name}
              <button
                type="button"
                onClick={() => onRemove(emp.id)}
                className="text-blue-400 hover:text-blue-700 cursor-pointer bg-transparent border-none leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {(multi || selected.length === 0) && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => query && setOpen(true)}
            placeholder="Type employee name or ID…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition pr-8"
          />
          {loading && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}

      {open && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto">
          {options.map((emp) => {
            const sel = isSelected(emp.id);
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => handleSelect(emp)}
                disabled={sel}
                className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between
                  ${sel ? "bg-blue-50 text-blue-700 cursor-default" : "text-slate-700 hover:bg-slate-50 cursor-pointer"}`}
              >
                <span>
                  <span className="font-mono text-xs text-slate-400 mr-2">
                    {emp.employee_id || ""}
                  </span>
                  {emp.name}
                  {emp.job_title && (
                    <span className="text-xs text-slate-400 ml-2">
                      · {emp.job_title}
                    </span>
                  )}
                </span>
                {sel && <span className="text-xs text-blue-500">✓</span>}
              </button>
            );
          })}
        </div>
      )}
      {open && !loading && options.length === 0 && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 px-4 py-3 text-sm text-slate-400">
          No employees found
        </div>
      )}
    </div>
  );
}

export default function AddEntitlementsPage() {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [multiMode, setMultiMode] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeOption[]>(
    [],
  );
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [periodStart, setPeriodStart] = useState(defaultPeriod());
  const [entitlementDays, setEntitlementDays] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getEntitlementLeaveTypes()
      .then(setLeaveTypes)
      .catch(() => addToast("Failed to load leave types.", "error"))
      .finally(() => setLoadingTypes(false));
  }, []);

  const handleMultiToggle = (checked: boolean) => {
    setMultiMode(checked);
    if (!checked && selectedEmployees.length > 1) {
      setSelectedEmployees([selectedEmployees[0]]);
    }
  };

  const addEmployee = (emp: EmployeeOption) => {
    setSelectedEmployees((prev) =>
      prev.some((existing) => existing.id === emp.id) ? prev : [...prev, emp],
    );
    setErrors((prevErrors) => ({ ...prevErrors, employee: "" }));
  };

  const removeEmployee = (id: number) => {
    setSelectedEmployees((prev) =>
      prev.filter((existing) => existing.id !== id),
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (selectedEmployees.length === 0)
      newErrors.employee = "At least one employee is required.";
    if (!leaveTypeId) newErrors.leaveType = "Leave type is required.";
    if (!periodStart) newErrors.period = "Leave period is required.";
    const days = parseFloat(entitlementDays);
    if (!entitlementDays || isNaN(days) || days <= 0)
      newErrors.days = "Entitlement days must be > 0.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = multiMode
        ? {
            employee_ids: selectedEmployees.map((emp) => emp.id),
            leave_type_id: parseInt(leaveTypeId),
            leave_period_start: periodStart,
            entitlement_days: parseFloat(entitlementDays),
            comments: comments || undefined,
          }
        : {
            employee_id: selectedEmployees[0].id,
            leave_type_id: parseInt(leaveTypeId),
            leave_period_start: periodStart,
            entitlement_days: parseFloat(entitlementDays),
            comments: comments || undefined,
          };

      const result = await createEntitlements(payload);
      addToast(result.message, "success");

      setSelectedEmployees([]);
      setLeaveTypeId("");
      setEntitlementDays("");
      setComments("");
    } catch (err) {
      addToast(getApiErrorMessage(err, "Failed to save entitlement."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPeriod = PERIODS.find((period) => period.start === periodStart);

  const inputCls = (hasError?: boolean) =>
    `w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white transition
     ${hasError ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-blue-400"}`;

  return (
    <EntitlementsLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="max-w-3xl mx-auto">
        <h2 className="text-base font-bold text-slate-800 mb-6">
          Add Leave Entitlement
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Employee <span className="text-red-500">*</span>
                </label>
                <EmployeeSearch
                  selected={selectedEmployees}
                  multi={multiMode}
                  onAdd={addEmployee}
                  onRemove={removeEmployee}
                />
                {errors.employee && (
                  <p className="text-xs text-red-500 mt-1">{errors.employee}</p>
                )}

                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiMode}
                    onChange={(event) =>
                      handleMultiToggle(event.target.checked)
                    }
                    className="w-4 h-4 accent-blue-900"
                  />
                  <span className="text-sm text-slate-600">
                    Add to Multiple Employees
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                {loadingTypes ? (
                  <div className="h-9 bg-slate-100 animate-pulse rounded-lg" />
                ) : (
                  <div className="relative">
                    <select
                      value={leaveTypeId}
                      onChange={(event) => {
                        setLeaveTypeId(event.target.value);
                        setErrors((prevErrors) => ({
                          ...prevErrors,
                          leaveType: "",
                        }));
                      }}
                      className={`${inputCls(!!errors.leaveType)} appearance-none pr-8 cursor-pointer`}
                    >
                      <option value="">— Select leave type —</option>
                      {leaveTypes.map((lt) => (
                        <option key={lt.id} value={String(lt.id)}>
                          {lt.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▾
                    </span>
                  </div>
                )}
                {errors.leaveType && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.leaveType}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Leave Period <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={periodStart}
                    onChange={(event) => {
                      setPeriodStart(event.target.value);
                      setErrors((prevErrors) => ({
                        ...prevErrors,
                        period: "",
                      }));
                    }}
                    className={`${inputCls(!!errors.period)} appearance-none pr-8 cursor-pointer`}
                  >
                    <option value="">— Select period —</option>
                    {PERIODS.map((period) => (
                      <option key={period.start} value={period.start}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▾
                  </span>
                </div>
                {errors.period && (
                  <p className="text-xs text-red-500 mt-1">{errors.period}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Entitlement (Days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={entitlementDays}
                  onChange={(event) => {
                    setEntitlementDays(event.target.value);
                    setErrors((prevErrors) => ({ ...prevErrors, days: "" }));
                  }}
                  placeholder="e.g. 12"
                  className={inputCls(!!errors.days)}
                />
                {errors.days && (
                  <p className="text-xs text-red-500 mt-1">{errors.days}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Comment
                </label>
                <textarea
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  rows={3}
                  placeholder="Optional comments…"
                  className={`${inputCls()} resize-none`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Entitlement Type
                </label>
                <div className="px-3 py-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                  Added
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-5">* Required field</p>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={() => navigate("/leave/entitlements/list")}
              className="px-6 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 text-sm rounded-lg bg-gradient-to-r from-blue-900 to-teal-600 text-white font-semibold cursor-pointer hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              SAVE
            </button>
          </div>
        </form>
      </div>
    </EntitlementsLayout>
  );
}
