import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getHolidayMatrix,
  uploadHolidayMatrixPdf,
} from "../../../api/holiday.api";
import { Holiday, OfficeLocation } from "../../../types/holiday.types";
import { isAdminRole } from "../../../config/roles";
import { useAppSelector } from "../../../app/hooks";

interface UpcomingHolidaysProps {
  location?: string | null;
}

type FilterKey = OfficeLocation;

function toDateOnly(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function parseDate(dateStr: string): {
  day: string;
  month: string;
  year: string;
  weekday: string;
  isWeekend: boolean;
} {
  const [year, month, day] = toDateOnly(dateStr).split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en-IN", { month: "short" }),
    year: String(year),
    weekday: d.toLocaleString("en-IN", { weekday: "long" }),
    isWeekend: dow === 0 || dow === 6,
  };
}

function isHolidayForLocation(
  h: Holiday,
  loc: string | null | undefined,
): boolean {
  const upper = loc?.toUpperCase();
  if (upper === "BANGALORE") return h.is_bangalore;
  if (upper === "COIMBATORE") return h.is_coimbatore;
  if (upper === "HYDERABAD") return h.is_hyderabad;
  return h.is_bangalore || h.is_coimbatore || h.is_hyderabad;
}

function applyFilter(holidays: Holiday[], filter: FilterKey): Holiday[] {
  if (filter === "ALL") return holidays;
  if (filter === "BANGALORE") return holidays.filter((h) => h.is_bangalore);
  if (filter === "COIMBATORE") return holidays.filter((h) => h.is_coimbatore);
  if (filter === "HYDERABAD") return holidays.filter((h) => h.is_hyderabad);
  return holidays;
}

function HolidayOverlay({
  allHolidays,
  employeeLocation,
  isAdmin,
  onClose,
  onUploadSuccess,
}: {
  allHolidays: Holiday[];
  employeeLocation?: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}) {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await uploadHolidayMatrixPdf(file);
      setUploadMsg({
        type: "success",
        text: `Updated — ${res.data?.length ?? 0} holidays loaded.`,
      });
      onUploadSuccess();
    } catch (err: any) {
      setUploadMsg({
        type: "error",
        text: err.response?.data?.message || "Upload failed.",
      });
    } finally {
      setUploading(false);
    }
  };

  const filtered = applyFilter(allHolidays, filter);
  const isFiltered = filter !== "ALL";

  // Derive year label from actual data rather than hardcoding
  const years = [...new Set(allHolidays.map((h) => toDateOnly(h.holiday_date).slice(0, 4)))].sort();
  const yearLabel = years.length === 0 ? "" : years.length === 1 ? years[0] : `${years[0]}–${years[years.length - 1]}`;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Holiday Calendar"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Holiday Calendar {yearLabel}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              All company holidays across locations
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
                    uploading
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-teal-600 hover:bg-teal-700"
                  }`}
                >
                  {uploading ? (
                    <svg
                      className="animate-spin h-3.5 w-3.5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  )}
                  {uploading ? "Uploading…" : "Upload PDF"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={handleUpload}
                />
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {uploadMsg && (
          <div
            className={`mx-5 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${
              uploadMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span className="flex-1">{uploadMsg.text}</span>
            <button
              type="button"
              onClick={() => setUploadMsg(null)}
              className="opacity-60 hover:opacity-100 text-base leading-none"
            >
              ×
            </button>
          </div>
        )}

        <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-100">
          {(["ALL", "BANGALORE", "COIMBATORE", "HYDERABAD"] as const).map(
            (f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === f
                    ? f === "ALL"
                      ? "bg-slate-800 text-white"
                      : f === "BANGALORE"
                        ? "bg-blue-600 text-white"
                        : f === "COIMBATORE"
                          ? "bg-purple-600 text-white"
                          : "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ),
          )}
          <span className="ml-auto text-[11px] text-slate-400">
            {filtered.length} holiday{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <p className="text-sm">No holidays for selected location</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Holiday
                  </th>
                  <th className="text-left py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left py-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Day
                  </th>
                  {!isFiltered && (
                    <>
                      <th className="text-center py-3 px-2 text-[11px] font-semibold text-blue-400 uppercase tracking-wide">
                        BLR
                      </th>
                      <th className="text-center py-3 px-2 text-[11px] font-semibold text-purple-400 uppercase tracking-wide">
                        CBE
                      </th>
                      <th className="text-center py-3 px-2 text-[11px] font-semibold text-amber-500 uppercase tracking-wide pr-5">
                        HYD
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((h, idx) => {
                  const { day, month, year, weekday, isWeekend } = parseDate(
                    h.holiday_date,
                  );
                  const isMyHoliday = isHolidayForLocation(h, employeeLocation);
                  return (
                    <tr
                      key={h.id ?? idx}
                      className={`transition-colors hover:bg-slate-50/60 ${
                        isWeekend ? "bg-orange-50/60" : ""
                      } ${!isMyHoliday && !isFiltered ? "opacity-50" : ""}`}
                    >
                      <td className="py-3 px-5 font-medium text-slate-800">
                        {h.title}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold ${isWeekend ? "text-red-600" : "text-slate-700"}`}
                        >
                          {day} {month} {year}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isWeekend
                              ? "bg-red-100 text-red-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {weekday}
                        </span>
                      </td>
                      {!isFiltered && (
                        <>
                          <td className="py-3 px-2 text-center">
                            <LocationDot active={h.is_bangalore} color="blue" />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <LocationDot
                              active={h.is_coimbatore}
                              color="purple"
                            />
                          </td>
                          <td className="py-3 px-2 text-center pr-5">
                            <LocationDot
                              active={h.is_hyderabad}
                              color="amber"
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LocationDot({
  active,
  color,
}: {
  active: boolean;
  color: "blue" | "purple" | "amber";
}) {
  if (active) {
    const cls =
      color === "blue"
        ? "bg-blue-100 text-blue-600"
        : color === "purple"
          ? "bg-purple-100 text-purple-600"
          : "bg-amber-100 text-amber-600";
    return (
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${cls}`}
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
    </span>
  );
}

export default function UpcomingHolidays({ location }: UpcomingHolidaysProps) {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = isAdminRole(user?.role);

  const [allHolidays, setAllHolidays] = useState<Holiday[]>([]);
  const [upcoming, setUpcoming] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  // Incremented on every fetch; responses from older fetches are discarded
  const fetchGenRef = useRef(0);

  const fetchHolidays = () => {
    const gen = ++fetchGenRef.current;
    getHolidayMatrix()
      .then((data) => {
        if (gen !== fetchGenRef.current) return; // stale — a newer fetch completed
        setAllHolidays(data);
        const today = new Date();
        const todayStr = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0"),
        ].join("-");
        setUpcoming(
          data.filter((h) => toDateOnly(h.holiday_date) >= todayStr).slice(0, 6),
        );
        setError(false);
      })
      .catch(() => {
        if (gen !== fetchGenRef.current) return;
        setError(true);
      })
      .finally(() => {
        if (gen !== fetchGenRef.current) return;
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    fetchHolidays();
  }, [location]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-36 mb-4" />
        <div className="h-3 bg-slate-100 rounded w-full mb-3" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 bg-slate-50 rounded mb-1" />
        ))}
      </div>
    );
  }

  const isEmpty = !error && upcoming.length === 0;

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-[#333333]">
            Upcoming Holidays
          </h2>

          {!isEmpty && (
            <button
              type="button"
              onClick={() => setOverlayOpen(true)}
              className="flex items-center gap-0.5 text-xs text-[#007bff] hover:underline font-medium"
            >
              View All
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          {isEmpty && isAdmin && (
            <button
              type="button"
              onClick={() => setOverlayOpen(true)}
              className="flex items-center gap-1 text-xs text-teal-600 hover:underline font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload PDF
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500 px-4 pb-3">
            Unable to load holidays.
          </p>
        )}

        {isEmpty && (
          <div className="text-center py-8 px-4 text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-8 w-8 mb-2 text-slate-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium">No upcoming holidays</p>
            {isAdmin && (
              <p className="text-xs mt-1 text-slate-400">
                Upload a PDF to populate the calendar
              </p>
            )}
          </div>
        )}

        {!error && upcoming.length > 0 && (
          <div className="px-4 pb-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-[38%]">
                    Holiday
                  </th>
                  <th className="text-left py-2 pr-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-[22%]">
                    Date
                  </th>
                  <th className="text-center py-2 px-1 text-[11px] font-semibold text-blue-400 uppercase tracking-wide w-[13%]">
                    BLR
                  </th>
                  <th className="text-center py-2 px-1 text-[11px] font-semibold text-purple-400 uppercase tracking-wide w-[13%]">
                    CBE
                  </th>
                  <th className="text-center py-2 px-1 text-[11px] font-semibold text-amber-500 uppercase tracking-wide w-[14%]">
                    HYD
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {upcoming.map((h, idx) => {
                  const { day, month, weekday, isWeekend } = parseDate(
                    h.holiday_date,
                  );
                  const isMyHoliday = isHolidayForLocation(h, location);
                  return (
                    <tr
                      key={h.id ?? idx}
                      className={`transition-colors hover:bg-slate-50/60 ${isWeekend ? "bg-red-50/40" : ""} ${!isMyHoliday ? "opacity-40" : ""}`}
                    >
                      <td className="py-2.5 pr-2 font-medium text-slate-800 leading-tight">
                        {h.title}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span
                          className={`font-medium ${isWeekend ? "text-red-600" : "text-slate-700"}`}
                        >
                          {day} {month}
                        </span>
                        <span
                          className={`ml-1 text-[10px] ${isWeekend ? "text-red-400" : "text-slate-400"}`}
                        >
                          {weekday}
                        </span>
                      </td>
                      <td className="py-2.5 px-1 text-center">
                        <LocationDot active={h.is_bangalore} color="blue" />
                      </td>
                      <td className="py-2.5 px-1 text-center">
                        <LocationDot active={h.is_coimbatore} color="purple" />
                      </td>
                      <td className="py-2.5 px-1 text-center">
                        <LocationDot active={h.is_hyderabad} color="amber" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {overlayOpen && (
        <HolidayOverlay
          allHolidays={allHolidays}
          employeeLocation={location}
          isAdmin={isAdmin}
          onClose={() => setOverlayOpen(false)}
          onUploadSuccess={fetchHolidays}
        />
      )}
    </>
  );
}
