import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createAppraisalCycle,
  getPerformanceTemplates,
} from "../../api/performance.api";
import Button from "../../components/common/Button";
import DateInput from "../../components/common/DateInput";
import SelectInput from "../../components/common/SelectInput";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { AppraisalTemplate } from "../../types/performance.types";
import Toast from "../../utils/toast";
import { FieldShell, PanelTitle, SoftInput } from "./performanceUi";
import { showPerformanceError } from "./performanceNotifications";
import { PAGE_PATHS } from "../../config/roles";

export default function CreateAppraisalCycle() {
  const navigate = useNavigate();
  const [cycleName, setCycleName] = useState("PA - 2026 - 2027 - HR");
  const [location, setLocation] = useState("All");
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");
  const [dueDate, setDueDate] = useState("2027-03-31");
  const [template, setTemplate] = useState("");
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([]);

  useEffect(() => {
    getPerformanceTemplates()
      .then((data) => {
        setTemplates(data);
        setTemplate(data[0]?.id || "");
      })
      .catch(() => setTemplates([]));
  }, []);

  const save = async () => {
    if (!cycleName.trim() || !fromDate || !toDate || !dueDate || !template) {
      Toast.warning("Cycle name, dates, and template are required.");
      return;
    }
    try {
      const cycle = await createAppraisalCycle({
        name: cycleName.trim(),
        location,
        fromDate,
        toDate,
        dueDate,
        templateId: template,
      });
      Toast.created("Appraisal cycle");
      navigate(PAGE_PATHS.performanceAppraisalCycleAddEmployees(cycle.id));
    } catch (error) {
      showPerformanceError(error, "Unable to create appraisal cycle.");
    }
  };

  return (
    <PerformanceLayout
      title="Performance / Appraisals / Appraisal Cycles"
      activeTab="Appraisal Cycles"
    >
      <form className="mx-auto max-w-[1400px] rounded-[8px] bg-white p-9 pb-28">
        <PanelTitle>Appraisal Cycle Details</PanelTitle>
        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <FieldShell label="Cycle Name*">
              <SoftInput
                value={cycleName}
                onChange={(event) => setCycleName(event.target.value)}
                className="bg-[#eef4ff]"
              />
            </FieldShell>
            <SelectInput
              label="Location"
              value={location}
              onChange={setLocation}
              options={["All", "Coimbatore", "Hyderabad", "Chennai"]}
            />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <DateInput
              label="From Date"
              required
              value={fromDate}
              onChange={setFromDate}
            />
            <DateInput
              label="To Date"
              required
              value={toDate}
              onChange={setToDate}
            />
            <DateInput
              label="Due Date"
              required
              value={dueDate}
              onChange={setDueDate}
            />
          </div>

          <div className="mt-6 max-w-2xl">
            <SelectInput
              label="Template"
              required
              value={template}
              onChange={setTemplate}
              options={templates.map((item) => ({
                value: item.id,
                label: item.templateName,
              }))}
            />
          </div>
        </div>
        <div className="fixed bottom-8 right-12 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(PAGE_PATHS.performanceAppraisalCycles)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save
          </Button>
        </div>
      </form>
    </PerformanceLayout>
  );
}
