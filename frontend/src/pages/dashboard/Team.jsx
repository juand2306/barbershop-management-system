import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import { toast } from 'react-toastify';
import { Users, Plus, CheckCircle, Clock, Edit2, UserX, UserCheck } from 'lucide-react';

// Helper to extract first API error message
const extractApiError = (err) => {
  const data = err.response?.data;
  if (!data) return 'Error de conexión con el servidor';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  // DRF field-level errors: { field: ['message'] }
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const msg = data[firstKey];
    return Array.isArray(msg) ? `${firstKey}: ${msg[0]}` : `${firstKey}: ${msg}`;
  }
  return 'Error desconocido';
};

// Use local date (not UTC) to avoid timezone issues at night
const getLocalDateStr = () => new Intl.DateTimeFormat('en-CA').format(new Date());

const emptyForm = { name: '', phone: '', document_id: '', specialty: '', commission_percentage: 50, active: true };

const Team = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);

  const { data: barbers, isLoading } = useQuery(['barbers'], async () => {
    const res = await api.get('/barbers/');
    return res.data.results || res.data;
  });

  const { data: activeLog } = useQuery(['barbersActive'], async () => {
    const res = await api.get('/barbers/activos-hoy/');
    return res.data.results || res.data;
  });

  const isBarberActiveToday = (barberId) => {
    if (!Array.isArray(activeLog)) return false;
    return activeLog.some(log => log.barber === barberId);
  };

  const getActiveLogId = (barberId) => {
    if (!Array.isArray(activeLog)) return null;
    const log = activeLog.find(log => log.barber === barberId);
    return log ? log.id : null;
  };

  const createBarber = useMutation({
    mutationFn: (data) => api.post('/barbers/', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['barbers']);
      toast.success('¡Barbero agregado al equipo!');
      setIsAddModalOpen(false);
      setFormData(emptyForm);
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const updateBarber = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/barbers/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['barbers']);
      toast.success('Barbero actualizado');
      setIsEditModalOpen(false);
      setEditTarget(null);
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => api.patch(`/barbers/${id}/`, { active }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['barbers']);
      toast.success(vars.active ? 'Barbero reactivado' : 'Barbero desactivado');
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const markEntry = useMutation({
    mutationFn: (barberId) => api.post('/barbers/daily-active/', { barber: barberId, work_date: getLocalDateStr() }),
    onSuccess: () => {
      // Refresh both Team and Home dashboard
      queryClient.invalidateQueries(['barbersActive']);
      toast.success('¡Entrada registrada con éxito!');
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const markExit = useMutation({
    mutationFn: (logId) => api.patch(`/barbers/daily-active/${logId}/`, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['barbersActive']);
      toast.success('¡Salida registrada!');
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const openEdit = (barber) => {
    setEditTarget(barber);
    setEditData({
      name: barber.name,
      phone: barber.phone || '',
      document_id: barber.document_id || '',
      specialty: barber.specialty || '',
      commission_percentage: barber.commission_percentage,
      active: barber.active,
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="animate-slide-up space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Gestión de Equipo</h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">Control de personal y comisiones</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
          <Plus className="w-5 h-5" />
          <span className="font-bold">Nuevo Barbero</span>
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="glass-panel h-52 animate-pulse border-white/5" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbers?.map((barber) => {
              const active = isBarberActiveToday(barber.id);
              return (
                <div key={barber.id} className={`glass-panel p-6 border-white/5 flex flex-col justify-between ${!barber.active ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.5)] text-lg font-black text-white">
                        {barber.name.substring(0,1)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white uppercase tracking-wide">{barber.name}</h3>
                        <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Comisión: {barber.commission_percentage}%</span>
                      </div>
                    </div>
                    {/* Status + Actions */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(barber)} className="text-gray-500 hover:text-white transition-colors p-1" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive.mutate({ id: barber.id, active: !barber.active })}
                        className={`transition-colors p-1 ${barber.active ? 'text-gray-500 hover:text-red-400' : 'text-gray-500 hover:text-emerald-400'}`}
                        title={barber.active ? 'Desactivar' : 'Reactivar'}
                      >
                        {barber.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <div title={active ? "En turno hoy" : "No ha ingresado"}>
                        {active ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-400 bg-white/5 p-3 rounded-sm border border-white/5 border-b-4 mt-4">
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">Especialidad</span>
                       <span className="uppercase font-medium text-white">{barber.specialty || 'General'}</span>
                    </div>
                    {!active && barber.active && (
                      <button
                        onClick={() => markEntry.mutate(barber.id)}
                        disabled={markEntry.isLoading}
                        className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-emerald-500 hover:text-black transition-colors disabled:opacity-50"
                      >
                        Marcar Entrada
                      </button>
                    )}
                    {active && (
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider hidden sm:inline">En Turno ✓</span>
                         <button
                           onClick={() => {if(window.confirm('¿Registrar salida de este barbero?')) markExit.mutate(getActiveLogId(barber.id))}}
                           disabled={markExit.isLoading}
                           className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                         >
                           Marcar Salida
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              );
          })}

          {barbers?.length === 0 && (
             <div className="col-span-full text-center py-20 text-gray-500 glass-card">
                 <Users className="w-12 h-12 mx-auto mb-4 opacity-50 text-purple-400" />
                 <p className="font-semibold uppercase tracking-widest">No hay barberos registrados</p>
             </div>
          )}
        </div>
      )}

      {/* Modal: Crear Barbero */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Alta de Barbero">
        <form onSubmit={(e) => { e.preventDefault(); createBarber.mutate(formData); }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Nombre Completo *</label>
            <input required className="input-glass" placeholder="Ej. Peaky Blinder" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Documento (Cédula) *</label>
            <input required className="input-glass" placeholder="Número de documento" value={formData.document_id} onChange={e => setFormData({...formData, document_id: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Teléfono</label>
              <input type="tel" className="input-glass" placeholder="300 123 4567" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Comisión (%)</label>
              <input type="number" min="0" max="100" required className="input-glass font-bold text-purple-400" value={formData.commission_percentage} onChange={e => setFormData({...formData, commission_percentage: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Especialidad</label>
            <input className="input-glass" placeholder="Ej. Fade, Barba, Clásico..." value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
          </div>
          <button type="submit" disabled={createBarber.isLoading} className="btn btn-primary w-full shadow-[4px_4px_0px_rgba(0,0,0,0.8)] mt-2">
            {createBarber.isLoading ? 'Guardando...' : 'GUARDAR BARBERO'}
          </button>
        </form>
      </Modal>

      {/* Modal: Editar Barbero */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Barbero">
        {editTarget && (
          <form onSubmit={(e) => { e.preventDefault(); updateBarber.mutate({ id: editTarget.id, ...editData }); }} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Nombre Completo *</label>
              <input required className="input-glass" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Documento</label>
              <input className="input-glass" value={editData.document_id} onChange={e => setEditData({...editData, document_id: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Teléfono</label>
                <input type="tel" className="input-glass" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Comisión (%)</label>
                <input type="number" min="0" max="100" required className="input-glass font-bold text-purple-400" value={editData.commission_percentage} onChange={e => setEditData({...editData, commission_percentage: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Especialidad</label>
              <input className="input-glass" placeholder="Ej. Fade, Barba, Clásico..." value={editData.specialty} onChange={e => setEditData({...editData, specialty: e.target.value})} />
            </div>
            <button type="submit" disabled={updateBarber.isLoading} className="btn btn-primary w-full shadow-[4px_4px_0px_rgba(0,0,0,0.8)] mt-2">
              {updateBarber.isLoading ? 'Guardando...' : 'ACTUALIZAR BARBERO'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Team;
