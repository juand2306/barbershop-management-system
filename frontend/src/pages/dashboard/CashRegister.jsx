import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { Calculator, DollarSign, Wallet, ArrowDown, ArrowUp, Scissors, Package, Receipt, LogOut } from 'lucide-react';
import Modal from '../../components/Modal';

// Helper to extract DRF error messages
const extractApiError = (err) => {
  const data = err.response?.data;
  if (!data) return 'Error de conexión con el servidor';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const msg = data[firstKey];
    return Array.isArray(msg) ? `${firstKey}: ${msg[0]}` : `${firstKey}: ${msg}`;
  }
  return 'Error desconocido al guardar';
};

const getLocalDateStr = () => new Intl.DateTimeFormat('en-CA').format(new Date());

const CashRegister = () => {
  const queryClient = useQueryClient();
  const todayStr = getLocalDateStr();

  const [activeModal, setActiveModal] = useState(null); // 'service' | 'product' | 'expense' | 'advance'
  const [cierreReport, setCierreReport] = useState(null);

  // ── Data queries ──────────────────────────────────────────────────
  const { data: barbers } = useQuery(['barbers'], async () => { const r = await api.get('/barbers/'); return r.data.results || r.data; });
  const { data: services } = useQuery(['services'], async () => { const r = await api.get('/services/'); return r.data.results || r.data; });
  const { data: products } = useQuery(['products'], async () => { const r = await api.get('/products/'); return r.data.results || r.data; });
  const { data: paymentMethods } = useQuery(['paymentMethods'], async () => { const r = await api.get('/payment-methods/'); return r.data.results || r.data; });

  // ── Form states ───────────────────────────────────────────────────
  const [serviceForm, setServiceForm] = useState({ barber: '', service: '', price_charged: '', payment_method: '', client_name: '' });

  const [productForm, setProductForm] = useState({ product: '', seller: '', quantity: 1, unit_price: '', payment_method: '' });

  // expense fields aligned to backend model: detail (not description), expense_date required
  const [expenseForm, setExpenseForm] = useState({ detail: '', amount: '', category: 'otro', payment_method: '' });

  // advance fields aligned to backend model: detail (not notes)
  const [advanceForm, setAdvanceForm] = useState({ barber: '', amount: '', payment_method: '', detail: '' });

  // ── Auto-fill unit_price cuando selecciona producto ───────────────
  const handleProductSelect = async (productId) => {
    if (!productId) {
      setProductForm(prev => ({ ...prev, product: '', unit_price: '' }));
      return;
    }
    
    try {
      const response = await api.get(`/products/${productId}/get-price/`);
      setProductForm(prev => ({
        ...prev,
        product: productId,
        unit_price: response.data.price
      }));
    } catch (error) {
      toast.error('Error al obtener precio del producto');
      console.error('Error fetching product price:', error);
    }
  };

  // ── Mutations ─────────────────────────────────────────────────────
  const createService = useMutation({
    mutationFn: (data) => api.post('/service-records/', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['todaySummary']);
      toast.success('✅ Servicio cobrado exitosamente');
      setActiveModal(null);
      setServiceForm({ barber: '', service: '', price_charged: '', payment_method: '', client_name: '' });
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const createProductSale = useMutation({
    mutationFn: (data) => api.post('/products/sales/', data),
    onSuccess: () => {
      toast.success('✅ Venta registrada');
      setActiveModal(null);
      setProductForm({ product: '', seller: '', quantity: 1, unit_price: '', payment_method: '' });
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const createExpense = useMutation({
    mutationFn: (data) => api.post('/expenses/', data),
    onSuccess: () => {
      toast.success('✅ Gasto registrado');
      setActiveModal(null);
      setExpenseForm({ detail: '', amount: '', category: 'otro', payment_method: '' });
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const createAdvance = useMutation({
    mutationFn: (data) => api.post('/advances/', data),
    onSuccess: () => {
      toast.success('✅ Vale entregado al barbero');
      setActiveModal(null);
      setAdvanceForm({ barber: '', amount: '', payment_method: '', detail: '' });
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const generateCierre = useMutation({
    mutationFn: () => api.post('/reports/generar-cierre/', { date: todayStr }),
    onSuccess: (res) => {
      toast.success('Arqueo calculado exitosamente');
      setCierreReport(res.data);
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  const forceConfirmCierre = useMutation({
    mutationFn: () => api.patch(`/reports/${cierreReport.id}/confirmar/`),
    onSuccess: (res) => {
      toast.success('¡Día cerrado oficialmente!');
      setCierreReport(res.data);
    },
    onError: (err) => toast.error(extractApiError(err))
  });

  // ── Submit handlers ───────────────────────────────────────────────
  const handleServiceSubmit = (e) => {
    e.preventDefault();
    const price = parseFloat(serviceForm.price_charged);
    if (isNaN(price) || price < 0) { toast.error('Ingresa un precio válido'); return; }
    if (!serviceForm.payment_method) { toast.error('Selecciona un método de pago. Si no hay, créalo en Configuración.'); return; }
    createService.mutate({ ...serviceForm, price_charged: price });
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    if (!productForm.payment_method) { toast.error('Selecciona un método de pago. Si no hay, créalo en Configuración.'); return; }
    
    const unitPrice = parseFloat(productForm.unit_price);
    const quantity = parseInt(productForm.quantity);
    
    if (isNaN(unitPrice) || unitPrice < 0) { toast.error('Ingresa un precio unitario válido'); return; }
    if (isNaN(quantity) || quantity < 1) { toast.error('Ingresa una cantidad válida'); return; }
    
    createProductSale.mutate({
      product: productForm.product,
      barber: productForm.seller || null,  // Ahora es 'seller', no 'barber'
      quantity: quantity,
      unit_price: unitPrice,
      payment_method: productForm.payment_method,
      sale_date: todayStr,  // Agregar fecha de venta
    });
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (!expenseForm.payment_method) { toast.error('Selecciona un método de pago. Si no hay, créalo en Configuración.'); return; }
    createExpense.mutate({
      detail: expenseForm.detail,
      amount,
      category: expenseForm.category,
      payment_method: expenseForm.payment_method,
      expense_date: todayStr,     // ← REQUIRED by backend model
    });
  };

  const handleAdvanceSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(advanceForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (!advanceForm.payment_method) { toast.error('Selecciona un método de pago. Si no hay, créalo en Configuración.'); return; }
    createAdvance.mutate({
      barber: advanceForm.barber,
      amount,
      payment_method: advanceForm.payment_method,
      detail: advanceForm.detail,   // ← field name backend expects
    });
  };

  // ── UI helpers ────────────────────────────────────────────────────
  const ActionBtn = ({ title, icon: Icon, colorClass, onClick }) => (
    <button
      onClick={onClick}
      className={`glass-panel p-6 flex flex-col items-center justify-center gap-3 transition-all border-b-4 border-transparent hover:border-current shadow-[4px_4px_0px_rgba(0,0,0,0.8)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.6)] group ${colorClass}`}
    >
      <div className="p-4 rounded-sm bg-white/5 group-hover:bg-white/10 transition-colors">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="font-black text-white uppercase tracking-widest text-sm text-center">{title}</h3>
    </button>
  );

  const EXPENSE_CATEGORIES = [
    { value: 'compras', label: 'Compras / Insumos' },
    { value: 'servicios', label: 'Servicios Externos' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'nomina', label: 'Nómina / Personal' },
    { value: 'arriendo', label: 'Arriendo' },
    { value: 'publicidad', label: 'Publicidad' },
    { value: 'otro', label: 'Otro' },
  ];

  const safeInt = (v) => { const n = parseInt(v); return isNaN(n) ? 0 : n; };

  return (
    <div className="animate-slide-up space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Caja Diaria</h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">Flujo de dinero, cobros y arqueo</p>
        </div>
        <span className="glass-card px-4 py-2 border-purple-500/50 text-purple-400 font-black uppercase tracking-widest shadow-[4px_4px_0px_rgba(168,85,247,0.3)]">
          Hoy: {todayStr}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ActionBtn title="Registrar Corte" icon={Scissors} colorClass="text-purple-400 hover:bg-purple-900/20" onClick={() => setActiveModal('service')} />
        <ActionBtn title="Vender Producto" icon={Package} colorClass="text-cyan-400 hover:bg-cyan-900/20" onClick={() => setActiveModal('product')} />
        <ActionBtn title="Registrar Gasto" icon={Receipt} colorClass="text-red-400 hover:bg-red-900/20" onClick={() => setActiveModal('expense')} />
        <ActionBtn title="Dar Vale" icon={LogOut} colorClass="text-yellow-400 hover:bg-yellow-900/20" onClick={() => setActiveModal('advance')} />
      </div>

      {/* Cierre de Caja */}
      <div className="bg-[#151518] border border-white/10 p-8 rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none rounded-full"></div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 relative z-10 border-b border-white/5 pb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 text-black p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-sm">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-emerald-400">Arqueo Financiero</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Calcula exacto cuánto debe haber en caja</p>
            </div>
          </div>
          <button
            onClick={() => generateCierre.mutate()}
            disabled={generateCierre.isLoading || (cierreReport && cierreReport.status === 'confirmado')}
            className="btn bg-emerald-500 hover:bg-emerald-400 text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] uppercase tracking-widest font-black py-4 px-8 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generateCierre.isLoading ? 'CALCULANDO...' : 'CALCULAR CIERRE DE HOY'}
          </button>
        </div>

        {cierreReport && (
          <div className="space-y-10 animate-slide-up">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0c0c0e] border border-emerald-500/20 p-6 shadow-[4px_4px_0px_rgba(16,185,129,0.2)]">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowUp className="w-4 h-4 text-emerald-400"/> Ingresos Totales</p>
                <p className="text-3xl font-black text-emerald-400">
                  ${(safeInt(cierreReport.total_services_amount) + safeInt(cierreReport.total_products_amount) + safeInt(cierreReport.total_advance_payments)).toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 uppercase mt-2 font-bold tracking-widest">Servicios + Productos + Vales Pagados</p>
              </div>
              <div className="bg-[#0c0c0e] border border-red-500/20 p-6 shadow-[4px_4px_0px_rgba(239,68,68,0.2)]">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowDown className="w-4 h-4 text-red-400"/> Egresos Totales</p>
                <p className="text-3xl font-black text-red-500">
                  ${(safeInt(cierreReport.total_expenses) + safeInt(cierreReport.total_advances_given)).toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 uppercase mt-2 font-bold tracking-widest">Gastos + Vales Dados</p>
              </div>
              <div className="bg-[#0c0c0e] border border-purple-500/20 p-6 shadow-[4px_4px_0px_rgba(168,85,247,0.2)]">
                <p className="text-xs text-purple-300 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Wallet className="w-4 h-4 text-purple-400"/> Nómina Comisiones</p>
                <p className="text-3xl font-black text-purple-400">${safeInt(cierreReport.barber_commission_total).toLocaleString()}</p>
                <p className="text-[10px] text-purple-500/60 uppercase mt-2 font-bold tracking-widest">Dinero que pertenece a barberos</p>
              </div>
            </div>

            <div className="border border-cyan-500/30 bg-cyan-500/5 p-8 text-center shadow-[4px_4px_0px_rgba(6,182,212,0.2)]">
              <p className="text-sm font-bold uppercase text-cyan-500 tracking-widest mb-2">GANANCIA NETA BARBERÍA (PROFIT)</p>
              <p className="text-5xl font-black text-cyan-400 tracking-tighter">${safeInt(cierreReport.barbershop_profit).toLocaleString()}</p>
            </div>

            {/* Payment breakdown */}
            <div>
              <h3 className="text-lg font-black uppercase text-white tracking-widest mb-6 border-b border-white/10 pb-2">Desglose por Método de Pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cierreReport.payment_breakdown?.map(pb => {
                  const inflows = safeInt(pb.services_amount) + safeInt(pb.products_amount) + safeInt(pb.advance_payments_amount);
                  const outflows = safeInt(pb.expenses_amount) + safeInt(pb.advances_given_amount);
                  return (
                    <div key={pb.id} className="bg-[#0c0c0e] p-5 border-l-4 border-emerald-400 shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                      <h4 className="font-black text-white uppercase text-lg mb-4">{pb.payment_method_name}</h4>
                      <div className="space-y-2 text-sm font-bold tracking-wider">
                        <div className="flex justify-between"><span className="text-gray-500">ENTRÓ:</span><span className="text-emerald-400">+${inflows.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">SALIÓ:</span><span className="text-red-400">-${outflows.toLocaleString()}</span></div>
                        <div className="flex justify-between pt-2 border-t border-white/10 mt-2"><span className="text-gray-300">TOTAL ESPERADO:</span><span className="text-white text-xl">${(inflows - outflows).toLocaleString()}</span></div>
                      </div>
                    </div>
                  );
                })}
                {(!cierreReport.payment_breakdown || cierreReport.payment_breakdown.length === 0) && (
                  <p className="text-gray-500 font-bold uppercase tracking-widest col-span-3">No hubo movimientos financieros hoy.</p>
                )}
              </div>
            </div>

            {/* Commissions table */}
            <div>
              <h3 className="text-lg font-black uppercase text-white tracking-widest mb-6 border-b border-white/10 pb-2">Comisiones a Pagar por Barbero</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-xs uppercase font-black text-purple-400 bg-purple-500/10 border-b border-purple-500/20">
                    <tr>
                      <th className="p-4">Barbero</th>
                      <th className="p-4">% Com.</th>
                      <th className="p-4">Generado Bruto</th>
                      <th className="p-4 text-red-400">Vales Adeudados</th>
                      <th className="p-4">Comisión a Pagar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm font-bold tracking-wider">
                    {cierreReport.barber_commissions?.map(bc => (
                      <tr key={bc.id} className="hover:bg-white/5">
                        <td className="p-4 text-white uppercase">{bc.barber_name}</td>
                        <td className="p-4 text-gray-400">{bc.commission_percentage}%</td>
                        <td className="p-4 text-emerald-400">${safeInt(bc.services_total).toLocaleString()}</td>
                        <td className="p-4 text-red-500">-${safeInt(bc.pending_advances_total).toLocaleString()}</td>
                        <td className="p-4 text-white bg-purple-500/5 text-lg">${safeInt(bc.commission_amount).toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!cierreReport.barber_commissions || cierreReport.barber_commissions.length === 0) && (
                      <tr><td colSpan="5" className="p-6 text-center text-gray-500">Nadie trabajó hoy</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confirm action */}
            <div className="flex justify-end pt-8 mt-4 border-t border-white/10">
              {cierreReport.status === 'borrador' ? (
                <button
                  onClick={() => { if(window.confirm('¿Seguro que deseas confirmar el cierre? Ya no se podrán agregar más cortes al día de hoy.')) forceConfirmCierre.mutate(); }}
                  className="btn bg-red-600 hover:bg-red-500 text-white shadow-[4px_4px_0px_rgba(0,0,0,1)] uppercase tracking-widest font-black py-3 px-8 text-lg"
                >
                  CONFIRMAR ARQUEO Y CERRAR DÍA
                </button>
              ) : (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-8 py-3 font-black tracking-widest uppercase">
                  ✓ Cierre Finalizado y Bloqueado
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALES ── */}

      {/* 1. Registrar Corte */}
      <Modal isOpen={activeModal === 'service'} onClose={() => setActiveModal(null)} title="Registrar Corte (Ingreso)">
        <form onSubmit={handleServiceSubmit} className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            ⚠ El barbero debe tener marcada su entrada del día para poder registrar un corte.
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Barbero *</label>
            <select className="input-glass" required value={serviceForm.barber} onChange={e => setServiceForm({...serviceForm, barber: e.target.value})}>
              <option value="">Seleccione un barbero...</option>
              {barbers?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Servicio *</label>
            <select className="input-glass" required value={serviceForm.service} onChange={e => setServiceForm({...serviceForm, service: e.target.value})}>
              <option value="">Seleccione un servicio...</option>
              {services?.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} (${parseInt(s.price).toLocaleString()})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Precio Cobrado Real *</label>
            <input type="number" required min="0" className="input-glass text-emerald-400 text-lg font-black" value={serviceForm.price_charged} onChange={e => setServiceForm({...serviceForm, price_charged: e.target.value})} placeholder="25000" />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Método de Pago *</label>
            <select className="input-glass" value={serviceForm.payment_method} onChange={e => setServiceForm({...serviceForm, payment_method: e.target.value})}>
              <option value="">Seleccione método de pago...</option>
              {paymentMethods?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Cliente (Opcional)</label>
            <input type="text" className="input-glass" value={serviceForm.client_name} onChange={e => setServiceForm({...serviceForm, client_name: e.target.value})} placeholder="Juan Pérez o vacío" />
          </div>
          <button type="submit" disabled={createService.isLoading} className="btn bg-purple-600 hover:bg-purple-500 text-white w-full py-4 mt-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest">
            {createService.isLoading ? 'GUARDANDO...' : 'REGISTRAR INGRESO'}
          </button>
        </form>
      </Modal>

      {/* 2. Vender Producto */}
      <Modal isOpen={activeModal === 'product'} onClose={() => setActiveModal(null)} title="Venta de Producto">
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Producto *</label>
            <select 
              className="input-glass" 
              required 
              value={productForm.product} 
              onChange={(e) => handleProductSelect(e.target.value)}
            >
              <option value="">Seleccione un producto...</option>
              {products?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.current_quantity})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Vendedor de Productos (Opcional)</label>
            <select 
              className="input-glass" 
              value={productForm.seller} 
              onChange={(e) => setProductForm({...productForm, seller: e.target.value})}
            >
              <option value="">Sin asignar</option>
              {barbers?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Cantidad *</label>
              <input 
                type="number" 
                min="1" 
                required 
                className="input-glass font-bold" 
                value={productForm.quantity} 
                onChange={e => setProductForm({...productForm, quantity: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Precio Unitario *</label>
              <input 
                type="number" 
                min="0" 
                required 
                className="input-glass text-cyan-400 font-bold" 
                value={productForm.unit_price} 
                onChange={e => setProductForm({...productForm, unit_price: e.target.value})} 
                placeholder="Auto-completado con el precio del producto"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Método de Pago *</label>
            <select 
              className="input-glass" 
              required
              value={productForm.payment_method} 
              onChange={e => setProductForm({...productForm, payment_method: e.target.value})}
            >
              <option value="">Seleccione método de pago...</option>
              {paymentMethods?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button 
            type="submit" 
            disabled={createProductSale.isLoading} 
            className="btn bg-cyan-600 hover:bg-cyan-500 text-white w-full py-4 mt-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest"
          >
            {createProductSale.isLoading ? 'GUARDANDO...' : 'REGISTRAR VENTA'}
          </button>
        </form>
      </Modal>

      {/* 3. Registrar Gasto */}
      <Modal isOpen={activeModal === 'expense'} onClose={() => setActiveModal(null)} title="Registrar Gasto del Local">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Concepto / Detalle *</label>
            <input type="text" required className="input-glass" value={expenseForm.detail} onChange={e => setExpenseForm({...expenseForm, detail: e.target.value})} placeholder="Ej. Cuchillas Gillette, Papel higiénico..." />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Categoría</label>
            <select className="input-glass bg-[#151518]" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
              <option value="compras">Compras / Insumos</option>
              <option value="servicios">Servicios Externos</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="nomina">Nómina / Personal</option>
              <option value="arriendo">Arriendo</option>
              <option value="publicidad">Publicidad</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Monto (Egreso) *</label>
            <input type="number" required min="1" className="input-glass text-red-400 text-lg font-black" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="15000" />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Dinero sacado de... *</label>
            <select className="input-glass" value={expenseForm.payment_method} onChange={e => setExpenseForm({...expenseForm, payment_method: e.target.value})}>
              <option value="">Seleccione método de pago...</option>
              {paymentMethods?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
            Gasto fecha: {todayStr}
          </div>
          <button type="submit" disabled={createExpense.isLoading} className="btn bg-red-600 hover:bg-red-500 text-white w-full py-4 mt-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest">
            {createExpense.isLoading ? 'GUARDANDO...' : 'REGISTRAR GASTO'}
          </button>
        </form>
      </Modal>

      {/* 4. Dar Vale */}
      <Modal isOpen={activeModal === 'advance'} onClose={() => setActiveModal(null)} title="Dar Vale a Barbero">
        <form onSubmit={handleAdvanceSubmit} className="space-y-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wider leading-relaxed">
            Un vale es dinero real que sale de caja hoy como adelanto al barbero.
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Entrega a... *</label>
            <select className="input-glass" required value={advanceForm.barber} onChange={e => setAdvanceForm({...advanceForm, barber: e.target.value})}>
              <option value="">Seleccione barbero...</option>
              {barbers?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Monto Prestado *</label>
            <input type="number" required min="1" className="input-glass text-yellow-500 text-lg font-black" value={advanceForm.amount} onChange={e => setAdvanceForm({...advanceForm, amount: e.target.value})} placeholder="50000" />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Dinero sacado de... *</label>
            <select className="input-glass" value={advanceForm.payment_method} onChange={e => setAdvanceForm({...advanceForm, payment_method: e.target.value})}>
              <option value="">Seleccione método de pago...</option>
              {paymentMethods?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-gray-400 tracking-wider">Motivo (Opcional)</label>
            <input type="text" className="input-glass" value={advanceForm.detail} onChange={e => setAdvanceForm({...advanceForm, detail: e.target.value})} placeholder="Almuerzo, Adelanto quincena..." />
          </div>
          <button type="submit" disabled={createAdvance.isLoading} className="btn bg-yellow-500 hover:bg-yellow-400 text-black w-full py-4 mt-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest">
            {createAdvance.isLoading ? 'GUARDANDO...' : 'ENTREGAR VALE AL BARBERO'}
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default CashRegister;
