import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout as logoutAction } from "../store/authSlice";
import cannyforeLogo from "../assets/cannyfore_title_logo.png";

import {
  IconBuilding,
  IconPeople,
  IconChart,
  IconCalendar,
  IconBriefcase,
  IconSearch,
  IconGear,
  IconLogout,
  IconHome,
  IconFilter,
  IconShare,
} from "./Icons";

export interface TabItem {
  label: string;
  path: string;
}
interface Props {
  children: React.ReactNode;
  title?: string;
  tabs?: TabItem[];
  activeTab?: string;
  onFab?: () => void;
}

const HR_ADMIN_SUB_ITEMS: { label: string; path: string }[] = [];

export default function Layout({
  children,
  title,
  tabs,
  activeTab,
  onFab,
}: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role || "employee";
  const username = user?.name || user?.username || "User";
  const roleLabel =
    role === "empmanager" ? "Employee Manager" : role === "hradmin" ? "HR Administrator" : "Employee";

  const isActive = (path: string) => location.pathname.startsWith(path);

  const isHrAdminActive = isActive("/hradmin");

  const pageTitle =
    title ||
    (isActive("/employees") || isActive("/my-info")
      ? "Employee Management"
      : isActive("/hradmin") || isActive("/roles")
        ? "HR Administration"
        : isActive("/leave")
          ? "Leave"
          : isActive("/goals")
            ? "Goals"
            : "HRMS");

  const navItems = [
    ...(role === "hradmin" || role === "empmanager"
      ? [
          {
            to: "/hradmin/job-titles",
            label: "HR Administration",
            icon: <IconBuilding />,
            subItems: HR_ADMIN_SUB_ITEMS,
          },
        ]
      : []),
    { to: "/employees", label: "Employee Management", icon: <IconPeople /> },
    { to: "#", label: "Reports and Analytics", icon: <IconChart /> },
    { to: "/leave/view_leave_list", label: "Leave", icon: <IconCalendar /> },
    { to: "#", label: "Performance", icon: <IconBriefcase /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <div className="relative">
        <aside
          style={{
            width: collapsed ? 72 : 230,
            transition: "width 250ms ease-in-out"
          }}
          className="flex flex-col bg-white shadow-lg relative z-10 flex-shrink-0 h-screen overflow-hidden"
        >
          {/* Logo - Fixed at top */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-center flex-shrink-0 min-h-[80px]">
            <img
              src={cannyforeLogo}
              alt="Cannyfore"
              className="h-10 max-w-[9rem] object-contain"
              style={{
                opacity: collapsed ? 0 : 1,
                transition: "opacity 250ms ease-in-out"
              }}
            />
          </div>

          {/* Profile */}
          <div
            className="px-4 flex flex-col items-center text-center flex-shrink-0 border-b border-slate-100 overflow-hidden"
            style={{
              maxHeight: collapsed ? 0 : "180px",
              paddingTop: collapsed ? 0 : "20px",
              paddingBottom: collapsed ? 0 : "12px",
              opacity: collapsed ? 0 : 1,
              transition: "max-height 250ms ease-in-out, opacity 250ms ease-in-out, padding 250ms ease-in-out",
            }}
          >
            <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center border-[3px] border-white shadow-md mb-2 flex-shrink-0">
              {user?.avatar ? (
                <img src={`/uploads/${user.avatar}`} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-white text-2xl font-bold">{username.charAt(0).toUpperCase()}</span>
              )}
              <div className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                <IconGear size={10} color="#888" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-1 mb-0 leading-tight truncate w-full">{username}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate w-full">{roleLabel}</p>
          </div>

          {/* Search */}
          <div
            className="px-3 flex-shrink-0 border-b border-slate-100 overflow-hidden"
            style={{
              maxHeight: collapsed ? 0 : "56px",
              paddingTop: collapsed ? 0 : "0px",
              paddingBottom: collapsed ? 0 : "12px",
              opacity: collapsed ? 0 : 1,
              transition: "max-height 250ms ease-in-out, opacity 250ms ease-in-out, padding 250ms ease-in-out",
            }}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-3.5 pr-8 py-[7px] border border-slate-200 rounded-full text-xs text-slate-600 bg-slate-50 outline-none"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <IconSearch size={13} color="#94a3b8" />
              </span>
            </div>
          </div>

        <nav className="flex-1 px-2 py-1 pb-6 overflow-y-auto">
          {navItems.map((item) => {
            const hasSubItems = !!(item.subItems && item.subItems.length > 0);
            const isHrAdminItem = item.to.startsWith("/hradmin");
            const parentActive = isHrAdminItem
              ? isActive("/hradmin")
              : item.to !== "#" && isActive(item.to);
            const parentExpanded = hasSubItems && isHrAdminActive;
            const hovered = hoveredNav === item.label;

            return (
              <div key={item.label}>
                <NavItem
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={parentActive}
                  expanded={parentExpanded}
                  hovered={hovered}
                  hasSubItems={hasSubItems}
                  subExpanded={parentExpanded}
                  onMouseEnter={() => setHoveredNav(item.label)}
                  onMouseLeave={() => setHoveredNav("")}
                />

                {hasSubItems && isHrAdminActive && (
                  <div className="ml-4 mb-1 border-l-2 border-slate-100 pl-2">
                    {item.subItems!.map((sub) => {
                      const subActive = location.pathname === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`flex items-center gap-2 px-2.5 py-1.75 rounded-xl text-xs no-underline mb-0.5 transition ${
                            subActive
                              ? "font-semibold text-blue-900 bg-blue-50"
                              : "font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                              subActive ? "bg-blue-900" : "bg-slate-300"
                            }`}
                          />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Toggle Button - Always visible */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute w-7 h-7 rounded-full bg-[#233B86] border-none text-white cursor-pointer z-50 flex items-center justify-center shadow-md text-sm font-bold hover:bg-[#1a2d6b] active:scale-95"
          style={{
            right: "-14px",
            top: "50%",
            transform: "translateY(-50%)",
            transition: "background-color 250ms ease-in-out"
          }}
        >
          <span style={{
            display: "inline-block",
            transition: "transform 250ms ease-in-out",
            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)"
          }}>
            {collapsed ? "›" : "‹"}
          </span>
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-gradient-to-r from-blue-900 to-teal-600 flex items-center justify-between px-6 flex-shrink-0 shadow-md">
          <span className="text-white font-bold text-lg tracking-wide">
            {pageTitle}
          </span>
          <button
            onClick={() => {
              dispatch(logoutAction());
              navigate("/login");
            }}
            className="flex items-center gap-1.75 bg-white/20 border border-white/35 text-white rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer hover:bg-white/30 transition"
          >
            <IconLogout size={15} />
            Log Out
            <span className="text-xs opacity-80">▾</span>
          </button>
        </header>

        {tabs && tabs.length > 0 && (
          <div className="bg-white border-b border-blue-100 flex items-center gap-1 px-4 py-2 flex-shrink-0 overflow-x-auto">
            <Link
              to={tabs[0]?.path || "#"}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 mr-1 no-underline hover:bg-slate-200 transition"
            >
              <IconHome size={15} color="#64748b" />
            </Link>

            {tabs.map((tab) => {
              const isActiveTab =
                activeTab === tab.label || location.pathname === tab.path;
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  className={`px-4 py-1.75 rounded-full text-sm no-underline whitespace-nowrap flex-shrink-0 transition ${
                    isActiveTab
                      ? "font-semibold text-amber-700 bg-orange-100"
                      : "font-medium text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {tab.label}
                </Link>
              );
            })}

            <div className="ml-auto flex items-center gap-1.5">
              <TabIconBtn>
                <IconFilter size={14} />
              </TabIconBtn>
              <TabIconBtn dark>
                <span className="font-bold text-sm">?</span>
              </TabIconBtn>
              <TabIconBtn>
                <IconShare size={14} />
              </TabIconBtn>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {onFab && (
          <button
            onClick={onFab}
            className="fixed bottom-8 right-8 w-13 h-13 rounded-full bg-blue-900 text-white border-none text-3xl cursor-pointer shadow-2xl z-50 flex items-center justify-center hover:bg-blue-800 transition"
            aria-label="Add"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
  expanded,
  hovered,
  hasSubItems,
  subExpanded,
  onMouseEnter,
  onMouseLeave,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  expanded?: boolean;
  hovered: boolean;
  hasSubItems?: boolean;
  subExpanded?: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const content = (
    <>
      <span className="flex items-center flex-shrink-0 min-w-fit">{icon}</span>
      <span
        className={`flex items-center flex-shrink-0 ${
          active || expanded ? "opacity-100" : "opacity-70"
        }`}
      >
        {icon}
      </span>
      <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1">
        {label}
      </span>
      {hasSubItems && (
        <span
          className={`text-xs flex-shrink-0 transition-transform duration-200 ${
            subExpanded ? "rotate-90" : ""
          } ${active ? "text-white/70" : "text-slate-400"}`}
        >
          ›
        </span>
      )}
    </>
  );

  const baseClass =
    "flex items-center gap-2.5 px-3 py-2.75 rounded-2xl text-sm transition no-underline mb-0.5 cursor-pointer";

  const classes = active
    ? `${baseClass} font-semibold bg-gradient-to-r from-blue-900 to-teal-600 text-white shadow-md`
    : expanded
      ? `${baseClass} font-semibold text-blue-900 bg-blue-50`
      : hovered
        ? `${baseClass} font-medium text-slate-900 bg-emerald-50`
        : `${baseClass} font-medium text-slate-700 hover:bg-slate-50`;

  if (to === "#") {
    return (
      <a
        href="#"
        className={baseClass}
        style={{
          ...collapsedStyle,
          ...(active ? activeStyle : inactiveStyle)
        }}
        onClick={(event) => event.preventDefault()}
        onMouseEnter={(event) => { if (!active) (event.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
        onMouseLeave={(event) => { if (!active) (event.currentTarget as HTMLElement).style.background = "transparent"; }}
        title={collapsed ? label : undefined}
      >
        {content}
      </a>
    );
  }
  return (
    <Link
      to={to}
      className={baseClass}
      style={{
        ...collapsedStyle,
        ...(active ? activeStyle : inactiveStyle)
      }}
      onMouseEnter={(event) => { if (!active) (event.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
      onMouseLeave={(event) => { if (!active) (event.currentTarget as HTMLElement).style.background = "transparent"; }}
      title={collapsed ? label : undefined}
    >
      {content}
    </Link>
  );
}

function TabIconBtn({
  children,
  dark,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      className={`w-8.5 h-8.5 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 transition ${dark
          ? "bg-blue-900 text-white hover:bg-blue-800"
          : "border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
    >
      {children}
    </button>
  );
}
