import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import { toast } from 'react-toastify';
import { Package, Plus, Edit2, AlertTriangle } from 'lucide-react';

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

const emptyForm = { name: '', description: '', price: '', cost_price: 0, current_quantity: 0, minimum_quantity: 5, supplier: '', active: true };

const ProductsCatalog = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);

  const { data: products, isLoading } = useQuery(['products'], async () => {
    const res = await api.get('/products/');
    return res.data.results || res.data;
  });

  const createProduct = useMutation({
    mutationFn: (data) => api.post('/products/', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Producto ingresado al inventario');
      setIsAddModalOpen(false);
      setFormData(emptyForm);
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/products/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Producto actualizado');
      setIsEditModalOpen(false);
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const toggleProduct = useMutation({
    mutationFn: ({ id, active }) => api.patch(`/products/${id}/`, { active }),
    onSuccess: () => queryClient.invalidateQueries(['products']),
    onError: (err) => toast.error(extractApiError(err))
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const price = parseInt(String(formData.price).replace(/\D/g, ''), 10);
    const cost_price = parseInt(String(formData.cost_price).replace(/\D/g, ''), 10) || 0;
    if (isNaN(price) || price < 0) { toast.error('Ingresa un precio de venta válido'); return; }
    createProduct.mutate({ ...formData, price, cost_price });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const price = parseInt(String(editData.price).replace(/\D/g, ''), 10);
    const cost_price = parseInt(String(editData.cost_price).replace(/\D/g, ''), 10) || 0;
    if (isNaN(price) || price < 0) { toast.error('Ingresa un precio de venta válido'); return; }
    updateProduct.mutate({ id: editTarget.id, ...editData, price, cost_price });
  };

  const openEdit = (product) => {
    setEditTarget(product);
    setEditData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      cost_price: product.cost_price,
      current_quantity: product.current_quantity,
      minimum_quantity: product.minimum_quantity,
      supplier: product.supplier || '',
      active: product.active,
    });
    setIsEditModalOpen(true);
  };

  const ProductForm = ({ data, setData, onSubmit, isLoading, btnLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Nombre del Producto *</label>
        <input required className="input-glass" placeholder="Ej. Minoxidil Kirkland, Cera..." value={data.name} onChange={e => setData({...data, name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Stock Actual</label>
          <input type="number" min="0" required className="input-glass font-bold text-emerald-400" value={data.current_quantity} onChange={e => setData({...data, current_quantity: e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Min. Alerta</label>
          <input type="number" min="0" required className="input-glass font-bold text-red-400" value={data.minimum_quantity} onChange={e => setData({...data, minimum_quantity: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Costo (Compra)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 font-bold pointer-events-none">$</span>
            <input type="number" min="0" className="input-glass !pl-8" value={data.cost_price} onChange={e => setData({...data, cost_price: e.target.value})} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Precio Venta *</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-emerald-400 font-bold pointer-events-none">$</span>
            <input type="number" min="0" required className="input-glass !pl-8 font-black text-emerald-400" value={data.price} onChange={e => setData({...data, price: e.target.value})} />
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Proveedor local/Marca</label>
        <input className="input-glass" value={data.supplier} onChange={e => setData({...data, supplier: e.target.value})} />
      </div>
      <button type="submit" disabled={isLoading} className="btn btn-primary w-full shadow-[4px_4px_0px_rgba(0,0,0,0.8)] mt-2">
        {isLoading ? 'Guardando...' : btnLabel}
      </button>
    </form>
  );

  return (
    <div className="animate-slide-up space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Inventario de Productos</h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">Control de stock, costos y ventas</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
          <Plus className="w-5 h-5" />
          <span className="font-bold">Nuevo Producto</span>
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
                  <th className="p-4 font-bold">Producto</th>
                  <th className="p-4 font-bold text-center">Stock</th>
                  <th className="p-4 font-bold text-right">Precio Venta</th>
                  <th className="p-4 font-bold text-center">Estado</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products?.map(product => {
                  const isLow = product.current_quantity <= product.minimum_quantity;
                  return (
                  <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase tracking-wide">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.supplier || 'Sin proveedor'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-bold ${isLow ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-300'}`}>
                        {product.current_quantity} unidades
                        {isLow && <AlertTriangle className="w-3 h-3" />}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-lg font-black text-emerald-400">${parseInt(product.price).toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleProduct.mutate({ id: product.id, active: !product.active })} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors" title={product.active ? 'Desactivar' : 'Activar'}>
                        {product.active ? (
                          <><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span><span className="text-emerald-400">Activo</span></>
                        ) : (
                          <><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-red-400">Inactivo</span></>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => openEdit(product)} className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-sm" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )})}
                {products?.length === 0 && (
                  <tr><td colSpan="5" className="p-10 text-center text-gray-500 font-bold uppercase tracking-widest">El inventario está vacío</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Registrar Producto">
        <ProductForm data={formData} setData={setFormData} onSubmit={handleCreate} isLoading={createProduct.isLoading} btnLabel="CREAR PRODUCTO" />
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Producto">
        <ProductForm data={editData} setData={setEditData} onSubmit={handleUpdate} isLoading={updateProduct.isLoading} btnLabel="ACTUALIZAR PRODUCTO" />
      </Modal>
    </div>
  );
};

export default ProductsCatalog;
