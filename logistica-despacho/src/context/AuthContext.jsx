import React, { createContext, useState, useContext, useEffect } from 'react';
import { socket } from '../utils/socket'; 
import { AlertTriangle, X } from 'lucide-react'; 

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = sessionStorage.getItem('userData');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [alertaEmergente, setAlertaEmergente] = useState(null);

  // 1. Limpiar token al cerrar pestaña
  useEffect(() => {
    const handleTabClose = () => {
      const storedUserStr = sessionStorage.getItem('userData');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        const token = storedUser.token;
        if (token) {
          const apiUrl = import.meta.env.VITE_API_URL || 'https://logidespacho-1.onrender.com';
          fetch(`${apiUrl}/api/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            keepalive: true 
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleTabClose);
    window.addEventListener('pagehide', handleTabClose);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      window.removeEventListener('pagehide', handleTabClose);
    };
  }, []);

  // 2. REGISTRO DE SOCKET BLINDADO
  useEffect(() => {
    if (user) {
      const registrarUsuario = () => {
        console.log("🔌 Conectado al Socket. Registrando usuario en sala de monitores...");
        socket.emit('registrar_usuario', { 
          id: user.id || user.id_usuario, 
          email: user.email, 
          role: user.role 
        });
      };

      if (socket.connected) {
        registrarUsuario();
      } else {
        socket.connect();
      }

      socket.on('connect', registrarUsuario);

      return () => {
        socket.off('connect', registrarUsuario);
      };
    }
  }, [user]);

  // 👇 3. ESCUCHADOR GLOBAL INFALIBLE (Red y Local) 👇
  useEffect(() => {
    const recibirAlerta = (datos) => {
      console.log("🔔 ALERTA RECIBIDA Y MOSTRADA EN PANTALLA:", datos); 
      setAlertaEmergente(datos);
      
      // Se cierra sola a los 15 segundos
      setTimeout(() => setAlertaEmergente(null), 15000);
    };

    // A) Escucha las alertas que vienen del servidor (de los conductores u otros usuarios)
    socket.on('alerta_novedad', recibirAlerta);

    // B) Escucha las alertas instantáneas que TÚ MISMO generas (sin pasar por internet)
    const escucharAlertaLocal = (e) => recibirAlerta(e.detail);
    window.addEventListener('alerta_local', escucharAlertaLocal);

    return () => {
      socket.off('alerta_novedad', recibirAlerta);
      window.removeEventListener('alerta_local', escucharAlertaLocal);
    };
  }, []);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('userData');
    if (storedUser && !user) {
      setUser(JSON.parse(storedUser));
    }
  }, [user]);

  const login = (userData) => {
    // Si es super_admin, marcamos su rol real
    if (userData.rol_nombre === 'super_admin') {
      userData.realRole = 'super_admin';
    }
    setUser(userData);
    sessionStorage.setItem('userData', JSON.stringify(userData));
    if (!socket.connected) socket.connect();
  };

  const switchRole = (newRoleId, newRoleName) => {
    if (user?.realRole === 'super_admin') {
      const updatedUser = { 
        ...user, 
        role: newRoleId, 
        rol_nombre: newRoleName 
      };
      setUser(updatedUser);
      sessionStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  };

  const logout = async () => {
    try {
      const storedUserStr = sessionStorage.getItem('userData');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        const token = storedUser.token;
        if (token) {
          const apiUrl = import.meta.env.VITE_API_URL || 'https://logidespacho-1.onrender.com';
          await fetch(`${apiUrl}/api/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    } catch (error) {
      console.error("Error procesando el cierre de sesión:", error);
    } finally {
      setUser(null);
      sessionStorage.removeItem('userData');
      if (socket.connected) socket.disconnect();
      window.location.replace('/');
    }
  };

  const rolUsuario = user ? String(user.role).toLowerCase() : '';
  const esConductor = rolUsuario === '4' || rolUsuario === 'conductor';

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole }}>
      {children}
      
      {/* NOTIFICACIÓN FLOTANTE GLOBAL */}
      {alertaEmergente && user && !esConductor && (
        <div className="fixed top-20 right-4 z-[9999] bg-white border-l-4 border-orange-500 rounded-xl shadow-2xl p-4 max-w-sm animate-bounce">
          <div className="flex justify-between items-start gap-3">
            <div className="bg-orange-100 p-2 rounded-full shrink-0">
              <AlertTriangle className="text-orange-600" size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-800 text-sm">¡Alerta de Novedad en Ruta!</h4>
              <p className="text-xs text-slate-600 mt-1">
                El usuario <b>{alertaEmergente.conductor}</b> reportó un estado de <span className="font-bold text-orange-600">{alertaEmergente.estado}</span>.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded p-2 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Factura: {alertaEmergente.factura}</p>
                <p className="text-xs text-slate-700 font-bold">{alertaEmergente.cliente}</p>
                <p className="text-xs text-slate-600 mt-1 italic">"{alertaEmergente.motivo}"</p>
              </div>
            </div>
            <button onClick={() => setAlertaEmergente(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1">
              <X size={14}/>
            </button>
          </div>
        </div>
      )}
      
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);