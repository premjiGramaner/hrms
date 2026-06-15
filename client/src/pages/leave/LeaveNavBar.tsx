import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { IconHome } from "../../components/Icons";

interface NavLink { label: string; path: string }

const NAV_LINKS: NavLink[] = [
  { label: "Leave List",     path: "/leave/view_leave_list" },
  { label: "Assign Leave",   path: "/leave/assign_leave" },
  { label: "Bulk Assign",    path: "/leave/bulk_assign" },
  { label: "Apply",          path: "/leave/apply" },
  { label: "My Leave Usage", path: "/leave/my_leave_usage" },
  { label: "Leave Calendar", path: "/leave/calendar" },
  { label: "My Leave",       path: "/leave/my_leave" },
];

const MORE_ITEMS = [
  {
    label: "Entitlements",
    path: "/leave/entitlements",
    children: [
      { label: "Add Entitlements", path: "/leave/entitlements/add" },
      { label: "Entitlement List", path: "/leave/entitlements/list" },
      { label: "My Entitlements",  path: "/leave/entitlements/my" },
    ],
  },
  { label: "Configure", path: "/leave/configure", children: [] },
];

export default function LeaveNavBar() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen]           = useState(false);
  const [entOpen,  setEntOpen]            = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
        setEntOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isActive     = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const isMoreActive = MORE_ITEMS.some((m) => isActive(m.path));

  return (
    <nav className="bg-white border-b border-slate-200 flex items-center gap-0.5 px-3 py-0 flex-shrink-0 flex-wrap overflow-visible">
      <Link
        to="/leave/dashboard"
        title="Leave Dashboard"
        className={`flex items-center justify-center w-9 h-9 rounded mr-1 flex-shrink-0 transition no-underline
          ${isActive("/leave/dashboard") ? "bg-orange-100 text-orange-700" : "text-slate-500 hover:bg-slate-100"}`}
      >
        <IconHome size={16} />
      </Link>

      {NAV_LINKS.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`px-3.5 py-2.5 text-sm whitespace-nowrap no-underline flex-shrink-0 transition border-b-2
            ${isActive(link.path)
              ? "border-orange-500 text-orange-700 font-semibold bg-orange-50"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"}`}
        >
          {link.label}
        </Link>
      ))}

      <div ref={moreRef} className="relative flex-shrink-0 self-stretch flex items-center">
        <button
          onClick={() => { setMoreOpen((o) => !o); setEntOpen(false); }}
          className={`flex items-center gap-1 px-3.5 py-2.5 text-sm border-b-2 transition cursor-pointer h-full
            ${isMoreActive
              ? "border-orange-500 text-orange-700 font-semibold bg-orange-50"
              : "border-transparent text-slate-600 hover:text-slate-900 font-medium"}`}
        >
          More
          <svg className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {moreOpen && (
          <div
            className="absolute top-full left-0 mt-0 bg-white border border-slate-200 rounded-lg shadow-xl py-1"
            style={{ zIndex: 9999, minWidth: "11rem" }}
          >
            {MORE_ITEMS.map((item) => (
              <div key={item.path} className="relative">
                {item.children.length > 0 ? (
                  <button
                    onClick={() => setEntOpen((o) => !o)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm transition cursor-pointer
                      ${isActive(item.path)
                        ? "bg-orange-50 text-orange-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    <span>{item.label}</span>
                    <svg className={`w-3.5 h-3.5 transition-transform ml-3 ${entOpen ? "rotate-90" : ""}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => { setMoreOpen(false); setEntOpen(false); }}
                    className={`block px-4 py-2 text-sm no-underline transition
                      ${isActive(item.path)
                        ? "bg-orange-50 text-orange-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    {item.label}
                  </Link>
                )}

                {item.children.length > 0 && entOpen && (
                  <div className="bg-slate-50 border-t border-slate-100 py-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => { setMoreOpen(false); setEntOpen(false); }}
                        className={`flex items-center gap-2 px-6 py-2 text-sm no-underline transition
                          ${pathname === child.path
                            ? "text-orange-700 font-semibold bg-orange-50"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white"}`}
                      >
                        <span className="w-1 h-1 rounded-full bg-current opacity-60 flex-shrink-0" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
