import React, { useEffect, useMemo, useState } from "react";
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
import {
  EditIcon,
  DeleteIcon,
  IconGrid,
  IconCheckCircle,
  IconUser,
} from "../../components/Icons";
import DataTable, {
  ColumnDef,
  ActionDef,
  StatCard,
} from "../../components/DataTable";
import Toast from "../../utils/toast";
import Alert from "../../utils/alert";
import Button from "../../components/common/Button";
import { PAGE_PATHS } from "../../config/roles";

const TABS: TabItem[] = [
  { label: "Job Titles", path: PAGE_PATHS.hradminJobTitles },
  { label: "Job Categories", path: PAGE_PATHS.hradminJobCategories },
  { label: "Sub Units", path: PAGE_PATHS.hradminSubUnits },
  { label: "Role Access", path: PAGE_PATHS.hradminRoleAccess },
  { label: "Audit Trail", path: PAGE_PATHS.hradminAuditTrail },
];

export default function SubUnitsPage() {
  const [subUnitList, setSubUnitList] = useState<SubUnit[]>([]);
  const [filteredList, setFilteredList] = useState<SubUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [subUnitToEdit, setSubUnitToEdit] = useState<SubUnit | null>(null);
  const [pageError, setPageError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
          (su.description || "").toLowerCase().includes(term),
      ),
    );
    setCurrentPage(1);
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedFilter(value);
  };

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleDeleteConfirm = async (subUnit: SubUnit) => {
    const confirmed = await Alert.confirmDelete(subUnit.sub_unit_name);
    if (!confirmed) return;

    try {
      await deleteSubUnit(subUnit.id);
      Toast.deleted("Sub Unit");
      fetchSubUnits();
    } catch {
      Toast.error("Failed to delete sub unit. Please try again.");
    }
  };

  const handleSaved = () => {
    setShowAddModal(false);
    setSubUnitToEdit(null);
    fetchSubUnits();
  };

  const activeCount = subUnitList.filter((s) => s.is_active).length;
  const withSupervisor = subUnitList.filter((s) => !!s.supervisor_name).length;
  const stats: StatCard[] = [
    {
      label: "Total Sub Units",
      value: subUnitList.length,
      icon: <IconGrid size={20} />,
      color: "#0369a1",
      bg: "#f0f9ff",
      border: "#bae6fd",
    },
    {
      label: "Active",
      value: activeCount,
      icon: <IconCheckCircle size={20} />,
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    {
      label: "With Supervisor",
      value: withSupervisor,
      icon: <IconUser size={20} />,
      color: "#0284c7",
      bg: "#e0f2fe",
      border: "#7dd3fc",
    },
  ];

  const columns: ColumnDef<SubUnit>[] = [
    {
      key: "sub_unit_name",
      header: "Sub Unit Name",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              background: "linear-gradient(135deg,#172554,#14b8a6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(27,42,107,0.2)",
            }}
          >
            {row.sub_unit_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>
              {row.sub_unit_name}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
              ID #{row.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "supervisor_name",
      header: "Supervisor",
      render: (row) =>
        row.supervisor_name ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg,#172554,#14b8a6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {row.supervisor_name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
              {row.supervisor_name}
            </span>
          </div>
        ) : (
          <span
            style={{ fontSize: 12.5, color: "#94a3b8", fontStyle: "italic" }}
          >
            No supervisor
          </span>
        ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) =>
        row.description ? (
          <span
            style={{
              color: "#475569",
              fontSize: 13,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {row.description}
          </span>
        ) : (
          <span
            style={{ color: "#cbd5e1", fontSize: 12.5, fontStyle: "italic" }}
          >
            No description
          </span>
        ),
    },
    {
      key: "is_active",
      header: "Status",
      width: 120,
      render: (row) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 999,
            background: row.is_active ? "#dcfce7" : "#f1f5f9",
            color: row.is_active ? "#16a34a" : "#94a3b8",
            border: `1px solid ${row.is_active ? "#bbf7d0" : "#e2e8f0"}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              flexShrink: 0,
              background: row.is_active ? "#22c55e" : "#cbd5e1",
            }}
          />
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  const actions: ActionDef<SubUnit>[] = [
    {
      label: "Edit",
      icon: EditIcon,
      color: "#1b2a6b",
      bg: "#eff6ff",
      bgHover: "#dbeafe",
      borderColor: "#bfdbfe",
      borderColorHover: "#93c5fd",
      onClick: (row) => setSubUnitToEdit(row),
      title: "Edit sub unit",
    },
    {
      label: "Delete",
      icon: DeleteIcon,
      color: "#e11d48",
      bg: "#fff1f2",
      bgHover: "#ffe4e6",
      borderColor: "#fecdd3",
      borderColorHover: "#fda4af",
      onClick: (row) => handleDeleteConfirm(row),
      title: "Delete sub unit",
    },
  ];

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Sub Units">
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
            <span>⚠</span>
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
            }}
          >
            ✕
          </button>
        </div>
      )}

      <DataTable<SubUnit>
        title="Sub Units"
        subtitle="Manage your organisation's sub units"
        icon={<IconGrid size={18} />}
        rows={pagedList}
        isLoading={isLoading}
        columns={columns.filter((column) => column.key !== "supervisor_name")}
        actions={actions}
        getKey={(row) => row.id}
        emptyIcon={<IconGrid size={36} />}
        emptyTitle={
          searchQuery ? `No results for "${searchQuery}"` : "No sub units yet"
        }
        emptySubtitle={
          searchQuery
            ? "Try a different search term"
            : "Click 'Add Sub Unit' to create one"
        }
        stats={stats.filter((stat) => stat.label !== "With Supervisor")}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={filteredList.length}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
        itemLabel="sub units"
        searchQuery={searchQuery}
        searchPlaceholder="Search by name or supervisor…"
        onSearchChange={handleSearchChange}
        addLabel="Add Sub Unit"
        onAdd={() => setShowAddModal(true)}
      />

      {showAddModal && (
        <SubUnitFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
          onError={(m) => setPageError(m)}
        />
      )}
      {subUnitToEdit && (
        <SubUnitFormModal
          mode="edit"
          subUnit={subUnitToEdit}
          onClose={() => setSubUnitToEdit(null)}
          onSaved={handleSaved}
          onError={(m) => setPageError(m)}
        />
      )}
    </Layout>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "11px 14px",
  border: "1.5px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 13.5,
  outline: "none",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};
const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "#374151",
};

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
        await createSubUnit({
          sub_unit_name: subUnitName.trim(),
          supervisor_name: null,
          description: description.trim() || undefined,
        } as CreateSubUnitPayload);
        Toast.created("Sub Unit");
      } else if (mode === "edit" && subUnit) {
        await updateSubUnit(subUnit.id, {
          sub_unit_name: subUnitName.trim(),
          supervisor_name: null,
          description: description.trim() || undefined,
          is_active: isActive,
        } as UpdateSubUnitPayload);
        Toast.updated("Sub Unit");
      }
      onSaved();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        `Failed to ${mode === "add" ? "create" : "update"} sub unit.`;
      setFormError(msg);
      onError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(4px)",
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
          borderRadius: 20,
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 26px 18px",
            background: "linear-gradient(135deg,#172554,#14b8a6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {mode === "add" ? "➕" : "✏️"}
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {mode === "add" ? "Add Sub Unit" : "Edit Sub Unit"}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 2,
                }}
              >
                {mode === "add"
                  ? "Create a new sub unit"
                  : "Update sub unit details"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "22px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {formError && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderLeft: "4px solid #ef4444",
                borderRadius: 10,
                color: "#dc2626",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⚠ {formError}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>
              Sub Unit Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={subUnitName}
              onChange={(e) => {
                setSubUnitName(e.target.value);
                setFormError("");
              }}
              placeholder="e.g. Delivery – IT Services"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#172554")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>
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
                ...inputStyle,
                resize: "vertical",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#172554")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
            />
          </div>
          {mode === "edit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Status</label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["Active", "Inactive"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIsActive(opt === "Active")}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `2px solid ${isActive === (opt === "Active") ? (opt === "Active" ? "#22c55e" : "#94a3b8") : "#e2e8f0"}`,
                      background:
                        isActive === (opt === "Active")
                          ? opt === "Active"
                            ? "#f0fdf4"
                            : "#f8fafc"
                          : "#fff",
                      color:
                        isActive === (opt === "Active")
                          ? opt === "Active"
                            ? "#16a34a"
                            : "#64748b"
                          : "#94a3b8",
                      fontWeight: 600,
                      fontSize: 13.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: opt === "Active" ? "#22c55e" : "#94a3b8",
                      }}
                    />
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 26px 22px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafbff",
          }}
        >
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            <span style={{ color: "#ef4444" }}>*</span> Required fields
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSaving}
              loading={isSaving}
            >
              {mode === "add" ? "Add Sub Unit" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
