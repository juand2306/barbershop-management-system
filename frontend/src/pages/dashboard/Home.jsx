import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Scissors, DollarSign, Clock, Users, Calendar } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[40px] opacity-20 transition-transform group-hover:scale-150 ${colorClass}`} />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h3 className="text-gray-400 font-medium text-sm uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold mt-2 text-white">{value}</p>
        <p className="text-xs mt-3 text-gray-500">{subtext}</p>
      </div>
      <div className={`p-3 rounded-sm bg-white/5 border border-white/10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  </div>
);

const HomeDashboard = () => {

  const { data: todaySummary, isLoading } = useQuery(['todaySummary'], async () => {
    const res = await api.get('/service-records/resumen-hoy/');
    return res.data;
  });

  // Use same key as Team.jsx so invalidations sync
  const { data: barbersActive } = useQuery(['barbersActive'], async () => {
     const res = await api.get('/barbers/activos-hoy/');
     return res.data.results || res.data;
  });

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Resumen de Hoy</h1>
        <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">Vistazo rápido del estado del día.</p>
      </div>

      {isLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="glass-card h-36 border-white/5 animate-pulse" />)}
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Ingresos Servicios" 
            value={`$${parseInt(todaySummary?.total_amount || 0).toLocaleString()}`} 
            subtext="Dinero facturado por cortes hoy"
            icon={DollarSign}
            colorClass="bg-emerald-400"
          />
          <StatCard 
            title="Cortes Realizados" 
            value={todaySummary?.total_services || 0} 
            subtext="Servicios finalizados en el día"
            icon={Scissors}
            colorClass="bg-purple-400"
          />
          <StatCard 
            title="Barberos Activos" 
            value={Array.isArray(barbersActive) ? barbersActive.length : 0} 
            subtext="Personal en el local hoy"
            icon={Users}
            colorClass="bg-cyan-400"
          />
           <StatCard 
            title="Progreso Turno" 
            value="Activo" 
            subtext="Caja aún sin cerrar"
            icon={Clock}
            colorClass="bg-indigo-400"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
         <div className="lg:col-span-2 glass-panel p-6 border-white/5 h-96 flex flex-col items-center justify-center text-center">
            <Calendar className="w-12 h-12 text-white/20 mb-4" />
            <h3 className="text-lg font-bold text-white/50 uppercase tracking-wider">Histórico de Ingresos</h3>
            <p className="text-sm text-white/30 mt-2">Próximamente gráficos con Recharts.</p>
         </div>
         <div className="glass-panel p-6 border-white/5 h-96 overflow-y-auto custom-scrollbar flex flex-col">
            <h3 className="text-lg font-black uppercase text-white tracking-widest mb-6 border-b border-white/10 pb-4">
                Barberos Activos Hoy
            </h3>
            {Array.isArray(barbersActive) && barbersActive.length > 0 ? (
                <ul className="space-y-3 flex-1">
                  {barbersActive.map(activeLog => (
                     <li key={activeLog.id} className="flex justify-between items-center p-3 rounded-sm bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                        <div className="flex flex-col">
                           <span className="font-bold text-white text-sm uppercase tracking-wide">{activeLog.barber_name}</span>
                           <span className="text-xs text-emerald-400 font-medium tracking-wider mt-0.5">
                             Ingresó: {activeLog?.entry_time ? String(activeLog.entry_time).split('.')[0] : 'Sin hora'}
                           </span>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] flex-shrink-0"></div>
                     </li>
                  ))}
                </ul>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-500 text-center font-bold uppercase tracking-widest">Ningún barbero ha<br/>registrado entrada hoy.</p>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
