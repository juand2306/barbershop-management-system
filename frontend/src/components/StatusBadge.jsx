import { Clock, Check, CheckCircle, AlertCircle, XCircle, Ban } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const cfg = {
    // Appointment statuses
    pendiente:           { label: 'Pendiente',    icon: Clock,        cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    confirmada:          { label: 'Confirmada',   icon: CheckCircle,  cls: 'text-cyan-400   bg-cyan-400/10   border-cyan-400/20'   },
    completada:          { label: 'Completada',   icon: Check,        cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    no_asistio:          { label: 'No asistió',   icon: XCircle,      cls: 'text-red-400   bg-red-400/10   border-red-400/20'    },
    cancelada:           { label: 'Cancelada',    icon: Ban,          cls: 'text-gray-500  bg-gray-500/10  border-gray-500/20'   },
    // Service record / report statuses
    completado:          { label: 'Completado',   icon: Check,        cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    confirmado:          { label: 'Confirmado',   icon: CheckCircle,  cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    cancelado:           { label: 'Cancelado',    icon: Ban,          cls: 'text-gray-500  bg-gray-500/10  border-gray-500/20'   },
    borrador:            { label: 'Borrador',     icon: Clock,        cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    guardado:            { label: 'Guardado',     icon: CheckCircle,  cls: 'text-cyan-400  bg-cyan-400/10  border-cyan-400/20'  },
    // Advance / payment statuses
    pagado:              { label: 'Pagado',       icon: Check,        cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    parcialmente_pagado: { label: 'Parcial',      icon: AlertCircle,  cls: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  }[status] || { label: status, icon: AlertCircle, cls: 'text-gray-400 bg-white/5 border-white/10' };
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border font-bold ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label.toUpperCase()}
    </span>
  );
};

export default StatusBadge;
