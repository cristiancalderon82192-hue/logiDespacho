import React, { useState } from 'react';
import { X, Lock, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Include authorization header if your backend requires it for this endpoint
          'Authorization': `Bearer ${user?.token || ''}`
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto close after 2 seconds on success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      ></div>
      
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Lock size={24} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Seguridad</h2>
              <p className="text-sm text-slate-300">Cambiar contraseña de acceso</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¡Contraseña Actualizada!</h3>
              <p className="text-slate-500">Tu contraseña se ha cambiado correctamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-start gap-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Contraseña Actual</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key size={18} />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                    placeholder="Ingresa tu contraseña actual"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Nueva Contraseña</label>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CheckCircle size={18} />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 transition-all outline-none ${
                      confirmPassword && newPassword !== confirmPassword 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/20'
                    }`}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="flex-1 px-4 py-3 text-white bg-slate-900 hover:bg-slate-800 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
