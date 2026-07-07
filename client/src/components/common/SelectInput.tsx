import { ChevronDown } from "lucide-react";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
};

export default function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder = "-- Select --",
  required,
}: Props) {
  return (
    <label className="block text-sm font-semibold text-slate-500">
      {label ? (
        <span className="mb-2 block">
          {label}
          {required ? "*" : ""}
        </span>
      ) : null}
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-600 outline-none focus:border-navy-700"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => {
            const value = typeof option === "string" ? option : option.value;
            const label = typeof option === "string" ? option : option.label;
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </select>
        <span className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#f4f1f8] text-slate-500">
          <ChevronDown size={17} />
        </span>
      </span>
    </label>
  );
}
