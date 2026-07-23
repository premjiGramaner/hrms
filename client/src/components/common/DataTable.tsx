import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableProps } from "../../types/table.types";
import EmptyState from "./EmptyState";
import SkeletonTable from "./SkeletonTable";

type SortDirection = "asc" | "desc";

// Regular expression patterns for data normalization
const REGEX_PATTERNS = {
  ISO_DATE_FORMAT: /^\d{4}-\d{2}-\d{2}/,
} as const;

export default function DataTable<T>({
  columns,
  data,
  loading,
  selectable,
  selectedIds = [],
  getRowId,
  onSelectRow,
  onSelectAll,
  onRowClick,
  actions,
  emptyMessage = "Sorry, No Data Found!",
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{
    key: string;
    direction: SortDirection;
  } | null>(null);
  const allSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(getRowId(row)));
  const sortedData = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((first, second) =>
      compareValues(
        valueFor(first, sort.key),
        valueFor(second, sort.key),
        sort.direction,
      ),
    );
  }, [data, sort]);

  const changeSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" };
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  };

  if (loading) return <SkeletonTable />;

  return (
    <div className="overflow-x-auto rounded-[8px] bg-white">
      <table className="min-w-full border-collapse text-left text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-200">
            {selectable ? (
              <th className="w-11 px-4 py-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="h-4 w-4 rounded border-slate-300 accent-navy-700"
                />
              </th>
            ) : null}
            {columns.map((column) => {
              const key = String(column.key);
              const isActiveSort = sort?.key === key;
              return (
                <th
                  key={key}
                  className="px-4 py-4 text-xs font-bold text-slate-500"
                >
                  <button
                    type="button"
                    disabled={!column.sortable}
                    onClick={() => changeSort(key)}
                    className={`inline-flex items-center gap-2 text-left ${column.sortable ? "cursor-pointer hover:text-navy-700" : "cursor-default"}`}
                    aria-sort={
                      isActiveSort
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <span>{column.header}</span>
                    {column.sortable ? (
                      <ArrowDownUp
                        size={14}
                        className={`${isActiveSort ? "text-navy-700" : "text-slate-400"} ${isActiveSort && sort.direction === "desc" ? "rotate-180" : ""}`}
                      />
                    ) : null}
                  </button>
                </th>
              );
            })}
            {actions ? (
              <th className="w-32 px-4 py-4 text-right text-xs font-bold text-slate-500">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={
                  columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)
                }
              >
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            sortedData.map((row) => {
              const id = getRowId(row);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-100 hover:bg-[#fbf9ff] ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {selectable ? (
                    <td
                      className="px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => onSelectRow?.(id)}
                        className="h-4 w-4 rounded border-slate-300 accent-navy-700"
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="px-4 py-3 align-middle"
                    >
                      {column.render
                        ? column.render(row)
                        : String(
                            (row as Record<string, unknown>)[
                              String(column.key)
                            ] ?? "",
                          )}
                    </td>
                  ))}
                  {actions ? (
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {actions(row)}
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function valueFor<T>(row: T, key: string) {
  return (row as Record<string, unknown>)[key];
}

function compareValues(
  first: unknown,
  second: unknown,
  direction: SortDirection,
) {
  const modifier = direction === "asc" ? 1 : -1;
  const firstValue = normalize(first);
  const secondValue = normalize(second);

  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return (firstValue - secondValue) * modifier;
  }

  return (
    String(firstValue).localeCompare(String(secondValue), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * modifier
  );
}

function normalize(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();

  const text = String(value).trim();
  const dateValue = Date.parse(text);
  if (REGEX_PATTERNS.ISO_DATE_FORMAT.test(text) && Number.isFinite(dateValue))
    return dateValue;

  const numberValue = Number(text);
  if (text !== "" && Number.isFinite(numberValue)) return numberValue;

  return text;
}
