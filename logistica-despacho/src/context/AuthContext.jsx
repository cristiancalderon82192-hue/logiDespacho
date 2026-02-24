import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // 1. Al cargar la página, buscamos si hay sesión guardada
  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // 2. Función LOGIN (Simulada o Real)
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData)); // Guardamos sesión
  };

  // 3. Función LOGOUT (LA QUE FALTABA)
  const logout = () => {
    setUser(null); // Borramos usuario de la memoria
    localStorage.removeItem('userData'); // Borramos usuario del navegador
    window.location.href = '/'; // Forzamos la recarga hacia el Login
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);