import React, { useEffect, useMemo, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import { getAuditTrail } from "../../api/hradmin.api";
import useDebounce from "../../hooks/useDebounce";
import DataTable, { ColumnDef, StatCard } from "../../components/DataTable";
import { getAvatarSrc, getInitials } from "../../utils/avatar";

import {
  IconClipboardList,
  IconActivity,
  IconPlusCircle,
  IconEdit,
  IconXCircle,
} from "../../components/Icons";
import { getDisplayName } from "../employees/EmployeeListPage";
import { getMyInfo } from "../../api/employee.api";
import { Employee } from "../../types";
const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
  { label: "Role Access", path: "/hradmin/role-access" },
  { label: "Audit Trail", path: "/hradmin/audit-trail" },
];
const Adminuser: Employee | null = JSON.parse(
  localStorage.getItem("hrms_user") || "null",
);

const ACTION_COLOR: Record<string, { bg: string; color: string; dot: string }> =
  {
    CREATE: { bg: "#dcfce7", color: "#16a34a", dot: "#22c55e" },
    UPDATE: { bg: "#fef9c3", color: "#a16207", dot: "#eab308" },
    DELETE: { bg: "#fee2e2", color: "#dc2626", dot: "#ef4444" },
    TERMINATE: { bg: "#fce7f3", color: "#9d174d", dot: "#ec4899" },
  };

interface AuditRecord {
  id: number;
  employee_id?: number;
  employee_code?: string;
  action_owner: string;
  action_owner_username: string;
  action_owner_avatar?: string | null;
  employee: string;
  employee_username: string;
  section: string;
  action: string;
  source: string;
  performed_screen: string;
  action_description: string;
  notes: string;
  event_time: string;
  created_at: string;
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  minWidth = 140,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  minWidth?: number;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "9px 32px 9px 12px",
          border: "1.5px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 13,
          outline: "none",
          appearance: "none",
          background: "#fff",
          cursor: "pointer",
          minWidth,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <option value="all">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "#94a3b8",
          fontSize: 11,
        }}
      >
        ▼
      </span>
    </div>
  );
}

export default function AuditTrailPage() {
  const [allRecords, setAllRecords] = useState<AuditRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc");
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    getAuditTrail(currentPage, pageSize)
      .then((res) => {
        setAllRecords(res.data);
        setFilteredRecords(res.data);
        setTotalRecords(res.pagination.totalCount);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => setPageError("Failed to load audit trail. Please refresh."))
      .finally(() => setIsLoading(false));
  }, [currentPage, pageSize]);

  const uniqueActions = [
    ...new Set(allRecords.map((allRecord) => allRecord.action).filter(Boolean)),
  ];
  const uniqueSections = [
    ...new Set(
      allRecords.map((allRecord) => allRecord.section).filter(Boolean),
    ),
  ];

  const applyFilters = (search: string, action: string, section: string) => {
    const term = search.toLowerCase();
    setFilteredRecords(
      allRecords.filter((allRecord) => {
        const matchesSearch =
          !term ||
          allRecord.action_owner.toLowerCase().includes(term) ||
          allRecord.employee.toLowerCase().includes(term) ||
          (allRecord.action_owner_username || "")
            .toLowerCase()
            .includes(term) ||
          (allRecord.employee_username || "").toLowerCase().includes(term) ||
          allRecord.section.toLowerCase().includes(term) ||
          allRecord.action_description.toLowerCase().includes(term) ||
          (allRecord.notes || "").toLowerCase().includes(term) ||
          allRecord.performed_screen.toLowerCase().includes(term);
        return (
          matchesSearch &&
          (action === "all" || allRecord.action === action) &&
          (section === "all" || allRecord.section === section)
        );
      }),
    );
    setCurrentPage(1);
  };

  const debouncedSearch = useDebounce(
    (v: string) => applyFilters(v, actionFilter, sectionFilter),
    300,
  );
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };
  const handleAction = (value: string) => {
    setActionFilter(value);
    applyFilters(searchQuery, value, sectionFilter);
  };
  const handleSection = (value: string) => {
    setSectionFilter(value);
    applyFilters(searchQuery, actionFilter, value);
  };
  const handleClear = () => {
    setSearchQuery("");
    setActionFilter("all");
    setSectionFilter("all");
    setFilteredRecords(allRecords);
    setCurrentPage(1);
  };
  const hasFilters =
    searchQuery !== "" || actionFilter !== "all" || sectionFilter !== "all";

  const pagedRecords = useMemo(() => {
    const sorted = [...filteredRecords].sort((a, b) => {
      const diff =
        new Date(a.event_time).getTime() - new Date(b.event_time).getTime();
      return dateSort === "desc" ? -diff : diff;
    });
    return sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredRecords, currentPage, pageSize, dateSort]);

  const createCount = allRecords.filter(
    (Record) => Record.action === "CREATE",
  ).length;
  const updateCount = allRecords.filter(
    (Record) => Record.action === "UPDATE",
  ).length;
  const terminateCount = allRecords.filter(
    (Record) => Record.action === "TERMINATE",
  ).length;

  const stats: StatCard[] = [
    {
      label: "Total Events",
      value: allRecords.length,
      icon: (<IconActivity size={20} />) as any,
      color: "#1b2a6b",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Created",
      value: createCount,
      icon: <IconPlusCircle size={20} />,
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    {
      label: "Updated",
      value: updateCount,
      icon: <IconEdit size={20} />,
      color: "#a16207",
      bg: "#fefce8",
      border: "#fde68a",
    },
    {
      label: "Terminated",
      value: terminateCount,
      icon: <IconXCircle size={20} />,
      color: "#9d174d",
      bg: "#fdf2f8",
      border: "#fbcfe8",
    },
  ];

  const columns: ColumnDef<AuditRecord>[] = [
    {
      key: "event_time",
      header: "Date",
      render: (row) => (
        <span
          style={{ color: "#475569", fontSize: 12.5, whiteSpace: "nowrap" }}
        >
          {formatDateTime(row.event_time)}
        </span>
      ),
    },
    {
      key: "action_owner",
      header: "Action Owner",
      render: (row) => {
        const avatarSrc = getAvatarSrc(row.action_owner_avatar);

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                flexShrink: 0,
                overflow: "hidden",
                background: "linear-gradient(135deg,#1b2a6b,#16a085)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(27,42,107,0.2)",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={row.action_owner || "Action owner"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                getInitials(row.action_owner)
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                {row.action_owner || "—"}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>
                {row.action_owner_username || ""}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      width: 110,
      render: (row) => {
        const s = ACTION_COLOR[row.action] ?? {
          bg: "#f1f5f9",
          color: "#64748b",
          dot: "#94a3b8",
        };
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: s.bg,
              color: s.color,
              border: `1px solid ${s.bg}`,
              letterSpacing: 0.3,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: s.dot,
                flexShrink: 0,
              }}
            />
            {row.action}
          </span>
        );
      },
    },
    {
      key: "employee",
      header: "Employee",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
            {row.employee || "—"}
          </div>
          {row.employee_username && (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
              @{row.employee_username}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "employee_code",
      header: "Employee ID",
      width: 120,
      render: (row) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 6,
            background: "#f0f9ff",
            color: "#0369a1",
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid #bae6fd",
          }}
        >
          {row.employee_code || "—"}
        </span>
      ),
    },
    {
      key: "section",
      header: "Section",
      width: 120,
      render: (row) => (
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 6,
            background: "#f1f5f9",
            color: "#475569",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {row.section || "—"}
        </span>
      ),
    },
    {
      key: "performed_screen",
      header: "Performed Screen",
      render: (row) => (
        <span style={{ color: "#64748b", fontSize: 12.5 }}>
          {row.performed_screen || "—"}
        </span>
      ),
    },
    {
      key: "action_description",
      header: "Action Description",
      render: (row) => (
        <span
          style={{
            color: "#64748b",
            fontSize: 12.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
            maxWidth: 260,
          }}
        >
          {row.action_description || "—"}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => (
        <span
          style={{
            color: "#64748b",
            fontSize: 12.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
            maxWidth: 240,
          }}
        >
          {row.notes || "—"}
        </span>
      ),
    },
  ];

  const extraToolbar = (
    <>
      <FilterSelect
        value={actionFilter}
        onChange={handleAction}
        options={uniqueActions}
        placeholder="All Actions"
        minWidth={140}
      />
      <FilterSelect
        value={sectionFilter}
        onChange={handleSection}
        options={uniqueSections}
        placeholder="All Sections"
        minWidth={150}
      />
      {hasFilters && (
        <button
          onClick={handleClear}
          style={{
            padding: "9px 14px",
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            fontSize: 13,
            background: "#fff",
            cursor: "pointer",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: 5,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          ✕ Clear
        </button>
      )}
    </>
  );

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Audit Trail">
      {pageError && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 18px",
            background: "linear-gradient(135deg,#fff5f5,#fff)",
            border: "1px solid #fecaca",
            borderLeft: "4px solid #ef4444",
            borderRadius: 12,
            color: "#dc2626",
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(239,68,68,0.08)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            {pageError}
          </span>
          <button
            onClick={() => setPageError("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#dc2626",
              fontSize: 18,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <DataTable<AuditRecord>
        title="Audit Trail"
        subtitle="Full history of all user & employee actions"
        icon={(<IconClipboardList size={18} />) as any}
        rows={pagedRecords}
        isLoading={isLoading}
        columns={columns}
        actions={[]}
        getKey={(row, idx) => `${row.id}-${idx}`}
        emptyIcon={(<IconClipboardList size={36} />) as any}
        emptyTitle={
          hasFilters
            ? "No records match the current filters"
            : "No audit trail records found"
        }
        emptySubtitle={
          hasFilters
            ? "Try adjusting or clearing the filters"
            : "Actions will appear here once users make changes"
        }
        stats={stats}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={filteredRecords.length}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
        itemLabel="records"
        searchQuery={searchQuery}
        searchPlaceholder="Search by owner, employee, action…"
        onSearchChange={handleSearch}
        extraToolbar={extraToolbar}
        sortableColumns={{
          event_time: {
            dir: dateSort,
            onToggle: () => {
              setDateSort((p) => (p === "desc" ? "asc" : "desc"));
              setCurrentPage(1);
            },
          },
        }}
      />
    </Layout>
  );
}
