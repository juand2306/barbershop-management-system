import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import { toast } from 'react-toastify';
import { Scissors, Plus, Edit2 } from 'lucide-react';

const extractApiError = (err) => {
  const data = err.response?.data;
  if (!data) return 'Error de conexión';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const msg = data[firstKey];
    return Array.isArray(msg) ? `${firstKey}: ${msg[0]}` : `${firstKey}: ${msg}`;
  }
  return 'Error desconocido';
};

// Backend categories — must match Service.CATEGORY_CHOICES exactly
const CATEGORIES = [
  { value: 'corte', label: 'Corte de Cabello' },
  { value: 'barba', label: 'Barba' },
  { value: 'combo', label: 'Combo (Corte + Barba)' },
  { value: 'otro', label: 'Otro' },
];

const emptyForm = { name: '', description: '', price: '', duration_minutes: 30, category: 'corte', active: true };

// ⚠️ IMPORTANT: defined OUTSIDE ServicesCatalog so React doesn't remount (lose focus) on every keystroke
const ServiceForm = ({ data, setData, onSubmit, isLoading, btnLabel }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-1">
      <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Nombre del Servicio *</label>
      <input required className="input-glass" placeholder="Ej. Sombreado, Barba Spa..." value={data.name} onChange={e => setData({...data, name: e.target.value})} />
    </div>
    <div className="space-y-1">
      <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Descripción (Opcional)</label>
      <textarea className="input-glass resize-none h-16" value={data.description} onChange={e => setData({...data, description: e.target.value})} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Valor Cobrado *</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-emerald-400 font-bold pointer-events-none">$</span>
          <input
            type="number" min="0" required
            className="input-glass !pl-8 font-black text-emerald-400"
            placeholder="20000"
            value={data.price}
            onChange={e => setData({...data, price: e.target.value})}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Minutos *</label>
        <input type="number" min="5" step="5" required className="input-glass font-bold text-purple-400" value={data.duration_minutes} onChange={e => setData({...data, duration_minutes: e.target.value})} />
      </div>
    </div>
    <div className="space-y-1">
      <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Categoría</label>
      <select className="input-glass bg-[#151518]" value={data.category} onChange={e => setData({...data, category: e.target.value})}>
        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </div>
    <button type="submit" disabled={isLoading} className="btn btn-primary w-full shadow-[4px_4px_0px_rgba(0,0,0,0.8)] mt-2">
      {isLoading ? 'Guardando...' : btnLabel}
    </button>
  </form>
);

const ServicesCatalog = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);

  const { data: services, isLoading } = useQuery(['services'], async () => {
    const res = await api.get('/services/');
    return res.data.results || res.data;
  });

  const createService = useMutation({
    mutationFn: (data) => api.post('/services/', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
      toast.success('Servicio añadido al catálogo');
      setIsAddModalOpen(false);
      setFormData(emptyForm);
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const updateService = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/services/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
      toast.success('Servicio actualizado');
      setIsEditModalOpen(false);
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const toggleService = useMutation({
    mutationFn: ({ id, active }) => api.patch(`/services/${id}/`, { active }),
    onSuccess: () => queryClient.invalidateQueries(['services']),
    onError: (err) => toast.error(extractApiError(err))
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const price = Math.round(parseFloat(String(formData.price).replace(/[^0-9.,]/g, '').replace(',', '.')));
    if (isNaN(price) || price < 0) { toast.error('Ingresa un precio válido'); return; }
    createService.mutate({ ...formData, price });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const price = Math.round(parseFloat(String(editData.price).replace(/[^0-9.,]/g, '').replace(',', '.')));
    if (isNaN(price) || price < 0) { toast.error('Ingresa un precio válido'); return; }
    updateService.mutate({ id: editTarget.id, ...editData, price });
  };

  const openEdit = (service) => {
    setEditTarget(service);
    setEditData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration_minutes: service.duration_minutes,
      category: service.category,
      active: service.active,
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="animate-slide-up space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Catálogo de Servicios</h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">Administra los precios y tiempos</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
          <Plus className="w-5 h-5" />
          <span className="font-bold">Nuevo Servicio</span>
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><div className="w-8 h-8 rounded-sm bg-purple-500 animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b-2 border-white/10 text-xs uppercase tracking-widest text-gray-400">
                  <th className="p-4 font-bold">Servicio</th>
                  <th className="p-4 font-bold">Categoría</th>
                  <th className="p-4 font-bold">Duración</th>
                  <th className="p-4 font-bold text-right">Precio</th>
                  <th className="p-4 font-bold text-center">Estado</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {services?.map(service => (
                  <tr key={service.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Scissors className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase tracking-wide">{service.name}</p>
                          <p className="text-xs text-gray-500">{service.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 text-xs uppercase font-bold tracking-wider rounded-sm">
                        {service.category_display || service.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-300">{service.duration_minutes} MIN</td>
                    <td className="p-4 text-right">
                      <span className="text-lg font-black text-emerald-400">${parseInt(service.price).toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleService.mutate({ id: service.id, active: !service.active })} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors" title={service.active ? 'Desactivar' : 'Activar'}>
                        {service.active ? (
                          <><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span><span className="text-emerald-400">Activo</span></>
                        ) : (
                          <><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-red-400">Inactivo</span></>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => openEdit(service)} className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-sm" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {services?.length === 0 && (
                  <tr><td colSpan="6" className="p-10 text-center text-gray-500 font-bold uppercase tracking-widest">El catálogo está vacío</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Crear Servicio">
        <ServiceForm data={formData} setData={setFormData} onSubmit={handleCreate} isLoading={createService.isLoading} btnLabel="CREAR SERVICIO" />
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Servicio">
        <ServiceForm data={editData} setData={setEditData} onSubmit={handleUpdate} isLoading={updateService.isLoading} btnLabel="ACTUALIZAR SERVICIO" />
      </Modal>
    </div>
  );
};

export default ServicesCatalog;
