import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  Calendar, Check, X, ArrowRight, User, MessageCircle,
  Clock, Scissors, Phone, AlertCircle, CheckCircle, Ban,
  XCircle, RefreshCw, DollarSign, CreditCard
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Modal from '../../components/Modal';

// ─── WhatsApp URL builder ─────────────────────────────────────────────────────
const buildWhatsAppUrl = (appointment, shopName) => {
  const phone = appointment.client_phone?.replace(/\D/g, '');
  if (!phone) return null;
  const intlPhone = phone.startsWith('57') ? phone : `57${phone}`;
  const dateObj  = parseISO(appointment.appointment_datetime);
  const dateStr  = format(dateObj, "EEEE d 'de' MMMM", { locale: es });
  const timeStr  = format(dateObj, 'hh:mm a');
  const barber   = appointment.barber_name || 'tu barbero';
  const svc      = appointment.service_name || 'el servicio';
  const client   = appointment.client_name?.split(' ')[0] || 'Cliente';
  const msg = `Hola ${client} 👋, te recordamos que tienes una cita en *${shopName}* el *${dateStr}* a las *${timeStr}* con *${barber}* para *${svc}*.\n\n¿Confirmas tu asistencia? Si necesitas reagendar, contáctanos con tiempo. ¡Te esperamos! ✂️`;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    pendiente:  { label: 'Pendiente',  icon: Clock,         cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    confirmada: { label: 'Confirmada', icon: CheckCircle,   cls: 'text-cyan-400   bg-cyan-400/10   border-cyan-400/20'   },
    completada: { label: 'Completada', icon: Check,         cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    no_asistio: { label: 'No asistió', icon: XCircle,       cls: 'text-red-400   bg-red-400/10   border-red-400/20'    },
    cancelada:  { label: 'Cancelada',  icon: Ban,           cls: 'text-gray-500  bg-gray-500/10  border-gray-500/20'   },
  }[status] || { label: status, icon: AlertCircle, cls: 'text-gray-400 bg-white/5 border-white/10' };
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border font-bold ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label.toUpperCase()}
    </span>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const AppointmentsList = () => {
  const queryClient = useQueryClient();
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // ── Modal de cobro ─────────────────────────────────────────────────────────
  const [cobroModal, setCobroModal] = useState(null); // appointment object
  const [cobroForm, setCobroForm] = useState({ payment_method: '', price_charged: '', notes: '' });

  // ── Data queries ───────────────────────────────────────────────────────────
  const { data: shopInfo } = useQuery(
    ['shop-name'],
    () => api.get('/barbershop/').then(r => {
      const d = r.data?.results?.[0] || (Array.isArray(r.data) ? r.data[0] : r.data);
      return d?.name || 'la barbería';
    }),
    { staleTime: 300000 }
  );

  const { data: paymentMethods } = useQuery(
    ['paymentMethods'],
    () => api.get('/payment-methods/').then(r => r.data.results || r.data),
    { staleTime: 300000 }
  );

  // Main appointments query — auto-refresh every 30s for new online bookings
  const { data: appointments, isLoading, isFetching, refetch } = useQuery(
    ['appointments', filterDate],
    async () => {
      const res = await api.get(`/appointments/?date=${filterDate}`);
      return res.data.results || res.data;
    },
    {
      staleTime: 0,
      refetchInterval: 30000, // Auto-refresh every 30s — catches new online bookings
      refetchOnWindowFocus: true,
    }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const changeStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/estado/`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('Error al cambiar el estado'),
  });

  // THE KEY MUTATION: create service record from an appointment
  // This is what actually feeds the cash register, metrics, and barber stats
  const registrarCobro = useMutation({
    mutationFn: async ({ appointment, form }) => {
      const now = new Date();
      // Use appointment_datetime but cap at "now" to avoid future dates
      const apptDt = parseISO(appointment.appointment_datetime);
      const serviceDate = apptDt <= now ? apptDt : now;
      // Use Bogotá offset for timezone-aware datetime
      const pad = (n) => String(n).padStart(2, '0');
      const isoWithOffset = `${serviceDate.getFullYear()}-${pad(serviceDate.getMonth()+1)}-${pad(serviceDate.getDate())}T${pad(serviceDate.getHours())}:${pad(serviceDate.getMinutes())}:00-05:00`;

      return api.post('/service-records/', {
        barber: appointment.barber,
        service: appointment.service,
        appointment: appointment.id,       // links to the appointment
        price_charged: Number(form.price_charged),
        payment_method: form.payment_method || null,
        client_name: appointment.client_name,
        service_datetime: isoWithOffset,
        status: 'completado',
        notes: form.notes || appointment.notes || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      queryClient.invalidateQueries(['todaySummary']);
      queryClient.invalidateQueries(['records-recent']);
      queryClient.invalidateQueries(['barber-stats']);
      queryClient.invalidateQueries(['reports-chart']);
      setCobroModal(null);
      setCobroForm({ payment_method: '', price_charged: '', notes: '' });
      toast.success('Cobro registrado. El servicio ya aparece en caja y métricas.');
    },
    onError: (err) => {
      const data = err.response?.data;
      const msg = data?.barber?.[0] || data?.non_field_errors?.[0] || data?.detail || JSON.stringify(data) || 'Error al registrar cobro';
      toast.error(`Error: ${msg}`);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCobroModal = (app) => {
    setCobroModal(app);
    setCobroForm({
      payment_method: '',
      // Pre-fill with the catalog price — receptionist can adjust
      price_charged: app.service_price ? String(parseInt(app.service_price)) : '',
      notes: '',
    });
  };

  const handleCobro = (e) => {
    e.preventDefault();
    if (!cobroModal) return;
    if (!cobroForm.price_charged || Number(cobroForm.price_charged) < 0) {
      toast.error('Ingresa un precio válido');
      return;
    }
    registrarCobro.mutate({ appointment: cobroModal, form: cobroForm });
  };

  const handleWhatsApp = (app) => {
    const url = buildWhatsAppUrl(app, shopInfo || 'la barbería');
    if (!url) { toast.warning('Esta cita no tiene número de teléfono registrado'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('WhatsApp abierto con el mensaje listo para enviar');
  };

  return (
    <div className="animate-slide-up space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Agenda Diaria</h1>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">
            Turnos agendados — usa "Registrar Cobro" para que queden en caja
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Manual refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/8 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-purple-400' : ''}`} />
            {isFetching ? 'Actualizando...' : 'Actualizar'}
          </button>
          {/* Date filter */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
            <input
              type="date"
              className="bg-transparent text-white font-bold outline-none px-4 py-2 cursor-pointer tracking-widest"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Info callout explaining the flow ── */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-purple-500/15 bg-purple-500/5">
        <DollarSign className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs font-bold uppercase tracking-wide text-purple-300 space-y-0.5">
          <p>Flujo correcto: <span className="text-white">Confirmar</span> → cliente llega → <span className="text-emerald-400">Registrar Cobro</span> → queda en caja, métricas y comisiones.</p>
          <p className="text-gray-500 normal-case font-medium tracking-normal">El barbero debe tener el turno abierto (entrada marcada) para registrar un cobro. Se actualiza cada 30 s automáticamente.</p>
        </div>
      </div>

      {/* ── Appointments list ── */}
      <div className="glass-panel border-white/5 min-h-[400px]">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          </div>
        ) : appointments?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <Calendar className="w-16 h-16 mb-4 opacity-30" />
            <p className="uppercase tracking-widest font-bold">Sin agenda para esta fecha</p>
            <p className="text-xs mt-2 text-gray-700 font-medium">Se actualiza automáticamente cada 30 segundos</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {appointments?.map(app => {
              const appDate = parseISO(app.appointment_datetime);
              const timeStr = format(appDate, 'hh:mm a');
              const hasPhone = !!app.client_phone;
              const isActive = app.status === 'pendiente' || app.status === 'confirmada';

              return (
                <div key={app.id}
                  className="p-4 md:p-5 flex flex-col items-start gap-4 hover:bg-white/[0.015] transition-colors border-b border-white/5 last:border-0">

                  {/* Row 1: Time + info + status */}
                  <div className="flex items-start gap-4 w-full">
                    {/* Time block */}
                    <div className="text-center bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-xl min-w-[76px] flex-shrink-0">
                      <p className="text-lg font-black text-purple-400 tracking-tighter leading-none">{timeStr.split(' ')[0]}</p>
                      <p className="text-[9px] text-purple-300 font-black uppercase mt-0.5">{timeStr.split(' ')[1]}</p>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="truncate max-w-[140px] sm:max-w-none">{app.client_name}</span>
                        </h3>
                        {app.is_online_booking && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 font-black uppercase tracking-widest flex-shrink-0">Online</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Scissors className="w-3 h-3" /> {app.service_name}
                        </p>
                        <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1">
                          <User className="w-3 h-3 text-purple-400" /> {app.barber_name}
                        </p>
                        {app.client_phone && (
                          <p className="text-xs text-gray-600 font-bold flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {app.client_phone}
                          </p>
                        )}
                      </div>
                      {app.notes && <p className="text-[11px] text-gray-600 italic mt-0.5 truncate">"{app.notes}"</p>}
                    </div>
                    {/* Status badge on the right */}
                    <div className="flex-shrink-0"><StatusBadge status={app.status} /></div>
                  </div>

                  {/* Row 2: Action buttons */}
                  <div className="flex flex-wrap gap-2 w-full">

                      {/* WhatsApp */}
                      <button
                        onClick={() => handleWhatsApp(app)}
                        disabled={!hasPhone}
                        title={hasPhone ? 'Enviar recordatorio por WhatsApp' : 'Sin teléfono registrado'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider transition-all ${
                          hasPhone
                            ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            : 'border-white/5 bg-white/[0.02] text-gray-700 cursor-not-allowed'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WA
                      </button>

                      {/* Confirm (pendiente only) */}
                      {app.status === 'pendiente' && (
                        <button
                          onClick={() => changeStatus.mutate({ id: app.id, status: 'confirmada' })}
                          className="flex items-center gap-1 px-3 py-1.5 border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-lg text-xs font-black uppercase transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirmar
                        </button>
                      )}

                      {/* No-show */}
                      {isActive && (
                        <button
                          onClick={() => changeStatus.mutate({ id: app.id, status: 'no_asistio' })}
                          title="No asistió"
                          className="flex items-center gap-1 px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-black uppercase transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> No asistió
                        </button>
                      )}

                      {/* ★ REGISTRAR COBRO — THE KEY BUTTON ★ */}
                      {isActive && !app.has_service_record && (
                        <button
                          onClick={() => openCobroModal(app)}
                          className="flex items-center gap-1.5 px-4 py-1.5 border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-500/60 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Registrar Cobro
                        </button>
                      )}

                      {/* Already charged via service record */}
                      {app.has_service_record && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-500 border border-emerald-500/20 bg-emerald-500/5 rounded-lg text-xs font-black uppercase tracking-wider">
                          <Check className="w-3.5 h-3.5" /> Ya en Caja
                        </span>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Registrar Cobro
          Pre-fills from the appointment, asks for payment method + price
          Creates ServiceRecord → feeds cash register + barber metrics
      ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!cobroModal}
        onClose={() => { setCobroModal(null); setCobroForm({ payment_method: '', price_charged: '', notes: '' }); }}
        title="Registrar Cobro de Cita"
      >
        {cobroModal && (
          <form onSubmit={handleCobro} className="space-y-5">

            {/* Appointment summary */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <p className="font-black text-white uppercase tracking-wide">{cobroModal.client_name}</p>
                {cobroModal.is_online_booking && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 font-black uppercase">Online</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p className="text-gray-500 font-bold flex items-center gap-1.5">
                  <Scissors className="w-3 h-3 text-purple-400" />
                  {cobroModal.service_name}
                </p>
                <p className="text-gray-500 font-bold flex items-center gap-1.5">
                  <User className="w-3 h-3 text-purple-400" />
                  {cobroModal.barber_name}
                </p>
                <p className="text-gray-500 font-bold flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-purple-400" />
                  {format(parseISO(cobroModal.appointment_datetime), "d MMM · hh:mm a", { locale: es })}
                </p>
                {cobroModal.client_phone && (
                  <p className="text-gray-500 font-bold flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> {cobroModal.client_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Warning: barber must have daily active */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-xs font-bold uppercase tracking-wide">
                El barbero <span className="text-white">{cobroModal.barber_name}</span> debe tener el turno abierto hoy (entrada marcada en Equipo). Si la cita es futura, el cobro se registra con la hora actual.
              </p>
            </div>

            {/* Price charged */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-black text-gray-400 tracking-wider">
                Precio Cobrado *
              </label>
              <input
                type="number"
                required
                min="0"
                step="100"
                className="input-glass text-emerald-400 text-xl font-black"
                placeholder="Ej. 25000"
                value={cobroForm.price_charged}
                onChange={e => setCobroForm({ ...cobroForm, price_charged: e.target.value })}
                autoFocus
              />
              <p className="text-[11px] text-gray-600">Precio del catálogo: puedes cobrarlo diferente si hay descuento o combo.</p>
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-black text-gray-400 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Método de Pago *
              </label>
              <select
                required
                className="input-glass"
                value={cobroForm.payment_method}
                onChange={e => setCobroForm({ ...cobroForm, payment_method: e.target.value })}
              >
                <option value="">Seleccione método de pago...</option>
                {paymentMethods?.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-black text-gray-400 tracking-wider">Notas (opcional)</label>
              <input
                type="text"
                className="input-glass"
                placeholder="Observaciones del servicio..."
                value={cobroForm.notes}
                onChange={e => setCobroForm({ ...cobroForm, notes: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={registrarCobro.isLoading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.8)] transition-all flex items-center justify-center gap-2"
            >
              <DollarSign className="w-5 h-5" />
              {registrarCobro.isLoading ? 'Registrando...' : 'Registrar Cobro en Caja'}
            </button>
          </form>
        )}
      </Modal>

    </div>
  );
};

export default AppointmentsList;
