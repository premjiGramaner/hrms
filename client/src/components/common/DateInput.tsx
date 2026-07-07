import { CalendarDays } from "lucide-react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export default function DateInput({ label, value, onChange, required }: Props) {
  return (
    <label className="block text-sm font-semibold text-slate-500">
      <span className="mb-2 block">
        {label}
        {required ? "*" : ""}
      </span>
      <span className="relative block">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-600 outline-none focus:border-navy-700"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#f4f1f8] text-slate-500">
          <CalendarDays size={17} />
        </span>
      </span>
    </label>
  );
}
