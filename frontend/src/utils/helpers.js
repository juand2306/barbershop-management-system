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
  if (!val && val !== 0) return '$0';
  return `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const safeN = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
