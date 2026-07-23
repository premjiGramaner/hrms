import React from "react";
import { IconChevronDown, IconPlusCircle, IconSearch, IconX } from "./Icons";
import Pagination from "./Pagination";
import { IconX } from "./Icons";
import { COLORS } from "../styles/theme";

export interface ColumnDef<RowType> {
  key: string;
  header: string;
  width?: number | string;
  render?: (
    row: RowType,
    absoluteIndex: number,
    relativeIndex: number,
  ) => React.ReactNode;
}

export interface ActionDef<RowType> {
  label: string;
  icon?: React.ReactNode;
  color?: string;
  bg?: string;
  bgHover?: string;
  borderColor?: string;
  borderColorHover?: string;
  onClick: (row: RowType) => void;
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

export interface DataTableProps<RowType> {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rows: RowType[];
  isLoading?: boolean;
  columns: ColumnDef<RowType>[];
  actions?: ActionDef<RowType>[];
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
  getKey?: (row: RowType, relativeIndex: number) => string | number;
}

const CELL_CLASSES =
  "border-y border-slate-200 bg-white px-5 py-3.5 transition-colors group-hover:bg-[#f8faff]";

export default function DataTable<RowType>({
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
  searchPlaceholder = "Search...",
  onSearchChange,
  addLabel = "Add",
  onAdd,
  extraToolbar,
  sortableColumns = {},
  getKey,
}: DataTableProps<RowType>) {
  const hasActions = actions.length > 0;
  const displayedColumns = hasActions
    ? [
        ...columns,
        { key: "__actions__", header: "Actions" } as ColumnDef<RowType>,
      ]
    : columns;

  const getRowKey = (row: RowType, relativeIndex: number) => {
    if (getKey) return getKey(row, relativeIndex);
    const recordId = (row as Record<string, unknown>).id;
    return String(recordId ?? (currentPage - 1) * pageSize + relativeIndex);
  };

  return (
    <>
      {stats?.length ? (
        <div className="mb-5 flex flex-wrap gap-3.5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-[140px] flex-1 items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-[18px] py-3.5 shadow-sm"
            >
              <span className="flex shrink-0 text-navy-700">{stat.icon}</span>
              <div>
                <div className="text-[22px] font-extrabold leading-none text-navy-700">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {onSearchChange || onAdd || extraToolbar ? (
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          {onSearchChange ? (
            <div className="relative w-[300px] max-w-full">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconSearch size={15} />
              </span>
              <input
                type="search"
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-full rounded-[10px] border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm shadow-sm outline-none focus:border-navy-700"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <IconX size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
          {extraToolbar}
          <div className="ml-auto flex items-center gap-2.5">
            {searchQuery ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                {totalRecords} result{totalRecords === 1 ? "" : "s"}
              </span>
            ) : null}
            {onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-navy-700 to-teal-600 px-[18px] py-2 text-sm font-bold text-white shadow-md hover:opacity-90"
              >
                <IconPlusCircle size={18} />
                {addLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span>{icon}</span>
            <span className="text-sm font-bold text-slate-800">{title}</span>
            <span className="rounded-full bg-navy-700 px-2 py-0.5 text-[11px] font-bold text-white">
              {totalRecords}
            </span>
          </div>
          {subtitle ? (
            <span className="text-xs text-slate-400">{subtitle}</span>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-[14px] border border-slate-200 p-2">
          <table className="w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="bg-gradient-to-br from-navy-700 to-teal-600">
                <th className="w-14 px-5 py-3 text-left text-xs font-bold text-white">
                  #
                </th>
                {displayedColumns.map((column) => {
                  const sortControl = sortableColumns[column.key];
                  return (
                    <th
                      key={column.key}
                      onClick={sortControl?.onToggle}
                      className={`whitespace-nowrap px-5 py-3 text-left text-xs font-bold text-white ${sortControl ? "cursor-pointer select-none" : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {column.header}
                        {sortControl ? (
                          <span
                            className={
                              sortControl.dir === "asc" ? "rotate-180" : ""
                            }
                          >
                            <IconChevronDown size={11} />
                          </span>
                        ) : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={displayedColumns.length + 1}
                    className="rounded-[10px] border border-slate-200 py-14 text-center"
                  >
                    <span className="inline-block h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-navy-700" />
                    <p className="mt-2 text-sm text-slate-400">Loading...</p>
                  </td>
                </tr>
              ) : null}
              {!isLoading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayedColumns.length + 1}
                    className="rounded-[10px] border border-slate-200 py-14 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">{emptyIcon}</span>
                      <span className="font-semibold text-slate-600">
                        {emptyTitle}
                      </span>
                      <span className="text-sm text-slate-400">
                        {emptySubtitle}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : null}
              {!isLoading
                ? rows.map((row, relativeIndex) => {
                    const absoluteIndex =
                      (currentPage - 1) * pageSize + relativeIndex;
                    return (
                      <tr key={getRowKey(row, relativeIndex)} className="group">
                        <td
                          className={`${CELL_CLASSES} rounded-l-[10px] border-l`}
                        >
                          <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                            {absoluteIndex + 1}
                          </span>
                        </td>
                        {columns.map((column, columnIndex) => (
                          <td
                            key={column.key}
                            className={`${CELL_CLASSES} ${!hasActions && columnIndex === columns.length - 1 ? "rounded-r-[10px] border-r" : ""}`}
                          >
                            {column.render
                              ? column.render(row, absoluteIndex, relativeIndex)
                              : String(
                                  (row as Record<string, unknown>)[
                                    column.key
                                  ] ?? "—",
                                )}
                          </td>
                        ))}
                        {hasActions ? (
                          <td
                            className={`${CELL_CLASSES} rounded-r-[10px] border-r`}
                          >
                            <div className="flex gap-1.5">
                              {actions.map((action) => (
                                <button
                                  key={action.label}
                                  type="button"
                                  title={action.title ?? action.label}
                                  onClick={() => action.onClick(row)}
                                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                >
                                  {action.icon}
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                : null}
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
