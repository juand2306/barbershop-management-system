import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import BarberAvatar from '../components/BarberAvatar';
import {
  Scissors, Clock, MapPin, Phone, Star, Calendar,
  CheckCircle, ChevronRight, ChevronLeft, User, ArrowRight,
  X, Loader2, Tag, Zap, UserCheck, Lock, Instagram,
  Shield, Award, Sparkles, MessageCircle
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Brand Assets ─────────────────────────────────────────────────────────────
const LOGO_PNG = 'https://res.cloudinary.com/dsugqcizc/image/upload/q_auto/f_auto/v1777509156/LOGO_TITANES_SF_ox9vyz.png';
const LOGO_FULL = 'https://res.cloudinary.com/dsugqcizc/image/upload/q_auto/f_auto/v1777509156/LOGO_TITANES_N_sxvw7p.jpg';

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const G = {
  gold:        '#C9A84C',
  goldLight:   '#F0C860',
  goldDark:    '#8B6808',
  amber:       '#D4843A',
  amberLight:  '#E89A50',
  bg:          '#0a0a0b',
  surface:     '#0d0c08',
  glow:        'rgba(201,168,76,',
  amberGlow:   'rgba(212,132,58,',
};

const goldGradient = `linear-gradient(135deg, ${G.gold}, ${G.goldDark})`;
const goldGradientHover = `linear-gradient(135deg, ${G.goldLight}, ${G.gold})`;

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

// ─── Category colors — gold palette ───────────────────────────────────────────
const SERVICE_CATEGORIES = {
  'cabello':     { label: 'Cabello',     color: G.gold },
  'barba':       { label: 'Barba',       color: G.amber },
  'combo':       { label: 'Combo',       color: G.goldLight },
  'tratamiento': { label: 'Tratamiento', color: G.amberLight },
};

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: "Carlos M.", text: "El mejor corte que me he hecho. El barbero entendió exactamente lo que quería desde el primer momento. 100% recomendado.", stars: 5 },
  { name: "Andrés P.", text: "Ambiente increíble, servicio de primera. Salí completamente diferente. Ya agendar mi próxima cita.", stars: 5 },
  { name: "David R.", text: "Profesionales de verdad. El detalle en el acabado de la barba es impecable. Sin duda el mejor lugar.", stars: 5 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const StepDot = ({ n, current, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 ${
      n < current
        ? 'text-black'
        : n === current
          ? 'text-black ring-4'
          : 'bg-white/8 border border-white/10 text-gray-600'
    }`}
      style={n <= current ? {
        background: n === current ? goldGradient : G.gold,
        boxShadow: n === current ? `0 0 20px ${G.glow}0.4), 0 0 0 4px ${G.glow}0.15)` : undefined,
      } : {}}>
      {n < current ? <CheckCircle className="w-4 h-4" /> : n}
    </div>
    <span className="text-[9px] font-bold uppercase tracking-widest"
      style={{ color: n === current ? G.gold : '#374151' }}>{label}</span>
  </div>
);

const Stepper = ({ step, skipBarber }) => {
  const steps = skipBarber ? ['Servicio', 'Fecha', 'Datos'] : ['Servicio', 'Barbero', 'Fecha', 'Datos'];
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <StepDot n={i + 1} current={step} label={label} />
          {i < steps.length - 1 && (
            <div className="h-px w-7 mb-5"
              style={{ background: step > i + 1 ? G.gold : 'rgba(255,255,255,0.1)' }} />
          )}
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
          <button key={d.toISOString()} onClick={() => onSelect(d)} style={{ flexShrink: 0,
            ...(isSel ? { borderColor: G.gold, background: `${G.glow}0.12)`, color: '#fff' } : {})
          }}
            className={`flex flex-col items-center px-4 py-3 rounded-xl border transition-all ${
              isSel ? 'text-white' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:text-white'
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
        className="py-2.5 text-sm font-bold rounded-lg border transition-all"
        style={selected === slot
          ? { borderColor: G.gold, background: `${G.glow}0.12)`, color: '#fff' }
          : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#9ca3af' }}>
        {slot}
      </button>
    ))}
  </div>
);

const FieldInput = ({ label, required, type = 'text', placeholder, value, onChange }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">
      {label}{required && <span style={{ color: G.gold }}> *</span>}
    </label>
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-medium outline-none transition-colors placeholder-gray-600"
      onFocus={e => e.target.style.borderColor = G.gold}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
  </div>
);

const BarberBadge = ({ barber }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border mb-3"
    style={{ borderColor: `${G.amberGlow}0.3)`, background: `${G.amberGlow}0.08)` }}>
    <BarberAvatar
      name={barber.name}
      photoUrl={barber.photo_url}
      className="w-10 h-10 rounded-full flex-shrink-0"
      style={{ background: goldGradient }}
    />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: G.amber }}>Tu barbero</p>
      <p className="text-white font-black uppercase tracking-tight truncate">{barber.name}</p>
      {barber.specialty && <p className="text-[11px] text-gray-500">{barber.specialty}</p>}
    </div>
    <div className="flex items-center gap-1" style={{ color: G.amber }}>
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
        toast.error(msg);
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
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${G.glow}0.1)`, border: `1px solid ${G.glow}0.2)` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: G.gold }} />
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
            className="cursor-pointer rounded-xl p-4 border transition-all duration-200"
            style={selSvc?.id === svc.id
              ? { borderColor: G.gold, background: `${G.glow}0.08)` }
              : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Scissors className="w-3 h-3 flex-shrink-0" style={{ color: G.gold }} />
                  <h3 className="font-black text-white text-sm uppercase tracking-tight truncate">{svc.name}</h3>
                </div>
                {svc.description && <p className="text-xs text-gray-500 line-clamp-1 pl-5">{svc.description}</p>}
                <p className="text-[11px] text-gray-600 mt-0.5 pl-5 flex items-center gap-1"><Clock className="w-3 h-3" /> {svc.duration_minutes} min</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-lg text-white">{fmtPrice(svc.price)}</p>
                {selSvc?.id === svc.id && <CheckCircle className="w-4 h-4 ml-auto mt-1" style={{ color: G.gold }} />}
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
            className="cursor-pointer rounded-xl p-4 text-center border transition-all duration-200"
            style={selBarber?.id === b.id
              ? { borderColor: G.gold, background: `${G.glow}0.08)` }
              : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <BarberAvatar
              name={b.name}
              photoUrl={b.photo_url}
              className="w-12 h-12 rounded-full mx-auto mb-2"
              style={{ background: goldGradient }}
              textSize="text-xl"
            />
            <p className="font-black text-white text-sm uppercase tracking-tight leading-tight">{b.name}</p>
            {b.specialty && <p className="text-[11px] text-gray-500 mt-0.5">{b.specialty}</p>}
            {selBarber?.id === b.id && <CheckCircle className="w-4 h-4 mx-auto mt-2" style={{ color: G.gold }} />}
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
            <span className="normal-case font-bold capitalize" style={{ color: G.gold }}>{format(selDate, "EEEE d 'de' MMMM", { locale: es })}</span>
          </p>
          <TimeGrid slots={slots} selected={selTime} onSelect={setSelTime} />
        </div>
      )}
    </div>
  );

  const renderDataStep = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border text-xs mb-2"
        style={{ borderColor: `${G.glow}0.2)`, background: `${G.glow}0.05)` }}>
        {selSvc && <span className="text-white font-bold flex items-center gap-1"><Scissors className="w-3 h-3" style={{ color: G.gold }} /> {selSvc.name}</span>}
        {selBarber && <span className="text-white font-bold flex items-center gap-1"><User className="w-3 h-3" style={{ color: G.amber }} /> {selBarber.name}</span>}
        {selDate && selTime && <span className="text-white font-bold flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: G.goldLight }} /> {format(selDate, 'd MMM', { locale: es })} {selTime}</span>}
      </div>
      <FieldInput label="Nombre completo" required placeholder="Tu nombre completo" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
      <FieldInput label="Teléfono / WhatsApp" required type="tel" placeholder="300 123 4567" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
      <FieldInput label="Correo (opcional)" type="email" placeholder="correo@ejemplo.com" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Notas</label>
        <textarea
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-medium outline-none transition-colors placeholder-gray-600 resize-none"
          rows={2} placeholder="Tipo de corte, referencia de foto..."
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          onFocus={e => e.target.style.borderColor = G.gold}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
      </div>
    </div>
  );

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: G.bg }}>
      <div className="flex flex-col items-center gap-4">
        <img src={LOGO_PNG} alt="Titanes" style={{ height: '72px', opacity: 0.8 }} />
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${G.glow}0.3)`, borderTopColor: G.gold }} />
        <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: G.gold }}>Cargando...</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: G.bg }}>
      <div className="text-center">
        <Zap className="w-12 h-12 mx-auto mb-3" style={{ color: G.goldDark }} />
        <h2 className="font-black text-white uppercase mb-1">No disponible</h2>
        <p className="text-gray-500 text-sm">El sistema de reservas está temporalmente fuera de servicio.</p>
      </div>
    </div>
  );

  const s = shop || {};

  // ── QR MODE: Barber-specific hero ─────────────────────────────────────────
  if (preselectedBarberId && selBarber) {
    return (
      <div className="min-h-screen text-white" style={{ fontFamily: "'Outfit', sans-serif", background: G.bg }}>
        <div className="relative overflow-hidden flex flex-col items-center justify-center min-h-screen text-center px-6 py-16"
          style={{ background: 'linear-gradient(160deg, #110e05 0%, #08070a 55%, #0a0a0b 100%)' }}>

          {/* Gold orb top */}
          <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '500px', background: G.gold, borderRadius: '50%', filter: 'blur(130px)', opacity: 0.1, pointerEvents: 'none' }} />
          {/* Amber orb bottom right */}
          <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '300px', height: '300px', background: G.amber, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.08, pointerEvents: 'none' }} />

          {/* Shop logo */}
          <img src={LOGO_PNG} alt={s.name} style={{ height: '72px', marginBottom: '2rem', filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.5))' }} />

          {/* Shop name pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8"
            style={{ background: `${G.glow}0.08)`, borderColor: `${G.glow}0.25)`, color: G.gold }}>
            <Scissors className="w-3 h-3" />
            <span className="text-xs font-black uppercase tracking-widest">{s.name}</span>
          </div>

          {/* Barber Avatar */}
          <BarberAvatar
            name={selBarber.name}
            photoUrl={selBarber.photo_url}
            className="w-32 h-32 rounded-3xl mb-6 relative z-10"
            style={{ background: goldGradient, boxShadow: `0 0 80px ${G.glow}0.4), 0 20px 60px rgba(0,0,0,0.6)` }}
            textSize="text-5xl"
          />

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-2"
            style={{ textShadow: `0 0 60px ${G.glow}0.35)` }}>
            {selBarber.name}
          </h1>
          {selBarber.specialty && (
            <p className="font-bold uppercase tracking-[0.2em] text-sm mb-6" style={{ color: G.amber }}>{selBarber.specialty}</p>
          )}

          {/* Decorative divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px w-16" style={{ background: `linear-gradient(to right, transparent, ${G.gold}60)` }} />
            <Scissors className="w-4 h-4" style={{ color: G.gold }} />
            <div className="h-px w-16" style={{ background: `linear-gradient(to left, transparent, ${G.gold}60)` }} />
          </div>

          <p className="text-gray-400 text-base max-w-sm mx-auto mb-8 leading-relaxed">
            Reserva tu cita directamente con <strong className="text-white">{selBarber.name.split(' ')[0]}</strong>. Elige el servicio, el día y la hora que más te convenga.
          </p>

          {/* Info row */}
          <div className="flex flex-wrap justify-center gap-5 text-xs text-gray-500 mb-10">
            {s.address && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" style={{ color: G.gold }} /> {s.address}</span>}
            {s.opening_time && s.closing_time && <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" style={{ color: G.amber }} /> {s.opening_time?.slice(0, 5)} – {s.closing_time?.slice(0, 5)}</span>}
            {s.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" style={{ color: G.goldLight }} /> {s.phone}</span>}
          </div>

          {/* CTA */}
          <button onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-black text-sm uppercase tracking-wider text-black transition-all duration-300 hover:scale-105 hover:-translate-y-1 gold-pulse-btn"
            style={{ background: goldGradient, boxShadow: `0 0 50px ${G.glow}0.45), 0 10px 40px rgba(0,0,0,0.6)` }}>
            <Calendar className="w-4 h-4" />
            Reservar con {selBarber.name.split(' ')[0]}
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-gray-700 text-xs uppercase tracking-widest mt-4 font-bold">Sin registro · Sin complicaciones</p>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            {[
              { icon: Shield, label: 'Sin costo por agendar' },
              { icon: Award, label: 'Profesionales certificados' },
              { icon: Sparkles, label: 'Experiencia premium' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold"
                style={{ borderColor: `${G.glow}0.15)`, background: `${G.glow}0.04)`, color: '#9ca3af' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: G.gold }} />
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
  const serviceColors = [G.gold, G.amber, G.goldLight, G.amberLight, G.goldDark, '#E0AA60'];
  const barberColors  = [G.gold, G.amber, G.goldLight, G.amberLight];

  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "'Outfit', sans-serif", background: G.bg }}>

      {/* ════ NAV ════ */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{ background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${G.glow}0.1)` }}>
        <div className="flex items-center gap-3">
          <img src={LOGO_PNG} alt="Titanes" style={{ height: '40px', filter: 'drop-shadow(0 0 10px rgba(201,168,76,0.5))' }} />
        </div>
        <div className="flex items-center gap-2">
          {s.phone && (
            <a href={`tel:${s.phone}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/5"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#9ca3af' }}>
              <Phone className="w-3 h-3" /> {s.phone}
            </a>
          )}
          <button onClick={() => openBookingWith()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg font-black text-xs uppercase tracking-widest text-black transition-all hover:scale-105"
            style={{ background: goldGradient, boxShadow: `0 0 20px ${G.glow}0.35)` }}>
            <Calendar className="w-3.5 h-3.5" /> Reservar
          </button>
        </div>
      </nav>

      {/* ════ HERO ════ */}
      <header className="relative flex flex-col items-center justify-center overflow-hidden text-center px-6 py-28 md:py-36"
        style={{ background: 'linear-gradient(160deg, #110e04 0%, #08070a 45%, #0a0a0b 100%)', borderBottom: `1px solid ${G.glow}0.08)` }}>

        {/* Orbs */}
        <div style={{ position: 'absolute', top: '-150px', left: '-100px', width: '600px', height: '600px', background: G.gold, borderRadius: '50%', filter: 'blur(140px)', opacity: 0.1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '-120px', width: '500px', height: '500px', background: G.amber, borderRadius: '50%', filter: 'blur(130px)', opacity: 0.07, pointerEvents: 'none' }} />

        <div className="relative z-10 max-w-4xl mx-auto">

          {/* Logo */}
          <div className="mb-8">
            <img src={LOGO_PNG} alt={s.name || 'Titanes'} style={{ height: '140px', margin: '0 auto', filter: 'drop-shadow(0 0 40px rgba(201,168,76,0.55)) drop-shadow(0 0 80px rgba(201,168,76,0.25))' }} />
          </div>

          {/* Pre-headline */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6 gold-border-glow"
            style={{ background: `${G.glow}0.08)`, borderColor: `${G.glow}0.25)`, color: G.gold }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: G.gold }} />
            <span className="text-xs font-black uppercase tracking-[0.25em]">Reserva tu turno ahora</span>
          </div>

          {/* Main headline — gold shimmer */}
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-4 gold-shimmer-text">
            {s.name || 'Titanes'}
          </h1>

          {/* Accent line */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16" style={{ background: `linear-gradient(to right, transparent, ${G.gold})` }} />
            <Scissors className="w-5 h-5" style={{ color: G.gold }} />
            <div className="h-px w-16" style={{ background: `linear-gradient(to left, transparent, ${G.gold})` }} />
          </div>

          {s.description && (
            <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-4 leading-relaxed font-medium">
              {s.description}
            </p>
          )}

          {/* Info row */}
          <div className="flex flex-wrap justify-center gap-5 text-sm text-gray-500 mb-10">
            {s.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: G.gold }} /> {s.address}</span>}
            {s.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" style={{ color: G.amber }} /> {s.phone}</span>}
            {s.opening_time && s.closing_time && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" style={{ color: G.goldLight }} /> {s.opening_time?.slice(0, 5)} – {s.closing_time?.slice(0, 5)}</span>}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <button onClick={() => openBookingWith()}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider text-black transition-all duration-300 hover:scale-105 hover:-translate-y-1 gold-pulse-btn"
              style={{ background: goldGradient }}>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Reservar mi turno <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

        {/* Trust badges */}
        <div className="relative z-10 flex flex-wrap justify-center gap-3 mt-12">
          {[
            { icon: Shield, label: 'Reserva gratuita' },
            { icon: Award, label: 'Profesionales certificados' },
            { icon: Sparkles, label: 'Experiencia premium' },
            { icon: Star, label: 'Clientes satisfechos' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold"
              style={{ borderColor: `${G.glow}0.12)`, background: `${G.glow}0.03)`, color: '#9ca3af' }}>
              <Icon className="w-3.5 h-3.5" style={{ color: G.gold }} /> {label}
            </div>
          ))}
        </div>
      </header>

      {/* ════ SERVICES SECTION ════ */}
      {s.services?.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: G.gold }}>Catálogo</p>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-3">Nuestros Servicios</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${G.gold})` }} />
              <div className="w-2 h-2 rounded-full" style={{ background: G.gold }} />
              <div className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${G.gold})` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {s.services.map((svc, i) => {
              const color = serviceColors[i % serviceColors.length];
              return (
                <div key={svc.id} onClick={() => openBookingWith(svc)}
                  className="group cursor-pointer rounded-2xl p-6 border border-white/[0.07] bg-white/[0.015] transition-all duration-300 hover:-translate-y-1"
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `${color}55`;
                    e.currentTarget.style.boxShadow = `0 20px 60px ${color}18`;
                    e.currentTarget.style.background = `${color}08`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                  }}>
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
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest mt-3 group-hover:translate-x-1 transition-transform"
                    style={{ color: G.gold }}>
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
        style={{ background: `linear-gradient(180deg, ${G.glow}0.03) 0%, transparent 100%)` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: G.amber }}>¿Por qué elegirnos?</p>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white">La diferencia que notarás</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Award,    title: 'Profesionales', desc: 'Barberos formados en las mejores escuelas con años de experiencia.',                color: G.gold },
              { icon: Clock,    title: 'Puntualidad',   desc: 'Respetamos tu tiempo. Reserva online y llega sin esperas innecesarias.',          color: G.amber },
              { icon: Sparkles, title: 'Ambiente Premium', desc: 'Un espacio diseñado para que disfrutes cada visita como una experiencia completa.', color: G.goldLight },
              { icon: Shield,   title: 'Garantía Total', desc: 'Si no quedas satisfecho con tu servicio, lo repetimos sin costo adicional.',    color: G.amberLight },
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
            <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: G.gold }}>El equipo</p>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-3">Nuestros Barberos</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${G.amber})` }} />
              <div className="w-2 h-2 rounded-full" style={{ background: G.amber }} />
              <div className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${G.amber})` }} />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {s.barbers.map((b, i) => {
              const color = barberColors[i % barberColors.length];
              return (
                <div key={b.id} onClick={() => openBookingWith()}
                  className="group cursor-pointer text-center rounded-2xl p-6 border border-white/[0.07] bg-white/[0.015] transition-all duration-300 hover:-translate-y-2 w-full sm:w-48"
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                  <BarberAvatar
                    name={b.name}
                    photoUrl={b.photo_url}
                    className="w-24 h-24 rounded-2xl mx-auto mb-4 transition-all group-hover:scale-105"
                    color={color}
                    style={{ boxShadow: `0 0 30px ${color}30` }}
                    textSize="text-3xl"
                  />
                  <p className="font-black text-white uppercase tracking-tight text-lg leading-tight">{b.name}</p>
                  {b.specialty && <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color }}>{b.specialty}</p>}
                  <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all duration-300 text-gray-600 group-hover:text-amber-400">
                    Reservar <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ════ TESTIMONIALS ════ */}
      <section className="border-y border-white/[0.05] py-20"
        style={{ background: `linear-gradient(180deg, transparent, ${G.glow}0.03), transparent)` }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: G.goldLight }}>Reseñas</p>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Lo que dicen nuestros clientes</h2>
          </div>

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
            <div className="flex justify-center gap-1.5 mt-5">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className="rounded-full transition-all duration-300"
                  style={i === activeTestimonial
                    ? { width: '14px', height: '4px', background: G.gold }
                    : { width: '4px', height: '4px', background: 'rgba(255,255,255,0.18)' }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ FINAL CTA ════ */}
      <section className="py-28 text-center px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #110e04 0%, #08070a 60%, #0a0a0b 100%)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', background: G.gold, borderRadius: '50%', filter: 'blur(150px)', opacity: 0.08, pointerEvents: 'none' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-4" style={{ color: G.gold }}>¿Estás listo?</p>
          <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4">Tu mejor versión te espera</h2>
          <p className="text-gray-500 mb-10 text-base">Reserva en segundos. Sin registro. Sin apps. Sin pago anticipado.</p>
          <button onClick={() => openBookingWith()}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-black text-sm uppercase tracking-wider text-black transition-all duration-300 hover:scale-105 hover:-translate-y-1 gold-pulse-btn"
            style={{ background: goldGradient }}>
            <Calendar className="w-4 h-4" /> Agendar ahora <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer className="border-t" style={{ borderColor: `${G.glow}0.1)`, background: 'linear-gradient(180deg, #0a0a0b 0%, #080706 100%)' }}>

        {/* Top footer — info útil */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">

            {/* Col 1 — Brand */}
            <div className="flex flex-col items-start gap-3">
              <img src={LOGO_PNG} alt={s.name} style={{ height: '52px', filter: 'drop-shadow(0 0 12px rgba(201,168,76,0.45))' }} />
              {s.description && (
                <p className="text-gray-600 text-xs leading-relaxed max-w-[220px]">{s.description}</p>
              )}
              {/* WhatsApp CTA */}
              {s.phone && (
                <a href={`https://wa.me/57${s.phone?.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero información sobre sus servicios.')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/25 text-green-400 text-xs font-bold uppercase tracking-wider hover:bg-green-500/10 transition-all">
                  <MessageCircle className="w-3.5 h-3.5" /> Escríbenos por WhatsApp
                </a>
              )}
            </div>

            {/* Col 2 — Información */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4" style={{ color: G.gold }}>Información</p>
              <div className="space-y-3">
                {s.address && (
                  <div className="flex items-start gap-2.5 text-gray-500 text-xs">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: G.gold }} />
                    <span>{s.address}</span>
                  </div>
                )}
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-2.5 text-gray-500 text-xs hover:text-gray-300 transition-colors">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G.amber }} />
                    <span>{s.phone}</span>
                  </a>
                )}
                {s.opening_time && s.closing_time && (
                  <div className="flex items-center gap-2.5 text-gray-500 text-xs">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G.goldLight }} />
                    <span>Lun – Sáb &nbsp;·&nbsp; {s.opening_time?.slice(0,5)} – {s.closing_time?.slice(0,5)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Col 3 — CTA */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4" style={{ color: G.gold }}>¿Listo para tu cita?</p>
              <p className="text-gray-600 text-xs leading-relaxed mb-4">Agenda en segundos, sin registro ni apps. Elige tu barbero, fecha y hora.</p>
              <button onClick={() => openBookingWith()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider text-black transition-all hover:scale-105"
                style={{ background: goldGradient, boxShadow: `0 0 16px ${G.glow}0.3)` }}>
                <Calendar className="w-3.5 h-3.5" /> Agendar ahora
              </button>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t" style={{ borderColor: `${G.glow}0.06)` }}>
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-gray-700">
            <p>© {new Date().getFullYear()} <span className="text-gray-500 font-bold">{s.name}</span> — Todos los derechos reservados.</p>
            <a href="https://portafolio-jdi.vercel.app/" target="_blank" rel="noopener noreferrer"
              className="hover:text-gray-500 transition-colors"
              style={{ color: '#4b5563' }}>
              Desarrollado por <span className="font-bold" style={{ color: G.gold }}>Juan Diego Imbachi</span>
            </a>
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
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
        onClick={e => { if (e.target === e.currentTarget && !isSuccess) setModalOpen(false); }}>

        <div className="w-full max-w-lg rounded-2xl overflow-hidden animate-slide-up"
          style={{
            background: 'linear-gradient(160deg, #100e06 0%, #0d0d0e 100%)',
            border: `1px solid ${G.glow}0.2)`,
            boxShadow: `0 0 120px ${G.glow}0.15), 0 40px 100px rgba(0,0,0,0.95)`,
            maxHeight: '90vh', overflowY: 'auto',
          }}>

          {/* Modal header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
            style={{ background: 'rgba(16,14,6,0.97)', backdropFilter: 'blur(10px)' }}>
            <div>
              <h2 className="font-black text-white uppercase tracking-tighter text-base">{shopData.name || 'Reservar'}</h2>
              {skipBarber && selBarber && !isSuccess && (
                <p className="text-[10px] font-black uppercase tracking-widest mt-0.5 flex items-center gap-1"
                  style={{ color: G.amber }}>
                  <UserCheck className="w-3 h-3" /> Con {selBarber.name}
                </p>
              )}
              {!skipBarber && selBarber && !isSuccess && step > 2 && (
                <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: G.gold }}>Con {selBarber.name}</p>
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
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider text-black transition-all disabled:opacity-30"
                    style={{ background: canNext() ? goldGradient : 'rgba(255,255,255,0.05)', color: canNext() ? '#000' : '#4b5563' }}>
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={submit} disabled={!canNext() || bookMutation.isLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider text-black transition-all disabled:opacity-30"
                    style={{ background: goldGradient }}>
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
