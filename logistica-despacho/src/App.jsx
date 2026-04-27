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

// IMPORTACIONES DE REPORTES
import ReporteProductividad from './pages/ReporteProductividad';
import ReporteFinanciero from './pages/ReporteFinanciero';
import ReporteEfectividad from './pages/ReporteEfectividad';
import ReporteFlota from './pages/ReporteFlota';
import ReportePerfectos from './pages/ReportePerfectos';
import ReporteLeadTime from './pages/ReporteLeadTime'; // 👇 NUEVA IMPORTACIÓN DE LEAD TIME 👇

import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar'; 
import DashboardLogistica from './pages/DashboardLogistica';
import AsignacionLogistica from './pages/AsignacionLogistica';
import ReporteParciales from './pages/ReporteParciales'; 
import DashboardConductor from './pages/DashboardConductor'; 

// REDIRECT INTELIGENTE
const RootRedirect = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  const rol = String(user.role).toLowerCase().trim();
  
  if (rol === 'admin' || rol === '1') return <Navigate to="/admin-home" replace />;
  if (rol === 'logistica' || rol === '3') return <Navigate to="/dashboard-logistica" replace />;
  if (rol === 'conductor' || rol === '4') return <Navigate to="/conductor-home" replace />;
  
  return <Navigate to="/dashboard-lider" replace />;
};

const MainLayout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="flex bg-slate-50 min-h-screen w-full">
      <Sidebar userRole={user?.role} />
      
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

          {/* RUTAS DE REPORTES */}
          <Route path="/reportes/productividad" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteProductividad /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/financiero" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteFinanciero /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/efectividad" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteEfectividad /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/flota" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteFlota /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/perfectos" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReportePerfectos /></MainLayout></ProtectedRoute>} />
          
          {/* 👇 NUEVA RUTA DE LEAD TIME 👇 */}
          <Route path="/reportes/leadtime" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteLeadTime /></MainLayout></ProtectedRoute>} />
          
          {/* RUTAS DEL LÍDER DE SALA */}
          <Route path="/dashboard-lider" element={<ProtectedRoute allowedRoles={['lider_sala', '2', 2]}><MainLayout><DashboardLider /></MainLayout></ProtectedRoute>} />
          <Route path="/pedidos-lider" element={<ProtectedRoute allowedRoles={['lider_sala', '2', 2, 'logistica', '3', 3]}><MainLayout><PedidosLider /></MainLayout></ProtectedRoute>} />
          
          {/* RUTAS DE LOGÍSTICA */}
          <Route path="/dashboard-logistica" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><DashboardLogistica /></MainLayout></ProtectedRoute>} />
          <Route path="/logistica-asignacion" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><AsignacionLogistica /></MainLayout></ProtectedRoute>} />
          <Route path="/logistica-parciales" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><ReporteParciales /></MainLayout></ProtectedRoute>} />

          {/* RUTAS DEL CONDUCTOR */}
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