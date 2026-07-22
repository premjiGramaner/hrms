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
import SearchInput from "../../components/common/SearchInput";
import StatusBadge from "../../components/common/StatusBadge";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { AppraisalCycle } from "../../types/performance.types";
import { IconButton } from "./performanceUi";
import { PAGE_PATHS } from "../../config/roles";

const statusItems = [
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
  const [deleteCycle, setDeleteCycle] = useState<AppraisalCycle | null>(null);
  const [closeCycleTarget, setCloseCycleTarget] =
    useState<AppraisalCycle | null>(null);
  const [pageError, setPageError] = useState("");
  const navigate = useNavigate();

  const loadCycles = () => {
    setLoading(true);
    getAppraisalCycles()
      .then(setCycles)
      .catch(() => setCycles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCycles();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: cycles.length };
    cycles.forEach((cycle) => {
      const status = normalizeStatus(cycle.status);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [cycles]);

  const rows = useMemo(
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
    setPageError("");
    try {
      const updated = await updateAppraisalCycleStatus(
        closeCycleTarget.id,
        "Closed",
      );
      setCycles((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setCloseCycleTarget(null);
    } catch (err: any) {
      setPageError(
        err?.response?.data?.message ||
          "Cycle can be closed only when all appraisals are completed.",
      );
      setCloseCycleTarget(null);
    }
  };

  const reopenCycle = async (cycle: AppraisalCycle) => {
    setPageError("");
    const updated = await updateAppraisalCycleStatus(cycle.id, "Reopened");
    setCycles((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const confirmDelete = async () => {
    if (!deleteCycle) return;
    await deleteAppraisalCycle(deleteCycle.id);
    setCycles((current) =>
      current.filter((cycle) => cycle.id !== deleteCycle.id),
    );
    setDeleteCycle(null);
  };

  const downloadCycle = async (cycle: AppraisalCycle) => {
    setPageError("");
    try {
      await downloadAppraisalCycleZip(cycle.id, cycle.name);
    } catch (err: any) {
      setPageError(
        err?.response?.data?.message ||
          "Unable to download appraisal cycle ZIP.",
      );
    }
  };

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
            {statusItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveStatus(item.label)}
                className={`flex h-12 w-full items-center gap-4 rounded-[8px] px-4 text-left text-sm font-semibold text-slate-500 transition ${
                  activeStatus === item.label
                    ? "bg-[#f0edf3]"
                    : "hover:bg-[#fbf9ff]"
                }`}
              >
                <span
                  className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 font-bold ${item.color}`}
                >
                  {statusCounts[item.label] || 0}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="pl-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-400">
                ({rows.length}) Appraisal Cycles Found
              </h2>
              {pageError ? (
                <p className="mt-2 text-sm font-semibold text-red-500">
                  {pageError}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search"
                className="w-96"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-4 text-xs font-bold text-slate-500">
                    Appraisal Cycle Name
                  </th>
                  <th className="px-3 py-4 text-xs font-bold text-slate-500">
                    Due Date
                  </th>
                  <th className="px-3 py-4 text-xs font-bold text-slate-500">
                    Status
                  </th>
                  <th className="px-3 py-4 text-xs font-bold text-slate-500">
                    Actions
                  </th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-500" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-12 text-center text-sm font-semibold text-slate-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-16 text-center text-sm font-semibold text-slate-400"
                    >
                      No appraisal cycles found.
                    </td>
                  </tr>
                ) : (
                  rows.map((cycle) => (
                    <tr
                      key={cycle.id}
                      className="border-b border-slate-100 hover:bg-[#fbf9ff]"
                    >
                      <td className="max-w-[360px] px-3 py-4 font-semibold text-slate-500">
                        {cycle.name}
                      </td>
                      <td className="px-3 py-4 font-semibold text-slate-500">
                        {cycle.dueDate}
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge status={normalizeStatus(cycle.status)} />
                      </td>
                      <td className="px-3 py-4">
                        <Button
                          variant="secondary"
                          className="px-6 py-2"
                          onClick={() =>
                            normalizeStatus(cycle.status) === "Closed"
                              ? reopenCycle(cycle)
                              : setCloseCycleTarget(cycle)
                          }
                        >
                          {normalizeStatus(cycle.status) === "Closed"
                            ? "Reopen"
                            : "Close"}
                        </Button>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-3">
                          <IconButton
                            title="Delete"
                            onClick={() => setDeleteCycle(cycle)}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                          <IconButton
                            title="Download Appraisals ZIP"
                            onClick={() => downloadCycle(cycle)}
                          >
                            <Download size={18} />
                          </IconButton>
                          <IconButton
                            title="Edit"
                            onClick={() =>
                              navigate(
                                `/performance/appraisal_cycles/${cycle.id}`,
                              )
                            }
                          >
                            <Edit size={18} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {deleteCycle ? (
        <ConfirmDialog
          title="Are you sure?"
          message="The selected appraisal cycle will be permanently deleted. Are you sure you want to continue?"
          confirmLabel="Yes, Delete"
          onCancel={() => setDeleteCycle(null)}
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
