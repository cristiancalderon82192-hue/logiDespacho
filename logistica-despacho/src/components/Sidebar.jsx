import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import { 
  LayoutDashboard, Package, UserPlus, Truck, LogOut, 
  Building2, UsersRound, Map, MapPin, FileStack, AlertCircle, Menu, X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoEmpresa from '../assets/rodeo.png';

const Sidebar = ({ userRole = 'guest' }) => {
  const location = useLocation();
  const { logout } = useAuth();
  
  // 👇 ESTADO PARA CONTROLAR EL MENÚ EN MÓVILES 👇
  const [isOpen, setIsOpen] = useState(false);

  const normalizeRole = (role) => {
    const r = String(role);
    if (r === '1' || r === 'admin') return 'admin';
    if (r === '2' || r === 'lider_sala') return 'lider_sala';
    if (r === '3' || r === 'logistica') return 'logistica';
    if (r === '4' || r === 'conductor') return 'conductor';
    return 'guest';
  };

  const currentRole = normalizeRole(userRole);

  const mainItems = [
    { path: currentRole === 'admin' ? '/dashboard-admin' : '/dashboard-lider', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'lider_sala'] },
    { path: currentRole === 'admin' ? '/pedidos-admin' : '/pedidos-lider', icon: Package, label: 'Pedidos', roles: ['admin', 'lider_sala'] },
    { path: '/clientes', icon: UsersRound, label: 'Clientes', roles: ['admin'] },
    { path: '/flota', icon: Truck, label: 'Flota', roles: ['admin'] },
    { path: '/dashboard-logistica', icon: LayoutDashboard, label: 'Dashboard', roles: ['logistica'] },
    { path: '/logistica-asignacion', icon: Truck, label: 'Asignar Rutas', roles: ['logistica'] },
    { path: '/logistica-parciales', icon: AlertCircle, label: 'Envíos Parciales', roles: ['logistica', 'admin'] },
    // 👇 NUEVO ÍTEM DE REPORTES AGREGADO AQUÍ 👇
    { path: '/reportes', icon: FileSpreadsheet, label: 'Reportes', roles: ['admin'] } 
  ];

  const configItems = [
    { path: '/usuarios/nuevo', icon: UserPlus, label: 'Usuarios', roles: ['admin'] },
    { path: '/bodegas', icon: Building2, label: 'Bodegas', roles: ['admin'] },
    { path: '/zonas', icon: Map, label: 'Zonas', roles: ['admin'] },
    { path: '/destinos', icon: MapPin, label: 'Destinos', roles: ['admin'] },
    { path: '/tipos-documento', icon: FileStack, label: 'Tipos Doc.', roles: ['admin'] } 
  ];

  const renderLinks = (items) => {
    return items.map((item) => {
      if (!item.roles.includes(currentRole)) return null;
      
      const Icon = item.icon;
      const isActive = location.pathname.startsWith(item.path); // Cambiado a startsWith para que siga activo si entras a un sub-reporte

      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setIsOpen(false)} // Cerramos el menú al hacer clic en móvil
          className={`flex items-center space-x-3 p-3 rounded-lg transition-all mb-1 font-medium ${
            isActive 
              ? 'bg-slate-900 text-white shadow-lg' 
              : 'text-slate-800 hover:bg-slate-900/10 hover:text-slate-900'
          }`}
        >
          <Icon size={20} />
          <span className="text-sm">{item.label}</span>
        </Link>
      );
    });
  };

  return (
    <>
      {/* 👇 BOTÓN DE MENÚ (Solo visible en celulares) 👇 */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] bg-[#47B3A8] text-slate-900 p-2 rounded-lg shadow-lg border border-white/20 active:scale-90 transition-transform"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* 👇 OVERLAY OSCURO (Para cerrar el menú al tocar afuera en móvil) 👇 */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-[40] backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 👇 SIDEBAR CORREGIDO: w-64 en PC, Animado en Móvil 👇 */}
      <div className={`
        h-screen w-64 bg-[#47B3A8] flex flex-col fixed left-0 top-0 z-50 shadow-2xl border-r border-slate-900/5 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-900/10 flex flex-col items-center">
          <img 
            src={logoEmpresa} 
            alt="Logo Empresa" 
            className="h-16 w-auto object-contain drop-shadow-md" 
          />
          <div className="flex items-center gap-2 mt-3 bg-slate-900 px-3 py-1 rounded-full shadow-md">
            <div className={`w-2 h-2 rounded-full ${currentRole === 'admin' ? 'bg-green-400' : 'bg-orange-400'}`}></div>
            <p className="text-[10px] text-slate-100 uppercase font-bold tracking-wider">
              {currentRole.replace('_', ' ')}
            </p>
          </div>
        </div>
        
        {/* MENÚ DE NAVEGACIÓN */}
        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-700 uppercase mb-2 tracking-wider">Operaciones</p>
            {renderLinks(mainItems)}
          </div>
          {currentRole === 'admin' && (
            <div className="mt-8 space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-700 uppercase mb-2 tracking-wider">Sistema</p>
              {renderLinks(configItems)}
            </div>
          )}
        </nav>

        {/* FOOTER / LOGOUT */}
        <div className="p-4 border-t border-slate-900/10 bg-[#47B3A8]">
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 p-3 text-slate-900 hover:bg-red-500 hover:text-white rounded-lg transition-all duration-300 group shadow-sm font-bold"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;