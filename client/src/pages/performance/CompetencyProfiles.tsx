import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getCompetencyProfiles } from "../../api/performance.api";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { CompetencyProfile } from "../../types/performance.types";
import { DataTableColumn } from "../../types/table.types";
import { IconButton } from "./performanceUi";

export default function CompetencyProfiles() {
  const [profiles, setProfiles] = useState<CompetencyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCompetencyProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);
  const columns: DataTableColumn<CompetencyProfile>[] = [
    { key: "jobTitle", header: "Job Title", sortable: true },
    {
      key: "subUnits",
      header: "Sub Units",
      render: (row) => row.subUnits.join(", "),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <PerformanceLayout activeTab="Competency Profiles">
      <div className="rounded-[8px] bg-white p-8">
        <div className="mb-6 flex justify-end">
          <Button>
            <Plus size={16} />
            New Competency Profile
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={profiles}
          loading={loading}
          getRowId={(row) => row.id}
          actions={() => (
            <div className="flex justify-end gap-2">
              <IconButton title="Edit">
                <Edit size={16} />
              </IconButton>
              <IconButton title="Delete">
                <Trash2 size={16} />
              </IconButton>
            </div>
          )}
        />
      </div>
    </PerformanceLayout>
  );
}
