import { useState } from "react";
import { ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import Card from "../common/Card";
import { MigrationSheetPreview } from "../../api/migration.api";

const displayValue = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function SheetPreviewSection({
  sheets,
}: {
  sheets: MigrationSheetPreview[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <Card className="border border-slate-200 p-5">
      <div className="mb-4">
        <h2 className="font-bold text-slate-800">Workbook Preview</h2>
        <p className="mt-1 text-xs text-slate-500">
          Every worksheet is listed; previews show the first 10 records.
        </p>
      </div>
      <div className="space-y-3">
        {sheets.map((sheet) => {
          const open = Boolean(expanded[sheet.name]);
          return (
            <div
              key={sheet.name}
              className="overflow-hidden rounded-xl border border-slate-200"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded((current) => ({
                    ...current,
                    [sheet.name]: !open,
                  }))
                }
                className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
              >
                <span className="rounded-lg bg-white p-2 text-teal-600 shadow-sm">
                  <FileSpreadsheet size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-800">
                    {sheet.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {sheet.recordCount} records · {sheet.totalColumns} columns
                  </span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    sheet.status === "VALID"
                      ? "bg-emerald-100 text-emerald-700"
                      : sheet.status === "SKIPPED"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {sheet.status}
                </span>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {open ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-y border-slate-200 bg-white text-slate-500">
                      <tr>
                        {sheet.headers.map((header) => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-4 py-3 font-semibold"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.preview.map((row, index) => (
                        <tr
                          key={index}
                          className="border-b border-slate-100 text-slate-600"
                        >
                          {sheet.headers.map((header) => (
                            <td
                              key={header}
                              className="max-w-[260px] truncate px-4 py-3"
                            >
                              {displayValue(row[header])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!sheet.preview.length ? (
                    <p className="p-5 text-center text-sm text-slate-400">
                      No data rows
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
