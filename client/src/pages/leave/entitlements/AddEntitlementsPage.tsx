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
import { PAGE_PATHS } from "../../../config/roles";
import { ChevronDown, X } from "lucide-react";
import "../Style/AddEntitlementsPage.css";

function buildPeriods(): { label: string; start: string; end: string }[] {
  const periods = [];
  const now = new Date();
  const baseYear = now.getFullYear() - 2;

  for (let year = baseYear; year <= baseYear + 4; year++) {
    const start = `${year}-04-01`;
    const end = `${year + 1}-03-31`;

    periods.push({
      label: `${start} to ${end}`,
      start,
      end,
    });
  }

  return periods;
}

const PERIODS = buildPeriods();

function defaultPeriod(): string {
  const now = new Date();
  const currentYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  return `${currentYear}-04-01`;
}

interface EmpSearchProps {
  selected: EmployeeOption[];
  multi: boolean;
  onAdd: (employee: EmployeeOption) => void;
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
    const trimmedQuery = query.trim();

    clearTimeout(debounceRef.current);

    if (!trimmedQuery) {
      setOptions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    let isSearchCancelled = false;

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const employees = await getEntitlementEmployees(trimmedQuery);

        if (isSearchCancelled) return;

        setOptions(employees);
        setOpen(employees.length > 0);
      } catch {
        if (isSearchCancelled) return;

        setOptions([]);
        setOpen(false);
      } finally {
        if (!isSearchCancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isSearchCancelled = true;
      clearTimeout(debounceRef.current);
    };
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

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const isSelected = (id: number): boolean =>
    selected.some((employee) => employee.id === id);

  const handleSelect = (employee: EmployeeOption) => {
    if (isSelected(employee.id)) return;

    onAdd(employee);

    if (!multi) {
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="add-entitlements__employee-search">
      {(multi || selected.length === 0) && (
        <div className="add-entitlements__search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => query && setOpen(true)}
            placeholder="Type employee name or ID…"
            className="add-entitlements__input add-entitlements__employee-input"
          />

          {loading && (
            <div className="add-entitlements__search-loader-wrapper">
              <div className="add-entitlements__spinner add-entitlements__spinner--search" />
            </div>
          )}
        </div>
      )}

      {open && options.length > 0 && (
        <div className="add-entitlements__employee-options">
          {options.map((employee) => {
            const selectedEmployee = isSelected(employee.id);

            return (
              <button
                key={employee.id}
                type="button"
                onClick={() => handleSelect(employee)}
                disabled={selectedEmployee}
                className={`add-entitlements__employee-option ${
                  selectedEmployee
                    ? "add-entitlements__employee-option--selected"
                    : "add-entitlements__employee-option--default"
                }`}
              >
                <span className="add-entitlements__employee-option-info">
                  <span className="add-entitlements__employee-code">
                    {employee.employee_id || ""}
                  </span>

                  <span>{employee.name}</span>

                  {employee.job_title && (
                    <span className="add-entitlements__employee-job-title">
                      · {employee.job_title}
                    </span>
                  )}
                </span>

                {selectedEmployee && (
                  <span className="add-entitlements__selected-check">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="add-entitlements__selected-employees">
          {selected.map((employee) => (
            <span key={employee.id} className="add-entitlements__employee-chip">
              {employee.employee_id ? `${employee.employee_id} - ` : ""}
              {employee.name}

              <button
                type="button"
                onClick={() => onRemove(employee.id)}
                className="add-entitlements__employee-chip-remove"
                aria-label={`Remove ${employee.name}`}
              >
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && !loading && options.length === 0 && query.trim() && (
        <div className="add-entitlements__empty-search">No employees found</div>
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
  const [description, setDescription] = useState("");
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

  const addEmployee = (employee: EmployeeOption) => {
    setSelectedEmployees((previousEmployees) =>
      previousEmployees.some(
        (existingEmployee) => existingEmployee.id === employee.id,
      )
        ? previousEmployees
        : [...previousEmployees, employee],
    );

    setErrors((previousErrors) => ({
      ...previousErrors,
      employee: "",
    }));
  };

  const removeEmployee = (id: number) => {
    setSelectedEmployees((previousEmployees) =>
      previousEmployees.filter(
        (existingEmployee) => existingEmployee.id !== id,
      ),
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedEmployees.length === 0) {
      newErrors.employee = "At least one employee is required.";
    }

    if (!leaveTypeId) {
      newErrors.leaveType = "Leave type is required.";
    }

    if (!periodStart) {
      newErrors.period = "Leave period is required.";
    }

    const days = Number.parseFloat(entitlementDays);

    if (!entitlementDays || Number.isNaN(days) || days <= 0) {
      newErrors.days = "Entitlement days must be > 0.";
    }

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
            employee_ids: selectedEmployees.map((employee) => employee.id),
            leave_type_id: Number.parseInt(leaveTypeId, 10),
            leave_period_start: periodStart,
            entitlement_days: Number.parseFloat(entitlementDays),
            comments: comments || undefined,
            description: description || undefined,
          }
        : {
            employee_id: selectedEmployees[0].id,
            leave_type_id: Number.parseInt(leaveTypeId, 10),
            leave_period_start: periodStart,
            entitlement_days: Number.parseFloat(entitlementDays),
            comments: comments || undefined,
            description: description || undefined,
          };

      const result = await createEntitlements(payload);

      addToast(result.message, "success");

      setSelectedEmployees([]);
      setLeaveTypeId("");
      setEntitlementDays("");
      setComments("");
      setDescription("");
    } catch (error) {
      addToast(
        getApiErrorMessage(error, "Failed to save entitlement."),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getInputClassName = (hasError = false): string =>
    `add-entitlements__input ${
      hasError
        ? "add-entitlements__input--error"
        : "add-entitlements__input--default"
    }`;

  const disableNumberInputScroll = (
    event: React.WheelEvent<HTMLInputElement>,
  ) => {
    event.currentTarget.blur();
  };

  const handleCancel = () => {
    navigate(PAGE_PATHS.leaveEntitlementsList);
  };

  return (
    <EntitlementsLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="add-entitlements">
        <h2 className="add-entitlements__title">Add Leave Entitlement</h2>

        <form onSubmit={handleSubmit}>
          <div className="add-entitlements__card">
            <div className="add-entitlements__grid">
              <div className="add-entitlements__field">
                <label className="add-entitlements__label">
                  Employee
                  <span className="add-entitlements__required">*</span>
                </label>

                <EmployeeSearch
                  selected={selectedEmployees}
                  multi={multiMode}
                  onAdd={addEmployee}
                  onRemove={removeEmployee}
                />

                {errors.employee && (
                  <p className="add-entitlements__error">{errors.employee}</p>
                )}

                <label className="add-entitlements__checkbox-label">
                  <input
                    type="checkbox"
                    checked={multiMode}
                    onChange={(event) =>
                      handleMultiToggle(event.target.checked)
                    }
                    className="add-entitlements__checkbox"
                  />

                  <span>Add to Multiple Employees</span>
                </label>
              </div>

              <div className="add-entitlements__field">
                <label className="add-entitlements__label">
                  Leave Type
                  <span className="add-entitlements__required">*</span>
                </label>

                {loadingTypes ? (
                  <div className="add-entitlements__skeleton" />
                ) : (
                  <div className="add-entitlements__select-wrapper">
                    <select
                      value={leaveTypeId}
                      onChange={(event) => {
                        setLeaveTypeId(event.target.value);
                        setErrors((previousErrors) => ({
                          ...previousErrors,
                          leaveType: "",
                        }));
                      }}
                      className={`${getInputClassName(
                        Boolean(errors.leaveType),
                      )} add-entitlements__select`}
                    >
                      <option value="">— Select leave type —</option>

                      {leaveTypes.map((leaveType) => (
                        <option key={leaveType.id} value={String(leaveType.id)}>
                          {leaveType.name}
                        </option>
                      ))}
                    </select>

                    <span className="add-entitlements__select-icon">
                      <ChevronDown size={15} aria-hidden="true" />
                    </span>
                  </div>
                )}

                {errors.leaveType && (
                  <p className="add-entitlements__error">{errors.leaveType}</p>
                )}
              </div>

              <div className="add-entitlements__field">
                <label className="add-entitlements__label">
                  Leave Period
                  <span className="add-entitlements__required">*</span>
                </label>

                <div className="add-entitlements__select-wrapper">
                  <select
                    value={periodStart}
                    onChange={(event) => {
                      setPeriodStart(event.target.value);
                      setErrors((previousErrors) => ({
                        ...previousErrors,
                        period: "",
                      }));
                    }}
                    className={`${getInputClassName(
                      Boolean(errors.period),
                    )} add-entitlements__select`}
                  >
                    <option value="">— Select period —</option>

                    {PERIODS.map((period) => (
                      <option key={period.start} value={period.start}>
                        {period.label}
                      </option>
                    ))}
                  </select>

                  <span className="add-entitlements__select-icon">
                    <ChevronDown size={15} aria-hidden="true" />
                  </span>
                </div>

                {errors.period && (
                  <p className="add-entitlements__error">{errors.period}</p>
                )}
              </div>

              <div className="add-entitlements__field">
                <label className="add-entitlements__label">
                  Entitlement (Days)
                  <span className="add-entitlements__required">*</span>
                </label>

                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  onWheel={disableNumberInputScroll}
                  value={entitlementDays}
                  onChange={(event) => {
                    setEntitlementDays(event.target.value);
                    setErrors((previousErrors) => ({
                      ...previousErrors,
                      days: "",
                    }));
                  }}
                  placeholder="e.g. 12"
                  className={getInputClassName(Boolean(errors.days))}
                />

                {errors.days && (
                  <p className="add-entitlements__error">{errors.days}</p>
                )}
              </div>

              <div className="add-entitlements__field">
                <label className="add-entitlements__label">
                  Entitlement Type
                </label>

                <div className="add-entitlements__readonly-value">Added</div>
              </div>

              <div className="add-entitlements__field add-entitlements__field--full">
                <label className="add-entitlements__label">Comment</label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Optional description…"
                  className={`${getInputClassName()} add-entitlements__textarea`}
                />
              </div>
            </div>

            <p className="add-entitlements__required-note">* Required field</p>
          </div>

          <div className="add-entitlements__actions">
            <button
              type="button"
              onClick={handleCancel}
              className="add-entitlements__button add-entitlements__button--cancel"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="add-entitlements__button add-entitlements__button--save"
            >
              {submitting && (
                <div className="add-entitlements__spinner add-entitlements__spinner--submit" />
              )}
              SAVE
            </button>
          </div>
        </form>
      </div>
    </EntitlementsLayout>
  );
}
