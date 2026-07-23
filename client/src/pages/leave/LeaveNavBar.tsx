import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { PAGE_PATHS, isAdminRole } from "../../config/roles";

export default function LeaveNavBar() {
  const { pathname } = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = isAdminRole(user?.role);

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
    `inline-flex h-full items-center px-4 text-sm whitespace-nowrap no-underline flex-shrink-0 transition border-b-2 ${
      active
        ? "border-orange-500 text-orange-700 font-semibold bg-orange-50"
        : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
    }`;

  const entSubPaths = [
    PAGE_PATHS.leaveEntitlementsAdd,
    PAGE_PATHS.leaveEntitlementsList,
    PAGE_PATHS.leaveEntitlementsMy,
  ];
  const entActive = entSubPaths.some((p) => pathname === p);

  return (
    <nav className="flex h-full flex-shrink-0 items-stretch gap-0.5 overflow-visible">
      <Link
        to={PAGE_PATHS.leaveApply}
        className={tabCls(isActive(PAGE_PATHS.leaveApply))}
      >
        Apply
      </Link>

      <Link
        to={PAGE_PATHS.leaveList}
        className={tabCls(isActive(PAGE_PATHS.leaveList))}
      >
        Leave List
      </Link>

      {!isAdmin && (
        <Link
          to={PAGE_PATHS.leaveEntitlementsMy}
          className={tabCls(isActive(PAGE_PATHS.leaveEntitlementsMy))}
        >
          My Entitlements
        </Link>
      )}

      {isAdmin && (
        <div ref={entRef} className="relative flex flex-shrink-0 items-stretch">
          <button
            type="button"
            onClick={() => setEntOpen((o) => !o)}
            className={`flex h-full cursor-pointer items-center gap-1 border-b-2 px-4 text-sm transition ${
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
                {
                  label: "Add Entitlements",
                  path: PAGE_PATHS.leaveEntitlementsAdd,
                },
                {
                  label: "Entitlement List",
                  path: PAGE_PATHS.leaveEntitlementsList,
                },
                {
                  label: "My Entitlements",
                  path: PAGE_PATHS.leaveEntitlementsMy,
                },
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
