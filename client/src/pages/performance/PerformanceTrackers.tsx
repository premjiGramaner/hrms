import { Download, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { getPerformanceTrackers } from "../../api/performance.api";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { PerformanceTracker } from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";

export default function PerformanceTrackers() {
  const [tab, setTab] = useState("Tracker List");
  const [trackers, setTrackers] = useState<PerformanceTracker[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getPerformanceTrackers()
      .then(setTrackers)
      .catch(() => setTrackers([]))
      .finally(() => setLoading(false));
  }, []);
  const columns: DataTableColumn<PerformanceTracker>[] = [
    { key: "employee", header: "Employee" },
    { key: "trackerName", header: "Tracker Name" },
    {
      key: "reviewers",
      header: "Reviewers",
      render: (row) => row.reviewers.join(", "),
    },
    { key: "addedDate", header: "Added Date" },
    { key: "modifiedDate", header: "Modified Date" },
  ];

  return (
    <PerformanceLayout activeTab="Performance Trackers">
      <div className="rounded-[8px] bg-white p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex rounded-full bg-[#fbf8ff] p-1">
            {["Tracker List", "My Trackers"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-full px-6 py-2 text-sm font-semibold ${tab === item ? "bg-white text-navy-700 shadow-sm" : "text-slate-500"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">
              <Download size={16} />
              CSV Export
            </Button>
            <Button>
              <Plus size={16} />
              Add Performance Tracker
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={trackers}
          loading={loading}
          getRowId={(row) => row.id}
        />
      </div>
    </PerformanceLayout>
  );
}
