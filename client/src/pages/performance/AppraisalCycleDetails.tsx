import { Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCycleAppraisals,
  getAppraisalCycle,
  removeEmployeeFromCycle,
} from "../../api/performance.api";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import SearchInput from "../../components/common/SearchInput";
import StatusBadge from "../../components/common/StatusBadge";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import {
  AppraisalCycle,
  PerformanceEmployee,
} from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";
import Toast from "../../utils/toast";
import { IconButton, Stepper } from "./performanceUi";
import { PAGE_PATHS } from "../../config/roles";
import {
  CLOSED_CYCLE_MESSAGE,
  isClosedCycleStatus,
  showPerformanceError,
} from "./performanceNotifications";

export default function AppraisalCycleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<AppraisalCycle | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    getAppraisalCycle(id)
      .then(setCycle)
      .catch(() => setCycle(null));
  }, [id]);

  const rows = useMemo(
    () =>
      (cycle?.employees || []).filter((employee) =>
        employee.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [cycle?.employees, query],
  );

  const columns: DataTableColumn<PerformanceEmployee>[] = [
    { key: "name", header: "Employee Name" },
    {
      key: "mainEvaluator",
      header: "Main Evaluator",
      render: (row) => {
        const evaluator =
          row.mainEvaluator ??
          row.evaluators?.[0] ??
          row.supervisors?.[0] ??
          null;

        return evaluator ? (
          <span className="rounded-full bg-[#f2eef6] px-4 py-2 text-sm font-semibold text-slate-600">
            {evaluator.name}
          </span>
        ) : (
          <span className="text-sm font-semibold text-slate-400">
            No supervisor assigned
          </span>
        );
      },
    },
    {
      key: "evaluators",
      header: "Evaluators",
      render: (row) => {
        const evaluator =
          row.mainEvaluator ??
          row.evaluators?.[0] ??
          row.supervisors?.[0] ??
          null;

        return (
          <div className="flex flex-wrap gap-2">
            {evaluator ? (
              <span className="rounded-full bg-[#f2eef6] px-3 py-1 text-xs font-semibold text-slate-500">
                {evaluator.name}
              </span>
            ) : null}
            <span className="rounded-full bg-[#f2eef6] px-3 py-1 text-xs font-semibold text-slate-500">
              {row.name}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status || "Not Created"} />,
    },
  ];

  const toggle = (employeeId: string) =>
    setSelectedIds((current) =>
      current.includes(employeeId)
        ? current.filter((item) => item !== employeeId)
        : [...current, employeeId],
    );
  const removeEmployee = async (employeeId: string) => {
    if (!cycle) return;
    if (isClosedCycleStatus(cycle.status)) {
      Toast.warning(CLOSED_CYCLE_MESSAGE);
      return;
    }
    try {
      const next = await removeEmployeeFromCycle(cycle.id, employeeId);
      setCycle(next);
      Toast.success("Employee removed from the appraisal cycle.");
    } catch (error) {
      showPerformanceError(error, "Unable to remove employee from cycle.");
    }
  };
  const createAppraisals = async () => {
    if (!cycle) return;
    await createCycleAppraisals(cycle.id);
    const next = await getAppraisalCycle(cycle.id);
    setCycle(next);
    Toast.success("Appraisals created successfully.");
    navigate(PAGE_PATHS.performanceAppraisalsList);
  };

  if (!cycle) {
    return (
      <PerformanceLayout
        title="Performance / Appraisals / Appraisal Cycles"
        activeTab="Appraisal Cycles"
      >
        <div className="rounded-[8px] bg-white p-8 text-sm font-semibold text-slate-500">
          Loading cycle...
        </div>
      </PerformanceLayout>
    );
  }

  return (
    <PerformanceLayout
      title="Performance / Appraisals / Appraisal Cycles"
      activeTab="Appraisal Cycles"
    >
      <div className="mb-6 flex items-center gap-8 rounded-[8px] bg-white px-6 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-400">
            Appraisal Cycle Status
          </p>
          <p className="font-bold text-slate-600">{cycle.status}</p>
        </div>
        <Stepper active={1} />
        <Button
          disabled={rows.length === 0 || isClosedCycleStatus(cycle.status)}
          onClick={createAppraisals}
        >
          Create Appraisals
        </Button>
      </div>
      {isClosedCycleStatus(cycle.status) ? (
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {CLOSED_CYCLE_MESSAGE}
        </p>
      ) : null}
      <div className="grid gap-6 rounded-[8px] bg-white p-6 xl:grid-cols-[330px_1fr]">
        <aside className="border-r border-slate-100 pr-6">
          <div className="mb-8 rounded-[8px] bg-[#fbf9ff] px-4 py-4 text-lg font-bold text-slate-600">
            {cycle.name}
          </div>
          <Button
            variant="secondary"
            className="mb-8 w-full"
            disabled={isClosedCycleStatus(cycle.status)}
            onClick={() =>
              navigate(
                `/performance/appraisal_cycles/${cycle.id}/add-employees`,
              )
            }
          >
            <Users size={17} />
            Add More Employees
          </Button>
          <div className="space-y-5 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-500">Cycle Details</h3>
            {[
              ["Location", cycle.location],
              ["From Date", cycle.fromDate],
              ["To Date", cycle.toDate],
              ["Due Date", cycle.dueDate],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] bg-[#fbf9ff] p-4">
                <p className="text-xs font-semibold text-slate-400">{label}</p>
                <p className="mt-2 text-lg font-semibold text-slate-600">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </aside>
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-500">
              ({rows.length}) Employees in this Cycle
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
            data={rows}
            selectedIds={selectedIds}
            getRowId={(row) => row.id}
            onSelectRow={
              isClosedCycleStatus(cycle.status) ? undefined : toggle
            }
            onSelectAll={
              isClosedCycleStatus(cycle.status)
                ? undefined
                : () =>
                    setSelectedIds(
                      selectedIds.length === rows.length
                        ? []
                        : rows.map((row) => row.id),
                    )
            }
            actions={(row) => (
              <IconButton
                title={
                  isClosedCycleStatus(cycle.status)
                    ? "Closed cycles cannot be edited"
                    : "Delete"
                }
                disabled={isClosedCycleStatus(cycle.status)}
                onClick={() => removeEmployee(row.id)}
              >
                <Trash2 size={17} />
              </IconButton>
            )}
          />
        </section>
      </div>
    </PerformanceLayout>
  );
}
