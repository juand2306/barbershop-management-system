import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha ISO (YYYY-MM-DD o datetime string) como "12 may 2026".
 * Centralizado aquí para evitar duplicación en History.jsx y otros módulos.
 */
export const fmtDate = (str) => {
  if (!str) return '—';
  try { return format(parseISO(str), 'd MMM yyyy', { locale: es }); } catch { return str; }
};

/**
 * Formatea un datetime ISO como "12 may 2026 14:30".
 */
export const fmtDateTime = (str) => {
  if (!str) return '—';
  try { return format(parseISO(str), 'd MMM yyyy HH:mm', { locale: es }); } catch { return str; }
};

export const extractApiError = (err) => {
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

export const getLocalDateStr = () => new Intl.DateTimeFormat('en-CA').format(new Date());

export const fmt = (val) => {
  if (val === null || val === undefined || val === '') return '$0';
  // Math.round() elimina artefactos de punto flotante (ej: 71999.9999 → 72000)
  const n = Math.round(Number(val));
  if (isNaN(n)) return '$0';
  return `$${n.toLocaleString('es-CO')}`;
};

export const safeN = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
