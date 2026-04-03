import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Scissors, Calendar, Users, LogOut, DollarSign, Settings, Package } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const SidebarLink = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-sm mb-2 transition-all duration-300 ${
      active 
      ? 'bg-[#a855f7]/10 text-[#a855f7] border-l-4 border-[#a855f7]' 
      : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium tracking-wide">{label}</span>
  </Link>
);

const DashboardLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  // Redirect to login if unauthenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0b] text-white">
      {/* Sidebar background effects handles globally in index.css, just applying layout here */}
      <aside className="w-64 flex-shrink-0 glass-panel border-r border-white/10 m-3 mr-0 flex flex-col relative z-10 transition-transform duration-300">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="bg-purple-500 rounded-md w-6 h-6 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </span>
            <span className="text-white">{user?.barbershop_name || "Synapsia"}</span>
          </h1>
          <p className="text-xs text-cyan-400 mt-1 uppercase tracking-widest font-semibold ml-8">{user?.role_display}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={currentPath === '/dashboard'} />
          <SidebarLink to="/cash" icon={DollarSign} label="Caja Diaria" active={currentPath.includes('/cash')} />
          <SidebarLink to="/appointments" icon={Calendar} label="Citas" active={currentPath.includes('/appointments')} />
          <SidebarLink to="/services" icon={Scissors} label="Servicios" active={currentPath.includes('/services')} />
          <SidebarLink to="/products" icon={Package} label="Inventario" active={currentPath.includes('/products')} />
          <SidebarLink to="/team" icon={Users} label="Equipo" active={currentPath.includes('/team')} />
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          {user?.role_display !== 'Barbero' && (
            <SidebarLink to="/settings" icon={Settings} label="Configuración" active={currentPath.includes('/settings')} />
          )}
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 h-screen overflow-y-auto p-6 md:p-8 animate-slide-up custom-scrollbar">
         <header className="flex justify-between items-center mb-8 glass-card border border-white/10 py-3 px-6 rounded-sm relative shadow-none">
            <div>
               <h2 className="text-lg font-medium text-gray-300 uppercase tracking-wide">Panel de Control: <span className="text-white font-bold">{user?.first_name || user?.username}</span></h2>
            </div>
            <div className="flex items-center gap-4">
               {/* Quick actions or notifications here */}
               <div className="h-10 w-10 bg-purple-500 text-black flex items-center justify-center rounded-sm font-extrabold border-2 border-purple-500 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                  <span className="text-sm tracking-wider">{(user?.username || user?.first_name || 'US').substring(0,2).toUpperCase()}</span>
               </div>
            </div>
         </header>

         {/* Render children views */}
         <div className="w-full max-w-7xl mx-auto flex-1">
             <Outlet />
         </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
