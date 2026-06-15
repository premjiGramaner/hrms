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
}: EditableProfileFieldProps) {
  const controlClass =
    "min-h-[2.75rem] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-50";

  return (
    <div className={wide ? "md:col-span-2 xl:col-span-3" : ""}>
      <p className="mb-1.5 text-xs font-semibold text-slate-600">{label}</p>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          className={`${controlClass} min-h-[5.5rem] resize-y`}
        />
      ) : options ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
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
          className={controlClass}
        />
      )}
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
