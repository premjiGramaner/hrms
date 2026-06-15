import React, { useEffect, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import { getAuditTrail } from "../../api/hradmin.api";
import useDebounce from "../../hooks/useDebounce";

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
  { label: "Audit Trail", path: "/hradmin/audit-trail" },
  { label: "Organization", path: "#" },
  { label: "More", path: "#" },
];

const TABLE_COLUMNS = [
  "Date & Time",
  "Action Owner",
  "Action",
  "Employee",
  "Section",
  "Source",
  "Performed Screen",
  "Action Description",
];

const ACTION_COLOR: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: "#dcfce7", color: "#16a34a" },
  UPDATE: { bg: "#fef9c3", color: "#a16207" },
  DELETE: { bg: "#fee2e2", color: "#dc2626" },
};


interface AuditRecord {
  id: number;
  action_owner: string;
  action_owner_username: string;
  employee: string;
  employee_username: string;
  section: string;
  action: string;
  source: string;
  performed_screen: string;
  action_description: string;
  event_time: string;
  created_at: string;
  updated_at: string;
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


export default function AuditTrailPage() {
  const [allRecords, setAllRecords]     = useState<AuditRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [pageError, setPageError]       = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  useEffect(() => {
    setIsLoading(true);
    getAuditTrail()
      .then((res) => {
        setAllRecords(res.data);
        setFilteredRecords(res.data);
      })
      .catch(() => setPageError("Failed to load audit trail. Please refresh."))
      .finally(() => setIsLoading(false));
  }, []);

  const uniqueActions  = [...new Set(allRecords.map((r) => r.action).filter(Boolean))];
  const uniqueSections = [...new Set(allRecords.map((r) => r.section).filter(Boolean))];

  const applyFilters = (search: string, action: string, section: string) => {
    const term = search.toLowerCase();
    setFilteredRecords(
      allRecords.filter((record) => {
        const matchesSearch =
          !term ||
          record.action_owner.toLowerCase().includes(term) ||
          record.employee.toLowerCase().includes(term) ||
          (record.action_owner_username || "").toLowerCase().includes(term) ||
          (record.employee_username || "").toLowerCase().includes(term) ||
          record.section.toLowerCase().includes(term) ||
          record.action_description.toLowerCase().includes(term) ||
          record.performed_screen.toLowerCase().includes(term);

        const matchesAction  = action === "all"  || record.action === action;
        const matchesSection = section === "all" || record.section === section;

        return matchesSearch && matchesAction && matchesSection;
      }),
    );
  };

  const debouncedSearch = useDebounce((value: string) => {
    applyFilters(value, actionFilter, sectionFilter);
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleActionFilter = (value: string) => {
    setActionFilter(value);
    applyFilters(searchQuery, value, sectionFilter);
  };

  const handleSectionFilter = (value: string) => {
    setSectionFilter(value);
    applyFilters(searchQuery, actionFilter, value);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setActionFilter("all");
    setSectionFilter("all");
    setFilteredRecords(allRecords);
  };

  const hasActiveFilters =
    searchQuery !== "" || actionFilter !== "all" || sectionFilter !== "all";


  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Audit Trail">
      {pageError && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            color: "#dc2626",
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {pageError}
          <button
            onClick={() => setPageError("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 16, padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by owner, employee, action…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 13.5,
              outline: "none",
              background: "#fff",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ position: "relative" }}>
          <select
            value={actionFilter}
            onChange={(e) => handleActionFilter(e.target.value)}
            style={{
              padding: "9px 32px 9px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 13,
              outline: "none",
              appearance: "none",
              background: "#fff",
              cursor: "pointer",
              minWidth: 140,
            }}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▼</span>
        </div>

        <div style={{ position: "relative" }}>
          <select
            value={sectionFilter}
            onChange={(e) => handleSectionFilter(e.target.value)}
            style={{
              padding: "9px 32px 9px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 13,
              outline: "none",
              appearance: "none",
              background: "#fff",
              cursor: "pointer",
              minWidth: 150,
            }}
          >
            <option value="all">All Sections</option>
            {uniqueSections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▼</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: "9px 16px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 13,
              background: "#fff",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            ✕ Clear filters
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>
          {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#fafbff" }}>
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "11px 16px",
                      textAlign: "left",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#94a3b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={TABLE_COLUMNS.length}
                    style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}
                  >
                    Loading…
                  </td>
                </tr>
              )}

              {!isLoading && filteredRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={TABLE_COLUMNS.length}
                    style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}
                  >
                    {hasActiveFilters
                      ? "No records match the current filters."
                      : "No audit trail records found."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredRecords.map((record, rowIndex) => {
                  const actionStyle = ACTION_COLOR[record.action] ?? { bg: "#f1f5f9", color: "#64748b" };
                  return (
                    <tr
                      key={record.id}
                      style={{
                        borderBottom: "1px solid #f8fafc",
                        background: rowIndex % 2 === 0 ? "#fff" : "#fafbff",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.background = "#f0f9ff")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.background =
                          rowIndex % 2 === 0 ? "#fff" : "#fafbff")
                      }
                    >
                      <td
                        style={{
                          padding: "11px 16px",
                          color: "#64748b",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDateTime(record.event_time)}
                      </td>

                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg,#1b2a6b,#16a085)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(record.action_owner || "?")
                              .split(" ")
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                              {record.action_owner || "—"}
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: 11 }}>
                              {record.action_owner_username || ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "11px 16px" }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: actionStyle.bg,
                            color: actionStyle.color,
                            letterSpacing: 0.3,
                          }}
                        >
                          {record.action}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "11px 16px",
                          color: "#374151",
                          fontWeight: 500,
                          fontSize: 13,
                        }}
                      >
                        {record.employee || "—"}
                      </td>

                      <td
                        style={{
                          padding: "11px 16px",
                          color: "#64748b",
                          fontSize: 12.5,
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {record.section || "—"}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "11px 16px",
                          color: "#64748b",
                          fontSize: 12.5,
                        }}
                      >
                        {record.source || "—"}
                      </td>

                      <td
                        style={{
                          padding: "11px 16px",
                          color: "#64748b",
                          fontSize: 12.5,
                        }}
                      >
                        {record.performed_screen || "—"}
                      </td>

                      <td
                        style={{
                          padding: "11px 16px",
                          color: "#64748b",
                          fontSize: 12.5,
                          maxWidth: 260,
                        }}
                      >
                        {record.action_description || "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
