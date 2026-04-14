import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  History, Filter, Scissors, DollarSign, TrendingDown,
  CreditCard, Package, Calendar, ChevronDown, ChevronUp,
  Search, Download, RefreshCw, ArrowUpRight, ArrowDownRight,
  FileText, User, Clock, BarChart2, X
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (val) => {
  if (!val && val !== 0) return '$0';
  return `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const fmtDate = (str) => {
  if (!str) return '—';
  try { return format(parseISO(str), "d MMM yyyy", { locale: es }); } catch { return str; }
};
const fmtDateTime = (str) => {
  if (!str) return '—';
  try { return format(parseISO(str), "d MMM yyyy HH:mm", { locale: es }); } catch { return str; }
};

// ─── Quick date range presets ──────────────────────────────────────────────
const getPreset = (preset) => {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    case 'this_month':
      return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(endOfMonth(today), 'yyyy-MM-dd') };
    case 'last_month': {
      const last = subMonths(today, 1);
      return { from: format(startOfMonth(last), 'yyyy-MM-dd'), to: format(endOfMonth(last), 'yyyy-MM-dd') };
    }
    case 'last_3m': {
      const t3 = subMonths(today, 3);
      return { from: format(startOfMonth(t3), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    }
    default:
      return { from: '', to: '' };
  }
};

// ─── Tabs config ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'cierres',   label: 'Cierres de Caja', icon: FileText,      color: 'purple' },
  { id: 'servicios', label: 'Servicios',        icon: Scissors,      color: 'cyan'   },
  { id: 'gastos',    label: 'Gastos',           icon: TrendingDown,  color: 'red'    },
  { id: 'vales',     label: 'Vales',            icon: CreditCard,    color: 'yellow' },
  { id: 'productos', label: 'Ventas Productos', icon: Package,       color: 'green'  },
];

const TAB_COLORS = {
  purple: { active: 'border-purple-500 text-purple-400',   badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', summary: 'from-purple-900/20 to-transparent border-purple-500/20' },
  cyan:   { active: 'border-cyan-400 text-cyan-400',       badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',       summary: 'from-cyan-900/20 to-transparent border-cyan-500/20'   },
  red:    { active: 'border-red-400 text-red-400',         badge: 'bg-red-500/20 text-red-300 border-red-500/30',         summary: 'from-red-900/20 to-transparent border-red-500/20'     },
  yellow: { active: 'border-yellow-400 text-yellow-400',   badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', summary: 'from-yellow-900/20 to-transparent border-yellow-500/20'},
  green:  { active: 'border-green-400 text-green-400',     badge: 'bg-green-500/20 text-green-300 border-green-500/30',   summary: 'from-green-900/20 to-transparent border-green-500/20' },
};

// ─── Status badges ───────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const map = {
    completado: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    completada: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    confirmado: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    cancelado:  'text-gray-500 bg-gray-500/10 border-gray-500/20',
    borrador:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    guardado:   'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    pendiente:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    parcialmente_pagado: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    pagado:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  };
  const cls = map[status] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  const labels = {
    completado: 'Completado', completada: 'Completada', confirmado: 'Confirmado',
    cancelado: 'Cancelado', borrador: 'Borrador', guardado: 'Guardado',
    pendiente: 'Pendiente', parcialmente_pagado: 'Parcial', pagado: 'Pagado',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>
      {labels[status] || status}
    </span>
  );
};

// ─── Filter Bar component ────────────────────────────────────────────────────
const FilterBar = ({ filters, setFilters, barbers, paymentMethods, showBarber = true, showPayment = true, showCategory = false, showStatus = false }) => {
  const [open, setOpen] = useState(true);

  const applyPreset = (preset) => {
    const { from, to } = getPreset(preset);
    setFilters(f => ({ ...f, date_from: from, date_to: to }));
  };

  return (
    <div className="glass-panel mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-gray-300 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-purple-400" /> Filtros
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3 border-t border-white/5">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 pt-3">
            {[['today','Hoy'],['this_month','Este mes'],['last_month','Mes anterior'],['last_3m','Últimos 3 meses']].map(([preset, label]) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border border-white/10 text-gray-400 hover:border-purple-500/50 hover:text-purple-400 transition-all"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setFilters(f => ({ ...f, date_from: '', date_to: '', barber: '', payment_method: '', category: '', status: '', search: '' }))}
              className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Desde</label>
              <input type="date" className="input-glass text-sm py-2"
                value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Hasta</label>
              <input type="date" className="input-glass text-sm py-2"
                value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
            </div>

            {showBarber && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Barbero</label>
                <select className="input-glass text-sm py-2"
                  value={filters.barber} onChange={e => setFilters(f => ({ ...f, barber: e.target.value }))}>
                  <option value="">Todos</option>
                  {barbers?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {showPayment && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Método de Pago</label>
                <select className="input-glass text-sm py-2"
                  value={filters.payment_method} onChange={e => setFilters(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="">Todos</option>
                  {paymentMethods?.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                </select>
              </div>
            )}

            {showCategory && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Categoría</label>
                <select className="input-glass text-sm py-2"
                  value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Todas</option>
                  {[['compras','Compras/Insumos'],['servicios','Servicios Ext.'],['mantenimiento','Mantenimiento'],
                    ['nomina','Nómina'],['arriendo','Arriendo'],['publicidad','Publicidad'],['otro','Otro']].map(([v,l]) =>
                    <option key={v} value={v}>{l}</option>
                  )}
                </select>
              </div>
            )}

            {showStatus && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Estado</label>
                <select className="input-glass text-sm py-2"
                  value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                  <option value="">Todos</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="pendiente_pago">Pendiente pago</option>
                </select>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              className="input-glass text-sm py-2 pl-9"
              placeholder="Buscar por cliente, detalle, nombre..."
              value={filters.search || ''}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Summary cards ───────────────────────────────────────────────────────────
const SummaryCards = ({ cards, color }) => {
  const c = TAB_COLORS[color] || TAB_COLORS.purple;
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 rounded-lg bg-gradient-to-r ${c.summary} border`}>
      {cards.map(({ label, value, icon: Icon, sub }) => (
        <div key={label} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {Icon && <Icon className="w-3 h-3" />}
            <span className="truncate">{label}</span>
          </div>
          <p className="text-lg md:text-xl font-black text-white leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
        </div>
      ))}
    </div>
  );
};

// ─── Table wrapper ───────────────────────────────────────────────────────────
const TableWrap = ({ children, loading, empty }) => (
  <div className="glass-panel overflow-hidden">
    {loading ? (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
      </div>
    ) : empty ? (
      <div className="flex flex-col items-center justify-center py-16 text-gray-600">
        <History className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-bold uppercase tracking-widest text-sm">Sin registros para estos filtros</p>
      </div>
    ) : (
      <div className="overflow-x-auto custom-scrollbar w-full">
        <table className="text-sm" style={{ minWidth: '640px', width: '100%' }}>
          {children}
        </table>
      </div>
    )}
  </div>
);

const Th = ({ children, right }) => (
  <th className={`px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);
const Td = ({ children, right, mono, muted }) => (
  <td className={`px-4 py-3 border-b border-white/5 whitespace-nowrap ${right ? 'text-right' : ''} ${mono ? 'font-mono' : ''} ${muted ? 'text-gray-500 text-xs' : 'text-gray-200'}`}>
    {children}
  </td>
);

// ─── Tab: Cierres de Caja ────────────────────────────────────────────────────
const CierresTab = ({ filters, onFilterChange, barbers, paymentMethods }) => {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.status) params.set('status', filters.status);

  const { data, isLoading } = useQuery(['history-cierres', filters], async () => {
    const res = await api.get(`/reports/?${params.toString()}`);
    return res.data.results || res.data;
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let d = [...data];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      d = d.filter(r => r.report_date?.includes(s) || r.notes?.toLowerCase().includes(s) || r.status?.includes(s));
    }
    return d;
  }, [data, filters.search]);

  const totals = useMemo(() => ({
    income: filtered.reduce((a, r) => a + Number(r.total_services_amount || 0) + Number(r.total_products_amount || 0) + Number(r.total_advance_payments || 0), 0),
    commissions: filtered.reduce((a, r) => a + Number(r.barber_commission_total || 0), 0),
    profit: filtered.reduce((a, r) => a + Number(r.barbershop_profit || 0), 0),
  }), [filtered]);

  return (
    <>
      <FilterBar filters={filters} setFilters={onFilterChange} barbers={barbers} paymentMethods={paymentMethods}
        showBarber={false} showPayment={false} showStatus={true} />

      <SummaryCards color="purple" cards={[
        { label: 'Cierres', value: filtered.length, icon: FileText },
        { label: 'Ingresos totales', value: fmt(totals.income), icon: ArrowUpRight },
        { label: 'Comisiones', value: fmt(totals.commissions), icon: User },
        { label: 'Ganancia neta', value: fmt(totals.profit), icon: BarChart2 },
      ]} />

      <TableWrap loading={isLoading} empty={!filtered?.length}>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Estado</Th>
            <Th right>Servicios</Th>
            <Th right>Productos</Th>
            <Th right>Pagos Vales</Th>
            <Th right>Gastos</Th>
            <Th right>Vales dados</Th>
            <Th right>Comisiones</Th>
            <Th right>Ganancia</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
              <Td>
                <div className="font-bold text-white">{fmtDate(r.report_date)}</div>
                {r.notes && <div className="text-[11px] text-gray-500 mt-0.5 max-w-[180px] truncate">{r.notes}</div>}
              </Td>
              <Td><StatusChip status={r.status} /></Td>
              <Td right mono>{fmt(r.total_services_amount)}</Td>
              <Td right mono>{fmt(r.total_products_amount)}</Td>
              <Td right mono>{fmt(r.total_advance_payments)}</Td>
              <Td right mono muted>{fmt(r.total_expenses)}</Td>
              <Td right mono muted>{fmt(r.total_advances_given)}</Td>
              <Td right mono muted>{fmt(r.barber_commission_total)}</Td>
              <Td right>
                <span className={`font-black font-mono ${Number(r.barbershop_profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(r.barbershop_profit)}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ─── Tab: Servicios ──────────────────────────────────────────────────────────
const ServiciosTab = ({ filters, onFilterChange, barbers, paymentMethods }) => {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.barber) params.set('barber', filters.barber);
  if (filters.payment_method) params.set('payment_method', filters.payment_method);
  if (filters.status) params.set('status', filters.status);

  const { data, isLoading } = useQuery(['history-servicios', filters], async () => {
    const res = await api.get(`/service-records/?${params.toString()}`);
    return res.data.results || res.data;
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let d = [...data];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      d = d.filter(r => r.client_name?.toLowerCase().includes(s) || r.service_name?.toLowerCase().includes(s) || r.barber_name?.toLowerCase().includes(s));
    }
    return d;
  }, [data, filters.search]);

  const total = filtered.reduce((a, r) => a + Number(r.price_charged || 0), 0);
  const byBarber = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      map[r.barber_name] = (map[r.barber_name] || 0) + Number(r.price_charged || 0);
    });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]}: ${fmt(top[1])}` : '—';
  }, [filtered]);

  return (
    <>
      <FilterBar filters={filters} setFilters={onFilterChange} barbers={barbers} paymentMethods={paymentMethods}
        showBarber={true} showPayment={true} showStatus={true} />

      <SummaryCards color="cyan" cards={[
        { label: 'Registros', value: filtered.length, icon: Scissors },
        { label: 'Total cobrado', value: fmt(total), icon: DollarSign },
        { label: 'Promedio', value: fmt(filtered.length ? total / filtered.length : 0), icon: BarChart2 },
        { label: 'Top barbero', value: '', sub: byBarber, icon: User },
      ]} />

      <TableWrap loading={isLoading} empty={!filtered?.length}>
        <thead>
          <tr>
            <Th>Fecha/Hora</Th>
            <Th>Cliente</Th>
            <Th>Servicio</Th>
            <Th>Barbero</Th>
            <Th>Método pago</Th>
            <Th>Estado</Th>
            <Th right>Cobrado</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
              <Td muted>{fmtDateTime(r.service_datetime)}</Td>
              <Td>
                <div className="font-semibold text-white">{r.client_name || <span className="text-gray-500 italic">Walk-in</span>}</div>
              </Td>
              <Td>{r.service_name}</Td>
              <Td>{r.barber_name}</Td>
              <Td>{r.payment_method_name || '—'}</Td>
              <Td><StatusChip status={r.status} /></Td>
              <Td right><span className="font-black font-mono text-cyan-400">{fmt(r.price_charged)}</span></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ─── Tab: Gastos ─────────────────────────────────────────────────────────────
const GastosTab = ({ filters, onFilterChange, barbers, paymentMethods }) => {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.category) params.set('category', filters.category);

  const { data, isLoading } = useQuery(['history-gastos', filters], async () => {
    const res = await api.get(`/expenses/?${params.toString()}`);
    return res.data.results || res.data;
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let d = [...data];
    if (filters.payment_method) d = d.filter(r => String(r.payment_method) === String(filters.payment_method));
    if (filters.search) {
      const s = filters.search.toLowerCase();
      d = d.filter(r => r.detail?.toLowerCase().includes(s) || r.category?.includes(s));
    }
    return d;
  }, [data, filters.payment_method, filters.search]);

  const total = filtered.reduce((a, r) => a + Number(r.amount || 0), 0);
  const byCategory = useMemo(() => {
    const map = {};
    filtered.forEach(r => { map[r.category] = (map[r.category] || 0) + Number(r.amount || 0); });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : '—';
  }, [filtered]);

  const CATEGORY_LABELS = {
    compras: 'Compras', servicios: 'Serv. Ext.', mantenimiento: 'Mantenimiento',
    nomina: 'Nómina', arriendo: 'Arriendo', publicidad: 'Publicidad', otro: 'Otro',
  };

  return (
    <>
      <FilterBar filters={filters} setFilters={onFilterChange} barbers={barbers} paymentMethods={paymentMethods}
        showBarber={false} showPayment={true} showCategory={true} />

      <SummaryCards color="red" cards={[
        { label: 'Gastos', value: filtered.length, icon: TrendingDown },
        { label: 'Total gastos', value: fmt(total), icon: ArrowDownRight },
        { label: 'Promedio', value: fmt(filtered.length ? total / filtered.length : 0), icon: BarChart2 },
        { label: 'Categoría top', value: CATEGORY_LABELS[byCategory] || byCategory, icon: Filter },
      ]} />

      <TableWrap loading={isLoading} empty={!filtered?.length}>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Categoría</Th>
            <Th>Detalle</Th>
            <Th>Método pago</Th>
            <Th>Registrado por</Th>
            <Th right>Monto</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
              <Td muted>{fmtDate(r.expense_date)}</Td>
              <Td>
                <span className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded uppercase tracking-wide">
                  {CATEGORY_LABELS[r.category] || r.category}
                </span>
              </Td>
              <Td>
                <span className="max-w-[220px] truncate block">{r.detail}</span>
              </Td>
              <Td>{r.payment_method_name || '—'}</Td>
              <Td muted>{r.registered_by_name || '—'}</Td>
              <Td right><span className="font-black font-mono text-red-400">{fmt(r.amount)}</span></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ─── Tab: Vales ──────────────────────────────────────────────────────────────
const ValesTab = ({ filters, onFilterChange, barbers, paymentMethods }) => {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.barber) params.set('barber', filters.barber);
  if (filters.status) params.set('status', filters.status);

  const { data, isLoading } = useQuery(['history-vales', filters], async () => {
    const res = await api.get(`/advances/?${params.toString()}`);
    return res.data.results || res.data;
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let d = [...data];
    if (filters.payment_method) d = d.filter(r => String(r.payment_method) === String(filters.payment_method));
    if (filters.search) {
      const s = filters.search.toLowerCase();
      d = d.filter(r => r.barber_name?.toLowerCase().includes(s) || r.detail?.toLowerCase().includes(s));
    }
    return d;
  }, [data, filters.payment_method, filters.search]);

  const totalDado = filtered.reduce((a, r) => a + Number(r.amount || 0), 0);
  const totalPagado = filtered.reduce((a, r) => a + Number(r.amount_paid || 0), 0);
  const totalPendiente = filtered.reduce((a, r) => a + Number(r.amount_pending || 0), 0);

  const VALES_STATUS_FILTER = [
    ['', 'Todos'], ['pendiente', 'Pendiente'], ['parcialmente_pagado', 'Parcial'], ['pagado', 'Pagado'], ['cancelado', 'Cancelado'],
  ];

  return (
    <>
      <FilterBar filters={filters} setFilters={onFilterChange} barbers={barbers} paymentMethods={paymentMethods}
        showBarber={true} showPayment={true} showStatus={false} />

      {/* Custom vales status filter */}
      <div className="mb-3 flex gap-2 flex-wrap">
        {VALES_STATUS_FILTER.map(([val, lbl]) => (
          <button key={val}
            onClick={() => onFilterChange(f => ({ ...f, status: val }))}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border transition-all ${filters.status === val ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'}`}>
            {lbl}
          </button>
        ))}
      </div>

      <SummaryCards color="yellow" cards={[
        { label: 'Vales', value: filtered.length, icon: CreditCard },
        { label: 'Total dado', value: fmt(totalDado), icon: ArrowDownRight },
        { label: 'Total pagado', value: fmt(totalPagado), icon: ArrowUpRight },
        { label: 'Por cobrar', value: fmt(totalPendiente), icon: Clock },
      ]} />

      <TableWrap loading={isLoading} empty={!filtered?.length}>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Barbero</Th>
            <Th>Detalle</Th>
            <Th>Método</Th>
            <Th>Estado</Th>
            <Th right>Monto</Th>
            <Th right>Pagado</Th>
            <Th right>Pendiente</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
              <Td muted>{fmtDateTime(r.created_at)}</Td>
              <Td><span className="font-bold text-white">{r.barber_name}</span></Td>
              <Td><span className="max-w-[180px] truncate block text-gray-400">{r.detail || '—'}</span></Td>
              <Td muted>{r.payment_method_name || '—'}</Td>
              <Td><StatusChip status={r.status} /></Td>
              <Td right><span className="font-black font-mono text-yellow-400">{fmt(r.amount)}</span></Td>
              <Td right><span className="font-mono text-emerald-400">{fmt(r.amount_paid)}</span></Td>
              <Td right>
                <span className={`font-mono font-bold ${Number(r.amount_pending) > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                  {fmt(r.amount_pending)}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ─── Tab: Ventas Productos ───────────────────────────────────────────────────
const ProductosTab = ({ filters, onFilterChange, barbers, paymentMethods }) => {
  const params = new URLSearchParams();
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.payment_method) params.set('payment_method', filters.payment_method);

  const { data, isLoading } = useQuery(['history-productos', filters], async () => {
    // GET /api/products/sales/ — listado de ventas de productos
    const res = await api.get(`/products/sales/?${params.toString()}`);
    return res.data.results || res.data;
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let d = [...data];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      d = d.filter(r => r.product_name?.toLowerCase().includes(s) || r.barber_name?.toLowerCase().includes(s));
    }
    return d;
  }, [data, filters.search]);

  const total = filtered.reduce((a, r) => a + Number(r.total_price || 0), 0);
  const units = filtered.reduce((a, r) => a + Number(r.quantity || 0), 0);

  return (
    <>
      <FilterBar filters={filters} setFilters={onFilterChange} barbers={barbers} paymentMethods={paymentMethods}
        showBarber={false} showPayment={true} />

      <SummaryCards color="green" cards={[
        { label: 'Ventas', value: filtered.length, icon: Package },
        { label: 'Total vendido', value: fmt(total), icon: DollarSign },
        { label: 'Unidades', value: units, icon: BarChart2 },
        { label: 'Ticket promedio', value: fmt(filtered.length ? total / filtered.length : 0), icon: ArrowUpRight },
      ]} />

      <TableWrap loading={isLoading} empty={!filtered?.length}>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Producto</Th>
            <Th>Vendido por</Th>
            <Th>Método pago</Th>
            <Th right>Cant.</Th>
            <Th right>Precio u.</Th>
            <Th right>Total</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
              <Td muted>{fmtDate(r.sale_date)}</Td>
              <Td><span className="font-bold text-white">{r.product_name}</span></Td>
              <Td>{r.barber_name || <span className="text-gray-500 italic">—</span>}</Td>
              <Td muted>{r.payment_method_name || '—'}</Td>
              <Td right><span className="font-mono">{r.quantity}</span></Td>
              <Td right><span className="font-mono text-gray-400">{fmt(r.unit_price)}</span></Td>
              <Td right><span className="font-black font-mono text-green-400">{fmt(r.total_price)}</span></Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
};

// ─── Main History Page ────────────────────────────────────────────────────────
const HistoryPage = () => {
  const [activeTab, setActiveTab] = useState('cierres');
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(new Date(), 'yyyy-MM-dd'),
    barber: '',
    payment_method: '',
    category: '',
    status: '',
    search: '',
  });

  const { data: barbers } = useQuery(['barbers-all'], async () => {
    const res = await api.get('/barbers/');
    return res.data.results || res.data;
  }, { staleTime: 120000 });

  const { data: paymentMethods } = useQuery(['payment-methods'], async () => {
    const res = await api.get('/payment-methods/');
    return res.data.results || res.data;
  }, { staleTime: 120000 });

  const currentTab = TABS.find(t => t.id === activeTab);
  const tabColor = TAB_COLORS[currentTab?.color] || TAB_COLORS.purple;

  const tabProps = { filters, onFilterChange: setFilters, barbers, paymentMethods };

  return (
    <div className="animate-slide-up space-y-6">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <History className="w-6 h-6 text-purple-400" />
            Histórico de Cuentas
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 uppercase tracking-wider">
            Registro completo de todas las transacciones del negocio
          </p>
        </div>
      </div>

      {/* ── Tab navigation ─────────────────────────────── */}
      <div className="flex gap-0 border-b border-white/10 overflow-x-auto custom-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const tc = TAB_COLORS[tab.color];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? `${tc.active} bg-white/5`
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ────────────────────────────────── */}
      {activeTab === 'cierres'   && <CierresTab   {...tabProps} />}
      {activeTab === 'servicios' && <ServiciosTab {...tabProps} />}
      {activeTab === 'gastos'    && <GastosTab    {...tabProps} />}
      {activeTab === 'vales'     && <ValesTab     {...tabProps} />}
      {activeTab === 'productos' && <ProductosTab {...tabProps} />}

    </div>
  );
};

export default HistoryPage;
