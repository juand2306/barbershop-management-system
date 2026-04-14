import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Settings as SettingsIcon, CreditCard, Users, Shield, Plus, Lock, Edit2, UserX, UserCheck, Globe, QrCode, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../../components/Modal';

const Settings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('payment');
  
  // States for Payment Method
  const [newMethod, setNewMethod] = useState('');
  const [editMethodTarget, setEditMethodTarget] = useState(null);
  const [editMethodName, setEditMethodName] = useState('');

  // States for System User
  const [newUser, setNewUser] = useState({
     username: '', password: '', email: '',
     first_name: '', last_name: '', role: 'receptionist'
  });
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState(null);
  const [editUserData, setEditUserData] = useState({});

  // Barbershop info form state
  const [shopForm, setShopForm] = useState(null); // null = not loaded yet
  const [qrSize, setQrSize] = useState(200);

  // Queries
  const { data: currentMethods, isLoading: loadingMethods } = useQuery(['paymentMethods'], async () => {
    const res = await api.get('/payment-methods/');
    return res.data?.results || res.data;
  });

  const { data: users, isLoading: loadingUsers } = useQuery(['systemUsers'], async () => {
    const res = await api.get('/users/');
    return res.data?.results || res.data;
  });

  // Barbershop info query — staleTime alto para no re-fetch innecesario
  const { data: shopData } = useQuery(['barbershop-info'], async () => {
    const res = await api.get('/barbershop/');
    return res.data?.results?.[0] || (Array.isArray(res.data) ? res.data[0] : res.data);
  }, { staleTime: 60000 });

  // Populate form when shopData arrives (works with cache too — onSuccess no lo hace)
  useEffect(() => {
    if (shopData && !shopForm) {
      setShopForm({
        name: shopData.name || '',
        description: shopData.description || '',
        phone: shopData.phone || '',
        email: shopData.email || '',
        address: shopData.address || '',
        opening_time: shopData.opening_time?.slice(0, 5) || '08:00',
        closing_time: shopData.closing_time?.slice(0, 5) || '20:00',
        logo_url: shopData.logo_url || '',
      });
    }
  }, [shopData]);

  // Barbers query (for per-barber QR section)
  const { data: barbers, isLoading: loadingBarbers } = useQuery(['barbers-settings'], async () => {
    const res = await api.get('/barbers/?limit=100');
    return res.data?.results || res.data;
  });

  // Download QR as SVG by element ID
  const downloadQR = (elementId, filename = 'qr') => {
    const svgEl = document.getElementById(elementId);
    if (!svgEl) { toast.error('No se pudo encontrar el QR'); return; }
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`QR descargado: ${filename}.svg`);
  };

  // Mutations
  const createMethod = useMutation({
    mutationFn: (name) => api.post('/payment-methods/', { 
        name, 
        code: name.toLowerCase().replace(/\s+/g, '_').substring(0, 50),
        is_cash: name.toLowerCase().includes('efectivo'),
        active: true 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['paymentMethods']);
      toast.success('Método de pago guardado');
      setNewMethod('');
    },
    onError: (err) => {
       const msg = err.response?.data?.detail || err.response?.data?.code?.[0] || 'Error guardando método';
       toast.error(msg);
    }
  });

  const updateMethod = useMutation({
    mutationFn: ({ id, name }) => api.patch(`/payment-methods/${id}/`, { 
        name,
        code: name.toLowerCase().replace(/\s+/g, '_').substring(0, 50),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['paymentMethods']);
      toast.success('Método de pago actualizado');
      setEditMethodTarget(null);
      setEditMethodName('');
    },
    onError: (err) => {
       const msg = err.response?.data?.detail || err.response?.data?.code?.[0] || 'Error actualizando método';
       toast.error(msg);
    }
  });

  const deleteMethod = useMutation({
    mutationFn: (id) => api.delete(`/payment-methods/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries(['paymentMethods']);
      toast.success('Método de pago eliminado');
    },
    onError: (err) => {
       const msg = err.response?.data?.detail || (Array.isArray(err.response?.data) ? err.response.data[0] : null) || 'No se puede eliminar: tiene transacciones asociadas';
       toast.error(msg);
    }
  });


  const createUser = useMutation({
    mutationFn: (userObj) => api.post('/users/', userObj),
    onSuccess: () => {
      queryClient.invalidateQueries(['systemUsers']);
      toast.success('Usuario del sistema guardado');
      setNewUser({ username: '', password: '', email: '', first_name: '', last_name: '', role: 'receptionist' });
    },
    onError: (err) => {
       let msg = 'Error creando usuario';
       if(err.response?.data) {
          const keys = Object.keys(err.response.data);
          if (keys.length > 0 && Array.isArray(err.response.data[keys[0]])) {
             msg = `${keys[0].toUpperCase()}: ${err.response.data[keys[0]][0]}`;
          } else {
             msg = err.response?.data?.detail || msg;
          }
       }
       toast.error(msg);
    }
  });

  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries(['systemUsers']);
      toast.success('Usuario eliminado permanentemente');
    },
    onError: () => toast.error('Error al eliminar usuario')
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/users/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['systemUsers']);
      toast.success('Usuario del sistema actualizado');
      setIsEditUserModalOpen(false);
    },
    onError: (err) => {
       let msg = 'Error actualizando usuario';
       if(err.response?.data?.detail) msg = err.response.data.detail;
       toast.error(msg);
    }
  });

  const toggleUserActive = useMutation({
    mutationFn: ({ id, active }) => api.patch(`/users/${id}/`, { active }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['systemUsers']);
      toast.success(vars.active ? 'Usuario reactivado' : 'Usuario desactivado');
    },
    onError: () => toast.error('Error cambiando estado del usuario')
  });

  // Mutation to update barbershop info
  const updateShop = useMutation({
    mutationFn: (data) => api.patch(`/barbershop/${shopData?.id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['barbershop-info']);
      toast.success('Informacion del negocio actualizada. La landing refleja los cambios.');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error guardando informacion'),
  });

  // Handlers
  const handleAddMethod = (e) => {
    e.preventDefault();
    if (!newMethod.trim()) return;
    createMethod.mutate(newMethod.trim());
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    createUser.mutate(newUser);
  };

  const openEditUser = (u) => {
    setEditUserTarget(u);
    setEditUserData({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      role: u.role
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    updateUser.mutate({ id: editUserTarget.id, ...editUserData });
  };

  // Booking URL for QR
  const bookingUrl = `${window.location.origin}/booking`;

  return (
    <div className="animate-slide-up space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-white" />
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Configuraciones</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-6 overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveTab('payment')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'payment' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-white'}`}>
          <CreditCard className="w-4 h-4" /> Métodos de Pago
        </button>
        <button onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-white'}`}>
          <Shield className="w-4 h-4" /> Usuarios del Sistema
        </button>
        <button onClick={() => setActiveTab('negocio')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'negocio' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}>
          <Globe className="w-4 h-4" /> Negocio y Landing
        </button>
      </div>

      {/* TAB CONTENT: PAYMENTS */}
      {activeTab === 'payment' && (
        <div className="glass-panel p-8 animate-slide-up">
          <h2 className="text-lg flex items-center gap-2 font-bold mb-6 text-emerald-400 uppercase tracking-widest border-b border-white/5 pb-4">
            Flujo de Caja y Pagos
          </h2>

          {loadingMethods ? (
             <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Cargando...</p>
          ) : (
            <div className="space-y-4">
               {currentMethods?.length === 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-bold uppercase tracking-widest text-center">
                     Aún no has configurado métodos de pago. Crea "Efectivo", "Nequi", "Tarjeta", etc.
                  </div>
               )}

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {currentMethods?.map(method => (
                    <div key={method.id} className="bg-white/5 border border-white/10 p-4 rounded-sm flex justify-between items-center group">
                       <span className="font-bold text-white uppercase tracking-widest">{method.name}</span>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                           onClick={() => { setEditMethodTarget(method); setEditMethodName(method.name); }}
                           className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                           title="Editar nombre"
                         >
                           <Edit2 className="w-3.5 h-3.5" />
                         </button>
                         <button
                           onClick={() => { if(window.confirm(`¿Eliminar "${method.name}"? Solo es posible si no tiene transacciones.`)) deleteMethod.mutate(method.id); }}
                           className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-colors"
                           title="Eliminar"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                         </button>
                       </div>
                    </div>
                 ))}
               </div>

               {/* Edit method inline form */}
               {editMethodTarget && (
                 <div className="p-4 mt-4 border border-emerald-500/30 bg-emerald-500/5 rounded-sm">
                   <p className="text-xs uppercase font-bold text-emerald-400 tracking-widest mb-3">Editando: {editMethodTarget.name}</p>
                   <div className="flex gap-3">
                     <input
                       type="text"
                       className="input-glass flex-1"
                       value={editMethodName}
                       onChange={e => setEditMethodName(e.target.value)}
                       placeholder="Nuevo nombre..."
                       autoFocus
                     />
                     <button
                       onClick={() => { if(editMethodName.trim()) updateMethod.mutate({ id: editMethodTarget.id, name: editMethodName.trim() }); }}
                       disabled={updateMethod.isLoading || !editMethodName.trim()}
                       className="btn bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest px-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                     >
                       {updateMethod.isLoading ? '...' : 'GUARDAR'}
                     </button>
                     <button
                       onClick={() => { setEditMethodTarget(null); setEditMethodName(''); }}
                       className="btn bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase tracking-widest px-4"
                     >
                       CANCELAR
                     </button>
                   </div>
                 </div>
               )}

               <form onSubmit={handleAddMethod} className="pt-6 mt-6 border-t border-white/5 flex flex-col md:flex-row gap-4">
                  <input 
                    type="text" 
                    className="input-glass flex-1" 
                    placeholder="Nuevo método (ej. Nequi o Transferencia)" 
                    value={newMethod}
                    onChange={e => setNewMethod(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={createMethod.isLoading || !newMethod.trim()}
                    className="btn bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest whitespace-nowrap px-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                  >
                    {createMethod.isLoading ? '...' : 'AGREGAR MEDIO'}
                  </button>
               </form>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
          {/* Create User Form */}
          <div className="glass-panel p-8 h-fit">
               <h2 className="text-lg flex items-center gap-2 font-bold mb-6 text-purple-400 uppercase tracking-widest border-b border-white/5 pb-4">
                 Registrar Staff
               </h2>
               <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs uppercase font-bold text-gray-400">Nombres</label>
                        <input required className="input-glass" value={newUser.first_name} onChange={e => setNewUser({...newUser, first_name: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs uppercase font-bold text-gray-400">Apellidos</label>
                        <input required className="input-glass" value={newUser.last_name} onChange={e => setNewUser({...newUser, last_name: e.target.value})} />
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-xs uppercase font-bold text-gray-400">Correo Electrónico</label>
                     <input type="email" required className="input-glass" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs uppercase font-bold text-gray-400">Usuario (Login)</label>
                        <input required className="input-glass" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase()})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs uppercase font-bold text-gray-400">Contraseña</label>
                        <div className="relative">
                           <Lock className="w-4 h-4 absolute left-3 top-3 text-purple-400" />
                           <input type="text" required className="input-glass border border-purple-500/50 pl-10" minLength="6" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-xs uppercase font-bold text-gray-400">Rol de Acceso</label>
                     <select className="input-glass bg-[#151518]" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="receptionist">Recepcionista (Solo Agendar y Turnos)</option>
                        <option value="manager">Gerencia (Caja, Reportes y Equipo)</option>
                        <option value="admin">Administrador (Acceso Total)</option>
                     </select>
                  </div>

                  <button 
                     type="submit" 
                     disabled={createUser.isLoading}
                     className="btn btn-primary w-full shadow-[4px_4px_0px_rgba(0,0,0,0.8)] mt-4"
                  >
                     {createUser.isLoading ? 'GUARDANDO...' : 'CREAR USUARIO DEL SISTEMA'}
                  </button>
               </form>
          </div>

          {/* User List */}
          <div className="glass-panel p-8">
               <h2 className="text-lg flex items-center gap-2 font-bold mb-6 text-white uppercase tracking-widest border-b border-white/5 pb-4">
                 Cuentas Activas
               </h2>
               
               {loadingUsers ? (
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Cargando...</p>
               ) : (
                  <div className="space-y-3">
                     {users?.map(u => (
                        <div key={u.id} className="bg-white/5 border border-white/10 p-4 rounded-sm flex justify-between items-center group">
                           <div>
                              <p className="font-bold text-white uppercase tracking-wide">{u.first_name} {u.last_name}</p>
                              <p className="text-sm text-gray-400">@{u.username} • {u.email}</p>
                           </div>
                           <div className="flex gap-3 items-center">
                               <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-widest rounded-sm ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : u.role === 'manager' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {u.role === 'receptionist' ? 'Recepción' : u.role.toUpperCase()}
                               </span>
                               {/* Admin can't change their own active status or be deleted to prevent locking out */}
                               {u.username !== 'admin' && (
                                 <>
                                   <button onClick={() => toggleUserActive.mutate({ id: u.id, active: !u.active })} className={`p-1 transition-colors ${u.active ? 'text-gray-500 hover:text-red-400' : 'text-gray-500 hover:text-emerald-400'}`} title={u.active ? 'Desactivar' : 'Activar'}>
                                     {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                   </button>
                                   <button onClick={() => openEditUser(u)} className="text-gray-500 hover:text-white p-1 transition-colors" title="Editar Información">
                                     <Edit2 className="w-4 h-4" />
                                   </button>
                                   <button onClick={() => {if(window.confirm('¿Eliminar usuario?')) deleteUser.mutate(u.id)}} className="text-gray-500 hover:text-red-500 p-1 transition-colors" title="Eliminar Permanente">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                   </button>
                                 </>
                               )}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
          </div>
        </div>
      )}

      {/* TAB: NEGOCIO & LANDING */}
      {activeTab === 'negocio' && (
        <div className="space-y-8 animate-slide-up">

          {/* ── Info + QR General ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Edit barbershop info */}
            <div className="glass-panel p-7 space-y-4">
              <h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Info del Negocio
              </h2>
              {shopForm ? (
                <div className="space-y-3">
                  <div className="space-y-1"><label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Nombre</label>
                    <input className="input-glass" value={shopForm.name} onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Descripcion / Slogan</label>
                    <textarea rows={2} className="input-glass resize-none" value={shopForm.description} onChange={e => setShopForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Telefono</label>
                      <input className="input-glass" value={shopForm.phone} onChange={e => setShopForm(f => ({ ...f, phone: e.target.value }))} /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Correo</label>
                      <input type="email" className="input-glass" value={shopForm.email} onChange={e => setShopForm(f => ({ ...f, email: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Direccion</label>
                    <input className="input-glass" value={shopForm.address} onChange={e => setShopForm(f => ({ ...f, address: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Apertura</label>
                      <input type="time" className="input-glass" value={shopForm.opening_time} onChange={e => setShopForm(f => ({ ...f, opening_time: e.target.value }))} /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Cierre</label>
                      <input type="time" className="input-glass" value={shopForm.closing_time} onChange={e => setShopForm(f => ({ ...f, closing_time: e.target.value }))} /></div>
                  </div>
                  <button onClick={() => updateShop.mutate(shopForm)} disabled={updateShop.isLoading}
                    className="btn bg-cyan-500 hover:bg-cyan-400 text-black w-full font-black uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />{updateShop.isLoading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                  </button>
                </div>
              ) : <p className="text-gray-500 font-bold animate-pulse text-sm">Cargando...</p>}
            </div>

            {/* QR General */}
            <div className="glass-panel p-7 flex flex-col items-center gap-4">
              <div className="self-stretch">
                <h2 className="text-sm font-black text-purple-400 uppercase tracking-widest border-b border-white/5 pb-4 flex items-center gap-2">
                  <QrCode className="w-4 h-4" /> QR General del Negocio
                </h2>
                <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mt-2 mb-4">Reservas para cualquier barbero del equipo.</p>
              </div>
              <div className="p-5 bg-white rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.2)]">
                <QRCodeSVG id="qr-general" value={bookingUrl} size={qrSize} fgColor="#1a0a2e" bgColor="#ffffff" level="H" includeMargin={false} />
              </div>
              <div className="w-full flex gap-2">
                <input readOnly className="input-glass flex-1 text-xs" value={bookingUrl} />
                <button onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success('URL copiada'); }}
                  className="px-3 py-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500/25 transition-colors whitespace-nowrap">Copiar</button>
              </div>
              <div className="w-full space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Tamano: {qrSize}px</label>
                <input type="range" min={120} max={300} step={20} value={qrSize} onChange={e => setQrSize(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>
              <button onClick={() => downloadQR('qr-general', 'qr-negocio-general')}
                className="btn bg-purple-600 hover:bg-purple-500 text-white w-full font-black uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
                <QrCode className="w-4 h-4" /> Descargar QR
              </button>
            </div>
          </div>

          {/* ── QRs por Barbero ── */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-yellow-400" /> QR Personales por Barbero
                </h2>
                <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mt-1">
                  El cliente escanea y reserva directo con su barbero preferido. Sin pasos extras.
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl border border-purple-500/15 bg-purple-500/[0.03] mb-6">
              {[
                { n: '1', text: 'Imprime el QR del barbero en su tarjeta de presentacion o puesto de trabajo' },
                { n: '2', text: 'El cliente lo escanea con la camara — no necesita app ni cuenta' },
                { n: '3', text: 'La reserva abre con el barbero ya seleccionado. Solo elige servicio y hora' },
              ].map(({ n, text }) => (
                <div key={n} className="flex flex-col items-center text-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 font-black text-sm flex items-center justify-center">{n}</div>
                  <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {loadingBarbers ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3].map(i => <div key={i} className="glass-panel h-72 animate-pulse border-white/5 rounded-xl" />)}
              </div>
            ) : !barbers?.filter(b => b.active).length ? (
              <div className="glass-panel p-8 text-center border-white/5">
                <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No hay barberos activos. Agrega barberos en el modulo Equipo.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {barbers.filter(b => b.active).map(barber => {
                  const barberUrl = `${bookingUrl}?barber=${barber.id}`;
                  const qrId = `qr-barber-${barber.id}`;
                  return (
                    <div key={barber.id} className="glass-panel p-5 border-white/[0.07] hover:border-purple-500/20 transition-all">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center font-black text-lg text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] flex-shrink-0">
                          {barber.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white uppercase tracking-tight text-sm truncate">{barber.name}</p>
                          {barber.specialty && <p className="text-[11px] text-purple-400 font-bold">{barber.specialty}</p>}
                        </div>
                      </div>

                      {/* QR */}
                      <div className="flex justify-center mb-4">
                        <div className="p-3.5 bg-white rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.12)]">
                          <QRCodeSVG id={qrId} value={barberUrl} size={130} fgColor="#1a0a2e" bgColor="#ffffff" level="H" includeMargin={false} />
                        </div>
                      </div>

                      {/* URL */}
                      <div className="flex gap-1.5 mb-3">
                        <input readOnly className="input-glass flex-1 text-[10px] py-1.5" value={barberUrl} />
                        <button onClick={() => { navigator.clipboard.writeText(barberUrl); toast.success(`URL de ${barber.name.split(' ')[0]} copiada`); }}
                          className="px-2 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-[10px] font-bold hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">
                          Copiar
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => downloadQR(qrId, `qr-${barber.name.toLowerCase().replace(/\s+/g, '-')}`)}
                          className="flex items-center justify-center gap-1.5 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-colors">
                          <QrCode className="w-3 h-3" /> Descargar
                        </button>
                        <a href={barberUrl} target="_blank" rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-colors">
                          <Globe className="w-3 h-3" /> Ver pagina
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      <Modal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} title="Modificar Usuario">
         <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-gray-400">Nombres</label>
                  <input required className="input-glass" value={editUserData.first_name || ''} onChange={e => setEditUserData({...editUserData, first_name: e.target.value})} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs uppercase font-bold text-gray-400">Apellidos</label>
                  <input required className="input-glass" value={editUserData.last_name || ''} onChange={e => setEditUserData({...editUserData, last_name: e.target.value})} />
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-xs uppercase font-bold text-gray-400">Correo Electrónico</label>
               <input type="email" required className="input-glass" value={editUserData.email || ''} onChange={e => setEditUserData({...editUserData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-xs uppercase font-bold text-gray-400">Rol de Acceso</label>
               <select className="input-glass bg-[#151518]" value={editUserData.role || 'receptionist'} onChange={e => setEditUserData({...editUserData, role: e.target.value})}>
                  <option value="receptionist">Recepcionista (Solo Agendar y Turnos)</option>
                  <option value="manager">Gerencia (Caja, Reportes y Equipo)</option>
                  <option value="admin">Administrador (Acceso Total)</option>
               </select>
            </div>
            <button 
               type="submit" 
               disabled={updateUser.isLoading}
               className="btn btn-primary w-full shadow-[4px_4px_0px_rgba(0,0,0,0.8)] mt-4"
            >
               {updateUser.isLoading ? 'GUARDANDO...' : 'ACTUALIZAR USUARIO'}
            </button>
         </form>
      </Modal>

    </div>
  );
};

export default Settings;
