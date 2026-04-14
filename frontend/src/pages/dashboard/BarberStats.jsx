import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  Cell, Legend
} from 'recharts';
import {
  TrendingUp, Award, Scissors, DollarSign, Star,
  Users, Calendar, ChevronDown
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => `$${Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
const safeN = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

const BARBER_COLORS = [
  '#a855f7', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#0ea5e9', '#f97316', '#22c55e', '#ec4899',
];

// ─── Custom Bar Tooltip ────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 shadow-xl px-3 py-2"
      style={{ background: 'rgba(18,18,24,0.97)', backdropFilter: 'blur(10px)' }}>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-black" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Period Selector ──────────────────────────────────────────────────────────
const PERIODS = [
  { label: 'Esta semana', key: 'week' },
  { label: 'Este mes', key: 'month' },
  { label: 'Últimos 30 días', key: '30d' },
  { label: 'Últimos 90 días', key: '90d' },
];

const getPeriodDates = (key) => {
  const now = new Date();
  switch (key) {
    case 'week':  return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    case 'month': return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case '30d':   return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case '90d':   return { from: format(subDays(now, 89), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    default:      return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
  }
};

// ─── Medal Colors ─────────────────────────────────────────────────────────────
const MEDALS = [
  { bg: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/40', text: 'text-yellow-400', glow: '0 0 30px rgba(234,179,8,0.3)', label: '1°', icon: '🥇' },
  { bg: 'from-gray-400/20 to-gray-500/10',    border: 'border-gray-400/40',   text: 'text-gray-300',   glow: '0 0 20px rgba(156,163,175,0.2)', label: '2°', icon: '🥈' },
  { bg: 'from-orange-500/20 to-orange-600/10',border: 'border-orange-500/30', text: 'text-orange-400', glow: '0 0 20px rgba(249,115,22,0.2)',  label: '3°', icon: '🥉' },
];

// ─── Stat Mini Card ───────────────────────────────────────────────────────────
const MiniStat = ({ label, value, color }) => (
  <div className="text-center">
    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-0.5">{label}</p>
    <p className="font-black text-sm" style={{ color }}>{value}</p>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const BarberStats = () => {
  const [period, setPeriod] = useState('month');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const { from, to } = getPeriodDates(period);

  // Service records for period
  const { data: records, isLoading } = useQuery(
    ['barber-stats', from, to],
    () => api.get(`/service-records/?date_from=${from}&date_to=${to}&limit=2000`)
      .then(r => r.data.results || r.data),
    { staleTime: 60000 }
  );

  // Barber list (for names/specialties of those with 0 records too)
  const { data: barberList } = useQuery(
    ['barbers'],
    () => api.get('/barbers/?limit=100').then(r => r.data.results || r.data),
    { staleTime: 300000 }
  );

  // ── Aggregate stats per barber ───────────────────────────────────
  const barberStats = useMemo(() => {
    if (!records?.length) return [];
    const map = {};
    records.forEach(rec => {
      const id = rec.barber;
      const name = rec.barber_name || `Barbero ${id}`;
      if (!map[id]) {
        map[id] = {
          id, name,
          revenue: 0,
          services: 0,
          avgRevenue: 0,
          dailyRevenues: {},
        };
      }
      const amount = safeN(rec.price_charged);
      map[id].revenue += amount;
      map[id].services += 1;
      // Group by date for trend
      const day = rec.service_datetime?.split('T')[0];
      if (day) map[id].dailyRevenues[day] = (map[id].dailyRevenues[day] || 0) + amount;
    });

    return Object.values(map)
      .map(b => ({
        ...b,
        avgRevenue: b.services > 0 ? b.revenue / b.services : 0,
        // Enrich with specialty from barberList
        specialty: barberList?.find(bl => bl.id === b.id)?.specialty || '',
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [records, barberList]);

  // ── Chart data for main comparison bar chart ──────────────────
  const comparisonData = useMemo(() =>
    barberStats.map((b, i) => ({
      name: b.name.split(' ')[0], // First name only for chart
      fullName: b.name,
      Ingresos: b.revenue,
      Servicios: b.services,
      color: BARBER_COLORS[i % BARBER_COLORS.length],
    })),
  [barberStats]);

  // ── Radar chart data (normalized 0-100) ────────────────────────
  const maxRevenue  = barberStats[0]?.revenue  || 1;
  const maxServices = barberStats[0]?.services || 1;
  const maxAvg      = Math.max(...barberStats.map(b => b.avgRevenue)) || 1;

  const radarData = useMemo(() => {
    const top5 = barberStats.slice(0, 5);
    return [
      { metric: 'Ingresos',   ...Object.fromEntries(top5.map(b => [b.name.split(' ')[0], Math.round((b.revenue  / maxRevenue)  * 100)])) },
      { metric: 'Servicios',  ...Object.fromEntries(top5.map(b => [b.name.split(' ')[0], Math.round((b.services / maxServices) * 100)])) },
      { metric: 'Promedio/s', ...Object.fromEntries(top5.map(b => [b.name.split(' ')[0], Math.round((b.avgRevenue / maxAvg)   * 100)])) },
    ];
  }, [barberStats]);

  const currentPeriodLabel = PERIODS.find(p => p.key === period)?.label || '';
  const top3 = barberStats.slice(0, 3);

  if (isLoading) return (
    <div className="animate-slide-up space-y-8">
      <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="glass-panel h-48 animate-pulse border-white/5 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="animate-slide-up space-y-8 pb-8">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            Rendimiento por Barbero
          </h1>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">
            Análisis de desempeño individual y comparativo
          </p>
        </div>

        {/* Period selector */}
        <div className="relative">
          <button
            onClick={() => setShowPeriodMenu(m => !m)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm hover:bg-white/8 transition-colors"
          >
            <Calendar className="w-4 h-4 text-purple-400" />
            {currentPeriodLabel}
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          {showPeriodMenu && (
            <div className="absolute right-0 top-full mt-2 z-20 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-44">
              {PERIODS.map(p => (
                <button key={p.key}
                  onClick={() => { setPeriod(p.key); setShowPeriodMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-white/5 transition-colors ${period === p.key ? 'text-purple-400 bg-purple-500/10' : 'text-gray-400'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {barberStats.length === 0 && (
        <div className="glass-panel p-16 text-center border-white/5">
          <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <h3 className="font-black text-white uppercase tracking-tight mb-1">Sin datos para el período</h3>
          <p className="text-gray-600 text-sm">No hay registros de servicios en este rango de fechas.</p>
        </div>
      )}

      {barberStats.length > 0 && (
        <>
          {/* ── TOP 3 PODIUM ── */}
          <div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-yellow-400" /> Top Performers — {currentPeriodLabel}
            </p>

            {/* Podium layout: on mobile stacks 1-col, on sm+ shows 3-col (2nd|1st|3rd) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                top3[1] ? { ...top3[1], rank: 1 } : null,  // 2nd place → left
                top3[0] ? { ...top3[0], rank: 0 } : null,  // 1st place → center
                top3[2] ? { ...top3[2], rank: 2 } : null,  // 3rd place → right
              ].map((barber, idx) => {
                if (!barber) return <div key={idx} />;
                const medal = MEDALS[barber.rank];
                const color = BARBER_COLORS[barber.rank];
                const isFirst = barber.rank === 0;
                return (
                  <div key={barber.id}
                    className={`glass-panel p-4 sm:p-5 border bg-gradient-to-b ${medal.bg} ${medal.border} flex flex-col items-center text-center transition-all ${isFirst ? 'sm:scale-105 shadow-2xl order-first sm:order-none' : ''}`}
                    style={{ boxShadow: medal.glow }}>

                    <div className={`text-2xl mb-2 font-black ${medal.text}`}>{medal.label}</div>

                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl text-white mb-2 flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${color}cc, ${color}66)`, boxShadow: `0 0 25px ${color}40` }}>
                      {barber.name[0].toUpperCase()}
                    </div>

                    <h3 className={`font-black uppercase tracking-tight text-base leading-tight mb-0.5 ${medal.text}`}>
                      {barber.name.split(' ')[0]}
                    </h3>
                    {barber.specialty && (
                      <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mb-2">{barber.specialty}</p>
                    )}

                    <div className="w-full border-t border-white/[0.06] pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Ingresos</span>
                        <span className="font-black text-white text-sm">{fmt(barber.revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Servicios</span>
                        <span className="font-black text-white text-sm">{barber.services}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Promedio</span>
                        <span className="font-black text-white text-sm">{fmt(barber.avgRevenue)}</span>
                      </div>
                    </div>

                    <div className="w-full bg-white/5 rounded-full h-1 mt-3">
                      <div className="h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.round((barber.revenue / maxRevenue) * 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── COMPARISON CHARTS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">

            {/* Revenue comparison bar chart */}
            <div className="glass-panel p-5 border-white/5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight text-sm">Ingresos Totales</h3>
                  <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold mt-0.5">Comparativa entre todos los barberos</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-black uppercase tracking-widest">
                  <DollarSign className="w-3.5 h-3.5" /> Total: {fmt(barberStats.reduce((a, b) => a + b.revenue, 0))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="Ingresos" radius={[6, 6, 0, 0]}>
                    {comparisonData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Services count bar chart */}
            <div className="glass-panel p-5 border-white/5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight text-sm">Servicios Realizados</h3>
                  <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold mt-0.5">Cantidad de atenciones por barbero</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-black uppercase tracking-widest">
                  <Scissors className="w-3.5 h-3.5" /> Total: {barberStats.reduce((a, b) => a + b.services, 0)}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="Servicios" radius={[6, 6, 0, 0]}>
                    {comparisonData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── RADAR CHART (if ≥ 2 barbers) ── */}
          {barberStats.length >= 2 && (
            <div className="glass-panel p-5 border-white/5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight text-sm">Análisis Multidimensional</h3>
                  <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold mt-0.5">
                    Comparativa en ingresos, servicios y ticket promedio (top 5) — Escala relativa 0-100
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 700 }} />
                  {barberStats.slice(0, 5).map((b, i) => (
                    <Radar key={b.id}
                      name={b.name.split(' ')[0]}
                      dataKey={b.name.split(' ')[0]}
                      stroke={BARBER_COLORS[i]}
                      fill={BARBER_COLORS[i]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend iconType="circle" iconSize={8}
                    formatter={(val) => <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{val}</span>} />
                  <Tooltip content={<BarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── INDIVIDUAL BARBER CARDS ── */}
          <div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Detalle Individual
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {barberStats.map((barber, i) => {
                const color = BARBER_COLORS[i % BARBER_COLORS.length];
                const pctRevenue  = Math.round((barber.revenue  / maxRevenue)  * 100);
                const pctServices = Math.round((barber.services / maxServices) * 100);
                const rank = i + 1;
                return (
                  <div key={barber.id} className="glass-panel p-5 border-white/[0.07] hover:border-white/15 transition-all">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}cc, ${color}44)`, boxShadow: `0 0 20px ${color}30` }}>
                        {barber.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-white uppercase tracking-tight truncate">{barber.name}</p>
                          {rank <= 3 && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${rank === 1 ? 'bg-yellow-500/20 text-yellow-400' : rank === 2 ? 'bg-gray-400/15 text-gray-300' : 'bg-orange-500/15 text-orange-400'}`}>
                              {rank === 1 ? '1°' : rank === 2 ? '2°' : '3°'}
                            </span>
                          )}
                        </div>
                        {barber.specialty && <p className="text-[11px] font-bold" style={{ color }}>{barber.specialty}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Rank</p>
                        <p className="font-black text-lg text-white">#{rank}</p>
                      </div>
                    </div>

                    {/* Main stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <MiniStat label="Ingresos" value={fmt(barber.revenue)} color={color} />
                      <MiniStat label="Servicios" value={barber.services} color="#06b6d4" />
                      <MiniStat label="Promedio" value={`$${Math.round(barber.avgRevenue / 1000)}k`} color="#10b981" />
                    </div>

                    {/* Revenue progress */}
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">
                          <span>Ingresos</span><span>{pctRevenue}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pctRevenue}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">
                          <span>Volumen</span><span>{pctServices}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pctServices}%`, background: 'linear-gradient(90deg, #06b6d4, #0891b2)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BarberStats;
