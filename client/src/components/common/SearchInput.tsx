import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className = "",
}: Props) {
  return (
    <div className={`relative ${className}`}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-700 outline-none focus:border-navy-700"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <X size={15} />
        </button>
      ) : null}
      <span className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Search size={16} />
      </span>
    </div>
  );
}
