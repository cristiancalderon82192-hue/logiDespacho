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
// 👇 1. IMPORTAMOS LA NUEVA VISTA AQUÍ
import TiposDocumento from './pages/TiposDocumentos'; 

// Importamos componentes auxiliares
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar'; 

// --- REDIRECCIÓN INTELIGENTE ---
const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin-home" replace />;
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
          
          {/* 1. Ruta Raíz y Login */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* =======================================================
              RUTAS DEL ADMINISTRADOR (Role: 'admin')
             ======================================================= */}
          
          {/* Dashboard Admin */}
          <Route 
            path="/admin-home" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout role="admin">
                  <AdminDashboard />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          {/* Historial de Pedidos Admin */}
          <Route 
            path="/pedidos-admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout role="admin">
                  <PedidosAdmin />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/flota" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout role="admin">
                  <Flota />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          {/* --- NUEVA SECCIÓN: CONFIGURACIÓN (ZONAS Y DESTINOS) --- */}
          
          {/* Gestión de Zonas */}
          <Route 
            path="/zonas" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout role="admin">
                  <Zonas />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          {/* Gestión de Destinos */}
          <Route 
            path="/destinos" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout role="admin">
                  <Destinos />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          {/* 👇 2. NUEVA RUTA: TIPOS DE DOCUMENTO */}
          <Route 
            path="/tipos-documento" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout role="admin">
                  <TiposDocumento />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          {/* --- FIN SECCIÓN CONFIGURACIÓN --- */}


          {/* Gestión de Usuarios */}
          <Route 
            path="/usuarios/nuevo" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RegisterUser />
              </ProtectedRoute>
            } 
          />

          {/* Gestión de Bodegas */}
          <Route 
            path="/bodegas" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
               <MainLayout role="admin">
                 <Bodegas />
               </MainLayout>
              </ProtectedRoute>
            } 
          />

          {/* Gestión de Clientes */}
          <Route 
            path="/clientes" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout role="admin">
                  <Clientes />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          {/* =======================================================
              RUTAS DEL LÍDER (Role: 'lider_sala')
             ======================================================= */}

          {/* Dashboard Líder */}
          <Route 
            path="/dashboard-lider" 
            element={
              <ProtectedRoute allowedRoles={['lider_sala']}>
                <MainLayout role="lider_sala">
                  <DashboardLider />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          {/* Formulario de Pedidos Líder */}
          <Route 
            path="/pedidos-lider" 
            element={
              <ProtectedRoute allowedRoles={['lider_sala']}>
                <MainLayout role="lider_sala">
                  <PedidosLider />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}