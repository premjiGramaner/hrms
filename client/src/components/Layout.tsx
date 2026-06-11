import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout as logoutAction } from '../store/authSlice';
import {
  IconBuilding, IconPeople, IconChart, IconCalendar, IconBriefcase,
  IconSearch, IconGear, IconLogout, IconHome, IconFilter, IconShare,
} from './Icons';

export interface TabItem { label: string; path: string; }
interface Props {
  children: React.ReactNode;
  title?: string;
  tabs?: TabItem[];
  activeTab?: string;
  onFab?: () => void;
}

export default function Layout({ children, title, tabs, activeTab, onFab }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredNav, setHoveredNav] = useState('');

  const role = user?.role || 'employee';
  const username = user?.name || user?.username || 'User';
  const roleLabel = role === 'empmanager' ? 'Employee Manager'
    : role === 'hradmin' ? 'HR Administrator' : 'Employee';

  const isActive = (path: string) => location.pathname.startsWith(path);

  const pageTitle = title || (
    isActive('/employees') || isActive('/my-info') ? 'Employee Management' :
    isActive('/hradmin') || isActive('/roles') ? 'HR Administration' :
    isActive('/goals') ? 'Goals' : 'HRMS'
  );

  const navItems = [
    ...(role === 'hradmin' || role === 'empmanager'
      ? [{ to: '/hradmin/users', label: 'HR Administration', icon: <IconBuilding /> }]
      : []),
    { to: '/employees', label: 'Employee Management', icon: <IconPeople /> },
    { to: '#', label: 'Reports and Analytics', icon: <IconChart /> },
    { to: '#', label: 'Leave', icon: <IconCalendar /> },
    { to: '#', label: 'Performance', icon: <IconBriefcase /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside className={`transition-all duration-250 flex flex-col bg-white shadow-lg relative z-10 flex-shrink-0 overflow-hidden ${
        collapsed ? 'w-0 min-w-0' : 'w-52 min-w-52'
      }`}>
        {/* Logo */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center">
          <img src="/logo.png" alt="Cannyfore" className="h-9.5 max-w-40 object-contain" />
        </div>

        {/* Profile */}
        <div className="px-4 py-5 pb-3 flex flex-col items-center text-center">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center border-4 border-white shadow-md mb-2">
            {user?.avatar
              ? <img src={`/uploads/${user.avatar}`} className="w-full h-full object-cover" alt="" />
              : <span className="text-white text-2xl font-bold">{username.charAt(0).toUpperCase()}</span>}
            {/* Gear badge */}
            <div className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
              <IconGear size={10} color="#888" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-1 mb-0.5 truncate w-full">{username}</p>
          <p className="text-xs text-slate-600 m-0 truncate w-full">{roleLabel}</p>
        </div>

        {/* Search */}
        <div className="px-3 pb-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-3.5 pr-8 py-2 border border-slate-200 rounded-full text-xs text-slate-600 bg-slate-50 outline-none"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <IconSearch size={13} color="#94a3b8" />
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-1 pb-6 overflow-y-auto">
          {navItems.map(item => {
            const active = item.to !== '#' && isActive(item.to);
            const hovered = hoveredNav === item.label;
            return (
              <NavItem
                key={item.label}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={active}
                hovered={hovered}
                onMouseEnter={() => setHoveredNav(item.label)}
                onMouseLeave={() => setHoveredNav('')}
              />
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 rounded-full bg-blue-900 border-none text-white cursor-pointer z-20 flex items-center justify-center shadow-md text-sm font-bold hover:bg-blue-800 transition"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* ═══════════════ MAIN ═══════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Header ── */}
        <header className="h-14 bg-gradient-to-r from-blue-900 to-teal-600 flex items-center justify-between px-6 flex-shrink-0 shadow-md">
          <span className="text-white font-bold text-lg tracking-wide">{pageTitle}</span>
          <button
            onClick={() => { dispatch(logoutAction()); navigate('/login'); }}
            className="flex items-center gap-1.75 bg-white/20 border border-white/35 text-white rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer hover:bg-white/30 transition"
          >
            <IconLogout size={15} />
            Log Out
            <span className="text-xs opacity-80">▾</span>
          </button>
        </header>

        {/* ── Tab Bar ── */}
        {tabs && tabs.length > 0 && (
          <div className="bg-white border-b border-blue-100 flex items-center gap-1 px-4 py-2 flex-shrink-0 overflow-x-auto">
            {/* Home icon */}
            <Link
              to={tabs[0]?.path || '#'}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 mr-1 no-underline hover:bg-slate-200 transition"
            >
              <IconHome size={15} color="#64748b" />
            </Link>

            {tabs.map(tab => {
              const isActiveTab = activeTab === tab.label || location.pathname === tab.path;
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  className={`px-4 py-1.75 rounded-full text-sm font-${isActiveTab ? '600' : '500'} no-underline whitespace-nowrap flex-shrink-0 transition ${
                    isActiveTab
                      ? 'text-amber-700 bg-orange-100'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-1.5">
              <TabIconBtn><IconFilter size={14} /></TabIconBtn>
              <TabIconBtn dark><span className="font-bold text-sm">?</span></TabIconBtn>
              <TabIconBtn><IconShare size={14} /></TabIconBtn>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* ── FAB ── */}
        {onFab && (
          <button
            onClick={onFab}
            className="fixed bottom-8 right-8 w-13 h-13 rounded-full bg-blue-900 text-white border-none text-3xl cursor-pointer shadow-2xl z-50 flex items-center justify-center hover:bg-blue-800 transition"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Nav Item ── */
function NavItem({ to, icon, label, active, hovered, onMouseEnter, onMouseLeave }: {
  to: string; icon: React.ReactNode; label: string; active: boolean;
  hovered: boolean; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const content = (
    <>
      <span className={`flex items-center flex-shrink-0 ${active ? 'opacity-100' : 'opacity-70'}`}>{icon}</span>
      <span className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
    </>
  );
  const baseClass = "flex items-center gap-2.5 px-3 py-2.75 rounded-2xl text-sm transition no-underline mb-0.5 cursor-pointer";
  const classes = active
    ? `${baseClass} font-semibold bg-gradient-to-r from-blue-900 to-teal-600 text-white shadow-md`
    : hovered
    ? `${baseClass} font-medium text-slate-900 bg-emerald-50`
    : `${baseClass} font-medium text-slate-700 hover:bg-slate-50`;

  if (to === '#') return (
    <a href="#" className={classes} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={e => e.preventDefault()}>
      {content}
    </a>
  );
  return (
    <Link to={to} className={classes} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {content}
    </Link>
  );
}

function TabIconBtn({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <button className={`w-8.5 h-8.5 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 transition ${
      dark
        ? 'bg-blue-900 text-white hover:bg-blue-800'
        : 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}>
      {children}
    </button>
  );
}

