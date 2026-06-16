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
      <div className="-mx-6 -mt-6 bg-white border-b border-slate-200 flex items-center px-4 gap-0.5 mb-6">
        {SUB_TABS.map((tab) => {
          const active = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-4 py-2.5 text-sm no-underline whitespace-nowrap transition border-b-2
                ${active
                  ? "border-orange-500 text-orange-700 font-semibold bg-orange-50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"}`}
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
