import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// --- IMPORTACIÓN DE PÁGINAS ---
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DashboardLider from './pages/DashboardLider';
import PedidosLider from './pages/PedidosLider';
import PedidosAdmin from './pages/PedidosAdmin';
import RegisterUser from './pages/RegisterUser';
import WhatsappConfig from './pages/WhatsappConfig';
import ComprobantePublico from './pages/ComprobantePublico';
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
import ReporteLeadTime from './pages/ReporteLeadTime';
import ReporteMovimientos from './pages/ReporteMovimientos'; 

import UbicacionFlota from './pages/UbicacionFlota';
import TestDesempeno from './pages/TestDesempeno';

import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar'; 
import RoleSelector from './components/RoleSelector';
import DashboardLogistica from './pages/DashboardLogistica';
import AsignacionLogistica from './pages/AsignacionLogistica';
import ReporteParciales from './pages/ReporteParciales'; 
import DashboardConductor from './pages/DashboardConductor'; 

// importacion del modulo de bodeguero
import DashboardBodega from './pages/DashboardBodega';
import PendientesBodega from './pages/PendientesBodega';
import EntregadosBodega from './pages/EntregadosBodega';
import ReporteBodegaParciales from './pages/ReporteBodegaParciales';
import ChatAssistant from './components/ChatAssistant';
import GlobalLoader from './components/GlobalLoader';

// REDIRECT INTELIGENTE
const RootRedirect = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  const rol = String(user.role).toLowerCase().trim();
  const rolNombre = user.rol_nombre ? user.rol_nombre.toLowerCase() : '';
  
  if (rolNombre === 'super_admin' || rol === '6') {
    return (
      <MainLayout>
        <div className="flex-1 bg-slate-50 min-h-screen"></div>
      </MainLayout>
    );
  }

  if (rol === 'admin' || rol === '1') return <Navigate to="/admin-home" replace />;
  if (rol === 'logistica' || rol === '3') return <Navigate to="/dashboard-logistica" replace />;
  if (rol === 'conductor' || rol === '4') return <Navigate to="/conductor-home" replace />;
  if (rol === 'bodeguero' || rol === '5') return <Navigate to="/bodega-dashboard" replace />;

  return <Navigate to="/dashboard-lider" replace />;
};

const MainLayout = ({ children }) => {
  const { user } = useAuth();

  const isSuperAdminSelecting = user?.realRole === 'super_admin' && user?.rol_nombre === 'super_admin';

  return (
    <div className="flex bg-slate-50 min-h-screen w-full relative">
      {isSuperAdminSelecting && <RoleSelector />}
      
      <Sidebar userRole={user?.role} />
      
      <main className="flex-1 w-full lg:pl-64 p-4 md:p-8 transition-all duration-300 overflow-x-hidden">
        {children}
      </main>
      
      <ChatAssistant />
      <GlobalLoader />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          
          {/* RUTA PÚBLICA PARA COMPROBANTE DE ENTREGA WHATSAPP */}
          <Route path="/comprobante/:id_factura" element={<ComprobantePublico />} />

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
          <Route path="/test-desempeno" element={<ProtectedRoute allowedRoles={['admin', '1', 1]}><MainLayout><TestDesempeno /></MainLayout></ProtectedRoute>} />
          <Route path="/whatsapp-config" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'Especial', '6', 6, 'super_admin']}><MainLayout><WhatsappConfig /></MainLayout></ProtectedRoute>} />

          {/* RUTAS DE OPERACIONES (LOGÍSTICA Y MAPAS) */}
          <Route path="/dashboard-logistica" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><DashboardLogistica /></MainLayout></ProtectedRoute>} />
          <Route path="/logistica-asignacion" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><AsignacionLogistica /></MainLayout></ProtectedRoute>} />
          <Route path="/logistica-parciales" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><ReporteParciales /></MainLayout></ProtectedRoute>} />
          
          {/* 👇 NUEVA RUTA PARA EL MAPA (Solo Admin y Logística) 👇 */}
          <Route path="/ubicacion-vivo" element={<ProtectedRoute allowedRoles={['logistica', '3', 3, 'admin', '1', 1]}><MainLayout><UbicacionFlota /></MainLayout></ProtectedRoute>} />

          {/* RUTAS DE REPORTES */}
          <Route path="/reportes/productividad" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteProductividad /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/financiero" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteFinanciero /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/efectividad" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteEfectividad /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/flota" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteFlota /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/perfectos" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReportePerfectos /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/leadtime" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteLeadTime /></MainLayout></ProtectedRoute>} />
          <Route path="/reportes/movimientos" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3]}><MainLayout><ReporteMovimientos /></MainLayout></ProtectedRoute>} />

          {/* RUTAS DEL LÍDER DE SALA */}
          <Route path="/dashboard-lider" element={<ProtectedRoute allowedRoles={['lider_sala', '2', 2]}><MainLayout><DashboardLider /></MainLayout></ProtectedRoute>} />
          <Route path="/pedidos-lider" element={<ProtectedRoute allowedRoles={['lider_sala', '2', 2, 'logistica', '3', 3]}><MainLayout><PedidosLider /></MainLayout></ProtectedRoute>} />
          
          {/* RUTAS DEL CONDUCTOR */}
          <Route path="/conductor-home" element={<ProtectedRoute allowedRoles={['conductor', '4', 4]}><DashboardConductor /></ProtectedRoute>} />
          
          {/* MÓDULO BODEGA */}
          <Route path="/bodega-dashboard" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3, 'lider_sala', '2', 2, 'bodeguero', '5', 5]}><MainLayout><DashboardBodega /></MainLayout></ProtectedRoute>} />
          <Route path="/bodega-pendientes" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3, 'lider_sala', '2', 2, 'bodeguero', '5', 5]}><MainLayout><PendientesBodega /></MainLayout></ProtectedRoute>} />
          <Route path="/bodega-entregados" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3, 'lider_sala', '2', 2, 'bodeguero', '5', 5]}><MainLayout><EntregadosBodega /></MainLayout></ProtectedRoute>} />
          <Route path="/bodega-reporte-parciales" element={<ProtectedRoute allowedRoles={['admin', '1', 1, 'logistica', '3', 3, 'bodeguero', '5', 5]}><MainLayout><ReporteBodegaParciales /></MainLayout></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}