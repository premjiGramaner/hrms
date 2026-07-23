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

interface RemoveEmployeeConfirmationModalProps {
  employeeName: string;
  loading: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

function RemoveEmployeeConfirmationModal({
  employeeName,
  loading,
  onConfirm,
  onClose,
}: RemoveEmployeeConfirmationModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-employee-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h3
          id="remove-employee-title"
          className="mb-3 text-base font-bold text-slate-800"
        >
          Remove Employee
        </h3>

        <p className="mb-5 text-sm text-slate-600">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-slate-800">
            {employeeName}
          </span>{" "}
          from this appraisal cycle?
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            No, Keep Employee
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex min-w-28 cursor-pointer items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Removing...
              </>
            ) : (
              "Yes, Remove"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppraisalCycleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState<AppraisalCycle | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [employeeToRemove, setEmployeeToRemove] =
    useState<PerformanceEmployee | null>(null);

  const [isRemovingEmployee, setIsRemovingEmployee] =
    useState(false);

  useEffect(() => {
    if (!id) return;

    getAppraisalCycle(id)
      .then(setCycle)
      .catch(() => setCycle(null));
  }, [id]);

  const rows = useMemo(
    () =>
      (cycle?.employees || []).filter((employee) =>
        employee.name
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [cycle?.employees, query],
  );

  const columns: DataTableColumn<PerformanceEmployee>[] = [
    {
      key: "name",
      header: "Employee Name",
    },
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
      render: (row) => (
        <StatusBadge status={row.status || "Not Created"} />
      ),
    },
  ];

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedIds((currentSelectedIds) =>
      currentSelectedIds.includes(employeeId)
        ? currentSelectedIds.filter(
            (selectedEmployeeId) =>
              selectedEmployeeId !== employeeId,
          )
        : [...currentSelectedIds, employeeId],
    );
  };

  const handleOpenRemoveConfirmation = (
    employee: PerformanceEmployee,
  ) => {
    if (!cycle) return;

    if (isClosedCycleStatus(cycle.status)) {
      Toast.warning(CLOSED_CYCLE_MESSAGE);
      return;
    }

    setEmployeeToRemove(employee);
  };

  const handleCloseRemoveConfirmation = () => {
    if (isRemovingEmployee) return;

    setEmployeeToRemove(null);
  };

  const handleRemoveEmployeeConfirm = async () => {
    if (!cycle || !employeeToRemove) return;

    if (isClosedCycleStatus(cycle.status)) {
      Toast.warning(CLOSED_CYCLE_MESSAGE);
      setEmployeeToRemove(null);
      return;
    }

    const employeeId = employeeToRemove.id;

    setIsRemovingEmployee(true);

    try {
      const updatedCycle = await removeEmployeeFromCycle(
        cycle.id,
        employeeId,
      );

      setCycle(updatedCycle);

      setSelectedIds((currentSelectedIds) =>
        currentSelectedIds.filter(
          (selectedEmployeeId) =>
            selectedEmployeeId !== employeeId,
        ),
      );

      setEmployeeToRemove(null);

      Toast.success(
        "Employee removed from the appraisal cycle.",
      );
    } catch (error: unknown) {
      showPerformanceError(
        error,
        "Unable to remove employee from cycle.",
      );
    } finally {
      setIsRemovingEmployee(false);
    }
  };

  const createAppraisals = async () => {
    if (!cycle) return;

    try {
      await createCycleAppraisals(cycle.id);

      const updatedCycle = await getAppraisalCycle(cycle.id);

      setCycle(updatedCycle);

      Toast.success("Appraisals created successfully.");

      navigate(PAGE_PATHS.performanceAppraisalsList);
    } catch (error: unknown) {
      showPerformanceError(
        error,
        "Unable to create appraisals.",
      );
    }
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

  const isCycleClosed = isClosedCycleStatus(cycle.status);

  return (
    <PerformanceLayout
      title="Performance / Appraisals / Appraisal Cycles"
      activeTab="Appraisal Cycles"
    >
      {employeeToRemove && (
        <RemoveEmployeeConfirmationModal
          employeeName={employeeToRemove.name}
          loading={isRemovingEmployee}
          onConfirm={handleRemoveEmployeeConfirm}
          onClose={handleCloseRemoveConfirmation}
        />
      )}

      <div className="mb-6 flex items-center gap-8 rounded-[8px] bg-white px-6 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-400">
            Appraisal Cycle Status
          </p>

          <p className="font-bold text-slate-600">
            {cycle.status}
          </p>
        </div>

        <Stepper active={1} />

        <Button
          disabled={rows.length === 0 || isCycleClosed}
          onClick={createAppraisals}
        >
          Create Appraisals
        </Button>
      </div>

      {isCycleClosed ? (
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
            disabled={isCycleClosed}
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
            <h3 className="text-sm font-bold text-slate-500">
              Cycle Details
            </h3>

            {[
              ["Location", cycle.location],
              ["From Date", cycle.fromDate],
              ["To Date", cycle.toDate],
              ["Due Date", cycle.dueDate],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[8px] bg-[#fbf9ff] p-4"
              >
                <p className="text-xs font-semibold text-slate-400">
                  {label}
                </p>

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
              isCycleClosed
                ? undefined
                : toggleEmployeeSelection
            }
            onSelectAll={
              isCycleClosed
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
                  isCycleClosed
                    ? "Closed cycles cannot be edited"
                    : "Remove employee"
                }
                disabled={
                  isCycleClosed || isRemovingEmployee
                }
                onClick={() =>
                  handleOpenRemoveConfirmation(row)
                }
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