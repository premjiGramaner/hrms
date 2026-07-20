import { ChevronDown } from "lucide-react";
import { DayHalf } from "./leave";

type HalfDaySelectProps = {
  value: DayHalf;
  onChange: (value: DayHalf) => void;
};

function HalfDaySelect({ value, onChange }: HalfDaySelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as DayHalf)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white transition appearance-none pr-8 cursor-pointer"
      >
        <option value="First Half">First Half</option>
        <option value="Second Half">Second Half</option>
      </select>

      <ChevronDown
        size={16}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
      />
    </div>
  );
}

export default HalfDaySelect;
