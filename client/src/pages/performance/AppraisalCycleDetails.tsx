import { Edit, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCycleAppraisals,
  getAppraisalCycle,
  getPerformanceTemplates,
  removeEmployeeFromCycle,
  updateAppraisalCycle,
} from "../../api/performance.api";
import Button from "../../components/common/Button";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/common/DataTable";
import SearchInput from "../../components/common/SearchInput";
import StatusBadge from "../../components/common/StatusBadge";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import {
  AppraisalCycle,
  AppraisalTemplate,
  PerformanceEmployee,
} from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";
import Toast from "../../utils/toast";
import { IconButton } from "./performanceUi";
import { PAGE_PATHS } from "../../config/roles";
import {
  APPRAISAL_VALIDATION_TOAST_DURATION_MS,
  CLOSED_CYCLE_MESSAGE,
  isClosedCycleStatus,
  showPerformanceError,
} from "./performanceNotifications";
import EditCycleModal, { CycleFormData } from "./EditCycleModal";

export default function AppraisalCycleDetails() {
  const { id: cycleId } = useParams();
  const navigate = useNavigate();

  const [currentCycle, setCurrentCycle] = useState<AppraisalCycle | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<
    AppraisalTemplate[]
  >([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isCreatingAppraisals, setIsCreatingAppraisals] = useState(false);
  const [isRemovingEmployee, setIsRemovingEmployee] = useState(false);
  const [employeePendingRemoval, setEmployeePendingRemoval] =
    useState<PerformanceEmployee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cycleFormData, setCycleFormData] = useState<CycleFormData>({
    templateId: "",
    fromDate: "",
    toDate: "",
    dueDate: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  useEffect(() => {
    if (!cycleId) return;

    Promise.all([getAppraisalCycle(cycleId), getPerformanceTemplates()])
      .then(([cycleData, templatesData]) => {
        setCurrentCycle(cycleData);
        setAvailableTemplates(templatesData);
        setCycleFormData({
          templateId: cycleData.templateId,
          fromDate: cycleData.fromDate,
          toDate: cycleData.toDate,
          dueDate: cycleData.dueDate,
        });
      })
      .catch(() => {
        setCurrentCycle(null);
        setAvailableTemplates([]);
      });
  }, [cycleId]);

  const filteredEmployees = useMemo(
    () =>
      (currentCycle?.employees || []).filter((employee) =>
        employee.name
          .toLowerCase()
          .includes(employeeSearchQuery.trim().toLowerCase()),
      ),
    [currentCycle?.employees, employeeSearchQuery],
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
      render: (row) => <StatusBadge status={row.status || "Not Created"} />,
    },
  ];

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeIds((currentSelectedIds) =>
      currentSelectedIds.includes(employeeId)
        ? currentSelectedIds.filter(
            (selectedEmployeeId) => selectedEmployeeId !== employeeId,
          )
        : [...currentSelectedIds, employeeId],
    );
  };

  const removeEmployee = async (employeeId: string) => {
    if (!currentCycle || isRemovingEmployee) return;

    if (isClosedCycleStatus(currentCycle.status)) {
      Toast.warning(CLOSED_CYCLE_MESSAGE);
      setEmployeePendingRemoval(null);
      return;
    }

    setIsRemovingEmployee(true);

    try {
      const updatedCycle = await removeEmployeeFromCycle(
        currentCycle.id,
        employeeId,
      );

      setCurrentCycle(updatedCycle);

      setSelectedEmployeeIds((currentSelectedIds) =>
        currentSelectedIds.filter(
          (selectedEmployeeId) => selectedEmployeeId !== employeeId,
        ),
      );

      Toast.success("Employee removed from the appraisal cycle.");
    } catch (error: unknown) {
      showPerformanceError(error, "Unable to remove employee from cycle.");
    } finally {
      setIsRemovingEmployee(false);
      setEmployeePendingRemoval(null);
    }
  };

  const createAppraisals = async () => {
    if (!currentCycle || isCreatingAppraisals) return;

    setIsCreatingAppraisals(true);
    try {
      await createCycleAppraisals(currentCycle.id);
      const updatedCycle = await getAppraisalCycle(currentCycle.id);
      setCurrentCycle(updatedCycle);
      Toast.success("Appraisals created successfully.");
      navigate(PAGE_PATHS.performanceAppraisalsList);
    } catch (error) {
      showPerformanceError(
        error,
        "Unable to create appraisals.",
        APPRAISAL_VALIDATION_TOAST_DURATION_MS,
      );
    } finally {
      setIsCreatingAppraisals(false);
    }
  };

  const openEditCycleModal = () => {
    if (!currentCycle) return;

    setCycleFormData({
      templateId: currentCycle.templateId,
      fromDate: currentCycle.fromDate,
      toDate: currentCycle.toDate,
      dueDate: currentCycle.dueDate,
    });
    setIsEditModalOpen(true);
  };

  const closeEditCycleModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveCycleChanges = async (updatedFormData: CycleFormData) => {
    if (!currentCycle || isSubmittingEdit) return;

    setIsSubmittingEdit(true);
    try {
      const updatedCycle = await updateAppraisalCycle(
        currentCycle.id,
        updatedFormData,
      );
      setCurrentCycle(updatedCycle);
      setIsEditModalOpen(false);
      Toast.success("Cycle updated successfully.");
    } catch (error: any) {
      const isConflictError = error?.response?.status === 409;
      const errorMessage = isConflictError
        ? "Cannot edit cycle. Ratings have already been submitted by supervisors or employees."
        : "Unable to update cycle.";

      if (isConflictError) {
        Toast.error(errorMessage);
      } else {
        showPerformanceError(error, errorMessage);
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (!currentCycle) {
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

  const isCycleClosed = isClosedCycleStatus(currentCycle.status);

  return (
    <PerformanceLayout
      title="Performance / Appraisals / Appraisal Cycles"
      activeTab="Appraisal Cycles"
    >
      <div className="mb-6 flex items-center justify-between rounded-[8px] bg-white px-6 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-400">
            Appraisal Cycle Status
          </p>

          <p className="font-bold text-slate-600">{currentCycle.status}</p>
        </div>

        <Button
          disabled={
            filteredEmployees.length === 0 ||
            isClosedCycleStatus(currentCycle.status)
          }
          loading={isCreatingAppraisals}
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
            {currentCycle.name}
          </div>

          <Button
            variant="secondary"
            className="mb-8 w-full"
            disabled={isCycleClosed}
            onClick={() =>
              navigate(
                `/performance/appraisal_cycles/${currentCycle.id}/add-employees`,
              )
            }
          >
            <Users size={17} />
            Add More Employees
          </Button>

          <div className="space-y-5 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-500">
                Cycle Details
              </h3>
            </div>

            {[
              ["Location", currentCycle.location],
              ["From Date", currentCycle.fromDate],
              ["To Date", currentCycle.toDate],
              ["Due Date", currentCycle.dueDate],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] bg-[#fbf9ff] p-4">
                <p className="text-xs font-semibold text-slate-400">{label}</p>

                <p className="mt-2 text-lg font-semibold text-slate-600">
                  {value}
                </p>
              </div>
            ))}

            <Button
              variant="primary"
              className="w-full"
              disabled={isCycleClosed}
              onClick={openEditCycleModal}
            >
              <Edit size={17} />
              Edit Cycle Details
            </Button>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-500">
              ({filteredEmployees.length}) Employees in this Cycle
            </h2>

            <SearchInput
              value={employeeSearchQuery}
              onChange={setEmployeeSearchQuery}
              placeholder="Search"
              className="w-96"
            />
          </div>

          <DataTable
            columns={columns}
            data={filteredEmployees}
            selectedIds={selectedEmployeeIds}
            getRowId={(row) => row.id}
            onSelectRow={isCycleClosed ? undefined : toggleEmployeeSelection}
            onSelectAll={
              isCycleClosed
                ? undefined
                : () =>
                    setSelectedEmployeeIds(
                      selectedEmployeeIds.length === filteredEmployees.length
                        ? []
                        : filteredEmployees.map((row) => row.id),
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
                  isClosedCycleStatus(currentCycle.status) || isRemovingEmployee
                }
                onClick={() => setEmployeePendingRemoval(row)}
              >
                <Trash2 size={17} />
              </IconButton>
            )}
          />
        </section>
      </div>
      {employeePendingRemoval ? (
        <ConfirmDialog
          title="Remove Employee?"
          message={`Remove ${employeePendingRemoval.name} from this appraisal cycle? Any appraisal created for this employee in the cycle will also be deleted.`}
          confirmLabel={isRemovingEmployee ? "Removing..." : "Yes, Remove"}
          loading={isRemovingEmployee}
          onCancel={() => {
            if (!isRemovingEmployee) setEmployeePendingRemoval(null);
          }}
          onConfirm={() => removeEmployee(employeePendingRemoval.id)}
        />
      ) : null}

      <EditCycleModal
        isOpen={isEditModalOpen}
        initialData={cycleFormData}
        templates={availableTemplates}
        isSubmitting={isSubmittingEdit}
        onClose={closeEditCycleModal}
        onSave={handleSaveCycleChanges}
      />
    </PerformanceLayout>
  );
}
