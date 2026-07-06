import React from "react";
import { useAppSelector } from "../../app/hooks";
import { performanceTabs } from "../../config/performanceNavigation";
import { isAdminRole, isSupervisorRole } from "../../config/roles";
import Layout from "../Layout";

export default function PerformanceLayout({
  children,
  title = "Performance",
  activeTab,
  onFab,
}: {
  children: React.ReactNode;
  title?: string;
  activeTab?: string;
  onFab?: () => void;
}) {
  const role = useAppSelector((state) => state.auth.user?.role || "employee");
  const isPerformanceAdmin = isAdminRole(role);
  const canReviewTeam = isSupervisorRole(role);
  const visibleTabs = isPerformanceAdmin
    ? performanceTabs.filter((tab) => tab.label !== "Team Appraisals")
    : performanceTabs.filter(
        (tab) =>
          tab.label === "My Appraisals" ||
          (canReviewTeam && tab.label === "Team Appraisals"),
      );

  return (
    <Layout
      title={title}
      tabs={visibleTabs}
      activeTab={activeTab}
      onFab={isPerformanceAdmin ? onFab : undefined}
    >
      <div className="min-h-full bg-[#fbf6ff]">{children}</div>
    </Layout>
  );
}
