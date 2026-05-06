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
