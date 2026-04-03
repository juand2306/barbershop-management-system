import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { Settings as SettingsIcon, CreditCard, Users, Shield, Plus, Lock, Edit2, UserX, UserCheck } from 'lucide-react';
import Modal from '../../components/Modal';

const Settings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('payment');
  
  // States for Payment Method
  const [newMethod, setNewMethod] = useState('');
  
  // States for System User
  const [newUser, setNewUser] = useState({
     username: '',
     password: '',
     email: '',
     first_name: '',
     last_name: '',
     role: 'receptionist'
  });

  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState(null);
  const [editUserData, setEditUserData] = useState({});

  // Queries
  const { data: currentMethods, isLoading: loadingMethods } = useQuery(['paymentMethods'], async () => {
    const res = await api.get('/payment-methods/');
    return res.data?.results || res.data;
  });

  const { data: users, isLoading: loadingUsers } = useQuery(['systemUsers'], async () => {
    const res = await api.get('/users/');
    return res.data?.results || res.data;
  });

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

  return (
    <div className="animate-slide-up space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-white" />
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Configuraciones Globales</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-8">
         <button 
           onClick={() => setActiveTab('payment')}
           className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${activeTab === 'payment' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-white'}`}
         >
           <CreditCard className="w-4 h-4" /> Métodos de Pago
         </button>
         <button 
           onClick={() => setActiveTab('users')}
           className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-white'}`}
         >
           <Shield className="w-4 h-4" /> Usuarios del Sistema
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
                    </div>
                 ))}
               </div>

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
