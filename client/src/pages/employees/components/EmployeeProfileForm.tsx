import { ChangeEvent, ReactNode } from "react";
import { EditableEmployeeProfileForm } from "../../../types/employeeProfile";

type ProfileFieldChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

interface EditableProfileFieldProps {
  label: string;
  name: keyof EditableEmployeeProfileForm;
  value: string;
  onChange: (event: ProfileFieldChangeEvent) => void;
  type?: string;
  options?: readonly string[];
  wide?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  required?: boolean;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
}

interface ProfileDetailPanelProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function EditableProfileField({
  label,
  name,
  value,
  onChange,
  type = "text",
  options,
  wide = false,
  disabled = false,
  readOnly = false,
  error,
  required = false,
  pattern,
  maxLength,
  minLength,
}: EditableProfileFieldProps) {
  const displayValue = value || "Not Assigned";
  const controlClass = `min-h-[2.75rem] w-full rounded-lg border ${error ? "border-red-300" : "border-slate-200"} ${disabled || readOnly ? "bg-slate-50 cursor-not-allowed text-slate-500" : "bg-white"} px-3 py-2.5 text-sm font-medium ${disabled || readOnly ? "text-slate-500" : "text-slate-700"} outline-none transition ${disabled || readOnly ? "" : "focus:border-blue-300 focus:ring-2 focus:ring-blue-50"}`;

  if (readOnly) {
    return (
      <div className={wide ? "md:col-span-2 xl:col-span-3" : ""}>
        <p className="mb-1.5 text-xs font-semibold text-slate-600">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </p>
        <div className={`${controlClass} flex items-center`}>
          {displayValue}
        </div>
      </div>
    );
  }

  return (
    <div className={wide ? "md:col-span-2 xl:col-span-3" : ""}>
      <p className="mb-1.5 text-xs font-semibold text-slate-600">
        {label}
        {required && !disabled && <span className="text-red-500 ml-1">*</span>}
      </p>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${controlClass} min-h-[5.5rem] resize-y`}
        />
      ) : options && options.length > 0 ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={controlClass}
        >
          <option value="">-- Select --</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          pattern={pattern}
          maxLength={maxLength}
          minLength={minLength}
          className={controlClass}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ProfileDetailPanel({
  title,
  children,
  footer,
}: ProfileDetailPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="inline-block border-b-2 border-blue-900 pb-3 text-sm font-semibold text-blue-900">
          {title}
        </h2>
      </div>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-4">
        {children}
      </div>
      {footer && (
        <div className="mt-6 border-t border-slate-200 pt-5">{footer}</div>
      )}
    </div>
  );
}
