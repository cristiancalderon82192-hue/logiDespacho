import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // 1. Si no hay usuario logueado (ni cargando), mandar al Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 👇 NUEVO: Si el usuario guardado en memoria está inactivo, lo sacamos
  const usuarioDatos = user.user || user.usuario || user;
  if (String(usuarioDatos.estado) === '0' || usuarioDatos.estado === false) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si hay usuario, pero su rol NO está en la lista de permitidos
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Lo mandamos al inicio o mostramos alerta (aquí redirigimos al home)
    return <Navigate to="/" replace />;
  }

  // 3. Si todo está bien, mostrar la página solicitada
  return children;
};

export default ProtectedRoute;