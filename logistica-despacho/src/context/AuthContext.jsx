import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // CORRECCIÓN PRO: Inicializamos el estado directamente del localStorage
  // Esto evita que el usuario sea 'null' un instante y te saque al login al dar F5
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('userData');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Mantenemos este useEffect como respaldo para sincronizar cambios
  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser && !user) {
      setUser(JSON.parse(storedUser));
    }
  }, [user]);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  // 👇 MODIFICADO: Ahora es asíncrono y le avisa al backend 👇
  const logout = async () => {
    try {
      // 1. Recuperamos los datos del usuario para extraer el token ANTES de borrarlo
      const storedUserStr = localStorage.getItem('userData');
      
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        const token = storedUser.token; // Sacamos el token del objeto
        
        if (token) {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          
          // 2. Le avisamos al backend que limpie el 'session_token' en la base de datos
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
      console.error("Error al liberar la sesión en el servidor:", error);
    } finally {
      // 3. Limpiamos el frontend SIN IMPORTAR si el backend falló o fue exitoso
      setUser(null);
      localStorage.removeItem('userData');
      
      // Usamos replace para que no puedan volver atrás con el botón del navegador
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