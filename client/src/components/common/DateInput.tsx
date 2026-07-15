import { CalendarDays } from "lucide-react";
import { useRef } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export default function DateInput({ label, value, onChange, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <label className="block text-sm font-semibold text-slate-500">
      <span className="mb-2 block">
        {label}
        {required ? "*" : ""}
      </span>
      <span className="relative block">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-600 outline-none focus:border-navy-700 [&::-webkit-calendar-picker-indicator]:hidden"
          style={{
            colorScheme: "light",
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.showPicker?.()}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#f4f1f8] text-slate-500 hover:bg-[#e8e3f0] transition-colors"
        >
          <CalendarDays size={17} />
        </button>
      </span>
    </label>
  );
}
