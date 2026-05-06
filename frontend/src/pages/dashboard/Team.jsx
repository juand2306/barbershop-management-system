import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import BarberAvatar from '../../components/BarberAvatar';
import { toast } from 'react-toastify';
import { Users, Plus, CheckCircle, Clock, Edit2, UserX, UserCheck, Camera } from 'lucide-react';
import { extractApiError, getLocalDateStr } from '../../utils/helpers';

const emptyForm = { name: '', phone: '', document_id: '', specialty: '', commission_percentage: 50, active: true };

// ─── Sección reutilizable de foto ─────────────────────────────────────────────
const PhotoSection = ({ name, photoUrl, isUploading, inputRef, onPickFile }) => (
  <div className="flex items-center gap-4 p-3 rounded-xl border border-white/10 bg-white/[0.02]">
    <div
      className="relative cursor-pointer group flex-shrink-0"
      onClick={() => inputRef.current?.click()}
      title="Cambiar foto de perfil"
    >
      <BarberAvatar
        name={name || '?'}
        photoUrl={photoUrl}
        className="w-16 h-16 rounded-xl"
        style={!photoUrl ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' } : {}}
      />
      <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {isUploading
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Camera className="w-5 h-5 text-white" />
        }
      </div>
    </div>

    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={onPickFile}
    />

    <div>
      <p className="text-xs font-bold text-white uppercase tracking-wider">Foto de perfil</p>
      <p className="text-[11px] text-gray-500 mt-0.5">JPG, PNG o WebP · Máx. 5 MB · Opcional</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="text-[11px] text-purple-400 font-bold hover:text-purple-300 transition-colors mt-1 disabled:opacity-50"
      >
        {isUploading ? 'Subiendo...' : photoUrl ? 'Cambiar foto' : 'Subir foto'}
      </button>
    </div>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const Team = () => {
  const queryClient = useQueryClient();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Form data
  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);

  // Create modal: foto seleccionada localmente, se sube después de crear el barbero
  const [createPhotoFile, setCreatePhotoFile] = useState(null);
  const [createPhotoPreview, setCreatePhotoPreview] = useState(null);
  const createPhotoInputRef = useRef(null);

  // Edit modal: foto se sube inmediatamente al seleccionar
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const editPhotoInputRef = useRef(null);

  // ── Queries ────────────────────────────────────────────────────────────────
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

  // ── Mutations ──────────────────────────────────────────────────────────────

  // Crear barbero: primero crea el registro, luego sube la foto si el usuario eligió una.
  const createBarber = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/barbers/', data);
      const newBarber = res.data;
      if (createPhotoFile) {
        const fd = new FormData();
        fd.append('photo', createPhotoFile);
        await api.post(`/barbers/${newBarber.id}/upload-photo/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return newBarber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['barbers']);
      toast.success('¡Barbero agregado al equipo!');
      closeAddModal();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  // Actualizar datos del barbero (texto/números).
  const updateBarber = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/barbers/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['barbers']);
      toast.success('Barbero actualizado');
      closeEditModal();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  // Subir / reemplazar foto (modal de edición: se dispara al seleccionar archivo).
  const uploadPhoto = useMutation({
    mutationFn: ({ id, file }) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.post(`/barbers/${id}/upload-photo/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['barbers']);
      toast.success('Foto de perfil actualizada');
    },
    onError: (err) => {
      setEditPhotoPreview(null);
      toast.error(extractApiError(err));
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => api.patch(`/barbers/${id}/`, { active }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['barbers']);
      toast.success(vars.active ? 'Barbero reactivado' : 'Barbero desactivado');
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const markEntry = useMutation({
    mutationFn: (barberId) => api.post('/barbers/daily-active/', { barber: barberId, work_date: getLocalDateStr() }),
    onSuccess: () => {
      queryClient.invalidateQueries(['barbersActive']);
      toast.success('¡Entrada registrada con éxito!');
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const markExit = useMutation({
    mutationFn: (logId) => api.patch(`/barbers/daily-active/${logId}/`, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['barbersActive']);
      toast.success('¡Salida registrada!');
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Revoca el object URL del modal de crear al cerrarlo (evita memory leak)
  const closeAddModal = () => {
    if (createPhotoPreview) URL.revokeObjectURL(createPhotoPreview);
    setIsAddModalOpen(false);
    setFormData(emptyForm);
    setCreatePhotoFile(null);
    setCreatePhotoPreview(null);
  };

  // Revoca el object URL del modal de editar al cerrarlo
  const closeEditModal = () => {
    if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
    setIsEditModalOpen(false);
    setEditTarget(null);
    setEditPhotoPreview(null);
  };

  // Foto en modal crear: solo guarda localmente (se sube junto al POST del barbero).
  const handleCreatePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Revocar URL anterior si existía
    if (createPhotoPreview) URL.revokeObjectURL(createPhotoPreview);
    setCreatePhotoFile(file);
    setCreatePhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  // Foto en modal editar: sube inmediatamente a Cloudinary.
  const handleEditPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file || !editTarget) return;
    if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
    setEditPhotoPreview(URL.createObjectURL(file));
    uploadPhoto.mutate({ id: editTarget.id, file });
    e.target.value = '';
  };

  const openEdit = (barber) => {
    setEditTarget(barber);
    setEditPhotoPreview(null);
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

  // ── Render ─────────────────────────────────────────────────────────────────
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

      {/* Grid de barberos */}
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
                    <BarberAvatar
                      name={barber.name}
                      photoUrl={barber.photo_url}
                      className="w-12 h-12 rounded-sm border border-white/10 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
                      style={!barber.photo_url ? { background: 'rgba(255,255,255,0.05)' } : {}}
                    />
                    <div>
                      <h3 className="font-bold text-white uppercase tracking-wide">{barber.name}</h3>
                      <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Comisión: {barber.commission_percentage}%</span>
                    </div>
                  </div>
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
                    <div title={active ? 'En turno hoy' : 'No ha ingresado'}>
                      {active
                        ? <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        : <Clock className="w-5 h-5 text-gray-500" />
                      }
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
                        onClick={() => { if (window.confirm('¿Registrar salida de este barbero?')) markExit.mutate(getActiveLogId(barber.id)); }}
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

      {/* ── Modal: Crear Barbero ───────────────────────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={closeAddModal} title="Alta de Barbero">
        <form onSubmit={(e) => { e.preventDefault(); createBarber.mutate(formData); }} className="space-y-4">

          <PhotoSection
            name={formData.name}
            photoUrl={createPhotoPreview}
            isUploading={false}
            inputRef={createPhotoInputRef}
            onPickFile={handleCreatePhotoChange}
          />

          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Nombre Completo *</label>
            <input required className="input-glass" placeholder="Ej. Peaky Blinder" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Documento (Cédula) *</label>
            <input required className="input-glass" placeholder="Número de documento" value={formData.document_id} onChange={e => setFormData({ ...formData, document_id: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Teléfono</label>
              <input type="tel" className="input-glass" placeholder="300 123 4567" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Comisión (%)</label>
              <input type="number" min="0" max="100" required className="input-glass font-bold text-purple-400" value={formData.commission_percentage} onChange={e => setFormData({ ...formData, commission_percentage: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Especialidad</label>
            <input className="input-glass" placeholder="Ej. Fade, Barba, Clásico..." value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} />
          </div>

          <button type="submit" disabled={createBarber.isLoading} className="btn btn-primary w-full shadow-[4px_4px_0px_rgba(0,0,0,0.8)] mt-2">
            {createBarber.isLoading ? 'Guardando...' : 'GUARDAR BARBERO'}
          </button>
        </form>
      </Modal>

      {/* ── Modal: Editar Barbero ──────────────────────────────────────────── */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Editar Barbero">
        {editTarget && (
          <form onSubmit={(e) => { e.preventDefault(); updateBarber.mutate({ id: editTarget.id, ...editData }); }} className="space-y-4">

            <PhotoSection
              name={editData.name || editTarget.name}
              photoUrl={editPhotoPreview || editTarget.photo_url}
              isUploading={uploadPhoto.isLoading}
              inputRef={editPhotoInputRef}
              onPickFile={handleEditPhotoChange}
            />

            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Nombre Completo *</label>
              <input required className="input-glass" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Documento</label>
              <input className="input-glass" value={editData.document_id} onChange={e => setEditData({ ...editData, document_id: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Teléfono</label>
                <input type="tel" className="input-glass" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Comisión (%)</label>
                <input type="number" min="0" max="100" required className="input-glass font-bold text-purple-400" value={editData.commission_percentage} onChange={e => setEditData({ ...editData, commission_percentage: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Especialidad</label>
              <input className="input-glass" placeholder="Ej. Fade, Barba, Clásico..." value={editData.specialty} onChange={e => setEditData({ ...editData, specialty: e.target.value })} />
            </div>

            <button type="submit" disabled={updateBarber.isLoading || uploadPhoto.isLoading} className="btn btn-primary w-full shadow-[4px_4px_0px_rgba(0,0,0,0.8)] mt-2">
              {updateBarber.isLoading ? 'Guardando...' : 'ACTUALIZAR BARBERO'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Team;
