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
import ReporteParciales from './pages/ReporteParciales'; 
import DashboardConductor from './pages/DashboardConductor'; 

// 1. REDIRECT INTELIGENTE
const RootRedirect = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  const rol = String(user.role).toLowerCase().trim();
  
  if (rol === 'admin' || rol === '1') return <Navigate to="/admin-home" replace />;
  if (rol === 'logistica' || rol === '3') return <Navigate to="/dashboard-logistica" replace />;
  if (rol === 'conductor' || rol === '4') return <Navigate to="/conductor-home" replace />;
  
  return <Navigate to="/dashboard-lider" replace />;
};

// --- LAYOUT RESPONSIVO CORREGIDO ---
const MainLayout = ({ children }) => {
  const { user } = useAuth(); // Obtenemos el usuario para pasar el rol al Sidebar

  return (
    <div className="flex bg-slate-50 min-h-screen w-full">
      {/* El Sidebar ahora recibe el rol real del usuario logueado */}
      <Sidebar userRole={user?.role} />
      
      {/* 👇 SOLUCIÓN AL PROBLEMA VISUAL 👇
         - lg:pl-64: Solo pone el margen en pantallas grandes (PC).
         - w-full: Asegura que ocupe todo el ancho en celulares.
         - p-4 md:p-8: Relleno más pequeño en celular para que no se vea apretado.
      */}
      <main className="flex-1 w-full lg:pl-64 p-4 md:p-8 transition-all duration-300 overflow-x-hidden">
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

          {/* RUTAS DEL ADMINISTRADOR */}
          <Route path="/admin-home" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><AdminDashboard /></MainLayout></ProtectedRoute>} />
          <Route path="/pedidos-admin" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><PedidosAdmin /></MainLayout></ProtectedRoute>} />
          <Route path="/flota" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><Flota /></MainLayout></ProtectedRoute>} />
          <Route path="/zonas" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><Zonas /></MainLayout></ProtectedRoute>} />
          <Route path="/destinos" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><Destinos /></MainLayout></ProtectedRoute>} />
          <Route path="/tipos-documento" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><TiposDocumento /></MainLayout></ProtectedRoute>} />
          <Route path="/usuarios/nuevo" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><RegisterUser /></MainLayout></ProtectedRoute>} />
          <Route path="/bodegas" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><Bodegas /></MainLayout></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><Clientes /></MainLayout></ProtectedRoute>} />

          {/* RUTAS DEL LÍDER DE SALA */}
          <Route path="/dashboard-lider" element={<ProtectedRoute allowedRoles={['lider_sala', '2', 2]}><MainLayout><DashboardLider /></MainLayout></ProtectedRoute>} />
          <Route path="/pedidos-lider" element={<ProtectedRoute allowedRoles={['lider_sala', '2', 2]}><MainLayout><PedidosLider /></MainLayout></ProtectedRoute>} />
          
          {/* RUTAS DE LOGÍSTICA */}
          <Route path="/dashboard-logistica" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><DashboardLogistica /></MainLayout></ProtectedRoute>} />
          <Route path="/logistica-asignacion" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><AsignacionLogistica /></MainLayout></ProtectedRoute>} />
          <Route path="/logistica-parciales" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><ReporteParciales /></MainLayout></ProtectedRoute>} />

          {/* RUTAS DEL CONDUCTOR (Sin Sidebar) */}
          <Route path="/conductor-home" element={
            <ProtectedRoute allowedRoles={['conductor', '4', 4]}>
              <DashboardConductor />
            </ProtectedRoute>
          } />

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}