import React from "react";
import Pagination from "./Pagination";

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
  icon: string;
  color: string;
  bg: string;
  border: string;
}

export interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  icon?: string;

  rows: T[];
  isLoading?: boolean;

  columns: ColumnDef<T>[];

  actions?: ActionDef<T>[];

  emptyIcon?: string;
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

const tdBase: React.CSSProperties = {
  background: "#fff",
  borderTop: "1px solid #e2e8f0",
  borderBottom: "1px solid #e2e8f0",
  padding: "14px 20px",
  transition: "background 0.15s",
};

const tdFirst: React.CSSProperties = {
  ...tdBase,
  borderLeft: "1px solid #e2e8f0",
  borderRadius: "10px 0 0 10px",
};

const tdLast: React.CSSProperties = {
  ...tdBase,
  borderRight: "1px solid #e2e8f0",
  borderRadius: "0 10px 10px 0",
};

export default function DataTable<T>({
  title,
  subtitle,
  icon = "",
  rows,
  isLoading = false,
  columns,
  actions = [],
  emptyIcon = "📭",
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

  const hoverRow = (e: React.MouseEvent<HTMLTableRowElement>, bg: string) => {
    Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach((td) => {
      (td as HTMLElement).style.background = bg;
    });
  };

  return (
    <>
      {stats && stats.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 14,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: "1 1 140px",
                background: stat.bg,
                border: `1.5px solid ${stat.border}`,
                borderRadius: 14,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 22 }}>{stat.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: stat.color,
                    lineHeight: 1.1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#64748b",
                    fontWeight: 500,
                    marginTop: 2,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(onSearchChange || onAdd || extraToolbar) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {onSearchChange && (
            <div style={{ position: "relative", width: 300 }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
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
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 32px 9px 36px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 13.5,
                  outline: "none",
                  background: "#fff",
                  boxSizing: "border-box",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1b2a6b")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    fontSize: 14,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {extraToolbar}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginLeft: "auto",
            }}
          >
            {searchQuery && (
              <span
                style={{
                  fontSize: 12.5,
                  color: "#64748b",
                  background: "#f1f5f9",
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontWeight: 500,
                }}
              >
                {totalRecords} result{totalRecords !== 1 ? "s" : ""}
              </span>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  background: "linear-gradient(135deg,#1b2a6b,#16a085)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(27,42,107,0.25)",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                {addLabel}
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          overflow: "hidden",
          border: "1px solid #f1f5f9",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            background: "linear-gradient(70deg,#f0fdf4,#f0fdf1)",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
              {title}
            </span>
            <span
              style={{
                background: "#1b2a6b",
                color: "#fff",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                padding: "1px 8px",
                marginLeft: 2,
              }}
            >
              {totalRecords}
            </span>
          </div>
          {subtitle && (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{subtitle}</span>
          )}
        </div>

        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            background: "#fff",
            padding: 8,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 8px",
              fontSize: 13.5,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "linear-gradient(135deg,#1b2a6b 0%,#16a085 100%)",
                }}
              >
                <th
                  style={{
                    padding: "13px 20px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    whiteSpace: "nowrap",
                    width: 56,
                  }}
                >
                  #
                </th>

                {allColumns.map((col) => {
                  const sortable = sortableColumns[col.key];
                  return (
                    <th
                      key={col.key}
                      onClick={sortable ? sortable.onToggle : undefined}
                      style={{
                        padding: "13px 20px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#fff",
                        textTransform: "uppercase",
                        letterSpacing: "0.6px",
                        whiteSpace: "nowrap",
                        width: col.width,
                        cursor: sortable ? "pointer" : undefined,
                        userSelect: sortable ? "none" : undefined,
                      }}
                    >
                      {sortable ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {col.header}
                          <span
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              gap: 1,
                              lineHeight: 1,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 8,
                                color:
                                  sortable.dir === "asc"
                                    ? "#fff"
                                    : "rgba(255,255,255,0.4)",
                                lineHeight: 1,
                              }}
                            >
                              ▲
                            </span>
                            <span
                              style={{
                                fontSize: 8,
                                color:
                                  sortable.dir === "desc"
                                    ? "#fff"
                                    : "rgba(255,255,255,0.4)",
                                lineHeight: 1,
                              }}
                            >
                              ▼
                            </span>
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
              {isLoading && (
                <tr>
                  <td
                    colSpan={allColumns.length + 1}
                    style={{
                      ...tdFirst,
                      ...tdLast,
                      borderRight: "1px solid #e2e8f0",
                      borderRadius: 10,
                      textAlign: "center",
                      padding: 56,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: "3px solid #e2e8f0",
                          borderTopColor: "#1b2a6b",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>
                        Loading…
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={allColumns.length + 1}
                    style={{
                      ...tdFirst,
                      ...tdLast,
                      borderRight: "1px solid #e2e8f0",
                      borderRadius: 10,
                      textAlign: "center",
                      padding: 60,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 36 }}>{emptyIcon}</span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#475569",
                        }}
                      >
                        {emptyTitle}
                      </span>
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>
                        {emptySubtitle}
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                rows.map((row, relIdx) => {
                  const absIdx = (currentPage - 1) * pageSize + relIdx;
                  return (
                    <tr
                      key={rowKey(row, relIdx)}
                      style={{
                        background: "#fff",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => hoverRow(e, "#f8faff")}
                      onMouseLeave={(e) => hoverRow(e, "#fff")}
                    >
                      <td style={tdFirst}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 26,
                            height: 26,
                            background: "#f1f5f9",
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "#64748b",
                          }}
                        >
                          {absIdx + 1}
                        </span>
                      </td>

                      {columns.map((col, cIdx) => {
                        const isLastDataCol =
                          !hasActions && cIdx === columns.length - 1;
                        return (
                          <td
                            key={col.key}
                            style={isLastDataCol ? tdLast : tdBase}
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

                      {hasActions && (
                        <td style={tdLast}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {actions.map((action) => (
                              <button
                                key={action.label}
                                title={action.title ?? action.label}
                                onClick={() => action.onClick(row)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: action.bg ?? "#f1f5f9",
                                  border: `1px solid ${action.borderColor ?? "#e2e8f0"}`,
                                  cursor: "pointer",
                                  color: action.color ?? "#374151",
                                  fontSize: 12.5,
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  fontWeight: 600,
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => {
                                  if (action.bgHover)
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.background = action.bgHover;
                                  if (action.borderColorHover)
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.borderColor =
                                      action.borderColorHover;
                                }}
                                onMouseLeave={(e) => {
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = action.bg ?? "#f1f5f9";
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.borderColor =
                                    action.borderColor ?? "#e2e8f0";
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
