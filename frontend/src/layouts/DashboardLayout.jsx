import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Scissors, Calendar, CalendarDays, Users,
  LogOut, DollarSign, Settings, Package, History,
  ChevronLeft, ChevronRight, Menu, TrendingUp, X
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, label, active, collapsed, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative ${
      active
        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
        : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
    } ${collapsed ? 'justify-center' : ''}`}
  >
    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
    {!collapsed && <span className="font-semibold tracking-wide text-[13px] truncate">{label}</span>}
    {collapsed && (
      <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#1e1e24] border border-white/10 rounded-lg text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        {label}
      </div>
    )}
  </Link>
);

const Divider = ({ label, collapsed }) => (
  !collapsed
    ? <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] px-3 pt-3 pb-0.5">{label}</p>
    : <div className="border-t border-white/5 my-2" />
);

// ─── Sidebar inner content (shared by both desktop and mobile) ────────────────
const SidebarContent = ({ collapsed, user, logout, p, onLinkClick }) => (
  <div className="flex-1 flex flex-col justify-between px-2 py-1 overflow-hidden">
    <div>
      <Divider label="Principal" collapsed={collapsed} />
      <SidebarLink to="/dashboard"    icon={LayoutDashboard} label="Dashboard"   active={p === '/dashboard'}            collapsed={collapsed} onClick={onLinkClick} />
      <SidebarLink to="/cash"         icon={DollarSign}      label="Caja Diaria" active={p.startsWith('/cash')}         collapsed={collapsed} onClick={onLinkClick} />
      <SidebarLink to="/calendar"     icon={CalendarDays}    label="Calendario"  active={p.startsWith('/calendar')}     collapsed={collapsed} onClick={onLinkClick} />
      <SidebarLink to="/appointments" icon={Calendar}        label="Citas"       active={p === '/appointments'}         collapsed={collapsed} onClick={onLinkClick} />
      <SidebarLink to="/history"      icon={History}         label="Histórico"   active={p.startsWith('/history')}      collapsed={collapsed} onClick={onLinkClick} />
      <SidebarLink to="/barber-stats" icon={TrendingUp}      label="Rendimiento" active={p.startsWith('/barber-stats')} collapsed={collapsed} onClick={onLinkClick} />

      <Divider label="Catálogos" collapsed={collapsed} />
      <SidebarLink to="/services" icon={Scissors} label="Servicios"  active={p.startsWith('/services')}  collapsed={collapsed} onClick={onLinkClick} />
      <SidebarLink to="/products" icon={Package}  label="Inventario" active={p.startsWith('/products')}  collapsed={collapsed} onClick={onLinkClick} />
      <SidebarLink to="/team"     icon={Users}    label="Equipo"     active={p.startsWith('/team')}      collapsed={collapsed} onClick={onLinkClick} />
    </div>

    <div className="border-t border-white/[0.06] pt-1">
      <Divider label="Sistema" collapsed={collapsed} />
      {user?.role_display !== 'Barbero' && (
        <SidebarLink to="/settings" icon={Settings} label="Configuración" active={p.startsWith('/settings')} collapsed={collapsed} onClick={onLinkClick} />
      )}
      <button
        onClick={() => { logout(); onLinkClick?.(); }}
        title={collapsed ? 'Cerrar Sesión' : undefined}
        className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg border border-transparent text-gray-500 hover:text-red-400 hover:bg-red-400/8 transition-all duration-200 mt-0.5 ${collapsed ? 'justify-center' : ''}`}
      >
        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span className="font-semibold text-[13px]">Cerrar Sesión</span>}
      </button>
    </div>
  </div>
);

// ─── Brand header ─────────────────────────────────────────────────────────────
const BrandHeader = ({ collapsed, user }) => (
  <div className={`flex items-center gap-2.5 px-3 py-4 border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}>
    <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(168,85,247,0.4)]">
      <Scissors className="w-3.5 h-3.5 text-white" />
    </div>
    {!collapsed && (
      <div className="overflow-hidden">
        <p className="font-black text-white text-[13px] truncate leading-none">{user?.barbershop_name || 'Synapsia'}</p>
        <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">{user?.role_display}</p>
      </div>
    )}
  </div>
);

// ─── Main Layout ──────────────────────────────────────────────────────────────
const DashboardLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const p = location.pathname;
  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : user?.username || 'Usuario';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;


  const SIDEBAR_STYLE = {
    background: 'rgba(15,15,20,0.98)',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(12px)',
    height: '100vh',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0b] text-white">

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR — hidden on mobile (< lg)
      ═══════════════════════════════════════════════════════════════ */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 relative z-20 transition-all duration-300 ease-in-out ${collapsed ? 'w-14' : 'w-56'}`}
        style={SIDEBAR_STYLE}
      >
        <BrandHeader collapsed={collapsed} user={user} />
        <SidebarContent collapsed={collapsed} user={user} logout={logout} p={p} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-14 w-6 h-6 bg-[#1a1a24] border border-white/15 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors shadow-lg z-30"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE SIDEBAR OVERLAY — slides in from left on mobile/tablet
      ═══════════════════════════════════════════════════════════════ */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 flex flex-col w-72 lg:hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={SIDEBAR_STYLE}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(168,85,247,0.4)]">
              <Scissors className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-[13px] truncate leading-none">{user?.barbershop_name || 'Synapsia'}</p>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">{user?.role_display}</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <SidebarContent
          collapsed={false}
          user={user}
          logout={logout}
          p={p}
          onLinkClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">

        {/* Top header bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/[0.06]"
          style={{ background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger — visible only on mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest leading-none">Panel de Control</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Bienvenido, <span className="text-purple-400 font-bold">{displayName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center rounded-xl font-black text-sm text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
