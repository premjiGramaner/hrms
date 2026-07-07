type Props = {
  status: string;
};

export default function StatusBadge({ status }: Props) {
  const normalized = status.toLowerCase();
  const active =
    normalized.includes("created") ||
    normalized.includes("initiated") ||
    normalized.includes("active");
  return (
    <span
      className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold ${active ? "border-slate-200 bg-white text-slate-600" : "border-slate-200 bg-slate-50 text-slate-400"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
