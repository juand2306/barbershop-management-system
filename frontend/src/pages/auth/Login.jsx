import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Scissors, Lock, User } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(username, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0b]">
        {/* Glow effects specific to login */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="glass-panel w-full max-w-md p-8 md:p-10 relative z-10 animate-slide-up border-white/10 mx-4">
            
            <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-sm flex items-center justify-center mb-6 border-b-4 border-purple-800 shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
                    <Scissors className="text-white w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black tracking-tighter text-white uppercase mt-2">Acceso Restringido</h1>
                <p className="text-purple-300 font-semibold tracking-wide text-xs mt-2 uppercase">Intranet Barber</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Usuario</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <input 
                            type="text" 
                            className="input-glass !pl-11 py-3" 
                            placeholder="admin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Contraseña</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-500" />
                        </div>
                        <input 
                            type="password" 
                            className="input-glass !pl-11 py-3" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="btn btn-primary w-full py-3 text-sm flex justify-center items-center"
                    >
                        {isSubmitting ? (
                            <span className="animate-spin border-2 border-black border-t-transparent rounded-full w-5 h-5 block"></span>
                        ) : (
                            'Acceder al Panel'
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default Login;
