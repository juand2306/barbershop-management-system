import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Scissors, Clock, MapPin, Phone, Star, Calendar,
  CheckCircle, ChevronRight, ChevronLeft, User, ArrowRight,
  X, Loader2, Tag, Zap, UserCheck, Lock, Instagram,
  Shield, Award, Sparkles, MessageCircle
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Public API ───────────────────────────────────────────────────────────────
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
const pub = axios.create({ baseURL: BASE });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPrice = (v) => `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
const generateSlots = (open = '08:00', close = '20:00') => {
  const s = [];
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  let h = oh, m = om;
  while (h < ch || (h === ch && m < cm)) {
    s.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 30;
    if (m >= 60) { m = 0; h++; }
  }
  return s;
};

// ─── Category icons mapping ────────────────────────────────────────────────────
const SERVICE_CATEGORIES = {
  'cabello': { label: 'Cabello', color: '#a855f7' },
  'barba': { label: 'Barba', color: '#06b6d4' },
  'combo': { label: 'Combo', color: '#f59e0b' },
  'tratamiento': { label: 'Tratamiento', color: '#10b981' },
};

// ─── Testimonials (fallback if none in DB) ────────────────────────────────────
const TESTIMONIALS = [
  { name: "Carlos M.", text: "El mejor corte que me he hecho. El barbero entendió exactamente lo que quería desde el primer momento. 100% recomendado.", stars: 5 },
  { name: "Andrés P.", text: "Ambiente increíble, servicio de primera. Salí completamente diferente. Ya agendar mi próxima cita.", stars: 5 },
  { name: "David R.", text: "Profesionales de verdad. El detalle en el acabado de la barba es impecable. Sin duda el mejor lugar.", stars: 5 },
];

// ─── Booking Modal Sub-components ─────────────────────────────────────────────
const StepDot = ({ n, current, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 ${
      n < current ? 'bg-purple-500 text-white'
      : n === current ? 'bg-purple-500 text-white ring-4 ring-purple-500/30'
      : 'bg-white/8 border border-white/10 text-gray-600'
    }`}>
      {n < current ? <CheckCircle className="w-4 h-4" /> : n}
    </div>
    <span className={`text-[9px] font-bold uppercase tracking-widest ${n === current ? 'text-purple-400' : 'text-gray-700'}`}>{label}</span>
  </div>
);

const Stepper = ({ step, skipBarber }) => {
  const steps = skipBarber ? ['Servicio', 'Fecha', 'Datos'] : ['Servicio', 'Barbero', 'Fecha', 'Datos'];
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <StepDot n={i + 1} current={step} label={label} />
          {i < steps.length - 1 && <div className={`h-px w-7 mb-5 ${step > i + 1 ? 'bg-purple-500' : 'bg-white/10'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

const DateStrip = ({ selected, onSelect }) => {
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));
  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="custom-scrollbar">
      {days.map(d => {
        const isSel = selected && isSameDay(d, selected);
        return (
          <button key={d.toISOString()} onClick={() => onSelect(d)} style={{ flexShrink: 0 }}
            className={`flex flex-col items-center px-4 py-3 rounded-xl border transition-all ${
              isSel ? 'border-purple-500 bg-purple-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:text-white'
            }`}>
            <span className="text-[9px] font-black uppercase tracking-widest">{format(d, 'EEE', { locale: es }).toUpperCase()}</span>
            <span className="text-2xl font-black mt-0.5">{format(d, 'd')}</span>
            <span className="text-[9px] text-gray-500 capitalize">{format(d, 'MMM', { locale: es })}</span>
          </button>
        );
      })}
    </div>
  );
};

const TimeGrid = ({ slots, selected, onSelect }) => (
  <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-0.5 custom-scrollbar">
    {slots.map(slot => (
      <button key={slot} onClick={() => onSelect(slot)}
        className={`py-2.5 text-sm font-bold rounded-lg border transition-all ${
          selected === slot ? 'border-purple-500 bg-purple-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:text-white'
        }`}>
        {slot}
      </button>
    ))}
  </div>
);

const FieldInput = ({ label, required, type = 'text', placeholder, value, onChange }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">
      {label}{required && <span className="text-purple-400"> *</span>}
    </label>
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-medium outline-none focus:border-purple-500 transition-colors placeholder-gray-600" />
  </div>
);

const BarberBadge = ({ barber }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border border-cyan-500/25 bg-cyan-500/8 mb-3">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center font-black text-base text-white flex-shrink-0">
      {barber.name[0].toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Tu barbero</p>
      <p className="text-white font-black uppercase tracking-tight truncate">{barber.name}</p>
      {barber.specialty && <p className="text-[11px] text-gray-500">{barber.specialty}</p>}
    </div>
    <div className="flex items-center gap-1 text-cyan-400">
      <Lock className="w-3.5 h-3.5" />
      <span className="text-[10px] font-black uppercase tracking-widest">Seleccionado</span>
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const LandingPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedBarberId = searchParams.get('barber');
  const skipBarber = !!preselectedBarberId;
  const [step, setStep] = useState(1);
  const [selSvc, setSelSvc] = useState(null);
  const [selBarber, setSelBarber] = useState(null);
  const [selDate, setSelDate] = useState(null);
  const [selTime, setSelTime] = useState('');
  const [form, setForm] = useState({ client_name: '', client_phone: '', client_email: '', notes: '' });
  const [lastBooking, setLastBooking] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const { data: shop, isLoading, isError } = useQuery(
    ['public-shop'],
    () => pub.get('/barbershop/info-publica/').then(r => r.data),
    { retry: 2, staleTime: 300000 }
  );

  useEffect(() => {
    if (shop && preselectedBarberId && !selBarber) {
      const found = shop.barbers?.find(b => String(b.id) === String(preselectedBarberId));
      if (found) { setSelBarber(found); setStep(1); setModalOpen(true); }
    }
  }, [shop, preselectedBarberId]);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => setActiveTestimonial(i => (i + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const slots = useMemo(() => generateSlots(shop?.opening_time?.slice(0, 5), shop?.closing_time?.slice(0, 5)), [shop]);
  const maxStep = skipBarber ? 3 : 4;
  const successStep = skipBarber ? 4 : 5;

  const bookMutation = useMutation(
    (payload) => pub.post('/appointments/reservar/', payload),
    {
      onSuccess: () => {
        setLastBooking({
          client_name: form.client_name,
          service_name: selSvc?.name || '',
          barber_name: selBarber?.name || '',
          datetime_str: selDate && selTime ? format(selDate, "d 'de' MMMM yyyy", { locale: es }) + ' — ' + selTime + 'h' : '',
        });
        setStep(successStep);
      },
      onError: (err) => {
        const d = err.response?.data;
        const msg = typeof d === 'string' ? d : d?.appointment_datetime?.[0] || d?.non_field_errors?.[0] || d?.detail || 'Error al agendar. Intenta de nuevo.';
        alert(msg);
      },
    }
  );

  const reset = () => {
    setStep(1); setSelSvc(null);
    if (!preselectedBarberId) setSelBarber(null);
    setSelDate(null); setSelTime(''); setLastBooking(null);
    setForm({ client_name: '', client_phone: '', client_email: '', notes: '' });
    setModalOpen(false);
  };

  const openBookingWith = (svc = null) => { if (svc) setSelSvc(svc); setStep(1); setModalOpen(true); };

  const canNext = () => {
    if (skipBarber) {
      if (step === 1) return !!selSvc;
      if (step === 2) return !!selDate && !!selTime;
      if (step === 3) return !!form.client_name.trim() && !!form.client_phone.trim();
    } else {
      if (step === 1) return !!selSvc;
      if (step === 2) return !!selBarber;
      if (step === 3) return !!selDate && !!selTime;
      if (step === 4) return !!form.client_name.trim() && !!form.client_phone.trim();
    }
    return false;
  };

  const next = () => { if (canNext()) setStep(s => s + 1); };
  const back = () => { if (step === 1) { setModalOpen(false); return; } setStep(s => s - 1); };

  const submit = () => {
    if (!canNext() || !shop) return;
    const isoDatetime = `${format(selDate, 'yyyy-MM-dd')}T${selTime}:00-05:00`;
    bookMutation.mutate({
      barbershop: shop.id, barber: selBarber.id, service: selSvc.id,
      client_name: form.client_name.trim(), client_phone: form.client_phone.trim(),
      client_email: form.client_email?.trim() || undefined,
      appointment_datetime: isoDatetime, notes: form.notes?.trim() || undefined,
    });
  };

  const renderStep = () => {
    if (step === successStep) return (
      <div className="text-center py-6 animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight mb-1">Cita Confirmada</h2>
        <p className="text-gray-400 text-sm mb-5">Tu turno ha sido agendado. Te esperamos.</p>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left space-y-3 mb-5 max-w-xs mx-auto">
          {[
            { label: 'Cliente', value: lastBooking?.client_name, icon: User },
            { label: 'Servicio', value: lastBooking?.service_name, icon: Scissors },
            { label: 'Barbero', value: lastBooking?.barber_name, icon: Tag },
            { label: 'Fecha y hora', value: lastBooking?.datetime_str, icon: Calendar },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{label}</p>
                <p className="text-sm font-bold text-white leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mb-5">Llega 5 minutos antes. Si necesitas cancelar, contáctanos directamente.</p>
        <button onClick={reset} className="px-6 py-2.5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-bold text-sm uppercase tracking-wider transition-all">
          Agendar otra cita
        </button>
      </div>
    );

    if (skipBarber) {
      if (step === 1) return renderServiceStep();
      if (step === 2) return renderDateStep();
      if (step === 3) return renderDataStep();
    } else {
      if (step === 1) return renderServiceStep();
      if (step === 2) return renderBarberStep();
      if (step === 3) return renderDateStep();
      if (step === 4) return renderDataStep();
    }
  };

  const renderServiceStep = () => (
    <div>
      {skipBarber && selBarber && <BarberBadge barber={selBarber} />}
      <p className="font-black text-white uppercase tracking-tight text-sm mb-3">¿Qué servicio deseas?</p>
      <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
        {(shop?.services || []).map(svc => (
          <div key={svc.id} onClick={() => setSelSvc(svc)}
            className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 ${
              selSvc?.id === svc.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/[0.02] hover:border-purple-500/40'
            }`}>
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Scissors className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  <h3 className="font-black text-white text-sm uppercase tracking-tight truncate">{svc.name}</h3>
                </div>
                {svc.description && <p className="text-xs text-gray-500 line-clamp-1 pl-5">{svc.description}</p>}
                <p className="text-[11px] text-gray-600 mt-0.5 pl-5 flex items-center gap-1"><Clock className="w-3 h-3" /> {svc.duration_minutes} min</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-lg text-white">{fmtPrice(svc.price)}</p>
                {selSvc?.id === svc.id && <CheckCircle className="w-4 h-4 text-purple-400 ml-auto mt-1" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBarberStep = () => (
    <div>
      <p className="font-black text-white uppercase tracking-tight text-sm mb-3">¿Con quién quieres ir?</p>
      <div className="grid grid-cols-2 gap-3">
        {(shop?.barbers || []).map(b => (
          <div key={b.id} onClick={() => setSelBarber(b)}
            className={`cursor-pointer rounded-xl p-4 text-center border transition-all duration-200 ${
              selBarber?.id === b.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/[0.02] hover:border-purple-500/40'
            }`}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center mx-auto mb-2 font-black text-xl text-white">
              {b.name[0].toUpperCase()}
            </div>
            <p className="font-black text-white text-sm uppercase tracking-tight leading-tight">{b.name}</p>
            {b.specialty && <p className="text-[11px] text-gray-500 mt-0.5">{b.specialty}</p>}
            {selBarber?.id === b.id && <CheckCircle className="w-4 h-4 text-purple-400 mx-auto mt-2" />}
          </div>
        ))}
      </div>
    </div>
  );

  const renderDateStep = () => (
    <div className="space-y-5">
      {skipBarber && selBarber && <BarberBadge barber={selBarber} />}
      <div>
        <p className="font-black text-white uppercase tracking-tight text-sm mb-3">¿Qué día?</p>
        <DateStrip selected={selDate} onSelect={d => { setSelDate(d); setSelTime(''); }} />
      </div>
      {selDate && (
        <div>
          <p className="font-black text-white uppercase tracking-tight text-sm mb-3">
            ¿A qué hora?{' '}
            <span className="text-purple-400 normal-case font-bold capitalize">{format(selDate, "EEEE d 'de' MMMM", { locale: es })}</span>
          </p>
          <TimeGrid slots={slots} selected={selTime} onSelect={setSelTime} />
        </div>
      )}
    </div>
  );

  const renderDataStep = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs mb-2">
        {selSvc && <span className="text-white font-bold flex items-center gap-1"><Scissors className="w-3 h-3 text-purple-400" /> {selSvc.name}</span>}
        {selBarber && <span className="text-white font-bold flex items-center gap-1"><User className="w-3 h-3 text-cyan-400" /> {selBarber.name}</span>}
        {selDate && selTime && <span className="text-white font-bold flex items-center gap-1"><Calendar className="w-3 h-3 text-yellow-400" /> {format(selDate, 'd MMM', { locale: es })} {selTime}</span>}
      </div>
      <FieldInput label="Nombre completo" required placeholder="Tu nombre completo" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
      <FieldInput label="Teléfono / WhatsApp" required type="tel" placeholder="300 123 4567" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
      <FieldInput label="Correo (opcional)" type="email" placeholder="correo@ejemplo.com" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Notas</label>
        <textarea className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-medium outline-none focus:border-purple-500 transition-colors placeholder-gray-600 resize-none"
          rows={2} placeholder="Tipo de corte, referencia de foto..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </div>
  );

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0b' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-gray-600 text-xs font-black uppercase tracking-[0.2em]">Cargando...</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0b' }}>
      <div className="text-center">
        <Zap className="w-12 h-12 text-red-400/30 mx-auto mb-3" />
        <h2 className="font-black text-white uppercase mb-1">No disponible</h2>
        <p className="text-gray-500 text-sm">El sistema de reservas está temporalmente fuera de servicio.</p>
      </div>
    </div>
  );

  const s = shop || {};

  // ── QR MODE: Barber-specific hero ─────────────────────────────────────────
  if (preselectedBarberId && selBarber) {
    return (
      <div className="min-h-screen text-white" style={{ fontFamily: "'Outfit', sans-serif", background: '#0a0a0b' }}>
        {/* Barber hero */}
        <div className="relative overflow-hidden flex flex-col items-center justify-center min-h-screen text-center px-6 py-16"
          style={{ background: 'linear-gradient(160deg, #100a1e 0%, #080812 55%, #0a0a0b 100%)' }}>
          <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '500px', background: '#a855f7', borderRadius: '50%', filter: 'blur(130px)', opacity: 0.1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '300px', height: '300px', background: '#06b6d4', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.07, pointerEvents: 'none' }} />

          {/* Shop name pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8"
            style={{ background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.2)', color: '#c084fc' }}>
            <Scissors className="w-3 h-3" />
            <span className="text-xs font-black uppercase tracking-widest">{s.name}</span>
          </div>

          {/* Avatar */}
          <div className="w-32 h-32 rounded-3xl flex items-center justify-center font-black text-5xl text-white mb-6 relative z-10"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 0 80px rgba(168,85,247,0.4), 0 20px 60px rgba(0,0,0,0.6)' }}>
            {selBarber.name[0].toUpperCase()}
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-2"
            style={{ textShadow: '0 0 60px rgba(168,85,247,0.35)' }}>
            {selBarber.name}
          </h1>
          {selBarber.specialty && (
            <p className="text-cyan-400 font-bold uppercase tracking-[0.2em] text-sm mb-6">{selBarber.specialty}</p>
          )}

          <div className="flex items-center gap-3 my-5">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-500/40" />
            <Scissors className="w-4 h-4 text-purple-400" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500/40" />
          </div>

          <p className="text-gray-400 text-base max-w-sm mx-auto mb-8 leading-relaxed">
            Reserva tu cita directamente con <strong className="text-white">{selBarber.name.split(' ')[0]}</strong>. Elige el servicio, el día y la hora que más te convenga.
          </p>

          {/* Info row */}
          <div className="flex flex-wrap justify-center gap-5 text-xs text-gray-500 mb-10">
            {s.address && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-purple-400" /> {s.address}</span>}
            {s.opening_time && s.closing_time && <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-cyan-400" /> {s.opening_time?.slice(0, 5)} – {s.closing_time?.slice(0, 5)}</span>}
            {s.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-yellow-400" /> {s.phone}</span>}
          </div>

          {/* CTA */}
          <button onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full font-black text-lg uppercase tracking-wider text-white transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 0 50px rgba(168,85,247,0.4), 0 10px 40px rgba(0,0,0,0.6)' }}>
            <Calendar className="w-5 h-5" />
            Reservar con {selBarber.name.split(' ')[0]}
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-gray-700 text-xs uppercase tracking-widest mt-4 font-bold">Sin registro · Sin complicaciones</p>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            {[
              { icon: Shield, label: 'Sin costo por agendar' },
              { icon: Award, label: 'Profesionales certificados' },
              { icon: Sparkles, label: 'Experiencia premium' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 bg-white/[0.03] text-gray-400 text-xs font-bold">
                <Icon className="w-3.5 h-3.5 text-purple-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
        {renderModal(s)}
      </div>
    );
  }

  // ── REGULAR LANDING ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "'Outfit', sans-serif", background: '#0a0a0b' }}>

      {/* ════ NAV ════ */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,10,11,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}>
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white uppercase tracking-tight text-sm">{s.name || 'Barbería'}</span>
        </div>
        <div className="flex items-center gap-2">
          {s.phone && (
            <a href={`tel:${s.phone}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/5">
              <Phone className="w-3 h-3" /> {s.phone}
            </a>
          )}
          <button onClick={() => openBookingWith()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg font-black text-xs uppercase tracking-widest text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 0 20px rgba(168,85,247,0.3)' }}>
            <Calendar className="w-3.5 h-3.5" /> Reservar
          </button>
        </div>
      </nav>

      {/* ════ HERO ════ */}
      <header className="relative flex flex-col items-center justify-center overflow-hidden text-center px-6 py-28 md:py-36"
        style={{ background: 'linear-gradient(160deg, #0f0820 0%, #080713 45%, #0a0a0b 100%)', borderBottom: '1px solid rgba(168,85,247,0.08)' }}>
        <div style={{ position: 'absolute', top: '-150px', left: '-100px', width: '600px', height: '600px', background: '#a855f7', borderRadius: '50%', filter: 'blur(140px)', opacity: 0.09, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '-120px', width: '500px', height: '500px', background: '#06b6d4', borderRadius: '50%', filter: 'blur(130px)', opacity: 0.06, pointerEvents: 'none' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Pre-headline */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6"
            style={{ background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.22)', color: '#c084fc' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.25em]">Reserva tu turno ahora</span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter text-white leading-none mb-4"
            style={{ textShadow: '0 0 100px rgba(168,85,247,0.2)' }}>
            {s.name || 'Tu Barbería'}
          </h1>

          {/* Accent line */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-500" />
            <Scissors className="w-5 h-5 text-purple-400" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500" />
          </div>

          {s.description && (
            <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-4 leading-relaxed font-medium">
              {s.description}
            </p>
          )}

          {/* Info row */}
          <div className="flex flex-wrap justify-center gap-5 text-sm text-gray-500 mb-10">
            {s.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-purple-400" /> {s.address}</span>}
            {s.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-cyan-400" /> {s.phone}</span>}
            {s.opening_time && s.closing_time && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-yellow-400" /> {s.opening_time?.slice(0, 5)} – {s.closing_time?.slice(0, 5)}</span>}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <button onClick={() => openBookingWith()}
              className="inline-flex items-center gap-2 sm:gap-3 px-7 sm:px-10 py-4 rounded-full font-black text-sm sm:text-base uppercase tracking-wider text-white transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 0 50px rgba(168,85,247,0.4), 0 8px 30px rgba(0,0,0,0.5)' }}>
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" /> Reservar mi turno <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {s.phone && (
              <a href={`https://wa.me/57${s.phone?.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero información sobre sus servicios.')}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-bold text-sm uppercase tracking-wider text-green-400 border border-green-500/30 hover:bg-green-500/10 transition-all">
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </a>
            )}
          </div>
          <p className="text-gray-700 text-xs uppercase tracking-widest font-bold">Sin registro · Sin pago anticipado · 100% gratis agendar</p>
        </div>

        {/* Trust badges row */}
        <div className="relative z-10 flex flex-wrap justify-center gap-3 mt-12">
          {[
            { icon: Shield, label: 'Reserva gratuita' },
            { icon: Award, label: 'Profesionales certificados' },
            { icon: Sparkles, label: 'Experiencia premium' },
            { icon: Star, label: 'Clientes satisfechos' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.07] bg-white/[0.02] text-gray-400 text-xs font-bold">
              <Icon className="w-3.5 h-3.5 text-purple-400" /> {label}
            </div>
          ))}
        </div>
      </header>

      {/* ════ SERVICES SECTION ════ */}
      {s.services?.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black text-purple-400 uppercase tracking-[0.3em] mb-3">Catálogo</p>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-3">Nuestros Servicios</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-500" />
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {s.services.map((svc, i) => {
              const colors = ['#a855f7', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
              const color = colors[i % colors.length];
              return (
                <div key={svc.id} onClick={() => openBookingWith(svc)}
                  className="group cursor-pointer rounded-2xl p-6 border border-white/[0.07] bg-white/[0.015] hover:border-purple-500/40 hover:bg-purple-500/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(168,85,247,0.1)]">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Scissors className="w-5 h-5" style={{ color }} />
                  </div>
                  {/* Category tag */}
                  {svc.category && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ color, background: `${color}18`, border: `1px solid ${color}25` }}>
                      {svc.category}
                    </span>
                  )}
                  <h3 className="font-black text-white uppercase tracking-tight text-lg mt-3 mb-2">{svc.name}</h3>
                  {svc.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">{svc.description}</p>}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.06]">
                    <span className="text-gray-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {svc.duration_minutes} min</span>
                    <span className="font-black text-white text-xl">{fmtPrice(svc.price)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-purple-400 uppercase tracking-widest mt-3 group-hover:translate-x-1 transition-transform">
                    Reservar ahora <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ════ WHY US ════ */}
      <section className="border-y border-white/[0.05] py-20"
        style={{ background: 'linear-gradient(180deg, rgba(168,85,247,0.03) 0%, transparent 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-3">¿Por qué elegirnos?</p>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white">La diferencia que notarás</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Award, title: 'Profesionales', desc: 'Barberos formados en las mejores escuelas con años de experiencia.', color: '#a855f7' },
              { icon: Clock, title: 'Puntualidad', desc: 'Respetamos tu tiempo. Reserva online y llega sin esperas innecesarias.', color: '#06b6d4' },
              { icon: Sparkles, title: 'Ambiente Premium', desc: 'Un espacio diseñado para que disfrutes cada visita como una experiencia completa.', color: '#f59e0b' },
              { icon: Shield, title: 'Garantía Total', desc: 'Si no quedas satisfecho con tu servicio, lo repetimos sin costo adicional.', color: '#10b981' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="text-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <h3 className="font-black text-white uppercase tracking-tight mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ TEAM ════ */}
      {s.barbers?.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black text-purple-400 uppercase tracking-[0.3em] mb-3">El equipo</p>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-3">Nuestros Barberos</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500" />
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500" />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {s.barbers.map((b, i) => {
              const colors = ['#a855f7', '#06b6d4', '#f59e0b', '#10b981'];
              const color = colors[i % colors.length];
              return (
                <div key={b.id} onClick={() => openBookingWith()}
                  className="group cursor-pointer text-center rounded-2xl p-6 border border-white/[0.07] bg-white/[0.015] hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-2 w-full sm:w-48">
                  <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-3xl text-white transition-all group-hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${color}cc, ${color}44)`, boxShadow: `0 0 30px ${color}30` }}>
                    {b.name[0].toUpperCase()}
                  </div>
                  <p className="font-black text-white uppercase tracking-tight text-lg leading-tight">{b.name}</p>
                  {b.specialty && <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color }}>{b.specialty}</p>}
                  <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-black text-gray-600 group-hover:text-purple-400 uppercase tracking-widest transition-colors">
                    Reservar <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ════ TESTIMONIALS ════ */}
      <section className="border-y border-white/[0.05] py-20" style={{ background: 'linear-gradient(180deg, transparent, rgba(168,85,247,0.03), transparent)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-[11px] font-black text-yellow-400 uppercase tracking-[0.3em] mb-3">Reseñas</p>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Lo que dicen nuestros clientes</h2>
          </div>

          {/* Testimonial carousel */}
          <div className="relative">
            <div className="flex gap-4 overflow-hidden">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className={`w-full flex-shrink-0 transition-all duration-500 ${i === activeTestimonial ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'}`}
                  style={{ display: i === activeTestimonial ? 'block' : 'none' }}>
                  <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                    <div className="flex justify-center gap-1 mb-4">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <p className="text-lg text-gray-300 leading-relaxed italic mb-5">"{t.text}"</p>
                    <p className="font-black text-white uppercase tracking-wide text-sm">{t.name}</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Cliente verificado · Google</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={`rounded-full transition-all ${i === activeTestimonial ? 'w-6 h-2 bg-purple-500' : 'w-2 h-2 bg-white/20 hover:bg-white/30'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ FINAL CTA ════ */}
      <section className="py-28 text-center px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f0820 0%, #080713 60%, #0a0a0b 100%)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', background: '#a855f7', borderRadius: '50%', filter: 'blur(150px)', opacity: 0.07, pointerEvents: 'none' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-[11px] font-black text-purple-400 uppercase tracking-[0.3em] mb-4">¿Estás listo?</p>
          <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4">Tu mejor versión te espera</h2>
          <p className="text-gray-500 mb-10 text-base">Reserva en segundos. Sin registro. Sin apps. Sin pago anticipado.</p>
          <button onClick={() => openBookingWith()}
            className="inline-flex items-center gap-3 px-12 py-5 rounded-full font-black text-lg uppercase tracking-wider text-white transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 0 60px rgba(168,85,247,0.5), 0 10px 50px rgba(0,0,0,0.6)' }}>
            <Calendar className="w-6 h-6" /> Agendar ahora <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }}>
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-black text-white uppercase tracking-tight text-sm">{s.name}</p>
                {s.address && <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {s.address}</p>}
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-gray-600 font-bold uppercase tracking-widest">
              {s.phone && <a href={`tel:${s.phone}`} className="hover:text-gray-400 transition-colors flex items-center gap-1"><Phone className="w-3 h-3" /> {s.phone}</a>}
              {s.opening_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.opening_time?.slice(0,5)} – {s.closing_time?.slice(0,5)}</span>}
            </div>
          </div>
          <div className="border-t border-white/[0.04] mt-6 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] text-gray-700">
            <p>© {new Date().getFullYear()} {s.name} — Todos los derechos reservados.</p>
            <p>Sistema gestionado por <span className="text-purple-500 font-bold">Synapsia</span></p>
          </div>
        </div>
      </footer>

      {/* ════ BOOKING MODAL ════ */}
      {renderModal(s)}
    </div>
  );

  // ─── BOOKING MODAL RENDERER ───────────────────────────────────────────────
  function renderModal(shopData) {
    if (!modalOpen) return null;
    const isSuccess = step === successStep;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)' }}
        onClick={e => { if (e.target === e.currentTarget && !isSuccess) setModalOpen(false); }}>

        <div className="w-full max-w-lg rounded-2xl overflow-hidden animate-slide-up"
          style={{
            background: 'linear-gradient(160deg, #12102a 0%, #0d0d14 100%)',
            border: '1px solid rgba(168,85,247,0.2)',
            boxShadow: '0 0 120px rgba(168,85,247,0.15), 0 40px 100px rgba(0,0,0,0.95)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>

          {/* Modal header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
            style={{ background: 'rgba(18,16,42,0.97)', backdropFilter: 'blur(10px)' }}>
            <div>
              <h2 className="font-black text-white uppercase tracking-tighter text-base">{shopData.name || 'Reservar'}</h2>
              {skipBarber && selBarber && !isSuccess && (
                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Con {selBarber.name}
                </p>
              )}
              {!skipBarber && selBarber && !isSuccess && step > 2 && (
                <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mt-0.5">Con {selBarber.name}</p>
              )}
              {isSuccess && <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-0.5">Cita confirmada</p>}
            </div>
            <button onClick={() => { setModalOpen(false); if (isSuccess) reset(); }}
              className="text-gray-600 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {!isSuccess && <Stepper step={step} skipBarber={skipBarber} />}
            {renderStep()}

            {/* Navigation */}
            {!isSuccess && (
              <div className="flex gap-3 mt-6 pt-5 border-t border-white/[0.05]">
                <button onClick={back}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-white/10 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 font-bold text-xs uppercase tracking-wider transition-all">
                  <ChevronLeft className="w-4 h-4" /> {step === 1 ? 'Cerrar' : 'Atrás'}
                </button>
                {step < maxStep ? (
                  <button onClick={next} disabled={!canNext()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider text-white transition-all disabled:opacity-30"
                    style={{ background: canNext() ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(255,255,255,0.05)' }}>
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={submit} disabled={!canNext() || bookMutation.isLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider text-white transition-all disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
                    {bookMutation.isLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</>
                      : <><CheckCircle className="w-4 h-4" /> Confirmar Cita</>}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};

export default LandingPage;
