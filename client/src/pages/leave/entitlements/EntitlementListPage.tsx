import { useEffect, useRef, useState } from "react";
import {
  getEntitlementList,
  getEntitlementLeaveTypes,
  getEntitlementEmployees,
  EntitlementRecord,
  EmployeeOption,
} from "../../../api/entitlement.api";
import { LeaveType } from "../../../types";
import { getApiErrorMessage } from "../../../utils/errors";
import Toast, { useToast } from "../../../components/Toast";
import EntitlementsLayout from "./EntitlementsLayout";
import { DescriptionCell } from "../../employees/components/Description";
import { X } from "lucide-react";
import "../Style/EntitlementListPage.css";

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EmployeeAutocomplete({
  value,
  onSelect,
  onClear,
}: {
  value: EmployeeOption | null;
  onSelect: (emp: EmployeeOption) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(
    value
      ? `${value.employee_id ? value.employee_id + " - " : ""}${value.name}`
      : "",
  );
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  useEffect(() => {
    let isCancelled = false;
    const trimmedQuery = query.trim();

    clearTimeout(debounceRef.current);

    if (!trimmedQuery) {
      setOptions([]);
      setOpen(false);
      setFetching(false);
      return;
    }

    setFetching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await getEntitlementEmployees(trimmedQuery);

        if (isCancelled) return;

        setOptions(data);
        setOpen(data.length > 0);
      } catch {
        if (isCancelled) return;

        setOptions([]);
        setOpen(false);
      } finally {
        if (!isCancelled) {
          setFetching(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
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
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelect = (emp: EmployeeOption) => {
    setQuery(`${emp.employee_id ? emp.employee_id + " - " : ""}${emp.name}`);
    setOpen(false);
    onSelect(emp);
  };

  return (
    <div ref={containerRef} className="entitlement-list__relative">
      <div className="entitlement-list__autocomplete-input-wrapper">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!event.target.value) onClear();
          }}
          placeholder="Type for hints…"
          className="entitlement-list__input entitlement-list__employee-input"
        />
        {fetching && (
          <div className="entitlement-list__autocomplete-spinner-wrapper">
            <div className="entitlement-list__spinner entitlement-list__spinner--search" />
          </div>
        )}
        {!fetching && value && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
              onClear();
            }}
            className="entitlement-list__clear-button"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && options.length > 0 && (
        <div className="entitlement-list__autocomplete-menu">
          {options.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => handleSelect(emp)}
              className="entitlement-list__autocomplete-option"
            >
              <span className="entitlement-list__employee-code">
                {emp.employee_id || ""}
              </span>
              <span className="entitlement-list__employee-name">
                {emp.name}
              </span>
              {emp.job_title && (
                <span className="entitlement-list__employee-job-title">
                  · {emp.job_title}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LIMIT = 20;

export default function EntitlementListPage() {
  const { toasts, addToast, removeToast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeOption | null>(null);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [records, setRecords] = useState<EntitlementRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false); // track if initial load is done

  useEffect(() => {
    getEntitlementLeaveTypes()
      .then(setLeaveTypes)
      .catch(() => {});
  }, []);

  // Load all history by default on page mount
  useEffect(() => {
    if (!initialLoad) {
      fetchRecords(1);
      setInitialLoad(true);
    }
  }, [initialLoad]);

  const fetchRecords = async (p: number) => {
    setLoading(true);
    try {
      const res = await getEntitlementList({
        employee_id: selectedEmployee?.id,
        leave_type_id: leaveTypeId ? parseInt(leaveTypeId) : undefined,
        page: p,
        limit: LIMIT,
      });
      setRecords(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch (err) {
      addToast(
        getApiErrorMessage(err, "Failed to load entitlements."),
        "error",
      );
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchRecords(1);
  };

  const handleReset = () => {
    setSelectedEmployee(null);
    setLeaveTypeId("");
    fetchRecords(1); // Reload all history after reset
  };

  useEffect(() => {
    if (initialLoad) fetchRecords(page);
  }, [page]);

  const selectCls = "entitlement-list__select";

  return (
    <EntitlementsLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="entitlement-list__search-card">
        <div className="entitlement-list__card-header">
          <span className="entitlement-list__card-title">
            Search{" "}
            <span className="entitlement-list__card-subtitle">
              (Please specify your search)
            </span>
          </span>
        </div>

        <div className="entitlement-list__search-body">
          <div className="entitlement-list__filter-grid">
            <div>
              <label className="entitlement-list__label">
                Employee{" "}
                <span className="entitlement-list__optional">(optional)</span>
              </label>
              <EmployeeAutocomplete
                value={selectedEmployee}
                onSelect={setSelectedEmployee}
                onClear={() => setSelectedEmployee(null)}
              />
            </div>

            <div>
              <label className="entitlement-list__label">Leave Type</label>
              <div className="entitlement-list__relative">
                <select
                  value={leaveTypeId}
                  onChange={(event) => setLeaveTypeId(event.target.value)}
                  className={selectCls}
                >
                  <option value="">All</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
                <span className="entitlement-list__select-icon">▾</span>
              </div>
            </div>
          </div>

          <p className="entitlement-list__required-note">* Required field</p>

          <div className="entitlement-list__search-actions">
            <button
              onClick={handleReset}
              className="entitlement-list__button entitlement-list__button--reset"
            >
              Reset
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="entitlement-list__button entitlement-list__button--search"
            >
              {loading && (
                <div className="entitlement-list__spinner entitlement-list__spinner--button" />
              )}
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="entitlement-list__results-card">
        <div className="entitlement-list__results-header">
          <span className="entitlement-list__card-title">
            {loading
              ? "Loading…"
              : `${total} record${total !== 1 ? "s" : ""} found`}
          </span>
        </div>

        <div className="entitlement-list__table-wrapper">
          <table className="entitlement-list__table">
            <thead>
              <tr className="entitlement-list__table-head-row">
                {[
                  "Employee ID",
                  "Employee Name",
                  "Leave Type",
                  "Entitlement",
                  "Credit On",
                  "Valid From",
                  "Valid To",
                  "Description",
                  "Expired Date",
                  "Leave Entitlements",
                ].map((heading) => (
                  <th key={heading} className="entitlement-list__table-heading">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={10}
                    className="entitlement-list__table-message-cell"
                  >
                    <div className="entitlement-list__loading-content">
                      <div className="entitlement-list__spinner entitlement-list__spinner--table" />
                      <span className="entitlement-list__loading-text">
                        Fetching records…
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && records.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="entitlement-list__table-message-cell"
                  >
                    <div className="entitlement-list__empty-icon">📋</div>
                    <p className="entitlement-list__empty-title">
                      No Records Found
                    </p>
                    <p className="entitlement-list__empty-message">
                      Try different filters or check that entitlements have been
                      added.
                    </p>
                  </td>
                </tr>
              )}
              {!loading &&
                records.map((record, rowIndex) => {
                  const addedDays = Number(
                    record.last_added_days ?? record.total_days ?? 0,
                  ).toFixed(1);

                  return (
                    <tr
                      key={record.id}
                      className={`entitlement-list__table-row ${
                        rowIndex % 2 === 0
                          ? "entitlement-list__table-row--even"
                          : "entitlement-list__table-row--odd"
                      }`}
                    >
                      <td className="entitlement-list__cell entitlement-list__cell--employee-code">
                        {record.emp_code || "—"}
                      </td>

                      <td className="entitlement-list__cell entitlement-list__cell--employee-name">
                        {record.employee_name}
                      </td>

                      <td className="entitlement-list__cell entitlement-list__cell--leave-type">
                        {record.leave_type_name}
                      </td>

                      <td className="entitlement-list__cell entitlement-list__cell--center">
                        <span className="entitlement-list__badge entitlement-list__badge--added">
                          Added
                        </span>
                      </td>

                      <td className="entitlement-list__cell entitlement-list__cell--date">
                        {formatDate(record.credited_on)}
                      </td>

                      <td className="entitlement-list__cell entitlement-list__cell--date">
                        {formatDate(record.valid_from)}
                      </td>

                      <td className="entitlement-list__cell entitlement-list__cell--date">
                        {formatDate(record.valid_to)}
                      </td>
                      <td className="entitlement-list__cell entitlement-list__cell--description">
                        <DescriptionCell description={record.description} />
                      </td>
                      <td className="entitlement-list__cell entitlement-list__cell--date">
                        {record.expired ? (
                          <span className="entitlement-list__badge entitlement-list__badge--expired">
                            {formatDate(record.valid_to)}
                          </span>
                        ) : (
                          <span className="entitlement-list__placeholder">
                            —
                          </span>
                        )}
                      </td>
                      <td className="entitlement-list__cell entitlement-list__cell--entitlement">
                        <span className="entitlement-list__badge entitlement-list__badge--days">
                          {addedDays}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="entitlement-list__pagination">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="entitlement-list__pagination-button"
            >
              ← Prev
            </button>
            <span className="entitlement-list__pagination-status">
              Page {page} of {totalPages} · {total} records
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="entitlement-list__pagination-button"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </EntitlementsLayout>
  );
}
