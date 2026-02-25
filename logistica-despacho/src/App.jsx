import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// --- IMPORTACIÓN DE PÁGINAS ---
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DashboardLider from './pages/DashboardLider';
import PedidosLider from './pages/PedidosLider';
import PedidosAdmin from './pages/PedidosAdmin';
import RegisterUser from './pages/RegisterUser';
import Bodegas from './pages/Bodegas';
import Clientes from './pages/Clientes';
import Zonas from './pages/Zonas';       
import Destinos from './pages/Destinos'; 
import Flota from './pages/Flota';
import TiposDocumento from './pages/TiposDocumentos'; 

import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar'; 
import DashboardLogistica from './pages/DashboardLogistica';
import AsignacionLogistica from './pages/AsignacionLogistica';

// 1. REDIRECT INTELIGENTE MEJORADO (Convierte todo a texto para que no falle)
const RootRedirect = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Forzamos que el rol sea un texto para evitar el error del número 3
  const rol = String(user.role).toLowerCase().trim();
  
  if (rol === 'admin' || rol === '1') return <Navigate to="/admin-home" replace />;
  if (rol === 'logistica' || rol === '3') return <Navigate to="/dashboard-logistica" replace />;
  
  // Por defecto (Líder de Sala)
  return <Navigate to="/dashboard-lider" replace />;
};

// --- LAYOUT CON SIDEBAR ---
const MainLayout = ({ children, role }) => {
  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar userRole={role} />
      <main className="ml-64 w-full p-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* =======================================================
              RUTAS DEL ADMINISTRADOR (Roles: 'admin', '1', 1)
             ======================================================= */}
          <Route path="/admin-home" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout role="admin"><AdminDashboard /></MainLayout></ProtectedRoute>} />
          <Route path="/pedidos-admin" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout role="admin"><PedidosAdmin /></MainLayout></ProtectedRoute>} />
          <Route path="/flota" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout role="admin"><Flota /></MainLayout></ProtectedRoute>} />
          <Route path="/zonas" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout role="admin"><Zonas /></MainLayout></ProtectedRoute>} />
          <Route path="/destinos" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout role="admin"><Destinos /></MainLayout></ProtectedRoute>} />
          <Route path="/tipos-documento" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout role="admin"><TiposDocumento /></MainLayout></ProtectedRoute>} />
          <Route path="/usuarios/nuevo" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><RegisterUser /></ProtectedRoute>} />
          <Route path="/bodegas" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout role="admin"><Bodegas /></MainLayout></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout role="admin"><Clientes /></MainLayout></ProtectedRoute>} />

          {/* =======================================================
              RUTAS DEL LÍDER DE SALA (Roles: 'lider_sala', '2', 2)
             ======================================================= */}
          <Route path="/dashboard-lider" element={<ProtectedRoute allowedRoles={['lider_sala', '2', 2]}><MainLayout role="lider_sala"><DashboardLider /></MainLayout></ProtectedRoute>} />
          <Route path="/pedidos-lider" element={<ProtectedRoute allowedRoles={['lider_sala', '2', 2]}><MainLayout role="lider_sala"><PedidosLider /></MainLayout></ProtectedRoute>} />
          
          {/* =======================================================
              RUTAS DE LOGÍSTICA (Roles: 'logistica', '3', 3, y admin)
             ======================================================= */}
          <Route path="/dashboard-logistica" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout role="logistica"><DashboardLogistica /></MainLayout></ProtectedRoute>} />
          <Route path="/logistica-asignacion" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout role="logistica"><AsignacionLogistica /></MainLayout></ProtectedRoute>} />
          
          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}