import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Calendar, Clock, Check, X, ArrowRight, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const AppointmentsList = () => {
  const queryClient = useQueryClient();
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: appointments, isLoading } = useQuery(['appointments', filterDate], async () => {
    const res = await api.get(`/appointments/?date=${filterDate}`);
    return res.data.results || res.data;
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/estado/`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('Error al cambiar el estado')
  });

  const handleStatusChange = (id, currentStatus, newStatus) => {
    // Si queremos pasarlo a completado porque ya se le cobró, 
    // idealmente se usa CashRegister, 
    // pero permitimos el hard-change acá.
    changeStatus.mutate({ id, status: newStatus });
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pendiente': return <span className="text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-sm text-xs border border-yellow-400/20 box-border">⏳ PENDIENTE</span>;
      case 'confirmada': return <span className="text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-sm text-xs border border-cyan-400/20">📅 CONFIRMADA</span>;
      case 'completada': return <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-sm text-xs border border-emerald-400/20">✅ COMPLETADA</span>;
      case 'no_asistio': return <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded-sm text-xs border border-red-400/20">❌ NO ASISTIÓ</span>;
      case 'cancelada': return <span className="text-gray-400 bg-gray-400/10 px-2 py-1 rounded-sm text-xs border border-gray-400/20">🚫 CANCELADA</span>;
      default: return null;
    }
  };

  return (
    <div className="animate-slide-up space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Agenda Diaria</h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">Turnos y estado de los clientes</p>
        </div>
        <div className="flex bg-white/5 border-2 border-white/10 p-1 rounded-sm w-full md:w-auto">
           <input 
             type="date"
             className="bg-transparent text-white font-bold outline-none px-4 py-2 cursor-pointer uppercase tracking-widest w-full"
             value={filterDate}
             onChange={(e) => setFilterDate(e.target.value)}
           />
        </div>
      </div>

      <div className="glass-panel border-white/5 min-h-[500px]">
        {isLoading ? (
           <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-sm bg-purple-500 animate-spin"></div></div>
        ) : appointments?.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-gray-500">
               <Calendar className="w-16 h-16 mb-4 opacity-50" />
               <p className="uppercase tracking-widest font-bold">Sin agenda para esta fecha</p>
           </div>
        ) : (
           <div className="divide-y divide-white/5">
             {appointments?.map(app => {
                 const appDate = parseISO(app.appointment_datetime);
                 const timeFormatted = format(appDate, 'hh:mm a'); // 03:30 P.M.
                 
                 return (
                   <div key={app.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                      {/* Horario y Cliente */}
                      <div className="flex items-center gap-6">
                         <div className="text-center bg-purple-500/10 border border-purple-500/20 p-3 rounded-sm min-w-[100px]">
                            <p className="text-xl font-black text-purple-400 tracking-tighter">{timeFormatted.split(' ')[0]}</p>
                            <p className="text-xs text-purple-300 font-bold">{timeFormatted.split(' ')[1]}</p>
                         </div>
                         <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                               <User className="w-4 h-4 text-cyan-400" />
                               {app.client_name}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                               <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">
                                  {app.service_name}
                               </p>
                               <span className="text-gray-600">•</span>
                               <p className="text-xs text-gray-400 font-bold uppercase">
                                  CON {app.barber_name}
                               </p>
                            </div>
                         </div>
                      </div>

                      {/* Estado y Acciones */}
                      <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                         {getStatusBadge(app.status)}
                         
                         <div className="flex gap-2 w-full md:w-auto">
                            {app.status === 'pendiente' && (
                               <button 
                                 onClick={() => handleStatusChange(app.id, app.status, 'confirmada')}
                                 className="flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.8)] border border-cyan-500 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black hover:border-transparent px-3 py-1 font-bold text-xs uppercase transition-colors"
                               >
                                 <Check className="w-4 h-4 mr-1" /> Confirmar
                               </button>
                            )}
                            
                            {(app.status === 'pendiente' || app.status === 'confirmada') && (
                               <>
                               <button 
                                 onClick={() => handleStatusChange(app.id, app.status, 'no_asistio')}
                                 className="flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.8)] border border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1 font-bold text-xs uppercase transition-colors"
                               >
                                 <X className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => handleStatusChange(app.id, app.status, 'completada')}
                                 title="Forzar paso a completada (mejor usar caja)"
                                 className="flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.8)] border border-emerald-500 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black px-3 py-1 font-bold text-xs uppercase transition-colors"
                               >
                                 Terminar <ArrowRight className="w-4 h-4 ml-1" />
                               </button>
                               </>
                            )}
                         </div>
                      </div>
                   </div>
                 );
             })}
           </div>
        )}
      </div>

    </div>
  );
};

export default AppointmentsList;
