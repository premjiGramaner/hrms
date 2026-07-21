import { useEffect, useMemo, useState } from "react";
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
  IconBuilding,
  IconCheckCircle,
  IconUser,
  IconPlusCircle,
  IconEdit,
  IconAlertCircle,
  IconX,
} from "../../components/Icons";
import DataTable, {
  ColumnDef,
  ActionDef,
  StatCard,
} from "../../components/DataTable";
import Toast from "../../utils/toast";
import Alert from "../../utils/alert";
import Button from "../../components/common/Button";

enum FormMode {
  ADD = "add",
  EDIT = "edit",
}

const TABS: TabItem[] = [
  { label: "Job Titles", path: "/hradmin/job-titles" },
  { label: "Job Categories", path: "/hradmin/job-categories" },
  { label: "Sub Units", path: "/hradmin/sub-units" },
  { label: "Role Access", path: "/hradmin/role-access" },
  { label: "Audit Trail", path: "/hradmin/audit-trail" },
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
      icon: <IconBuilding />,
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
        <div className="flex items-center gap-[10px]">
          <div className="w-9 h-9 rounded-[10px] flex-shrink-0 bg-gradient-to-br from-[#172554] to-[#14b8a6] flex items-center justify-center text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(27,42,107,0.2)]">
            {row.sub_unit_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-[14px]">
              {row.sub_unit_name}
            </div>
            <div className="text-[11px] text-slate-400 mt-[1px]">
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
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-[#172554] to-[#14b8a6] flex items-center justify-center text-white text-[10px] font-bold">
              {row.supervisor_name
                .split(" ")
                .map((word) => word[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <span className="text-[13px] text-gray-700 font-medium">
              {row.supervisor_name}
            </span>
          </div>
        ) : (
          <span className="text-[12.5px] text-slate-400 italic">
            No supervisor
          </span>
        ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) =>
        row.description ? (
          <span className="text-slate-600 text-[13px] line-clamp-2">
            {row.description}
          </span>
        ) : (
          <span className="text-slate-300 text-[12.5px] italic">
            No description
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
        <div className="mb-4 p-3 px-[18px] bg-gradient-to-br from-red-50 to-white border border-red-200 border-l-4 border-l-red-500 rounded-xl text-red-600 text-[13.5px] flex items-center justify-between shadow-[0_2px_8px_rgba(239,68,68,0.08)]">
          <span className="flex items-center gap-2">
            <IconAlertCircle size={16} />
            {pageError}
          </span>
          <button
            onClick={() => setPageError("")}
            className="bg-transparent border-0 cursor-pointer text-red-600 text-lg p-0 hover:opacity-70 transition-opacity"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      <DataTable<SubUnit>
        title="Sub Units"
        subtitle="Manage your organisation's sub units"
        icon={<IconBuilding />}
        rows={pagedList}
        isLoading={isLoading}
        columns={columns.filter((column) => column.key !== "supervisor_name")}
        actions={actions}
        getKey={(row) => row.id}
        emptyIcon={<IconBuilding />}
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
          mode={FormMode.ADD}
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
          onError={(message) => setPageError(message)}
        />
      )}
      {subUnitToEdit && (
        <SubUnitFormModal
          mode={FormMode.EDIT}
          subUnit={subUnitToEdit}
          onClose={() => setSubUnitToEdit(null)}
          onSaved={handleSaved}
          onError={(message) => setPageError(message)}
        />
      )}
    </Layout>
  );
}

interface SubUnitFormModalProps {
  mode: FormMode;
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
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    if (!subUnitName.trim()) {
      setFormError("Sub unit name is required.");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === FormMode.ADD) {
        await createSubUnit({
          sub_unit_name: subUnitName.trim(),
          supervisor_name: null,
          description: description.trim() || undefined,
        } as CreateSubUnitPayload);
        Toast.created("Sub Unit");
      } else if (mode === FormMode.EDIT && subUnit) {
        await updateSubUnit(subUnit.id, {
          sub_unit_name: subUnitName.trim(),
          supervisor_name: null,
          description: description.trim() || undefined,
        } as UpdateSubUnitPayload);
        Toast.updated("Sub Unit");
      }
      onSaved();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        `Failed to ${mode === FormMode.ADD ? "create" : "update"} sub unit.`;
      setFormError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const isAddMode = mode === FormMode.ADD;

  return (
    <div
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
    >
      <div className="bg-white rounded-[20px] w-full max-w-[520px] shadow-[0_24px_80px_rgba(0,0,0,0.22)] overflow-hidden">
        {/* Header */}
        <div className="p-[22px_26px_18px] bg-gradient-to-br from-[#172554] to-[#14b8a6] flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="w-9 h-9 rounded-[10px] bg-white/18 flex items-center justify-center">
              {isAddMode ? (
                <IconPlusCircle size={18} color="#fff" />
              ) : (
                <IconEdit size={18} color="#fff" />
              )}
            </div>
            <div>
              <h2 className="m-0 text-[17px] font-bold text-white">
                {isAddMode ? "Add Sub Unit" : "Edit Sub Unit"}
              </h2>
              <p className="m-0 text-xs text-white/70 mt-[2px]">
                {isAddMode
                  ? "Create a new sub unit"
                  : "Update sub unit details"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/18 border-0 cursor-pointer text-base text-white flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <IconX size={16} color="#fff" />
          </button>
        </div>

        <div className="p-[22px_26px] flex flex-col gap-4">
          {formError && (
            <div className="p-[10px_14px] bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-[10px] text-red-600 text-[13px] flex items-center gap-2">
              <IconAlertCircle size={14} color="#dc2626" />
              {formError}
            </div>
          )}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-gray-700">
              Sub Unit Name <span className="text-red-500">*</span>
            </label>
            <input
              value={subUnitName}
              onChange={(event) => {
                setSubUnitName(event.target.value);
                setFormError("");
              }}
              placeholder="e.g. Delivery – IT Services"
              className="w-full p-[11px_14px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white box-border transition-colors focus:border-[#172554]"
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-gray-700">
              Description{" "}
              <span className="text-[11px] font-normal text-slate-400">
                (optional)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief description of this sub unit…"
              rows={3}
              className="w-full p-[11px_14px] border-[1.5px] border-slate-200 rounded-[10px] text-[13.5px] outline-none bg-white box-border resize-y font-[inherit] transition-colors focus:border-[#172554]"
            />
          </div>
        </div>

        <div className="p-[16px_26px_22px] border-t border-slate-100 flex items-center justify-between bg-[#fafbff]">
          <span className="text-xs text-slate-400">
            <span className="text-red-500">*</span> Required fields
          </span>
          <div className="flex gap-[10px]">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSaving}
              loading={isSaving}
            >
              {isAddMode ? "Add Sub Unit" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
