import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout as logoutAction } from '../store/authSlice';

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
  const user = useAppSelector(s => s.auth.user);
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

            {tabs.map(t => {
              const isActiveTab = activeTab === t.label || location.pathname === t.path;
              return (
                <Link
                  key={t.label}
                  to={t.path}
                  className={`px-4 py-1.75 rounded-full text-sm font-${isActiveTab ? '600' : '500'} no-underline whitespace-nowrap flex-shrink-0 transition ${
                    isActiveTab
                      ? 'text-amber-700 bg-orange-100'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
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

/* ── SVG Icons ── */
function IconBuilding() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>; }
function IconPeople() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconChart() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>; }
function IconCalendar() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconBriefcase() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>; }
function IconDots() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>; }
function IconSearch({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function IconGear({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function IconLogout({ size = 16 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function IconHome({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconFilter({ size = 14 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>; }
function IconShare({ size = 14 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>; }
