import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/auth/Login';
import DashboardLayout from './layouts/DashboardLayout';
import HomeDashboard from './pages/dashboard/Home';
import CashRegister from './pages/dashboard/CashRegister';
import AppointmentsList from './pages/dashboard/AppointmentsList';
import ServicesCatalog from './pages/dashboard/ServicesCatalog';
import ProductsCatalog from './pages/dashboard/ProductsCatalog';
import Team from './pages/dashboard/Team';
import Settings from './pages/dashboard/Settings';
const PlaceholderPage = ({ title }) => (
  <div className="flex items-center justify-center h-full">
    <div className="glass-panel p-10 text-center animate-slide-up">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent mb-2">
        Módulo {title}
      </h2>
      <p className="text-gray-400">Esta sección está en desarrollo.</p>
    </div>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes inside Layout */}
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<HomeDashboard />} />
            <Route path="/cash" element={<CashRegister />} />
            <Route path="/appointments" element={<AppointmentsList />} />
            <Route path="/services" element={<ServicesCatalog />} />
            <Route path="/products" element={<ProductsCatalog />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      
      {/* Sistema de notificaciones elegante, estilo dark */}
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        theme="dark"
        toastClassName="glass-card !border-white/10 !shadow-xl !backdrop-blur-xl"
      />
    </AuthProvider>
  );
};

export default App;
