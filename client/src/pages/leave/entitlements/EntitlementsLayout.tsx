import React from "react";
import { Link, useLocation } from "react-router-dom";
import LeaveLayout from "../LeaveLayout";

const SUB_TABS = [
  { label: "Add Entitlements", path: "/leave/entitlements/add" },
  { label: "Entitlement List", path: "/leave/entitlements/list" },
  { label: "My Entitlements", path: "/leave/entitlements/my" },
];

interface Props { children: React.ReactNode }

export default function EntitlementsLayout({ children }: Props) {
  const { pathname } = useLocation();

  return (
    <LeaveLayout>
      <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex overflow-x-auto gap-2">
        {SUB_TABS.map((tab) => {
          const active = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-6 py-2 text-sm font-medium whitespace-nowrap rounded-full
                ${active
                  ? "bg-[#FFF3E0] text-[#C2410C]"
                  : "text-[#757575] hover:bg-gray-50"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </LeaveLayout>
  );
}
