import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../../app/hooks";
import LeaveLayout from "../LeaveLayout";
import { PAGE_PATHS, isAdminRole } from "../../../config/roles";

const ADMIN_TABS = [
  { label: "Add Entitlements", path: PAGE_PATHS.leaveEntitlementsAdd },
  { label: "Entitlement List", path: PAGE_PATHS.leaveEntitlementsList },
  { label: "My Entitlements", path: PAGE_PATHS.leaveEntitlementsMy },
];

const EMPLOYEE_TABS = [
  { label: "My Entitlements", path: PAGE_PATHS.leaveEntitlementsMy },
];

interface Props {
  children: React.ReactNode;
}

export default function EntitlementsLayout({ children }: Props) {
  const { pathname } = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = isAdminRole(user?.role);
  const tabs = isAdmin ? ADMIN_TABS : EMPLOYEE_TABS;

  return (
    <LeaveLayout>
      {isAdmin && (
        <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex overflow-x-auto gap-2">
          {tabs.map((tab) => {
            const active = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`px-6 py-2 text-sm font-medium whitespace-nowrap rounded-full
                  ${
                    active
                      ? "bg-[#FFF3E0] text-[#C2410C]"
                      : "text-[#757575] hover:bg-gray-50"
                  }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}
      {children}
    </LeaveLayout>
  );
}
