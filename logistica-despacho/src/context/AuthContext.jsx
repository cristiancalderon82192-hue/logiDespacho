import React, { createContext, useState, useContext, useEffect } from 'react';
import { socket } from '../utils/socket'; 

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = sessionStorage.getItem('userData');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // 👇 AQUÍ ESTÁ LA MAGIA: Forzamos la conexión si está dormida
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

  useEffect(() => {
    const storedUser = sessionStorage.getItem('userData');
    if (storedUser && !user) {
      setUser(JSON.parse(storedUser));
    }
  }, [user]);

  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    // Al iniciar sesión, aseguramos conexión y registramos
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('registrar_usuario', { 
      id: userData.id || userData.id_usuario, 
      email: userData.email, 
      role: userData.role 
    });
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
      // Desconectamos manualmente el socket al cerrar sesión normal
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