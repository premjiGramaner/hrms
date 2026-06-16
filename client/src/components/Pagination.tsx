import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

function buildPageNumbers(
  activePage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  if (activePage > 3) pages.push("ellipsis");

  const start = Math.max(2, activePage - 1);
  const end   = Math.min(totalPages - 1, activePage + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  if (activePage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

function PageBtn({
  children,
  onClick,
  disabled,
  active = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 32,
        height: 32,
        padding: "0 7px",
        borderRadius: 6,
        border: active ? "1.5px solid #1b2a6b" : "1.5px solid #e2e8f0",
        background: active ? "#1b2a6b" : disabled ? "transparent" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border-color 0.15s, background 0.15s, color 0.15s",
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#94a3b8";
          (e.currentTarget as HTMLButtonElement).style.color = "#1b2a6b";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
          (e.currentTarget as HTMLButtonElement).style.color = "#374151";
        }
      }}
    >
      {children}
    </button>
  );
}

export default function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = "records",
}: PaginationProps) {
  if (totalRecords === 0) return null;

  const firstRow = (currentPage - 1) * pageSize + 1;
  const lastRow  = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderTop: "1px solid #f1f5f9",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>
          Showing{" "}
          <span style={{ fontWeight: 600, color: "#1e293b" }}>
            {firstRow}–{lastRow}
          </span>{" "}
          of{" "}
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{totalRecords}</span>{" "}
          {itemLabel}
          &nbsp;·&nbsp; Page{" "}
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{currentPage}</span>{" "}
          of{" "}
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{totalPages}</span>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>
            Per page:
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: "4px 24px 4px 8px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 6,
              fontSize: 12,
              outline: "none",
              background: "#fff",
              appearance: "none",
              cursor: "pointer",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5' viewBox='0 0 9 5'%3E%3Cpath fill='%2394a3b8' d='M0 0l4.5 5 4.5-5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 7px center",
            }}
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <PageBtn
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          ««
        </PageBtn>
        <PageBtn
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
        >
          ‹
        </PageBtn>

        {buildPageNumbers(currentPage, totalPages).map((entry, idx) =>
          entry === "ellipsis" ? (
            <span
              key={`e${idx}`}
              style={{
                minWidth: 32,
                height: 32,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                color: "#94a3b8",
                userSelect: "none",
                letterSpacing: 1,
              }}
            >
              ···
            </span>
          ) : (
            <PageBtn
              key={entry}
              onClick={() => onPageChange(entry as number)}
              disabled={false}
              active={entry === currentPage}
            >
              {entry}
            </PageBtn>
          ),
        )}

        <PageBtn
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          ›
        </PageBtn>
        <PageBtn
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          »»
        </PageBtn>
      </div>
    </div>
  );
}
