import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { IconHome } from "../../components/Icons";

export default function LeaveNavBar() {
  const { pathname } = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "hradmin" || user?.role === "empmanager";

  const [entOpen, setEntOpen] = useState(false);
  const entRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (entRef.current && !entRef.current.contains(event.target as Node))
        setEntOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const tabCls = (active: boolean) =>
    `px-4 py-2.5 text-sm whitespace-nowrap no-underline flex-shrink-0 transition border-b-2 ${
      active
        ? "border-orange-500 text-orange-700 font-semibold bg-orange-50"
        : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
    }`;

  const entSubPaths = [
    "/leave/entitlements/add",
    "/leave/entitlements/list",
    "/leave/entitlements/my",
  ];
  const entActive = entSubPaths.some((p) => pathname === p);

  return (
    <nav className="bg-white border-b border-slate-200 flex items-center gap-0.5 px-3 py-0 flex-shrink-0 overflow-visible">
      <Link
        to="/leave/view_leave_list"
        title="Leave Home"
        className={`flex items-center justify-center w-9 h-9 rounded mr-1 flex-shrink-0 transition no-underline ${
          isActive("/leave/dashboard")
            ? "bg-orange-100 text-orange-700"
            : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <IconHome size={16} />
      </Link>

      <Link
        to="/leave/view_leave_list"
        className={tabCls(isActive("/leave/view_leave_list"))}
      >
        Leave List
      </Link>

      <Link to="/leave/apply" className={tabCls(isActive("/leave/apply"))}>
        Apply
      </Link>

      {/* Employees see only "My Entitlements" as a direct link */}
      {!isAdmin && (
        <Link
          to="/leave/entitlements/my"
          className={tabCls(isActive("/leave/entitlements/my"))}
        >
          My Entitlements
        </Link>
      )}

      {/* Admins see the full Entitlements dropdown */}
      {isAdmin && (
        <div
          ref={entRef}
          className="relative flex-shrink-0 self-stretch flex items-center"
        >
          <button
            onClick={() => setEntOpen((o) => !o)}
            className={`flex items-center gap-1 px-4 py-2.5 text-sm border-b-2 transition cursor-pointer h-full ${
              entActive
                ? "border-orange-500 text-orange-700 font-semibold bg-orange-50"
                : "border-transparent text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            Entitlements
            <svg
              className={`w-3 h-3 transition-transform ${entOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {entOpen && (
            <div
              className="absolute top-full left-0 mt-0 bg-white border border-slate-200 rounded-lg shadow-xl py-1"
              style={{ zIndex: 9999, minWidth: "11rem" }}
            >
              {[
                { label: "Add Entitlements", path: "/leave/entitlements/add" },
                { label: "Entitlement List", path: "/leave/entitlements/list" },
                { label: "My Entitlements", path: "/leave/entitlements/my" },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setEntOpen(false)}
                  className={`block px-4 py-2 text-sm no-underline transition ${
                    pathname === item.path
                      ? "bg-orange-50 text-orange-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
