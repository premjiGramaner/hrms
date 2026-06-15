import React, { useEffect, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  getSubUnits,
  createSubUnit,
  updateSubUnit,
  deleteSubUnit,
  SubUnit,
  CreateSubUnitPayload,
  UpdateSubUnitPayload,
} from "../../api/hradmin.api";
import useDebounce from "../../hooks/useDebounce";

const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
  { label: "Audit Trail", path: "/hradmin/audit-trail" },
  { label: "Organization", path: "#" },
  { label: "More", path: "#" },
];

const TABLE_COLUMNS = [
  "#",
  "Sub Unit Name",
  "Supervisor",
  "Description",
  "Status",
  "Actions",
];

export default function SubUnitsPage() {
  const [subUnitList, setSubUnitList] = useState<SubUnit[]>([]);
  const [filteredList, setFilteredList] = useState<SubUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [subUnitToEdit, setSubUnitToEdit] = useState<SubUnit | null>(null);
  const [subUnitToDelete, setSubUnitToDelete] = useState<SubUnit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageError, setPageError] = useState("");

  const fetchSubUnits = () => {
    setIsLoading(true);
    getSubUnits()
      .then((res) => {
        setSubUnitList(res.data);
        setFilteredList(res.data);
        setSearchQuery("");
      })
      .catch(() => setPageError("Failed to load sub units. Please refresh."))
      .finally(() => setIsLoading(false));
  };

  useEffect(fetchSubUnits, []);

  const debouncedFilter = useDebounce((value: string) => {
    const term = value.toLowerCase();
    setFilteredList(
      subUnitList.filter(
        (su) =>
          su.sub_unit_name.toLowerCase().includes(term) ||
          (su.supervisor_name || "").toLowerCase().includes(term) ||
          (su.description || "").toLowerCase().includes(term),
      ),
    );
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedFilter(value);
  };

  const handleDeleteConfirm = async () => {
    if (!subUnitToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSubUnit(subUnitToDelete.id);
      setSubUnitToDelete(null);
      fetchSubUnits();
    } catch {
      setPageError("Failed to delete sub unit. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaved = () => {
    setShowAddModal(false);
    setSubUnitToEdit(null);
    fetchSubUnits();
  };

  return (
    <Layout
      title="HR Administration"
      tabs={TABS}
      activeTab="Sub Units"
      onFab={() => setShowAddModal(true)}
    >
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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#dc2626",
              fontSize: 16,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

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
        <div style={{ position: "relative", width: 280 }}>
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
              width="14"
              height="14"
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
            placeholder="Search by name or supervisor…"
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

        <span style={{ fontSize: 13, color: "#64748b" }}>
          {filteredList.length} sub unit{filteredList.length !== 1 ? "s" : ""}
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
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              {TABLE_COLUMNS.map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "#94a3b8",
                    whiteSpace: "nowrap",
                    width: i === 0 ? 48 : undefined,
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

            {!isLoading && filteredList.length === 0 && (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}
                >
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : "No sub units found. Click + to add one."}
                </td>
              </tr>
            )}

            {!isLoading &&
              filteredList.map((subUnit, rowIndex) => (
                <tr
                  key={subUnit.id}
                  style={{
                    borderBottom: "1px solid #f8fafc",
                    background: rowIndex % 2 === 0 ? "#fff" : "#fafbff",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      rowIndex % 2 === 0 ? "#fff" : "#fafbff")
                  }
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#94a3b8",
                      fontSize: 12,
                    }}
                  >
                    {rowIndex + 1}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    {subUnit.sub_unit_name}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#374151",
                      fontSize: 13,
                    }}
                  >
                    {subUnit.supervisor_name ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg,#1b2a6b,#16a085)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {subUnit.supervisor_name
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        {subUnit.supervisor_name}
                      </span>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#64748b",
                      fontSize: 12.5,
                    }}
                  >
                    {subUnit.description || (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: subUnit.is_active ? "#dcfce7" : "#f1f5f9",
                        color: subUnit.is_active ? "#16a34a" : "#94a3b8",
                      }}
                    >
                      {subUnit.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setSubUnitToEdit(subUnit)}
                        title="Edit sub unit"
                        style={{
                          background: "#eff6ff",
                          border: "none",
                          cursor: "pointer",
                          color: "#1b2a6b",
                          fontSize: 13,
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => setSubUnitToDelete(subUnit)}
                        title="Delete sub unit"
                        style={{
                          background: "#fff1f2",
                          border: "none",
                          cursor: "pointer",
                          color: "#e11d48",
                          fontSize: 13,
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <SubUnitFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
          onError={(msg) => setPageError(msg)}
        />
      )}

      {subUnitToEdit && (
        <SubUnitFormModal
          mode="edit"
          subUnit={subUnitToEdit}
          onClose={() => setSubUnitToEdit(null)}
          onSaved={handleSaved}
          onError={(msg) => setPageError(msg)}
        />
      )}

      {subUnitToDelete && (
        <DeleteConfirmModal
          subUnitName={subUnitToDelete.sub_unit_name}
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setSubUnitToDelete(null)}
        />
      )}
    </Layout>
  );
}

interface SubUnitFormModalProps {
  mode: "add" | "edit";
  subUnit?: SubUnit;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

function SubUnitFormModal({
  mode,
  subUnit,
  onClose,
  onSaved,
  onError,
}: SubUnitFormModalProps) {
  const [subUnitName, setSubUnitName] = useState(subUnit?.sub_unit_name || "");
  const [supervisorName, setSupervisorName] = useState(
    subUnit?.supervisor_name || "",
  );
  const [description, setDescription] = useState(subUnit?.description || "");
  const [isActive, setIsActive] = useState(subUnit?.is_active !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    if (!subUnitName.trim()) {
      setFormError("Sub unit name is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (mode === "add") {
        const payload: CreateSubUnitPayload = {
          sub_unit_name: subUnitName.trim(),
          supervisor_name: supervisorName.trim() || null,
          description: description.trim() || undefined,
        };
        await createSubUnit(payload);
      } else if (mode === "edit" && subUnit) {
        const payload: UpdateSubUnitPayload = {
          sub_unit_name: subUnitName.trim(),
          supervisor_name: supervisorName.trim() || null,
          description: description.trim() || undefined,
          is_active: isActive,
        };
        await updateSubUnit(subUnit.id, payload);
      }
      onSaved();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        `Failed to ${mode === "add" ? "create" : "update"} sub unit. Please try again.`;
      setFormError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#1b2a6b",
            }}
          >
            {mode === "add" ? "Add Sub Unit" : "Edit Sub Unit"}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#f1f5f9",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {formError && (
            <div
              style={{
                padding: "8px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#dc2626",
                fontSize: 13,
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
              style={{ fontSize: 12.5, fontWeight: 600, color: "#4a5568" }}
            >
              Sub Unit Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={subUnitName}
              onChange={(e) => {
                setSubUnitName(e.target.value);
                setFormError("");
              }}
              placeholder="e.g. Delivery- IT Services"
              style={{
                padding: "10px 12px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                fontSize: 13.5,
                outline: "none",
                background: "#fff",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
              style={{ fontSize: 12.5, fontWeight: 600, color: "#4a5568" }}
            >
              Supervisor{" "}
              <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>
                (optional)
              </span>
            </label>
            <input
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="e.g. John Smith"
              style={{
                padding: "10px 12px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                fontSize: 13.5,
                outline: "none",
                background: "#fff",
              }}
            />
            <span style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
              This name will appear in the employee list under the Supervisor
              column.
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
              style={{ fontSize: 12.5, fontWeight: 600, color: "#4a5568" }}
            >
              Description{" "}
              <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>
                (optional)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this sub unit…"
              rows={3}
              style={{
                padding: "10px 12px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                fontSize: 13.5,
                outline: "none",
                background: "#fff",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          {mode === "edit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                style={{ fontSize: 12.5, fontWeight: 600, color: "#4a5568" }}
              >
                Status
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  paddingTop: 4,
                }}
              >
                {(["Active", "Inactive"] as const).map((statusOption) => (
                  <label
                    key={statusOption}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13.5,
                      cursor: "pointer",
                      color: "#374151",
                    }}
                  >
                    <input
                      type="radio"
                      name="sub_unit_status"
                      checked={isActive === (statusOption === "Active")}
                      onChange={() => setIsActive(statusOption === "Active")}
                      style={{ accentColor: "#1b2a6b", width: 15, height: 15 }}
                    />
                    {statusOption}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "14px 24px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            <span style={{ color: "#ef4444" }}>*</span> Required
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 22px",
                borderRadius: 999,
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              style={{
                padding: "9px 28px",
                borderRadius: 999,
                border: "none",
                background: isSaving
                  ? "#94a3b8"
                  : "linear-gradient(90deg,#1b2a6b,#16a085)",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              {isSaving
                ? "Saving…"
                : mode === "add"
                  ? "Add Sub Unit"
                  : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  subUnitName: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({
  subUnitName,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          padding: "28px 28px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#fff1f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 22,
          }}
        >
          🗑
        </div>
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 17,
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          Delete Sub Unit
        </h3>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 14,
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          Are you sure you want to delete{" "}
          <strong style={{ color: "#1e293b" }}>"{subUnitName}"</strong>?{" "}
          Employees assigned to this sub unit will keep their records, but it
          won't appear in the dropdown for new entries.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: "9px 24px",
              borderRadius: 999,
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: "9px 24px",
              borderRadius: 999,
              border: "none",
              background: isLoading ? "#94a3b8" : "#e11d48",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
