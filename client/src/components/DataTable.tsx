import React from "react";
import Pagination from "./Pagination";
import { IconX } from "./Icons";
import { COLORS } from "../styles/theme";

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: number | string;

  render?: (row: T, absIndex: number, relIndex: number) => React.ReactNode;
}

export interface ActionDef<T> {
  label: string;
  icon?: React.ReactNode;
  color?: string;
  bg?: string;
  bgHover?: string;
  borderColor?: string;
  borderColorHover?: string;
  onClick: (row: T) => void;
  title?: string;
}

export interface StatCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

export interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;

  rows: T[];
  isLoading?: boolean;

  columns: ColumnDef<T>[];

  actions?: ActionDef<T>[];

  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;

  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;

  stats?: StatCard[];

  searchQuery?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  addLabel?: string;
  onAdd?: () => void;
  extraToolbar?: React.ReactNode;

  sortableColumns?: Record<
    string,
    { dir: "asc" | "desc"; onToggle: () => void }
  >;

  getKey?: (row: T, relIndex: number) => string | number;
}

export default function DataTable<T>({
  title,
  subtitle,
  icon = null,
  rows,
  isLoading = false,
  columns,
  actions = [],
  emptyIcon = null,
  emptyTitle = "No records found",
  emptySubtitle = "Add a new record to get started",
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = "records",
  stats,
  searchQuery = "",
  searchPlaceholder = "Search…",
  onSearchChange,
  addLabel = "Add",
  onAdd,
  extraToolbar,
  sortableColumns = {},
  getKey,
}: DataTableProps<T>) {
  const hasActions = actions.length > 0;
  const allColumns = hasActions
    ? [
        ...columns,
        { key: "__actions__", header: "Actions", width: 160 } as ColumnDef<T>,
      ]
    : columns;

  const rowKey = (row: T, relIdx: number) =>
    getKey
      ? getKey(row, relIdx)
      : String((row as Record<string, unknown>).id ?? Math.random());

  return (
    <>
      {/* Stats Cards */}
      {stats && stats.length > 0 && (
        <div className="flex gap-3.5 mb-5 flex-wrap">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex-1 min-w-[140px] rounded-[14px] p-3.5 px-[18px] flex items-center gap-3"
              style={{
                background: stat.bg,
                border: `1.5px solid ${stat.border}`,
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ color: stat.color }}
              >
                <span className="flex">{stat.icon}</span>
              </div>
              <div>
                <div
                  className="text-[22px] font-extrabold leading-tight"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
                <div className="text-[11.5px] text-slate-500 font-medium mt-0.5">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search/Toolbar Section */}
      {(onSearchChange || onAdd || extraToolbar) && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
          {onSearchChange && (
            <div className="relative w-[300px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-full py-2.5 pr-8 pl-9 border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-colors focus:border-[#1b2a6b]"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 p-0 leading-none hover:text-slate-600"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>
          )}

          {extraToolbar}

          <div className="flex items-center gap-2.5 ml-auto">
            {searchQuery && (
              <span className="text-[12.5px] text-slate-500 bg-slate-100 py-1 px-2.5 rounded-full font-medium">
                {totalRecords} result{totalRecords !== 1 ? "s" : ""}
              </span>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                className="flex items-center gap-1.5 py-2.5 px-[18px] bg-gradient-to-br from-[#1b2a6b] to-[#16a085] text-white border-none rounded-[10px] text-[13.5px] font-bold cursor-pointer shadow-[0_2px_10px_rgba(27,42,107,0.25)] hover:shadow-[0_4px_14px_rgba(27,42,107,0.35)] transition-shadow"
              >
                <span className="text-lg leading-none">+</span>
                {addLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="py-3.5 px-5 bg-gradient-to-r from-green-50 to-green-50/60 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <span className="text-sm font-bold text-slate-800">{title}</span>
            <span className="bg-[#1b2a6b] text-white rounded-full text-[11px] font-bold py-0.5 px-2 ml-0.5">
              {totalRecords}
            </span>
          </div>
          {subtitle && (
            <span className="text-xs text-slate-400">{subtitle}</span>
          )}
        </div>

        {/* Table Wrapper */}
        <div className="overflow-x-auto border border-slate-200 rounded-[14px] bg-white p-2">
          <table
            className="w-full text-[13.5px]"
            style={{ borderCollapse: "separate", borderSpacing: "0 8px" }}
          > 
            <thead>
              <tr className="bg-gradient-to-br from-[#1b2a6b] to-[#16a085]">
                <th className="py-3 px-5 text-left text-xs font-bold text-white tracking-wider whitespace-nowrap w-14">
                  #
                </th>

                {allColumns.map((col) => {
                  const sortable = sortableColumns[col.key];
                  return (
                    <th
                      key={col.key}
                      onClick={sortable ? sortable.onToggle : undefined}
                      className="py-3 px-5 text-left text-xs font-bold text-white tracking-wider whitespace-nowrap"
                      style={{
                        width: col.width,
                        cursor: sortable ? "pointer" : undefined,
                        userSelect: sortable ? "none" : undefined,
                      }}
                    >
                      {sortable ? (
                        <span className="inline-flex items-center gap-1">
                          {col.header}
                          <span className="inline-flex flex-col gap-0.5 leading-none">
                            <svg
                              className="w-2 h-2"
                              viewBox="0 0 12 12"
                              fill={
                                sortable.dir === "asc"
                                  ? "#fff"
                                  : "rgba(255,255,255,0.4)"
                              }
                            >
                              <path d="M6 2 L10 8 L2 8 Z" />
                            </svg>
                            <svg
                              className="w-2 h-2"
                              viewBox="0 0 12 12"
                              fill={
                                sortable.dir === "desc"
                                  ? "#fff"
                                  : "rgba(255,255,255,0.4)"
                              }
                            >
                              <path d="M6 10 L10 4 L2 4 Z" />
                            </svg>
                          </span>
                        </span>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Loading State */}
              {isLoading && (
                <tr>
                  <td
                    colSpan={allColumns.length + 1}
                    className="py-14 px-5 text-center bg-white border-l border-r border-slate-200 rounded-[10px]"
                  >
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full border-[3px] border-slate-200 border-t-[#1b2a6b] animate-spin" />
                      <span className="text-[13px] text-slate-400">
                        Loading…
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty State */}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={allColumns.length + 1}
                    className="py-[60px] px-5 text-center bg-white border-l border-r border-slate-200 rounded-[10px]"
                  >
                    <div className="flex flex-col items-center gap-2.5">
                      <span className="text-4xl">{emptyIcon}</span>
                      <span className="text-sm font-semibold text-slate-600">
                        {emptyTitle}
                      </span>
                      <span className="text-[13px] text-slate-400">
                        {emptySubtitle}
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!isLoading &&
                rows.map((row, relIdx) => {
                  const absIdx = (currentPage - 1) * pageSize + relIdx;
                  return (
                    <tr
                      key={rowKey(row, relIdx)}
                      className="group bg-white transition-colors"
                    >
                      {/* Row Number */}
                      <td className="py-3 px-5 border-l border-t border-b border-slate-200 rounded-l-[10px] group-hover:bg-[#f8faff]">
                        <span className="inline-flex items-center justify-center w-[26px] h-[26px] bg-slate-100 rounded-lg text-[11.5px] font-bold text-slate-500">
                          {absIdx + 1}
                        </span>
                      </td>

                      {/* Data Columns */}
                      {columns.map((col, cIdx) => {
                        const isLastDataCol =
                          !hasActions && cIdx === columns.length - 1;
                        return (
                          <td
                            key={col.key}
                            className={`py-3 px-5 border-t border-b border-slate-200 whitespace-nowrap group-hover:bg-[#f8faff] ${
                              isLastDataCol ? "border-r rounded-r-[10px]" : ""
                            }`}
                          >
                            {col.render
                              ? col.render(row, absIdx, relIdx)
                              : String(
                                  (row as Record<string, unknown>)[col.key] ??
                                    "—",
                                )}
                          </td>
                        );
                      })}

                      {/* Actions Column */}
                      {hasActions && (
                        <td className="py-3 px-5 border-r border-t border-b border-slate-200 whitespace-nowrap rounded-r-[10px] group-hover:bg-[#f8faff]">
                          <div className="flex gap-1.5">
                            {actions.map((action) => (
                              <button
                                key={action.label}
                                title={action.title ?? action.label}
                                onClick={() => action.onClick(row)}
                                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[12.5px] font-semibold border transition-all"
                                style={{
                                  background: action.bg ?? COLORS.slate[100],
                                  borderColor:
                                    action.borderColor ?? COLORS.slate[200],
                                  color: action.color ?? COLORS.slate[700],
                                }}
                                onMouseEnter={(event) => {
                                  if (action.bgHover)
                                    (
                                      event.currentTarget as HTMLButtonElement
                                    ).style.background = action.bgHover;
                                  if (action.borderColorHover)
                                    (
                                      event.currentTarget as HTMLButtonElement
                                    ).style.borderColor =
                                      action.borderColorHover;
                                }}
                                onMouseLeave={(event) => {
                                  (
                                    event.currentTarget as HTMLButtonElement
                                  ).style.background =
                                    action.bg ?? COLORS.slate[100];
                                  (
                                    event.currentTarget as HTMLButtonElement
                                  ).style.borderColor =
                                    action.borderColor ?? COLORS.slate[200];
                                }}
                              >
                                {action.icon}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={itemLabel}
        />
      </div>
    </>
  );
}
