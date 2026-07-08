import React, { useEffect, useRef, useState } from "react";
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
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    setFetching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await getEntitlementEmployees(query.trim());
        setOptions(data);
        setOpen(true);
      } catch {
        setOptions([]);
      } finally {
        setFetching(false);
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

  const handleSelect = (emp: EmployeeOption) => {
    setQuery(`${emp.employee_id ? emp.employee_id + " - " : ""}${emp.name}`);
    setOpen(false);
    onSelect(emp);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!event.target.value) onClear();
          }}
          placeholder="Type for hints…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition pr-8"
        />
        {fetching ? (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
              onClear();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none text-base leading-none"
          >
            ×
          </button>
        ) : null}
      </div>

      {open && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto">
          {options.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => handleSelect(emp)}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition flex items-center gap-2"
            >
              <span className="font-mono text-xs text-slate-400 min-w-16">
                {emp.employee_id || ""}
              </span>
              <span className="flex-1">{emp.name}</span>
              {emp.job_title && (
                <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                  · {emp.job_title}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && !fetching && options.length === 0 && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 px-4 py-3 text-sm text-slate-400">
          No employees found
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
  const [searched, setSearched] = useState(false); // true after first Search click

  useEffect(() => {
    getEntitlementLeaveTypes()
      .then(setLeaveTypes)
      .catch(() => {});
  }, []);

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
    setSearched(true);
    fetchRecords(1);
  };

  const handleReset = () => {
    setSelectedEmployee(null);
    setLeaveTypeId("");
    setRecords([]);
    setTotal(0);
    setTotalPages(1);
    setPage(1);
    setSearched(false);
  };

  useEffect(() => {
    if (searched) fetchRecords(page);
  }, [page]);

  const selectCls =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white appearance-none cursor-pointer transition pr-8";

  return (
    <EntitlementsLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-5">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">
            Search{" "}
            <span className="text-xs text-slate-400 font-normal ml-1">
              (Please specify your search)
            </span>
          </span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Employee{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <EmployeeAutocomplete
                value={selectedEmployee}
                onSelect={setSelectedEmployee}
                onClear={() => setSelectedEmployee(null)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Leave Type
              </label>
              <div className="relative">
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
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▾
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-4">* Required field</p>

          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={handleReset}
              className="px-5 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition"
            >
              Reset
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-900 to-teal-600 text-white font-semibold cursor-pointer hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2"
            >
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {!searched
              ? "Use the filters above and click Search"
              : loading
                ? "Loading…"
                : `${total} record${total !== 1 ? "s" : ""} found`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100">
                {[
                  "Employee ID",
                  "Employee Name",
                  "Leave Type",
                  "Leave Period (Year)",
                  "Total Days",
                  "Used Days",
                  "Carried Days",
                  "Available Balance",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-7 h-7 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Fetching records…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && !searched && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-16 text-slate-400 text-sm"
                  >
                    Click{" "}
                    <span className="font-semibold text-slate-600">Search</span>{" "}
                    to load entitlement records.
                  </td>
                </tr>
              )}

              {!loading && searched && records.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-sm font-medium text-slate-500">
                      No Records Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try different filters or check that entitlements have been
                      added.
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                records.map((record, rowIndex) => (
                  <tr
                    key={record.id}
                    className={`border-b border-slate-100 hover:bg-emerald-50 transition-colors ${
                      rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-slate-600">
                      {record.emp_code || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                      {record.employee_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {record.leave_type_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 text-center">
                      {record.year}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-blue-700 text-center">
                      {Number(record.total_days).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-xs text-amber-700 text-center">
                      {Number(record.used_days).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 text-center">
                      {Number(record.carried_days).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-xs text-center">
                      <span
                        className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-xs
                          ${
                            Number(record.net_balance) > 0
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                      >
                        {Number(record.net_balance).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {searched && totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-3 text-sm text-slate-600">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="px-4 py-1.5 rounded border border-slate-200 bg-white cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total} records
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="px-4 py-1.5 rounded border border-slate-200 bg-white cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </EntitlementsLayout>
  );
}
