import React from "react";
import { IconChevronDown } from "./Icons";

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
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_unusedValue, pageIndex) => pageIndex + 1,
    );
  }

  const pages: (number | "ellipsis")[] = [1];
  if (activePage > 3) pages.push("ellipsis");
  const firstAdjacentPage = Math.max(2, activePage - 1);
  const lastAdjacentPage = Math.min(totalPages - 1, activePage + 1);
  for (
    let pageNumber = firstAdjacentPage;
    pageNumber <= lastAdjacentPage;
    pageNumber += 1
  ) {
    pages.push(pageNumber);
  }
  if (activePage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

function PageButton({
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
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition ${
        active
          ? "border-navy-700 bg-navy-700 font-bold text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-navy-700 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-300"
      }`}
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
  const firstVisibleRow = (currentPage - 1) * pageSize + 1;
  const lastVisibleRow = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 px-5 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="whitespace-nowrap text-sm text-slate-500">
          Showing{" "}
          <strong className="text-slate-800">
            {firstVisibleRow}–{lastVisibleRow}
          </strong>{" "}
          of <strong className="text-slate-800">{totalRecords}</strong>{" "}
          {itemLabel} · Page{" "}
          <strong className="text-slate-800">{currentPage}</strong> of{" "}
          <strong className="text-slate-800">{totalPages}</strong>
        </span>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Per page:
          <span className="relative">
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="appearance-none rounded-md border border-slate-200 bg-white py-1 pl-2 pr-7 text-xs text-slate-700 outline-none focus:border-navy-700"
            >
              {pageSizeOptions.map((pageSizeOption) => (
                <option key={pageSizeOption} value={pageSizeOption}>
                  {pageSizeOption}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <IconChevronDown size={11} />
            </span>
          </span>
        </label>
      </div>
      <div className="flex items-center gap-0.5">
        <PageButton
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          «
        </PageButton>
        <PageButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
        >
          ‹
        </PageButton>
        {buildPageNumbers(currentPage, totalPages).map(
          (pageEntry, pageEntryIndex) =>
            pageEntry === "ellipsis" ? (
              <span
                key={`ellipsis-${pageEntryIndex}`}
                className="inline-flex h-8 min-w-8 items-center justify-center text-slate-400"
              >
                ...
              </span>
            ) : (
              <PageButton
                key={pageEntry}
                onClick={() => onPageChange(pageEntry)}
                disabled={false}
                active={pageEntry === currentPage}
              >
                {pageEntry}
              </PageButton>
            ),
        )}
        <PageButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          ›
        </PageButton>
        <PageButton
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          »
        </PageButton>
      </div>
    </div>
  );
}
