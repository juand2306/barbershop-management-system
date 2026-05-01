import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data) {
      // Si DRF manda un diccionario de validaciones (ej. {"name": ["Obligatorio"]})
      // lo mapeamos a 'detail' para que extractApiError lo muestre correctamente.
      if (!error.response.data.detail && typeof error.response.data === 'object' && !Array.isArray(error.response.data)) {
        const firstKey = Object.keys(error.response.data)[0];
        if (firstKey) {
          const val = error.response.data[firstKey];
          error.response.data.detail = `${firstKey.toUpperCase()}: ${Array.isArray(val) ? val[0] : val}`;
        }
      }
    }

    // Token expirado a mitad de sesión: limpiar storage y redirigir a login
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
