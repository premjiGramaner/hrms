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

export default function Layout({ children, title, tabs, activeTab, onFab }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role || "employee";
  const username = user?.name || user?.username || "User";
  const roleLabel =
    role === "empmanager"
      ? "Employee Manager"
      : role === "hradmin"
        ? "HR Administrator"
        : "Employee";

  const isActive = (path: string) => location.pathname.startsWith(path);

  const pageTitle =
    title ||
    (isActive("/employees") || isActive("/my-info")
      ? "Employee Management"
      : isActive("/hradmin") || isActive("/roles")
        ? "HR Administration"
        : isActive("/leave")
          ? "Leave"
          : "HRMS");

  const navItems = [
    ...(role === "hradmin" || role === "empmanager"
      ? [{ to: "/hradmin/users", label: "HR Administration", icon: <IconBuilding /> }]
      : []),
    { to: "/employees", label: "Employee Management", icon: <IconPeople /> },
    { to: "#", label: "Reports and Analytics", icon: <IconChart /> },
    { to: "/leave/view_leave_list", label: "Leave", icon: <IconCalendar /> },
    { to: "#", label: "Performance", icon: <IconBriefcase /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">


      <div
        className="relative flex-shrink-0"
        style={{
          width: collapsed ? 0 : 230,
          minWidth: collapsed ? 0 : 0,
          transition: "width 250ms ease-in-out",
        }}
      >
        <aside
          style={{
            width: collapsed ? 0 : 230,
            transition: "width 250ms ease-in-out",
            overflow: "hidden",
          }}
          className="flex flex-col bg-white shadow-lg z-10 h-screen select-none"
        >
          <div
            className="flex items-center justify-center border-b border-slate-100 flex-shrink-0"
            style={{ height: 64, padding: "0 24px" }}
          >
            <img
              src={cannyforeLogo}
              alt="Cannyfore"
              style={{
                height: 38,
                maxWidth: 140,
                objectFit: "contain",
                opacity: collapsed ? 0 : 1,
                transition: "opacity 200ms ease-in-out",
              }}
            />
          </div>

          <div
            className="flex flex-col items-center text-center border-b border-slate-100 flex-shrink-0"
            style={{
              padding: "20px 16px 14px",
              maxHeight: collapsed ? 0 : 200,
              opacity: collapsed ? 0 : 1,
              overflow: "hidden",
              transition: "max-height 250ms ease-in-out, opacity 200ms ease-in-out",
            }}
          >
            <div
              className="relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{
                width: 72,
                height: 72,
                background: "linear-gradient(135deg, #fcd34d, #f97316)",
                border: "3px solid #ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
                marginBottom: 8,
              }}
            >
              {user?.avatar ? (
                <img
                  src={`/uploads/${user.avatar}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="avatar"
                />
              ) : (
                <span style={{ color: "#fff", fontSize: 26, fontWeight: 700 }}>
                  {username.charAt(0).toUpperCase()}
                </span>
              )}
              <div
                className="absolute flex items-center justify-center bg-white rounded-full"
                style={{ width: 20, height: 20, bottom: 2, right: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
              >
                <IconGear size={10} color="#888" />
              </div>
            </div>
            <p
              className="truncate w-full"
              style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}
            >
              {username}
            </p>
            <p
              className="truncate w-full"
              style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}
            >
              {roleLabel}
            </p>
          </div>

          <div
            style={{
              padding: "12px 12px 10px",
              maxHeight: collapsed ? 0 : 60,
              opacity: collapsed ? 0 : 1,
              overflow: "hidden",
              transition: "max-height 250ms ease-in-out, opacity 200ms ease-in-out",
            }}
            className="flex-shrink-0"
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                style={{
                  width: "100%",
                  paddingLeft: 14,
                  paddingRight: 34,
                  paddingTop: 7,
                  paddingBottom: 7,
                  border: "1px solid #e2e8f0",
                  borderRadius: 999,
                  fontSize: 12,
                  color: "#475569",
                  background: "#f8fafc",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span
                className="absolute"
                style={{ right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <IconSearch size={13} color="#94a3b8" />
              </span>
            </div>
          </div>

          <nav
            className="flex-1 overflow-y-auto"
            style={{ padding: "4px 8px 24px" }}
          >
            {navItems.map((item) => {
              const active = item.to !== "#" && isActive(item.to);
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
          style={{
            position: "absolute",
            right: -14,
            top: "50%",
            transform: "translateY(-50%)",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#233B86",
            border: "2px solid #ffffff",
            color: "#fff",
            cursor: "pointer",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(35,59,134,0.30)",
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
            transition: "background 200ms",
          }}
          onMouseEnter={(event) => ((event.currentTarget as HTMLElement).style.background = "#1a2e6e")}
          onMouseLeave={(event) => ((event.currentTarget as HTMLElement).style.background = "#233B86")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span
            style={{
              display: "inline-block",
              transition: "transform 250ms ease-in-out",
              transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
              lineHeight: 1,
            }}
          >
            ‹
          </span>
        </button>
      </div>


      {/* Main content area — unchanged */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-gradient-to-r from-blue-900 to-teal-600 flex items-center justify-between px-6 flex-shrink-0 shadow-md">
          <span className="text-white font-bold text-lg tracking-wide">{pageTitle}</span>
          <button
            onClick={() => { dispatch(logoutAction()); navigate("/login"); }}
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
              const isActiveTab = activeTab === tab.label || location.pathname === tab.path;
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  className={`px-4 py-1.75 rounded-full text-sm no-underline whitespace-nowrap flex-shrink-0 transition ${isActiveTab
                    ? "font-semibold text-amber-700 bg-orange-100"
                    : "font-medium text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {tab.label}
                </Link>
              );
            })}
            <div className="ml-auto flex items-center gap-1.5">
              <TabIconBtn><IconFilter size={14} /></TabIconBtn>
              <TabIconBtn dark><span className="font-bold text-sm">?</span></TabIconBtn>
              <TabIconBtn><IconShare size={14} /></TabIconBtn>
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

  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: collapsed ? 0 : 12,
    padding: collapsed ? "10px 0" : "10px 12px",
    borderRadius: 28,
    marginBottom: 4,
    textDecoration: "none",
    cursor: "pointer",
    transition: "background 180ms ease, padding 250ms ease, gap 250ms ease",
    userSelect: "none",
    justifyContent: collapsed ? "center" : "flex-start",
    background: active
      ? "linear-gradient(90deg, #233B86 0%, #12C7A5 100%)"
      : hovered
        ? "#f1f5f9"
        : "transparent",
    boxShadow: active ? "0 2px 10px rgba(35,59,134,0.20)" : "none",
  };

  const iconStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    color: active ? "#ffffff" : "#6B7BA4",
    transition: "color 180ms",
  };

  const textStyle: React.CSSProperties = {
    fontSize: 13.5,
    fontWeight: active ? 600 : 500,
    color: active ? "#ffffff" : hovered ? "#1e293b" : "#6B7BA4",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    letterSpacing: "0.01em",
    opacity: collapsed ? 0 : 1,
    maxWidth: collapsed ? 0 : 160,
    transition: "color 180ms, opacity 200ms ease, max-width 250ms ease",
  };

  const content = (
    <>
      <span style={iconStyle}>{icon}</span>
      <span style={textStyle}>{label}</span>
    </>
  );

  if (to === "#") {
    return (
      <a
        href="#"
        style={containerStyle}
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
      style={containerStyle}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {content}
    </Link>
  );
}


function TabIconBtn({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
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

