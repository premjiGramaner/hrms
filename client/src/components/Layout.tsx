import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout as logoutAction } from "../store/authSlice";
import { logout as logoutApi } from "../api/auth.api";
import { getRoleLabel, isAdminRole } from "../config/roles";
import cannyforeLogo from "../assets/cannyfore_title_logo.png";
import UserAvatar from "./UserAvatar";

import {
  IconBuilding,
  IconPeople,
  IconChart,
  IconCalendar,
  IconBriefcase,
  IconGear,
  IconLogout,
  IconHome,
  IconChevronLeft,
} from "./Icons";
import { fetchEmployeesWithLimit } from "../store/employeeSlice";
import NavigationSearch from "./NavigationSearch";

export interface TabItem {
  label: string;
  path: string;
}

interface Props {
  children: React.ReactNode;
  title?: string;
  tabs?: TabItem[];
  activeTab?: string;
  topNav?: React.ReactNode;
  onFab?: () => void;
  backTo?: string;
}

export default function Layout({
  children,
  title,
  tabs,
  activeTab,
  topNav,
  onFab,
  backTo,
}: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchEmployeesWithLimit());
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userNames, setUserName] = useState("");

  const role = user?.role || "employee";
  const isAdmin = isAdminRole(role);
  const roleLabel = getRoleLabel(role);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const pageTitle =
    title ||
    (isActive("/employees") || isActive("/my-info")
      ? "Employee Management"
      : isActive("/hradmin") || isActive("/roles")
        ? "HR Administration"
        : isActive("/leave")
          ? "Leave"
          : isActive("/performance")
            ? "Performance"
            : isActive("/reports")
              ? "Reports and Analytics"
              : "HRMS");

  const navItems = [
    ...(role === "hradmin" || role === "empmanager"
      ? [{ to: "/hradmin", label: "HR Administration", icon: <IconBuilding /> }]
      : []),
    { to: "/employees", label: "Employee Management", icon: <IconPeople /> },
    {
      to: isAdmin ? "/leave/view_leave_list" : "/leave/apply",
      label: "Leave",
      icon: <IconCalendar />,
    },
    { to: "/performance", label: "Performance", icon: <IconBriefcase /> },
    ...(role === "hradmin" || user?.id === 0 || user?.username === "admin"
      ? [
          {
            to: "/reports",
            label: "Reports and Analytics",
            icon: <IconChart />,
          },
        ]
      : []),
  ];

  const homeRoute = isAdmin ? "/employees" : "/my-info";
  useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
    }
  }, [user?.name]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
      <div
        className={`relative flex-shrink-0 transition-[width] duration-[250ms] ease-in-out ${
          collapsed ? "w-0 min-w-0" : "w-[230px]"
        }`}
      >
        <aside
          className={`flex flex-col bg-white shadow-lg z-10 h-screen select-none overflow-hidden transition-[width] duration-[250ms] ease-in-out ${
            collapsed ? "w-0" : "w-[230px]"
          }`}
        >
          <div className="flex items-center justify-center border-b border-slate-100 flex-shrink-0 h-16 px-6">
            <img
              src={cannyforeLogo}
              alt="Cannyfore"
              className={`h-[38px] max-w-[140px] object-contain transition-opacity duration-200 ease-in-out ${
                collapsed ? "opacity-0" : "opacity-100"
              }`}
            />
          </div>

          <div
            className={`flex flex-col items-center text-center border-b border-slate-100 flex-shrink-0 pt-5 px-4 pb-3.5 overflow-hidden transition-all duration-[250ms] ease-in-out ${
              collapsed ? "max-h-0 opacity-0" : "max-h-[200px] opacity-100"
            }`}
          >
            <div className="relative flex-shrink-0 mb-2">
              {/* Reusable UserAvatar component */}
              <UserAvatar
                size={72}
                className="border-[3px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.14)]"
              />

              <div className="absolute flex items-center justify-center bg-white rounded-full w-5 h-5 bottom-0.5 right-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
                <Link to="/my-info">
                  <IconGear size={10} color="#888" />
                </Link>
              </div>
            </div>
            <p className="truncate w-full text-[13.5px] font-bold text-slate-900 mt-0.5">
              {userNames}
            </p>
            <p className="truncate w-full text-[11.5px] text-slate-500 mt-0.5">
              {roleLabel}
            </p>
          </div>
          <div
            className={`flex-shrink-0 pt-3 px-3 pb-2.5 overflow-hidden transition-all duration-[250ms] ease-in-out ${
              collapsed ? "max-h-0 opacity-0" : "max-h-[60px] opacity-100"
            }`}
          >
            <NavigationSearch />
          </div>

          <nav className="flex-1 overflow-y-auto pt-1 px-2 pb-6">
            {navItems.map((item) => {
              let active = false;
              if (item.to !== "#") {
                if (item.to === "/leave/view_leave_list") {
                  active = isActive("/leave");
                } else if (item.label === "Employee Management") {
                  active = isActive("/employees") || isActive("/my-info");
                } else {
                  active = isActive(item.to);
                }
              }
              return (
                <SidebarNavItem
                  key={item.label}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={active}
                  collapsed={collapsed}
                />
              );
            })}
          </nav>
        </aside>

        <button
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#233B86] hover:bg-[#1a2e6e] border-2 border-white text-white cursor-pointer z-30 flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(35,59,134,0.30)] transition-colors duration-200"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span
            className={`inline-flex items-center justify-center leading-[0] transition-transform duration-[250ms] ease-in-out ${
              collapsed ? "rotate-180" : "rotate-0"
            }`}
          >
            <IconChevronLeft size={14} color="white" />
          </span>
        </button>
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-gradient-to-r from-blue-900 to-teal-600 flex items-center justify-between px-6 flex-shrink-0 shadow-md">
          <span className="text-white font-bold text-lg tracking-wide">
            {pageTitle}
          </span>
          <button
            onClick={async () => {
              try {
                await logoutApi();
              } catch (error) {
                console.error("Logout error:", error);
              } finally {
                dispatch(logoutAction());
                navigate("/login");
              }
            }}
            className="flex items-center gap-1.75 bg-white/20 border border-white/35 text-white rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer hover:bg-white/30 transition"
          >
            <IconLogout size={15} />
            Log Out
            <span className="text-xs opacity-80">▾</span>
          </button>
        </header>

        <div className="relative bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0 overflow-visible z-40">
          {backTo ? (
            <Link
              to={backTo}
              title="Back"
              className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 mr-3 no-underline hover:bg-slate-100 transition py-5 py-2"
            >
              <IconChevronLeft size={15} color="#64748b" />
            </Link>
          ) : (
            <Link
              to={homeRoute}
              title="Home"
              className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 mr-3 no-underline hover:bg-slate-100 transition py-5 py-2"
            >
              <IconHome size={15} color="#64748b" />
            </Link>
          )}

          {topNav}

          {!topNav && tabs && tabs.length > 0 && (
            <>
              {tabs.map((tab) => {
                const isActiveTab =
                  activeTab === tab.label || location.pathname === tab.path;
                return (
                  <Link
                    key={tab.label}
                    to={tab.path}
                    className={`px-4 py-2.5 text-sm whitespace-nowrap no-underline flex-shrink-0 transition border-b-2 ${
                      isActiveTab
                        ? "border-orange-500 text-orange-700 font-semibold bg-orange-50"
                        : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {children}

          {/* Footer Copyright */}
          <footer className="mt-8 pt-4 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">
              Cannyfore © {new Date().getFullYear()} All rights reserved.
            </p>
          </footer>
        </div>

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

function SidebarNavItem({
  to,
  icon,
  label,
  active,
  collapsed,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <>
      <span
        className={`flex items-center flex-shrink-0 transition-colors duration-[180ms] ${
          active ? "text-white" : "text-[#6B7BA4]"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis tracking-[0.01em] transition-all duration-200 ease-in-out ${
          active
            ? "font-semibold text-white"
            : hovered
              ? "font-medium text-slate-800"
              : "font-medium text-[#6B7BA4]"
        } ${collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[160px]"}`}
      >
        {label}
      </span>
    </>
  );

  const linkClasses = `flex items-center rounded-[28px] mb-1 no-underline cursor-pointer select-none transition-all duration-[180ms] ease ${
    collapsed ? "gap-0 p-2.5 justify-center" : "gap-3 py-2.5 px-3 justify-start"
  } ${
    active
      ? "bg-gradient-to-r from-[#233B86] to-[#12C7A5] shadow-[0_2px_10px_rgba(35,59,134,0.20)]"
      : hovered
        ? "bg-slate-100"
        : "bg-transparent"
  }`;

  if (to === "#") {
    return (
      <a
        href="#"
        className={linkClasses}
        title={collapsed ? label : undefined}
        onClick={(event) => event.preventDefault()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      to={to}
      className={linkClasses}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {content}
    </Link>
  );
}
