import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/users/me/');
      setUser(response.data);
    } catch (error) {
      console.error("Session expired or invalid token:", error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/token/', { username, password });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
      
      // Fetch user profile
      const userRes = await api.get('/users/me/');
      setUser(userRes.data);
      
      toast.success(`Bienvenido de vuelta, ${userRes.data.first_name || userRes.data.username}!`);
      return true;
    } catch (error) {
       toast.error(error.response?.data?.detail || 'Credenciales incorrectas. Inténtalo de nuevo.');
       return false;
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        await api.post('/auth/token/blacklist/', { refresh });
      } catch {
        // blacklist may fail if token already expired — proceed regardless
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.info('Sesión cerrada');
  };

  // Refresca el objeto user desde el servidor (útil tras cambios de logo/perfil)
  const refreshUser = async () => {
    try {
      const response = await api.get('/users/me/');
      setUser(response.data);
    } catch {
      // silent — si falla, el user anterior sigue siendo válido
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
