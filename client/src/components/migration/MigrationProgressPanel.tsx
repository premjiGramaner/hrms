import { CheckCircle2, Clock3, Database, Loader2, XCircle } from "lucide-react";
import Card from "../common/Card";
import { MigrationStatus } from "../../api/migration.api";

const duration = (seconds: number | null) => {
  if (seconds === null) return "Calculating…";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

export default function MigrationProgressPanel({
  status,
}: {
  status: MigrationStatus;
}) {
  const active = status.status === "RUNNING" || status.status === "QUEUED";

  return (
    <Card className="overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-800">
            {active ? (
              <Loader2 className="animate-spin text-teal-600" size={18} />
            ) : (
              <Database className="text-teal-600" size={18} />
            )}
            Migration Progress
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Live status refreshes every second
          </p>
        </div>
        <span className="text-2xl font-black text-blue-950">
          {status.percentage}%
        </span>
      </div>
      <div className="p-5">
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-950 to-teal-500 transition-all duration-500"
            style={{ width: `${status.percentage}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <span>
            Current:{" "}
            <strong className="text-slate-700">
              {status.current_sheet || "Waiting"}
              {status.current_row ? ` · row ${status.current_row}` : ""}
            </strong>
          </span>
          <span className="flex items-center gap-1">
            <Clock3 size={13} /> Remaining:{" "}
            {duration(status.estimated_remaining_seconds)}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            ["Processed", status.processed_records, "text-blue-700"],
            ["Remaining", status.remaining_records, "text-slate-700"],
            ["Inserted", status.inserted_records, "text-emerald-700"],
            ["Updated", status.updated_records, "text-cyan-700"],
            ["Skipped", status.skipped_records, "text-amber-700"],
            ["Failed", status.failed_records, "text-rose-700"],
          ].map(([label, value, color]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center"
            >
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-[11px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        {!active &&
        (status.status === "COMPLETED" ||
          status.status === "COMPLETED_WITH_ERRORS") ? (
          <div
            className={`mt-5 flex items-center gap-3 rounded-xl p-4 ${status.status === "COMPLETED" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
          >
            {status.status === "COMPLETED" ? (
              <CheckCircle2 size={22} />
            ) : (
              <XCircle size={22} />
            )}
            <div>
              <p className="font-bold">
                {status.status === "COMPLETED"
                  ? "Migration completed successfully"
                  : "Migration completed with exceptions"}
              </p>
              <p className="text-xs">
                Execution time: {duration(status.execution_time_seconds)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
