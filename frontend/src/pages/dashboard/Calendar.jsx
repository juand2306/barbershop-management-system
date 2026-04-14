import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Clock,
  User, Scissors, Phone, Mail, Check, AlertCircle, Wifi, WifiOff
} from 'lucide-react';
import { format, parseISO, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Constants ────────────────────────────────────────────────────────────────
const HOUR_START = 7;   // 7 AM
const HOUR_END = 22;    // 10 PM
const SLOT_MINUTES = 30;
const SLOTS_TOTAL = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES;
const SLOT_HEIGHT = 56; // px per 30-min slot
const TIME_COL_W = 70;  // px for time column

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toMinutesFromMidnight = (isoString) => {
  const d = parseISO(isoString);
  return d.getHours() * 60 + d.getMinutes();
};

const minutesToPosition = (minutes) => {
  const offsetMins = minutes - HOUR_START * 60;
  return (offsetMins / SLOT_MINUTES) * SLOT_HEIGHT;
};

const minutesToHeight = (durationMinutes) => {
  return (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT;
};

const formatHour = (hour) => {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h} ${ampm}`;
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  try {
    return format(parseISO(isoString), 'hh:mm a');
  } catch {
    return '';
  }
};

// ─── Color theme per event type ───────────────────────────────────────────────
const EVENT_STYLES = {
  cita: {
    bg: 'rgba(168, 85, 247, 0.18)',
    border: '#a855f7',
    text: '#e9d5ff',
    badge: 'rgba(168, 85, 247, 0.3)',
    icon: '📅',
    label: 'Cita Agendada',
  },
  servicio: {
    bg: 'rgba(6, 182, 212, 0.13)',
    border: '#06b6d4',
    text: '#a5f3fc',
    badge: 'rgba(6, 182, 212, 0.25)',
    icon: '✂️',
    label: 'Atendido',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TimeSlotLabel = ({ hour, isHalf }) => (
  <div
    style={{ height: `${SLOT_HEIGHT}px`, width: `${TIME_COL_W}px` }}
    className={`flex items-start pt-1 justify-end pr-3 flex-shrink-0 select-none ${isHalf ? 'opacity-0' : ''}`}
  >
    {!isHalf && (
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        {formatHour(hour)}
      </span>
    )}
  </div>
);

const EventBlock = ({ event, onClick }) => {
  const styles = EVENT_STYLES[event.type] || EVENT_STYLES.cita;
  const startMins = toMinutesFromMidnight(event.start);
  const top = minutesToPosition(startMins);
  const height = Math.max(minutesToHeight(event.duration_minutes), SLOT_HEIGHT * 0.75);

  // Clamp to visible area
  const clampedTop = Math.max(0, top);
  const maxH = SLOTS_TOTAL * SLOT_HEIGHT - clampedTop;
  const clampedHeight = Math.min(height, maxH);

  const isShort = clampedHeight < 50;

  return (
    <div
      onClick={() => onClick(event)}
      title={`${event.client_name} — ${event.service_name}`}
      style={{
        position: 'absolute',
        top: `${clampedTop}px`,
        left: '3px',
        right: '3px',
        height: `${clampedHeight - 2}px`,
        background: styles.bg,
        border: `1.5px solid ${styles.border}`,
        borderLeft: `3px solid ${styles.border}`,
        borderRadius: '4px',
        padding: isShort ? '3px 6px' : '6px 8px',
        cursor: 'pointer',
        zIndex: 10,
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        backdropFilter: 'blur(4px)',
      }}
      className="event-block group hover:brightness-125 hover:z-20"
    >
      {!isShort && (
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[10px]">{styles.icon}</span>
          <span style={{ color: styles.border, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {styles.label}
          </span>
        </div>
      )}
      <p style={{ color: styles.text, fontSize: '11px', fontWeight: 700, lineHeight: 1.2 }} className="truncate">
        {event.client_name}
      </p>
      {!isShort && (
        <p style={{ color: styles.text, fontSize: '10px', opacity: 0.75 }} className="truncate">
          {event.service_name} · {event.duration_minutes}min
        </p>
      )}
    </div>
  );
};

const EventDetailModal = ({ event, onClose, onNewAppointment }) => {
  if (!event) return null;
  const styles = EVENT_STYLES[event.type] || EVENT_STYLES.cita;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f0f 100%)',
          border: `1px solid ${styles.border}40`,
          boxShadow: `0 0 40px ${styles.border}25, 0 20px 60px rgba(0,0,0,0.7)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header strip */}
        <div style={{ background: styles.badge, borderBottom: `1px solid ${styles.border}30` }} className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{styles.icon}</span>
            <span style={{ color: styles.border, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {styles.label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{event.client_name}</h3>
            <p className="text-gray-400 text-sm mt-0.5">{event.service_name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Inicio" value={formatTime(event.start)} />
            <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Fin" value={formatTime(event.end)} />
            <InfoRow icon={<Scissors className="w-3.5 h-3.5" />} label="Barbero" value={event.barber_name} />
            <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Duración" value={`${event.duration_minutes} min`} />
          </div>

          {event.notes && (
            <div className="rounded p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Notas</p>
              <p className="text-sm text-gray-300">{event.notes}</p>
            </div>
          )}

          {event.type === 'cita' && (
            <div className="flex items-center gap-2">
              {event.is_online_booking ? (
                <span className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded">
                  <Wifi className="w-3 h-3" /> Reserva Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-400/10 border border-purple-400/20 px-2 py-1 rounded">
                  <WifiOff className="w-3 h-3" /> Agendado internamente
                </span>
              )}
              <StatusBadge status={event.status} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex flex-col gap-0.5">
    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1">
      {icon} {label}
    </p>
    <p className="text-sm font-bold text-white">{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    confirmada: { color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20', label: 'Confirmada' },
    pendiente: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', label: 'Pendiente' },
    completada: { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', label: 'Completada' },
    completado: { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', label: 'Completado' },
  };
  const s = map[status] || { color: 'text-gray-400', bg: 'bg-gray-400/10 border-gray-400/20', label: status };
  return (
    <span className={`text-xs ${s.color} ${s.bg} border px-2 py-1 rounded font-bold uppercase tracking-wide`}>
      {s.label}
    </span>
  );
};

// ─── New Appointment Modal ────────────────────────────────────────────────────
const NewAppointmentModal = ({ selectedSlot, barbers, services, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    barber: selectedSlot?.barberId || '',
    service: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    appointment_datetime: selectedSlot?.datetime || '',
    notes: '',
    status: 'confirmada',
  });
  const [loading, setLoading] = useState(false);

  // When service changes, auto-suggest end time (just for display)
  const selectedService = services?.find(s => String(s.id) === String(form.service));
  const endTimeDisplay = useMemo(() => {
    if (!form.appointment_datetime || !selectedService) return null;
    try {
      const start = new Date(form.appointment_datetime);
      const end = new Date(start.getTime() + selectedService.duration_minutes * 60000);
      return format(end, 'hh:mm a');
    } catch { return null; }
  }, [form.appointment_datetime, selectedService]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.barber || !form.service || !form.client_name || !form.client_phone || !form.appointment_datetime) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    setLoading(true);
    try {
      await api.post('/appointments/', {
        ...form,
        barber: parseInt(form.barber),
        service: parseInt(form.service),
      });
      toast.success('✅ Cita agendada correctamente');
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.appointment_datetime?.[0]
        || err.response?.data?.detail
        || err.response?.data?.non_field_errors?.[0]
        || 'Error al agendar la cita';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-lg mx-4 rounded-lg overflow-hidden animate-slide-up"
        style={{
          background: 'linear-gradient(160deg, #1c1c2e 0%, #0d0d0d 100%)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          boxShadow: '0 0 60px rgba(168, 85, 247, 0.15), 0 30px 80px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'rgba(168, 85, 247, 0.08)', borderBottom: '1px solid rgba(168, 85, 247, 0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Plus className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">Nueva Cita</h2>
              <p className="text-xs text-gray-400">Registrar turno del negocio</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Barbero *
              </label>
              <select
                className="input-glass text-sm"
                value={form.barber}
                onChange={e => handleChange('barber', e.target.value)}
                required
              >
                <option value="">Seleccionar...</option>
                {barbers?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Servicio *
              </label>
              <select
                className="input-glass text-sm"
                value={form.service}
                onChange={e => handleChange('service', e.target.value)}
                required
              >
                <option value="">Seleccionar...</option>
                {services?.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min)</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Fecha y Hora *
              {endTimeDisplay && selectedService && (
                <span className="ml-2 text-purple-400 normal-case font-semibold tracking-normal">
                  → Termina aprox. {endTimeDisplay}
                </span>
              )}
            </label>
            <input
              type="datetime-local"
              className="input-glass text-sm"
              value={form.appointment_datetime}
              onChange={e => handleChange('appointment_datetime', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                <User className="w-3 h-3 inline mr-1" />Cliente *
              </label>
              <input
                className="input-glass text-sm"
                placeholder="Nombre completo"
                value={form.client_name}
                onChange={e => handleChange('client_name', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                <Phone className="w-3 h-3 inline mr-1" />Teléfono *
              </label>
              <input
                className="input-glass text-sm"
                placeholder="Número"
                value={form.client_phone}
                onChange={e => handleChange('client_phone', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                <Mail className="w-3 h-3 inline mr-1" />Correo (opcional)
              </label>
              <input
                type="email"
                className="input-glass text-sm"
                placeholder="correo@ejemplo.com"
                value={form.client_email}
                onChange={e => handleChange('client_email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Estado
              </label>
              <select
                className="input-glass text-sm"
                value={form.status}
                onChange={e => handleChange('status', e.target.value)}
              >
                <option value="confirmada">Confirmada</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Notas (opcional)
            </label>
            <textarea
              className="input-glass text-sm resize-none"
              rows={2}
              placeholder="Preferencias, observaciones..."
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-bold text-sm uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn btn-primary py-3 text-sm uppercase tracking-wider font-black"
              style={{ borderRadius: '4px' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Check className="w-4 h-4" /> Agendar Cita</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Calendar Page ──────────────────────────────────────────────────────
const CalendarPage = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSlot, setNewSlot] = useState(null);
  const gridRef = useRef(null);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dateLabel = format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es });

  // ── Fetch calendar events ──────────────────────────
  const { data: calendarData, isLoading: loadingEvents } = useQuery(
    ['calendar', dateStr],
    async () => {
      const res = await api.get(`/appointments/calendario/?date=${dateStr}`);
      return res.data;
    },
    { staleTime: 30000 }
  );

  // ── Fetch barbers (actives today) ──────────────────
  const { data: barbersData } = useQuery(
    ['barbers-active'],
    async () => {
      const res = await api.get('/barbers/?active=true');
      return res.data.results || res.data;
    },
    { staleTime: 60000 }
  );

  // ── Fetch services ─────────────────────────────────
  const { data: servicesData } = useQuery(
    ['services-active'],
    async () => {
      const res = await api.get('/services/?active=true');
      return res.data.results || res.data;
    },
    { staleTime: 60000 }
  );

  const events = calendarData?.events || [];
  const barbers = barbersData || [];
  const services = servicesData || [];

  // Group events by barber
  const eventsByBarber = useMemo(() => {
    const map = {};
    barbers.forEach(b => { map[b.id] = []; });
    events.forEach(e => {
      if (map[e.barber_id] !== undefined) {
        map[e.barber_id].push(e);
      } else {
        if (!map['__unassigned']) map['__unassigned'] = [];
        map['__unassigned'].push(e);
      }
    });
    return map;
  }, [events, barbers]);

  // Scroll to current time on mount
  useEffect(() => {
    if (gridRef.current && isSameDay(currentDate, new Date())) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const topPx = minutesToPosition(nowMins) - 100;
      gridRef.current.scrollTop = Math.max(0, topPx);
    }
  }, [currentDate, loadingEvents]);

  // Current time indicator
  const nowIndicatorTop = useMemo(() => {
    if (!isSameDay(currentDate, new Date())) return null;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (mins < HOUR_START * 60 || mins > HOUR_END * 60) return null;
    return minutesToPosition(mins);
  }, [currentDate]);

  const handleGridClick = (barberId, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.closest('.calendar-scroll').scrollTop;
    const totalMins = Math.floor(y / SLOT_HEIGHT) * SLOT_MINUTES + HOUR_START * 60;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const dt = new Date(currentDate);
    dt.setHours(hours, mins, 0, 0);
    const iso = format(dt, "yyyy-MM-dd'T'HH:mm");
    setNewSlot({ barberId, datetime: iso });
    setShowNewModal(true);
  };

  const handleSuccess = () => {
    setShowNewModal(false);
    setNewSlot(null);
    queryClient.invalidateQueries(['calendar', dateStr]);
  };

  // ── Render ─────────────────────────────────────────
  return (
    <div className="animate-slide-up flex flex-col h-full" style={{ minHeight: 0 }}>

      {/* ── Page Header ─────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            Calendario
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 uppercase tracking-wider"
            style={{ textTransform: 'capitalize' }}>
            {dateLabel}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date navigation */}
          <div className="flex items-center gap-1 glass-panel px-1 py-1">
            <button
              onClick={() => setCurrentDate(d => subDays(d, 1))}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={dateStr}
              onChange={e => setCurrentDate(new Date(e.target.value + 'T12:00:00'))}
              className="bg-transparent text-white text-sm font-bold outline-none px-2 py-1 cursor-pointer"
            />
            <button
              onClick={() => setCurrentDate(d => addDays(d, 1))}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="ml-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-400 hover:text-white hover:bg-purple-500/20 rounded transition-all border border-purple-500/30"
            >
              Hoy
            </button>
          </div>

          {/* New appointment button */}
          <button
            onClick={() => { setNewSlot(null); setShowNewModal(true); }}
            className="btn btn-primary flex items-center gap-2 text-sm uppercase tracking-wider font-black"
            style={{ borderRadius: '4px', padding: '10px 20px' }}
          >
            <Plus className="w-4 h-4" /> Nueva Cita
          </button>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────── */}
      <div className="flex items-center gap-6 mb-4 flex-shrink-0">
        {Object.entries(EVENT_STYLES).map(([type, s]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: s.border, opacity: 0.8 }} />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
        <div className="ml-auto text-xs text-gray-500 font-medium">
          {events.length} evento{events.length !== 1 ? 's' : ''} hoy
        </div>
      </div>

      {/* ── Calendar Grid ─────────────────────── */}
      <div
        className="flex-1 rounded-lg overflow-hidden calendar-scroll"
        style={{
          minHeight: 0,
          background: 'linear-gradient(180deg, #15152a 0%, #0d0d12 40%, #080808 100%)',
          border: '1px solid rgba(168, 85, 247, 0.12)',
          boxShadow: '0 0 60px rgba(168, 85, 247, 0.05) inset, 0 4px 0px rgba(0,0,0,0.8)',
        }}
        ref={gridRef}
      >
        {loadingEvents ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
              <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Cargando agenda...</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${TIME_COL_W}px ${barbers.length > 0 ? `repeat(${barbers.length}, minmax(160px, 1fr))` : 'minmax(280px, 1fr)'}`,
              minWidth: `${TIME_COL_W + Math.max(barbers.length, 1) * 160}px`,
              overflowX: 'auto',
            }}
            className="h-full"
          >
            {/* ─ Sticky header row ─ */}
            <div
              style={{
                gridColumn: `1 / -1`,
                display: 'grid',
                gridTemplateColumns: `${TIME_COL_W}px ${barbers.length > 0 ? `repeat(${barbers.length}, minmax(160px, 1fr))` : 'minmax(280px, 1fr)'}`,
                position: 'sticky',
                top: 0,
                zIndex: 30,
                background: 'linear-gradient(180deg, #1c1c2e 0%, #141420 100%)',
                borderBottom: '1px solid rgba(168, 85, 247, 0.15)',
              }}
            >
              <div style={{ width: `${TIME_COL_W}px` }} className="flex items-center justify-center py-3">
                <Clock className="w-3.5 h-3.5 text-gray-600" />
              </div>
              {barbers.length > 0 ? barbers.map(barber => (
                <div key={barber.id}
                  className="py-3 px-4 flex flex-col items-center border-l"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-1">
                    <Scissors className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <p className="text-xs font-black text-white uppercase tracking-wide text-center">{barber.name}</p>
                  {barber.specialty && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{barber.specialty}</p>
                  )}
                  <p className="text-[10px] text-purple-400 mt-0.5 font-semibold">
                    {(eventsByBarber[barber.id] || []).length} evento{(eventsByBarber[barber.id] || []).length !== 1 ? 's' : ''}
                  </p>
                </div>
              )) : (
                <div className="py-3 px-4 flex items-center justify-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Sin barberos activos</p>
                </div>
              )}
            </div>

            {/* ─ Time column ─ */}
            <div style={{ position: 'relative', width: `${TIME_COL_W}px` }}>
              {Array.from({ length: SLOTS_TOTAL }).map((_, i) => {
                const hour = HOUR_START + Math.floor((i * SLOT_MINUTES) / 60);
                const isHalf = (i * SLOT_MINUTES) % 60 === 30;
                return (
                  <div
                    key={i}
                    style={{ height: `${SLOT_HEIGHT}px`, borderBottom: isHalf ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                    className="flex items-start pt-1 justify-end pr-3"
                  >
                    {!isHalf && (
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">
                        {formatHour(hour)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─ Barber columns ─ */}
            {(barbers.length > 0 ? barbers : [{ id: '__none', name: 'General' }]).map((barber, colIdx) => (
              <div
                key={barber.id}
                style={{
                  position: 'relative',
                  borderLeft: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'crosshair',
                }}
                onClick={e => {
                  if (e.target === e.currentTarget || e.target.classList.contains('slot-row')) {
                    handleGridClick(barber.id === '__none' ? '' : barber.id, e);
                  }
                }}
              >
                {/* Horizontal slot lines */}
                {Array.from({ length: SLOTS_TOTAL }).map((_, i) => {
                  const isHalf = i % 2 === 1;
                  return (
                    <div
                      key={i}
                      className="slot-row"
                      style={{
                        height: `${SLOT_HEIGHT}px`,
                        borderBottom: isHalf
                          ? '1px dashed rgba(255,255,255,0.03)'
                          : '1px solid rgba(255,255,255,0.05)',
                        background: colIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.005)',
                      }}
                    />
                  );
                })}

                {/* Current time indicator */}
                {nowIndicatorTop !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${nowIndicatorTop}px`,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
                      zIndex: 20,
                      boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Events for this barber */}
                {(eventsByBarber[barber.id] || []).map(event => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    onClick={e => { setSelectedEvent(e); }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────── */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onNewAppointment={() => { setSelectedEvent(null); setShowNewModal(true); }}
        />
      )}

      {showNewModal && (
        <NewAppointmentModal
          selectedSlot={newSlot}
          barbers={barbers}
          services={services}
          onClose={() => { setShowNewModal(false); setNewSlot(null); }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default CalendarPage;
