import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ChangePasswordModal from './ChangePasswordModal';
import {
  LayoutDashboard, Package, UserPlus, Truck, LogOut,
  Building2, UsersRound, Map, MapPin, FileStack, AlertCircle, Menu, X,
  DollarSign, BarChart2, CheckCircle, Clock, MessageCircle, Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoEmpresa from '../assets/rodeo.png';
import { socket } from '../utils/socket';
import { PackageOpen, FileCheck, Activity } from 'lucide-react';

const Sidebar = ({ userRole = 'guest' }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeModule, setActiveModule] = useState('general');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [parcialesCount, setParcialesCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizeRole = (role) => {
    const r = String(role);
    if (r === '1' || r === 'admin') return 'admin';
    if (r === '2' || r === 'lider_sala') return 'lider_sala';
    if (r === '3' || r === 'logistica') return 'logistica';
    if (r === '4' || r === 'conductor') return 'conductor';
    if (r === '5' || r === 'bodeguero') return 'bodeguero';
    return 'guest';
  };

  const currentRole = normalizeRole(userRole);

  // =========================================================================
  // 📍 LÓGICA DEL CONTADOR DE PARCIALES (TIEMPO REAL Y AUTO-LIMPIEZA)
  // =========================================================================
  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'logistica') return;

    // 1. Función para consultar el valor EXACTO en la base de datos
    const cargarConteoParciales = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos-parciales`);
        if (res.ok) {
          const data = await res.json();
          setParcialesCount(data.length || 0);
        }
      } catch (error) {
        // Silencioso
      }
    };

    // Carga inicial
    cargarConteoParciales();

    // 2. Auto-sincronización cada 10 segundos (Limpiará el contador automáticamente)
    const interval = setInterval(cargarConteoParciales, 10000);

    // 3. Sumar instantáneamente cuando alguien reporta un problema
    const incrementarContador = () => {
      setParcialesCount(prev => prev + 1);
    };

    // 4. Actualizar instantáneamente cuando alguien resuelve un parcial localmente
    const actualizarContador = () => {
      cargarConteoParciales();
    };

    socket.on('alerta_novedad', incrementarContador);
    window.addEventListener('alerta_local', incrementarContador);
    window.addEventListener('parcial_resuelto', actualizarContador);

    return () => {
      clearInterval(interval);
      socket.off('alerta_novedad', incrementarContador);
      window.removeEventListener('alerta_local', incrementarContador);
      window.removeEventListener('parcial_resuelto', actualizarContador);
    };
  }, [currentRole]);

  // =========================================================================

  const mainItems = [
    { path: currentRole === 'admin' ? '/admin-home' : '/dashboard-lider', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'lider_sala'] },
    { path: '/dashboard-logistica', icon: LayoutDashboard, label: 'Dashboard', roles: ['logistica'] },
    { path: currentRole === 'admin' ? '/pedidos-admin' : '/pedidos-lider', icon: Package, label: 'Pedidos', roles: ['admin', 'lider_sala', 'logistica'] },
    { path: '/logistica-asignacion', icon: Truck, label: 'Asignar Rutas', roles: ['logistica'] },
    { path: '/ubicacion-vivo', icon: Map, label: 'GPS en Vivo', roles: ['admin', 'logistica'] },
    { path: '/clientes', icon: UsersRound, label: 'Clientes', roles: ['admin'] },
    { path: '/flota', icon: Truck, label: 'Flota', roles: ['admin'] },
    { path: '/logistica-parciales', icon: AlertCircle, label: 'Envíos Parciales', roles: ['logistica', 'admin'], badge: parcialesCount },
    { path: '/bodega-dashboard', icon: LayoutDashboard, label: 'Dashboard Bodega', roles: ['bodeguero'] }
  ];

  const bodegaItems = [
    { path: '/bodega-pendientes', icon: PackageOpen, label: 'Material Pendiente', roles: ['admin', 'logistica', 'lider_sala', 'bodeguero'] },
    { path: '/bodega-entregados', icon: FileCheck, label: 'Soportes Entregados', roles: ['admin', 'logistica', 'lider_sala', 'bodeguero'] },
    { path: '/bodega-reporte-parciales', icon: FileStack, label: 'Trazabilidad Parciales', roles: ['admin', 'logistica', 'bodeguero'] }
  ];

  const reportItems = [
    { path: '/reportes/perfectos', icon: CheckCircle, label: 'Pedidos Perfectos', roles: ['admin', 'logistica'] },
    { path: '/reportes/leadtime', icon: Clock, label: 'Análisis Lead Time', roles: ['admin', 'logistica'] },
    { path: '/reportes/productividad', icon: Truck, label: 'Productividad', roles: ['admin', 'logistica'] },
    { path: '/reportes/financiero', icon: DollarSign, label: 'Financiero y Saldos', roles: ['admin', 'logistica'] },
    { path: '/reportes/flota', icon: BarChart2, label: 'Ocupación Flota', roles: ['admin', 'logistica'] },
    { path: '/reportes/movimientos', icon: MapPin, label: 'Movimiento Zonas', roles: ['admin', 'logistica'] }
  ];

  const configItems = [
    { path: '/usuarios/nuevo', icon: UserPlus, label: 'Usuarios', roles: ['admin'] },
    { path: '/bodegas', icon: Building2, label: 'Bodegas', roles: ['admin'] },
    { path: '/zonas', icon: Map, label: 'Zonas', roles: ['admin'] },
    { path: '/destinos', icon: MapPin, label: 'Destinos', roles: ['admin'] },
    { path: '/tipos-documento', icon: FileStack, label: 'Tipos Doc.', roles: ['admin'] },
    { path: '/plantillas-pdf', icon: FileStack, label: 'Plantillas PDF', roles: ['admin'] },
    // { path: '/whatsapp-config', icon: MessageCircle, label: 'WhatsApp Bot', roles: ['admin'] },
    { path: '/test-desempeno', icon: Activity, label: 'Test Desempeño', roles: ['admin'] }
  ];

  const renderLinks = (items, startIndex = 0) => {
    return items.map((item, index) => {
      if (!item.roles.includes(currentRole)) return null;

      const Icon = item.icon;
      const isActive = location.pathname === item.path;

      const animationDelay = `${(startIndex + index) * 0.05}s`;

      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setIsOpen(false)}
          className={`
            relative flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 mb-1 font-medium group overflow-hidden
            ${mounted ? 'animate-slide-right-fade' : 'opacity-0'}
            ${isActive
              ? (activeModule === 'bodega' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 translate-x-1' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1')
              : (activeModule === 'bodega' ? 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-2' : 'text-slate-800 hover:bg-white/40 hover:text-slate-900 hover:translate-x-2')
            }
            ${item.badge > 0 && !isActive ? (activeModule === 'bodega' ? 'bg-red-500/20' : 'bg-red-500/10') : ''} 
          `}
          style={{ animationDelay, animationFillMode: 'forwards' }}
        >
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
          )}

          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          <Icon size={20} className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'} ${item.badge > 0 && !isActive ? 'text-red-600' : ''}`} />

          <span className={`text-sm relative z-10 flex-1 transition-colors ${item.badge > 0 && !isActive ? (activeModule === 'bodega' ? 'text-red-400 font-bold' : 'text-red-900 font-bold') : ''}`}>{item.label}</span>

          {item.badge !== undefined && item.badge > 0 && (
            <div className="relative z-10 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse border border-red-400 min-w-[20px] text-center">
              {item.badge > 99 ? '99+' : item.badge}
            </div>
          )}
        </Link>
      );
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg shadow-lg border border-white/20 active:scale-90 transition-transform ${activeModule === 'bodega' ? 'bg-[#192242] text-white' : 'bg-[#47B3A8] text-slate-900'}`}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[40] backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`
        h-screen w-64 flex flex-col fixed left-0 top-0 z-50 shadow-2xl border-r transition-colors duration-500 ease-in-out
        ${activeModule === 'bodega' ? 'bg-[#192242] border-white/10' : 'bg-[#47B3A8] border-slate-900/5'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        <div className={`p-6 border-b flex flex-col items-center group cursor-pointer transition-colors duration-500 ${activeModule === 'bodega' ? 'border-white/10' : 'border-slate-900/10'}`}>
          <div className="relative">
            <div className="absolute -inset-4 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img
              src={logoEmpresa}
              alt="Logo Empresa"
              className="h-16 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500 relative z-10"
            />
          </div>
          <div className="flex items-center gap-2 mt-4 bg-slate-900 px-4 py-1.5 rounded-full shadow-lg border border-slate-700/50 group-hover:shadow-slate-900/50 transition-shadow">
            <div className={`w-2 h-2 rounded-full animate-pulse ${currentRole === 'admin' ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-orange-400 shadow-[0_0_8px_#fb923c]'}`}></div>
            <p className="text-[10px] text-slate-100 uppercase font-bold tracking-widest">
              {currentRole.replace('_', ' ')}
            </p>
          </div>
          {user?.realRole === 'super_admin' && (
            <div className="mt-2 bg-yellow-400/20 text-yellow-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-yellow-400/30">
              👑 Modo Auditor
            </div>
          )}
          {user?.nombre_completo && (
            <div className="mt-3 text-center">
              <p className={`text-xs font-medium transition-colors ${activeModule === 'bodega' ? 'text-slate-400' : 'text-slate-800'}`}>Bienvenido,</p>
              <p className={`text-sm font-black truncate w-48 mx-auto transition-colors ${activeModule === 'bodega' ? 'text-white' : 'text-slate-900'}`} title={user.nombre_completo}>
                {user.nombre_completo}
              </p>
            </div>
          )}

          {(currentRole === 'admin' || currentRole === 'logistica' || currentRole === 'lider_sala') && (
            <div className="w-full mt-5 px-2 animate-fade-in">
              <select 
                value={activeModule}
                onChange={(e) => setActiveModule(e.target.value)}
                className={`w-full text-xs font-bold rounded-lg px-2 py-2.5 outline-none focus:ring-2 cursor-pointer shadow-inner appearance-none text-center transition-colors duration-500
                  ${activeModule === 'bodega' 
                    ? 'bg-white/10 border border-white/20 text-white focus:ring-white/30' 
                    : 'bg-slate-900/10 border border-slate-900/20 text-slate-900 focus:ring-slate-900/30'
                  }`}
                style={{ textAlignLast: 'center' }}
              >
                <option value="general" className="text-slate-900 bg-white">🚛 LOGISTICA DE DESPACHO</option>
                <option value="bodega" className="text-slate-900 bg-white">📦 MATERIAL PENDIENTE</option>
              </select>
            </div>
          )}
        </div>

        <nav className={`flex-1 p-4 overflow-y-auto pb-20 ${activeModule === 'bodega' ? 'custom-scrollbar-dark' : 'custom-scrollbar'}`}>
          {(!['admin', 'logistica', 'lider_sala'].includes(currentRole) || activeModule === 'general') && (
            <div className="animate-fade-in">
              <div className="space-y-1">
                <p className={`px-3 text-[10px] font-extrabold uppercase mb-3 tracking-widest opacity-0 transition-colors duration-500 ${mounted ? 'animate-fade-in' : ''} ${activeModule === 'bodega' ? 'text-slate-400' : 'text-slate-700'}`} style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                  Operaciones
                </p>
                {renderLinks(mainItems, 0)}
              </div>

              {(currentRole === 'admin' || currentRole === 'logistica') && (
                <div className="mt-8 space-y-1">
                  <p className={`px-3 text-[10px] font-extrabold uppercase mb-3 tracking-widest opacity-0 transition-colors duration-500 ${mounted ? 'animate-fade-in' : ''} ${activeModule === 'bodega' ? 'text-slate-400' : 'text-slate-700'}`} style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                    Reportes
                  </p>
                  {renderLinks(reportItems, 10)}
                </div>
              )}

              {currentRole === 'admin' && (
                <div className="mt-8 space-y-1">
                  <p className={`px-3 text-[10px] font-extrabold uppercase mb-3 tracking-widest opacity-0 transition-colors duration-500 ${mounted ? 'animate-fade-in' : ''} ${activeModule === 'bodega' ? 'text-slate-400' : 'text-slate-700'}`} style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
                    Sistema
                  </p>
                  {renderLinks(configItems, 20)}
                </div>
              )}
            </div>
          )}

          {(!['admin', 'logistica', 'lider_sala'].includes(currentRole) || activeModule === 'bodega') && (
            <div className="animate-fade-in">
              {(currentRole === 'admin' || currentRole === 'logistica' || currentRole === 'lider_sala' || currentRole === 'bodeguero') && (
                <div className={`${activeModule === 'bodega' ? 'mt-0' : 'mt-8'} space-y-1`}>
                  <p className={`px-3 text-[10px] font-extrabold uppercase mb-3 tracking-widest opacity-0 transition-colors duration-500 ${mounted ? 'animate-fade-in' : ''} ${activeModule === 'bodega' ? 'text-slate-400' : 'text-slate-700'}`} style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                    Módulo Materiales Pendientes
                  </p>
                  {renderLinks(bodegaItems, 5)}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className={`p-4 border-t z-20 space-y-2 transition-colors duration-500 ${activeModule === 'bodega' ? 'bg-[#192242] border-white/10' : 'bg-[#47B3A8] border-slate-900/10'}`}>
          {user?.realRole === 'super_admin' && (
            <button
              onClick={() => {
                // Reiniciar a super_admin para que se active el RoleSelector
                const updatedUser = { ...user, role: '6', rol_nombre: 'super_admin' };
                sessionStorage.setItem('userData', JSON.stringify(updatedUser));
                window.location.replace('/');
              }}
              className="relative w-full flex items-center justify-center space-x-2 p-2.5 text-slate-900 bg-yellow-400 hover:bg-yellow-500 rounded-xl transition-all duration-300 group shadow-sm font-bold overflow-hidden"
            >
              <span className="text-sm relative z-10">👑 Cambiar Rol</span>
            </button>
          )}
          
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className={`relative w-full flex items-center justify-center space-x-2 p-3.5 rounded-xl transition-all duration-300 group shadow-sm font-bold overflow-hidden
              ${activeModule === 'bodega' ? 'text-white bg-white/10 hover:bg-teal-500' : 'text-slate-900 bg-white/20 hover:bg-teal-500 hover:text-white'}`}
          >
            <div className="absolute inset-0 w-0 bg-teal-600 transition-all duration-300 ease-out group-hover:w-full -z-10"></div>
            <Key size={18} className="relative z-10 group-hover:-translate-x-1.5 transition-transform duration-300" />
            <span className="text-sm relative z-10">Cambiar Contraseña</span>
          </button>

          <button
            onClick={logout}
            className={`relative w-full flex items-center justify-center space-x-2 p-3.5 rounded-xl transition-all duration-300 group shadow-sm font-bold overflow-hidden
              ${activeModule === 'bodega' ? 'text-white bg-white/10 hover:bg-red-500' : 'text-slate-900 bg-white/20 hover:bg-red-500 hover:text-white'}`}
          >
            <div className="absolute inset-0 w-0 bg-red-600 transition-all duration-300 ease-out group-hover:w-full -z-10"></div>
            <LogOut size={18} className="relative z-10 group-hover:-translate-x-1.5 transition-transform duration-300" />
            <span className="text-sm relative z-10">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />

      <style>{`
        @keyframes slideRightFade {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-right-fade {
          animation: slideRightFade 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
        }

        .custom-scrollbar-dark::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
        }
        .custom-scrollbar-dark:hover::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
};

export default Sidebar;