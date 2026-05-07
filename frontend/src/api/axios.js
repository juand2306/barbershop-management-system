import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: adjuntar access token ───────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Token refresh state ──────────────────────────────────────────────────────
// Evita que múltiples peticiones 401 simultáneas disparen múltiples refreshes.
let isRefreshing = false;
let failedQueue = [];   // peticiones en espera mientras se refresca el token

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else       prom.resolve(token);
  });
  failedQueue = [];
};

const clearSessionAndRedirect = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  delete api.defaults.headers.common['Authorization'];
  window.location.href = '/login';
};

// ─── Response interceptor: mapeo de errores + auto-refresh ───────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── 1. Auto-refresh al recibir 401 ────────────────────────────────────────
    // Se intenta renovar el access token usando el refresh token guardado en
    // localStorage. Si el refresh también está vencido → login.
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Ya hay un refresh en curso: encolar esta petición y esperar
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccess  = data.access;
        const newRefresh = data.refresh; // SimpleJWT con ROTATE_REFRESH_TOKENS

        localStorage.setItem('access_token', newAccess);
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh);

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
        originalRequest.headers['Authorization']     = `Bearer ${newAccess}`;

        processQueue(null, newAccess);
        return api(originalRequest); // reintentar la petición original
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 2. Mapear errores de validación de DRF a un campo 'detail' legible ────
    if (error.response?.data) {
      const data = error.response.data;
      if (
        !data.detail &&
        typeof data === 'object' &&
        !Array.isArray(data)
      ) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          error.response.data.detail = `${firstKey.toUpperCase()}: ${
            Array.isArray(val) ? val[0] : val
          }`;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
