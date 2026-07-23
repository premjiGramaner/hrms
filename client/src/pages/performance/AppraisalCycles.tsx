import { Download, Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteAppraisalCycle,
  downloadAppraisalCycleZip,
  getAppraisalCycles,
  updateAppraisalCycleStatus,
} from "../../api/performance.api";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/common/DataTable";
import SearchInput from "../../components/common/SearchInput";
import StatusBadge from "../../components/common/StatusBadge";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { PAGE_PATHS } from "../../config/roles";
import { AppraisalCycle } from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";
import Toast from "../../utils/toast";
import {
  isClosedCycleStatus,
  showPerformanceError,
} from "./performanceNotifications";
import { IconButton } from "./performanceUi";

const STATUS_ITEMS = [
  { label: "All", color: "bg-blue-100 text-blue-600" },
  { label: "Created", color: "bg-slate-100 text-slate-500" },
  { label: "Appraisals Created", color: "bg-orange-100 text-orange-500" },
  { label: "Activated", color: "bg-emerald-100 text-emerald-600" },
  { label: "Closed", color: "bg-red-100 text-red-500" },
  { label: "Reopened", color: "bg-teal-100 text-teal-600" },
];

function normalizeStatus(status: string) {
  if (status === "In Progress") return "Activated";
  if (status === "Completed") return "Closed";
  return status;
}

export default function AppraisalCycles() {
  const [query, setQuery] = useState("");
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("All");
  const [deleteCycleTarget, setDeleteCycleTarget] =
    useState<AppraisalCycle | null>(null);
  const [closeCycleTarget, setCloseCycleTarget] =
    useState<AppraisalCycle | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getAppraisalCycles()
      .then(setCycles)
      .catch((requestError) => {
        setCycles([]);
        showPerformanceError(requestError, "Unable to load appraisal cycles.");
      })
      .finally(() => setLoading(false));
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: cycles.length };
    cycles.forEach((cycle) => {
      const normalizedStatus = normalizeStatus(cycle.status);
      counts[normalizedStatus] = (counts[normalizedStatus] || 0) + 1;
    });
    return counts;
  }, [cycles]);

  const filteredCycles = useMemo(
    () =>
      cycles.filter((cycle) => {
        const matchesQuery = cycle.name
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStatus =
          activeStatus === "All" ||
          normalizeStatus(cycle.status) === activeStatus;
        return matchesQuery && matchesStatus;
      }),
    [activeStatus, cycles, query],
  );

  const closeCycle = async () => {
    if (!closeCycleTarget) return;
    try {
      const updatedCycle = await updateAppraisalCycleStatus(
        closeCycleTarget.id,
        "Closed",
      );
      setCycles((currentCycles) =>
        currentCycles.map((cycle) =>
          cycle.id === updatedCycle.id ? updatedCycle : cycle,
        ),
      );
      Toast.success("Appraisal cycle closed successfully.");
    } catch (requestError) {
      showPerformanceError(
        requestError,
        "Cycle can be closed only when all appraisals are completed.",
      );
    } finally {
      setCloseCycleTarget(null);
    }
  };

  const reopenCycle = async (cycle: AppraisalCycle) => {
    try {
      const updatedCycle = await updateAppraisalCycleStatus(
        cycle.id,
        "Reopened",
      );
      setCycles((currentCycles) =>
        currentCycles.map((currentCycle) =>
          currentCycle.id === updatedCycle.id ? updatedCycle : currentCycle,
        ),
      );
      Toast.success("Appraisal cycle reopened successfully.");
    } catch (requestError) {
      showPerformanceError(requestError, "Unable to reopen appraisal cycle.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteCycleTarget) return;
    try {
      await deleteAppraisalCycle(deleteCycleTarget.id);
      setCycles((currentCycles) =>
        currentCycles.filter((cycle) => cycle.id !== deleteCycleTarget.id),
      );
      Toast.deleted("Appraisal cycle");
    } catch (requestError) {
      showPerformanceError(requestError, "Unable to delete appraisal cycle.");
    } finally {
      setDeleteCycleTarget(null);
    }
  };

  const downloadCycle = async (cycle: AppraisalCycle) => {
    try {
      await downloadAppraisalCycleZip(cycle.id, cycle.name);
      Toast.success("Appraisal cycle downloaded successfully.");
    } catch (requestError) {
      showPerformanceError(
        requestError,
        "Unable to download appraisal cycle ZIP.",
      );
    }
  };

  const handleCycleStatusAction = (cycle: AppraisalCycle) => {
    if (isClosedCycleStatus(cycle.status)) {
      void reopenCycle(cycle);
      return;
    }
    setCloseCycleTarget(cycle);
  };

  const columns: DataTableColumn<AppraisalCycle>[] = [
    {
      key: "name",
      header: "Appraisal Cycle Name",
      sortable: true,
      width: "360px",
      render: (cycle) => (
        <span className="font-semibold text-slate-500">{cycle.name}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      render: (cycle) => (
        <span className="font-semibold text-slate-500">{cycle.dueDate}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (cycle) => (
        <StatusBadge status={normalizeStatus(cycle.status)} />
      ),
    },
    {
      key: "cycleAction",
      header: "Cycle Action",
      render: (cycle) => (
        <Button
          variant="secondary"
          className="px-6 py-2"
          onClick={() => handleCycleStatusAction(cycle)}
        >
          {isClosedCycleStatus(cycle.status) ? "Reopen" : "Close"}
        </Button>
      ),
    },
  ];

  return (
    <PerformanceLayout activeTab="Appraisal Cycles">
      <div className="grid gap-0 rounded-[8px] bg-white p-8 lg:grid-cols-[320px_1fr]">
        <aside className="border-r border-slate-100 pr-7">
          <Button
            className="mb-7 w-full justify-center text-base"
            onClick={() =>
              navigate(PAGE_PATHS.performanceAppraisalCyclesCreate)
            }
          >
            <Plus size={20} />
            Create Appraisal Cycle
          </Button>
          <div className="space-y-3">
            {STATUS_ITEMS.map((statusItem) => (
              <button
                key={statusItem.label}
                type="button"
                onClick={() => setActiveStatus(statusItem.label)}
                className={`flex h-12 w-full items-center gap-4 rounded-[8px] px-4 text-left text-sm font-semibold text-slate-500 transition ${activeStatus === statusItem.label ? "bg-[#f0edf3]" : "hover:bg-[#fbf9ff]"}`}
              >
                <span className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 font-bold ${statusItem.color}`}>
                  {statusCounts[statusItem.label] || 0}
                </span>
                {statusItem.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="pl-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-400">
              ({filteredCycles.length}) Appraisal Cycles Found
            </h2>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search"
              className="w-96"
            />
          </div>
          <DataTable
            columns={columns}
            data={filteredCycles}
            loading={loading}
            getRowId={(cycle) => cycle.id}
            emptyMessage="No appraisal cycles found."
            actions={(cycle) => (
              <div className="flex justify-end gap-3">
                <IconButton title="Delete" onClick={() => setDeleteCycleTarget(cycle)}><Trash2 size={18} /></IconButton>
                <IconButton title="Download Appraisals ZIP" onClick={() => downloadCycle(cycle)}><Download size={18} /></IconButton>
                <IconButton
                  title={isClosedCycleStatus(cycle.status) ? "Closed cycles cannot be edited" : "Edit"}
                  disabled={isClosedCycleStatus(cycle.status)}
                  onClick={() => navigate(`/performance/appraisal_cycles/${cycle.id}`)}
                ><Edit size={18} /></IconButton>
              </div>
            )}
          />
        </section>
      </div>

      {deleteCycleTarget ? (
        <ConfirmDialog
          title="Are you sure?"
          message="The selected appraisal cycle will be permanently deleted. Are you sure you want to continue?"
          confirmLabel="Yes, Delete"
          onCancel={() => setDeleteCycleTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
      {closeCycleTarget ? (
        <ConfirmDialog
          title="Close Appraisal Cycle?"
          message="This will permanently close the cycle. Only click this when ALL appraisals in the cycle are fully Completed. This action is difficult to reverse."
          confirmLabel="Yes, Close Cycle"
          onCancel={() => setCloseCycleTarget(null)}
          onConfirm={closeCycle}
        />
      ) : null}
    </PerformanceLayout>
  );
}
