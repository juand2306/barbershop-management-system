import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Scissors, DollarSign, Clock, Users, TrendingUp,
  AlertTriangle, Package, Calendar, CreditCard
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => (
  <div className="glass-card p-5 border-white/5 relative overflow-hidden group"
    style={{ borderLeft: `3px solid ${color}` }}>
    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[50px] opacity-15 transition-all group-hover:opacity-30"
      style={{ background: color }} />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h3 className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.15em] mb-2">{title}</h3>
        <p className="text-3xl font-black text-white leading-none">{value}</p>
        {subtext && <p className="text-[11px] mt-2 text-gray-500 font-medium">{subtext}</p>}
        {trend !== undefined && (
          <p className={`text-[11px] mt-1 font-bold flex items-center gap-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <TrendingUp className="w-3 h-3" />
            {trend >= 0 ? '+' : ''}{trend}% vs ayer
          </p>
        )}
      </div>
      <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
  </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 shadow-xl px-3 py-2"
      style={{ background: 'rgba(18,18,24,0.95)', backdropFilter: 'blur(10px)' }}>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-black" style={{ color: p.color }}>
          {typeof p.value === 'number' && p.name?.toLowerCase().includes('$')
            ? `$${p.value.toLocaleString()}`
            : p.dataKey === 'total' || p.dataKey === 'profit' || p.dataKey === 'income'
              ? `$${Number(p.value).toLocaleString()}`
              : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── PIE COLORS ───────────────────────────────────────────────────────────────
const PIE_COLORS = ['#a855f7', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeN = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const HomeDashboard = () => {

  // Today summary
  const { data: todaySummary, isLoading: loadingToday } = useQuery(
    ['todaySummary'],
    () => api.get('/service-records/resumen-hoy/').then(r => r.data)
  );

  // Active barbers today
  const { data: barbersActive } = useQuery(
    ['barbersActive'],
    () => api.get('/barbers/activos-hoy/').then(r => r.data.results || r.data)
  );

  // Last 30 days of reports for charting
  const dateFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd');
  const dateTo   = format(new Date(), 'yyyy-MM-dd');
  const { data: reportsRaw } = useQuery(
    ['reports-chart'],
    () => api.get(`/reports/?date_from=${dateFrom}&date_to=${dateTo}&limit=100`).then(r => r.data.results || r.data)
  );

  // Service records of the last 30 days — for payment method breakdown
  // This is the source of truth for the pie (doesn't need a cash closing to exist)
  const { data: recentRecords } = useQuery(
    ['records-recent', dateFrom],
    () => api.get(`/service-records/?date_from=${dateFrom}&date_to=${dateTo}&limit=500`)
      .then(r => r.data.results || r.data)
      .catch(() => [])
  );

  // Low stock products
  const { data: lowStockProducts } = useQuery(
    ['low-stock'],
    () => api.get('/products/').then(r => {
      const all = r.data.results || r.data;
      return all.filter(p => p.current_quantity <= p.minimum_quantity && p.active);
    })
  );

  // Today's appointments
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayAppointments } = useQuery(
    ['today-appointments'],
    () => api.get(`/appointments/?date=${today}`).then(r => r.data.results || r.data)
  );

  // Build chart data from last 30 reports (most recent 14 shown)
  const chartData = useMemo(() => {
    if (!reportsRaw?.length) return [];
    return [...reportsRaw]
      .sort((a, b) => a.report_date.localeCompare(b.report_date))
      .slice(-14)
      .map(r => ({
        date: format(new Date(r.report_date + 'T12:00:00'), 'd MMM', { locale: es }),
        income:  safeN(r.total_services_amount) + safeN(r.total_products_amount),
        expenses: safeN(r.total_expenses),
        profit:  safeN(r.barbershop_profit),
        services: r.barber_commissions?.reduce((a, c) => a + safeN(c.services_total), 0) || 0,
      }));
  }, [reportsRaw]);

  // Bar chart: last 7 days income
  const barData = chartData.slice(-7);

  // Pie: payment method breakdown — aggregate from ALL reports in period
  // Fallback: aggregate from raw service records if reports have no breakdown data
  const pieData = useMemo(() => {
    // Source 1: aggregate payment_breakdown across ALL reports (not just last one)
    const fromReports = {};
    (reportsRaw || []).forEach(r => {
      (r.payment_breakdown || []).forEach(pb => {
        if (!pb.payment_method_name) return;
        const key = pb.payment_method_name;
        fromReports[key] = (fromReports[key] || 0)
          + safeN(pb.services_amount)
          + safeN(pb.products_amount);
      });
    });
    const reportResult = Object.entries(fromReports)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    if (reportResult.length > 0) return reportResult;

    // Source 2: fallback — group service records directly by payment method
    // Field is 'price_charged' and 'payment_method_name' per the serializer
    const fromRecords = {};
    (recentRecords || []).forEach(rec => {
      const key = rec.payment_method_name || 'Sin especificar';
      fromRecords[key] = (fromRecords[key] || 0) + safeN(rec.price_charged);
    });
    return Object.entries(fromRecords)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [reportsRaw, recentRecords]);

  // Pie subtitle: show where data comes from
  const pieSubtitle = useMemo(() => {
    const hasReportBreakdown = (reportsRaw || []).some(r => r.payment_breakdown?.length > 0);
    if (hasReportBreakdown) return `${reportsRaw.length} cierre(s) del período`;
    if (recentRecords?.length > 0) return `${recentRecords.length} servicios del mes`;
    return 'Sin datos aún';
  }, [reportsRaw, recentRecords]);


  // Summary totals (last 30 days)
  const totals30 = useMemo(() => {
    if (!reportsRaw?.length) return { income: 0, profit: 0, services: 0 };
    return reportsRaw.reduce((acc, r) => ({
      income: acc.income + safeN(r.total_services_amount) + safeN(r.total_products_amount),
      profit: acc.profit + safeN(r.barbershop_profit),
      services: acc.services + (r.barber_commissions?.reduce((a, c) => a + safeN(c.services_total), 0) || 0),
    }), { income: 0, profit: 0, services: 0 });
  }, [reportsRaw]);

  return (
    <div className="space-y-7 animate-slide-up pb-8">

      {/* ── TITLE ── */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Dashboard</h1>
        <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })} — Resumen operacional
        </p>
      </div>

      {/* ── TODAY STAT CARDS ── */}
      {loadingToday ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="glass-card h-32 border-white/5 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Ingresos Hoy"     value={`$${safeN(todaySummary?.total_amount).toLocaleString()}`} subtext="Facturado por servicios" icon={DollarSign} color="#10b981" />
          <StatCard title="Cortes Hoy"       value={todaySummary?.total_services || 0}                       subtext="Servicios finalizados"  icon={Scissors}   color="#a855f7" />
          <StatCard title="Barberos Activos" value={Array.isArray(barbersActive) ? barbersActive.length : 0} subtext="Personal en turno"      icon={Users}      color="#06b6d4" />
          <StatCard title="Citas Hoy"        value={todayAppointments?.length || 0}                          subtext="Turnos agendados"        icon={Calendar}   color="#f59e0b" />
        </div>
      )}

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* Area line: 14-day income + profit */}
        <div className="lg:col-span-2 glass-panel p-4 md:p-5 border-white/5">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <div>
              <h3 className="font-black text-white uppercase tracking-tight text-sm">Tendencia Financiera</h3>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold mt-0.5">Últimos 14 días con cierre</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-purple-400"><span className="w-3 h-1 bg-purple-500 rounded-full inline-block" /> Ingresos</span>
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-3 h-1 bg-emerald-500 rounded-full inline-block" /> Ganancia</span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#a855f7" strokeWidth={2} fill="url(#gIncome)" name="Ingresos" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#gProfit)" name="Ganancia" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest text-center">
              Sin datos suficientes aún.
            </div>
          )}
        </div>

        {/* Pie chart: payment methods */}
        <div className="glass-panel p-4 md:p-5 border-white/5">
          <h3 className="font-black text-white uppercase tracking-tight text-sm mb-1">Métodos de Pago</h3>
          <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold mb-3">{pieSubtitle}</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(val) => <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest text-center leading-relaxed">
              Sin registros de servicios<br />en los últimos 30 días
            </div>
          )}
        </div>
      </div>


      {/* ── BAR CHART + SIDE PANELS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* Bar: last 7 days income */}
        <div className="lg:col-span-2 glass-panel p-4 md:p-5 border-white/5">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <div>
              <h3 className="font-black text-white uppercase tracking-tight text-sm">Ingresos por Día</h3>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold mt-0.5">Últimos 7 cierres</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-lg">
              <p className="text-purple-400 font-black text-xs uppercase tracking-widest">${safeN(totals30.income).toLocaleString()} / 30d</p>
            </div>
          </div>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 0, right: 5, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="income"   fill="#a855f7"   radius={[4,4,0,0]} maxBarSize={40} name="Ingresos" />
                <Bar dataKey="expenses" fill="#ef444440" radius={[4,4,0,0]} maxBarSize={40} name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">Sin datos aún</div>
          )}
        </div>

        {/* Right side: today barbers + alerts */}
        <div className="flex flex-col gap-4">
          {lowStockProducts?.length > 0 && (
            <div className="glass-panel p-4 border-red-500/20 bg-red-500/[0.03]">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="font-black text-red-400 uppercase tracking-tight text-xs">Stock Crítico</h3>
              </div>
              <ul className="space-y-2">
                {lowStockProducts.slice(0, 4).map(p => (
                  <li key={p.id} className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-bold truncate max-w-[120px]">{p.name}</span>
                    <span className="text-red-400 font-black">{p.current_quantity} ud</span>
                  </li>
                ))}
                {lowStockProducts.length > 4 && <p className="text-gray-600 text-[10px] font-bold">+{lowStockProducts.length - 4} más</p>}
              </ul>
            </div>
          )}

          <div className="glass-panel p-4 border-white/5 flex-1">
            <h3 className="font-black text-white uppercase tracking-tight text-xs mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              Barberos en Turno
            </h3>
            {Array.isArray(barbersActive) && barbersActive.length > 0 ? (
              <ul className="space-y-2">
                {barbersActive.map(log => (
                  <li key={log.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center font-black text-xs text-white">
                        {(log.barber_name || '?')[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-white text-xs uppercase tracking-wide">{log.barber_name}</span>
                    </div>
                    <span className="text-emerald-400 text-[10px] font-black">{String(log.entry_time || '').split('.')[0]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-xs font-bold uppercase tracking-widest text-center py-4">Nadie en turno aún</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 30-DAY SUMMARY STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: '30d Ingresos', value: `$${safeN(totals30.income).toLocaleString()}`, color: '#a855f7', icon: TrendingUp },
          { label: '30d Ganancia', value: `$${safeN(totals30.profit).toLocaleString()}`, color: '#10b981', icon: DollarSign },
          { label: 'Citas Hoy',   value: todayAppointments?.length || 0,                color: '#f59e0b', icon: Calendar },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-panel p-4 border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{label}</p>
              <p className="font-black text-white text-xl leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default HomeDashboard;
