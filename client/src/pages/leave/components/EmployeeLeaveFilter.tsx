import React, { useState } from "react";

const STATUS_OPTIONS = [
  "Cancelled",
  "Pending Approval",
  "Scheduled",
  "Taken",
  "Rejected",
  "Approved",
];

interface EmployeeLeaveFilterProps {
  from_date: string;
  to_date: string;
  statuses: string[];
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onStatusesChange: (statuses: string[]) => void;
  onSearch: () => void;
  onReset: () => void;
}

export default function EmployeeLeaveFilter({
  from_date,
  to_date,
  statuses,
  onFromDateChange,
  onToDateChange,
  onStatusesChange,
  onSearch,
  onReset,
}: EmployeeLeaveFilterProps) {
  const [errors, setErrors] = useState<{
    from_date?: string;
    to_date?: string;
    statuses?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!from_date) {
      newErrors.from_date = "From Date is required";
    }

    if (!to_date) {
      newErrors.to_date = "To Date is required";
    }

    if (from_date && to_date && from_date > to_date) {
      newErrors.to_date = "To Date cannot be earlier than From Date";
    }

    if (!statuses || statuses.length === 0) {
      newErrors.statuses = "Please select at least one leave status";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    if (validateForm()) {
      // If "Taken" is selected, automatically include "Approved" status
      let searchStatuses = [...statuses];
      if (
        searchStatuses.includes("Taken") &&
        !searchStatuses.includes("Approved")
      ) {
        searchStatuses.push("Approved");
        onStatusesChange(searchStatuses);
      }
      onSearch();
    }
  };

  const handleReset = () => {
    setErrors({});
    onReset();
  };

  const toggleStatus = (status: string) => {
    if (status === "All") {
      if (statuses.length === STATUS_OPTIONS.length) {
        onStatusesChange([]);
      } else {
        onStatusesChange([...STATUS_OPTIONS]);
      }
    } else {
      const newStatuses = statuses.includes(status)
        ? statuses.filter((s) => s !== status)
        : [...statuses, status];
      onStatusesChange(newStatuses);
    }
  };

  const isAllChecked = statuses.length === STATUS_OPTIONS.length;
  const isSomeChecked = statuses.length > 0 && !isAllChecked;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-5 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">
        Search{" "}
        <span className="text-xs text-slate-400 font-normal">
          (Please specify your search)
        </span>
      </h3>

      {/* Date Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            From <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={from_date}
            onChange={(e) => {
              onFromDateChange(e.target.value);
              if (errors.from_date) {
                setErrors((prev) => ({ ...prev, from_date: undefined }));
              }
            }}
            className={`w-full border ${errors.from_date ? "border-red-500" : "border-slate-300"} rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 bg-white transition`}
          />
          {errors.from_date && (
            <p className="text-xs text-red-600 mt-1">{errors.from_date}</p>
          )}
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            To <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={to_date}
            onChange={(e) => {
              onToDateChange(e.target.value);
              if (errors.to_date) {
                setErrors((prev) => ({ ...prev, to_date: undefined }));
              }
            }}
            className={`w-full border ${errors.to_date ? "border-red-500" : "border-slate-300"} rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 bg-white transition`}
          />
          {errors.to_date && (
            <p className="text-xs text-red-600 mt-1">{errors.to_date}</p>
          )}
        </div>
      </div>

      {/* Status Checkboxes */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-700 mb-2">
          Show Leave with Status <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllChecked}
              ref={(el) => {
                if (el) el.indeterminate = isSomeChecked;
              }}
              onChange={() => {
                toggleStatus("All");
                if (errors.statuses) {
                  setErrors((prev) => ({ ...prev, statuses: undefined }));
                }
              }}
              className="w-4 h-4 accent-blue-900"
            />
            All
          </label>
          {STATUS_OPTIONS.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={statuses.includes(s)}
                onChange={() => {
                  toggleStatus(s);
                  if (errors.statuses) {
                    setErrors((prev) => ({ ...prev, statuses: undefined }));
                  }
                }}
                className="w-4 h-4 accent-blue-900"
              />
              {s}
            </label>
          ))}
        </div>
        {errors.statuses && (
          <p className="text-xs text-red-600 mt-2">{errors.statuses}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={handleReset}
          className="px-5 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium cursor-pointer hover:bg-slate-700 transition"
        >
          RESET
        </button>
        <button
          onClick={handleSearch}
          className="px-6 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold cursor-pointer hover:bg-teal-700 transition"
        >
          SEARCH
        </button>
      </div>
    </div>
  );
}
