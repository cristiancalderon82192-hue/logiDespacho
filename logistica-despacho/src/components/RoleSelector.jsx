import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, UserCog, Package, Truck, Activity, Briefcase, Key, Lock, Check } from 'lucide-react';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';

const rolesDisponibles = [
  { id: 'admin', nombre: 'Admin', icon: <ShieldAlert size={24}/>, color: 'bg-red-50 text-red-600 border-red-200' },
  { id: 'logistica', nombre: 'Logística', icon: <Activity size={24}/>, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { id: 'lider_sala', nombre: 'Líder / Comercial', icon: <Briefcase size={24}/>, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 'bodeguero', nombre: 'Bodeguero', icon: <Package size={24}/>, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { id: 'conductor', nombre: 'Conductor', icon: <Truck size={24}/>, color: 'bg-orange-50 text-orange-600 border-orange-200' }
];

export default function RoleSelector() {
  const { switchRole, user } = useAuth();
  const navigate = useNavigate();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelect = (role) => {
    switchRole(role.id, role.nombre);
    // Redirigir al home general para que el RootRedirect lo mande a su respectivo dashboard
    navigate('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !currentPassword) return;
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://logidespacho-1.onrender.com';
      const res = await fetch(`${apiUrl}/api/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        mostrarExito("Contraseña actualizada exitosamente");
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        mostrarError(data.error || "Error al actualizar la contraseña");
      }
    } catch (error) {
      mostrarError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:items-center">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 sm:p-8 relative mt-4 sm:mt-8 md:mt-0 mb-4 sm:mb-8 md:mb-0">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600"></div>
          
          <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600 shadow-inner">
            <UserCog size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Modo Auditor (Super Admin)</h2>
          <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
            Tienes privilegios totales. Selecciona con qué perfil deseas navegar la plataforma en esta sesión para verificar sus funciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesDisponibles.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:-translate-y-1 hover:shadow-lg ${r.color} bg-white hover:bg-slate-50`}
            >
              <div className={`p-3 rounded-full mb-3 shadow-sm ${r.color.replace('border-', 'bg-').split(' ')[0]} bg-opacity-20`}>
                {r.icon}
              </div>
              <span className="font-bold text-slate-800">{r.nombre}</span>
              <span className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Ver como {r.nombre}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 border-t pt-6 text-center">
          {!showPasswordForm ? (
            <button 
              onClick={() => setShowPasswordForm(true)}
              className="text-slate-500 hover:text-slate-800 text-sm font-semibold flex items-center justify-center gap-2 mx-auto transition-colors"
            >
              <Key size={16} /> Cambiar mi contraseña
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="max-w-xs mx-auto animate-fade-in-up space-y-3">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="password" 
                  required 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Contraseña Actual" 
                  className="w-full pl-9 pr-3 py-2 border rounded-lg bg-slate-50 outline-none focus:border-yellow-500 focus:bg-white text-sm transition-all"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva Contraseña" 
                    className="w-full pl-9 pr-3 py-2 border rounded-lg bg-slate-50 outline-none focus:border-yellow-500 focus:bg-white text-sm transition-all"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-lg flex items-center justify-center disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
              </div>
              <button 
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 underline block mx-auto pt-1"
              >
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
