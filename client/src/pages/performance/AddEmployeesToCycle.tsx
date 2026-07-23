import { RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addEmployeesToCycle,
  getAppraisalCycle,
  getPerformanceEmployees,
} from "../../api/performance.api";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import SearchInput from "../../components/common/SearchInput";
import SelectInput from "../../components/common/SelectInput";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import {
  AppraisalCycle,
  PerformanceEmployee,
} from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";
import Toast from "../../utils/toast";
import { IconButton, SoftInput } from "./performanceUi";
import { PAGE_PATHS } from "../../config/roles";
import {
  CLOSED_CYCLE_MESSAGE,
  isClosedCycleStatus,
  showPerformanceError,
} from "./performanceNotifications";

export default function AddEmployeesToCycle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<AppraisalCycle | null>(null);
  const [employees, setEmployees] = useState<PerformanceEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [subUnit, setSubUnit] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [status, setStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    Promise.all([
      getAppraisalCycle(id),
      getPerformanceEmployees({
        limit: 500,
        search: query,
        location,
        subUnit,
        jobTitle,
        employmentStatus: status,
      }),
    ])
      .then(([cycleData, employeeData]) => {
        if (!active) return;
        setCycle(cycleData);
        setEmployees(employeeData.data);
        if (isClosedCycleStatus(cycleData.status)) {
          Toast.warning(CLOSED_CYCLE_MESSAGE);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, query, location, subUnit, jobTitle, status]);

  const rows = useMemo(
    () =>
      employees.filter((employee) => !cycle?.employeeIds.includes(employee.id)),
    [cycle?.employeeIds, employees],
  );
  const locations = useMemo(
    () => [
      ...new Set(
        employees.map((employee) => employee.location).filter(Boolean),
      ),
    ],
    [employees],
  );
  const subUnits = useMemo(
    () => [
      ...new Set(employees.map((employee) => employee.subUnit).filter(Boolean)),
    ],
    [employees],
  );

  const columns: DataTableColumn<PerformanceEmployee>[] = [
    { key: "employeeId", header: "Id", sortable: true },
    { key: "name", header: "Employee Name", sortable: true },
    { key: "jobTitle", header: "Job Title", sortable: true },
    { key: "subUnit", header: "Sub Unit", sortable: true },
    { key: "location", header: "Location", sortable: true },
  ];

  const toggle = (employeeId: string) =>
    setSelectedIds((current) =>
      current.includes(employeeId)
        ? current.filter((item) => item !== employeeId)
        : [...current, employeeId],
    );
  const reset = () => {
    setLocation("");
    setSubUnit("");
    setJobTitle("");
    setStatus("");
  };
  const submit = async () => {
    if (!cycle) return;
    if (isClosedCycleStatus(cycle.status)) {
      Toast.warning(CLOSED_CYCLE_MESSAGE);
      return;
    }
    try {
      await addEmployeesToCycle(cycle.id, selectedIds);
      Toast.success(
        `${selectedIds.length} employee${selectedIds.length === 1 ? "" : "s"} added to the appraisal cycle.`,
      );
      navigate(`/performance/appraisal_cycles/${cycle.id}`);
    } catch (error) {
      showPerformanceError(error, "Unable to add employees to this cycle.");
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

  if (isClosedCycleStatus(cycle.status)) {
    return (
      <PerformanceLayout
        title={`Performance / Appraisals / Appraisal Cycles / ${cycle.name}`}
        activeTab="Appraisal Cycles"
      >
        <div className="rounded-[8px] bg-white p-8">
          <p className="font-semibold text-amber-600">{CLOSED_CYCLE_MESSAGE}</p>
          <Button
            className="mt-5"
            onClick={() =>
              navigate(`/performance/appraisal_cycles/${cycle.id}`)
            }
          >
            Back to Cycle
          </Button>
        </div>
      </PerformanceLayout>
    );
  }

  return (
    <PerformanceLayout
      title={`Performance / Appraisals / Appraisal Cycles / ${cycle.name}`}
      activeTab="Appraisal Cycles"
    >
      <div className="grid gap-6 rounded-[8px] bg-white p-6 xl:grid-cols-[330px_1fr]">
        <aside className="border-r border-slate-100 pr-6">
          <div className="mb-6 rounded-[8px] bg-[#fbf9ff] px-4 py-3 text-lg font-bold text-slate-600">
            {cycle.name}
          </div>
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm font-bold text-slate-500">Filters</span>
            <IconButton title="Reset filters" onClick={reset}>
              <RotateCw size={18} />
            </IconButton>
          </div>
          <div className="space-y-4">
            <SelectInput
              label="Location"
              value={location}
              onChange={setLocation}
              options={locations}
            />
            <SelectInput
              label="Sub Unit"
              value={subUnit}
              onChange={setSubUnit}
              options={subUnits}
            />
            <label className="block text-sm font-semibold text-slate-500">
              Job Title
              <span className="mt-2 block">
                <SoftInput
                  placeholder="Type for hints..."
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                />
              </span>
            </label>
          </div>
        </aside>
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-500">
              ({selectedIds.length || rows.length}){" "}
              {selectedIds.length ? "Employee Selected" : "Employees Found"}
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
            loading={loading}
            selectable
            selectedIds={selectedIds}
            getRowId={(row) => row.id}
            onSelectRow={toggle}
            onSelectAll={() =>
              setSelectedIds(
                selectedIds.length === rows.length
                  ? []
                  : rows.map((row) => row.id),
              )
            }
          />
          <div className="mt-8 flex justify-end gap-4 border-t border-slate-200 pt-6">
            <Button
              variant="secondary"
              onClick={() =>
                navigate(PAGE_PATHS.performanceAppraisalCycle(cycle.id))
              }
            >
              Cancel
            </Button>
            <Button disabled={selectedIds.length === 0} onClick={submit}>
              Add Selected to Cycle
            </Button>
          </div>
        </section>
      </div>
    </PerformanceLayout>
  );
}
