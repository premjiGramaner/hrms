import type { TabItem } from "../../components/Layout";
import { PAGE_PATHS } from "../../config/roles";

export const REPORT_TABS: TabItem[] = [
  { label: "Birthday Report", path: PAGE_PATHS.reportsBirthday },
  { label: "Work Anniversary", path: PAGE_PATHS.reportsWorkAnniversary },
  { label: "Termination Report", path: PAGE_PATHS.reportsTermination },
  {
    label: "Leave by Department",
    path: PAGE_PATHS.reportsLeaveByDepartment,
  },
  { label: "Employee Contact", path: PAGE_PATHS.reportsEmployeeContact },
  { label: "Notifications", path: PAGE_PATHS.reportsNotifications },
];
