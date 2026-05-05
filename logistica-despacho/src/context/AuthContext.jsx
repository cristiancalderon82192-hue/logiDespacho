import React, { createContext, useState, useContext, useEffect } from 'react';
import { socket } from '../utils/socket'; 

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = sessionStorage.getItem('userData');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // 👇 1. EL DISPARO DE EMERGENCIA CUANDO CIERRAN LA PESTAÑA O EL NAVEGADOR
  useEffect(() => {
    const handleTabClose = () => {
      const storedUserStr = sessionStorage.getItem('userData');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        const token = storedUser.token;
        if (token) {
          const apiUrl = import.meta.env.VITE_API_URL || 'https://logidespacho-1.onrender.com';
          
          // El secreto es keepalive: true. Esto fuerza al navegador a enviar 
          // la petición a Render incluso si la pestaña ya se cerró.
          fetch(`${apiUrl}/api/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            keepalive: true 
          }).catch(() => {}); // Ignoramos errores porque la vista ya no existe
        }
      }
    };

    // Estos dos eventos detectan cuando el usuario le da a la "X" de la pestaña
    window.addEventListener('beforeunload', handleTabClose);
    window.addEventListener('pagehide', handleTabClose);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      window.removeEventListener('pagehide', handleTabClose);
    };
  }, []);

  // 2. Registro en el Socket
  useEffect(() => {
    if (user) {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('registrar_usuario', { 
        id: user.id || user.id_usuario, 
        email: user.email, 
        role: user.role 
      });
    }
  }, [user]);

  // 3. Recuperación de sesión
  useEffect(() => {
    const storedUser = sessionStorage.getItem('userData');
    if (storedUser && !user) {
      setUser(JSON.parse(storedUser));
    }
  }, [user]);

  // 4. Función de Login
  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('registrar_usuario', { 
      id: userData.id || userData.id_usuario, 
      email: userData.email, 
      role: userData.role 
    });
  };

  // 5. Función de Logout manual (Botón de cerrar sesión)
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
      if (socket.connected) {
        socket.disconnect();
      }
      window.location.replace('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);