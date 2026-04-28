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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userData');
    // Usamos replace para que no puedan volver atrás con el botón del navegador
    window.location.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);