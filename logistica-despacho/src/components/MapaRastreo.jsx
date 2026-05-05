import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { socket } from '../utils/socket';
import { Truck, FileText, User, MapPin, CheckCircle2 } from 'lucide-react';

// =====================================================================
// 🚚 CREACIÓN DEL ICONO DE CAMIÓN (Cero pines azules)
// =====================================================================
const truckIconHTML = `
  <div style="
    background-color: #0f172a; /* Fondo oscuro elegante (slate-900) */
    width: 44px; 
    height: 44px; 
    border-radius: 50%; 
    border: 3px solid #47B3A8; /* Tu verde corporativo */
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    display: flex; 
    align-items: center; 
    justify-content: center;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#47B3A8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  </div>
`;

// Registramos el ícono y le quitamos las clases por defecto de Leaflet
const truckIcon = L.divIcon({
  html: truckIconHTML,
  className: '', 
  iconSize: [44, 44],
  iconAnchor: [22, 22], 
  popupAnchor: [0, -25] 
});
// =====================================================================

const MapaRastreo = () => {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState({});

  useEffect(() => {
    if (!user) return;

    socket.emit('registrar_usuario', { 
      id: user.id_usuario || user.id, 
      email: user.email, 
      role: user.role 
    });

    socket.on('ubicaciones_iniciales', (listaUbicaciones) => {
      const ubicacionesObj = {};
      listaUbicaciones.forEach(ubi => {
        ubicacionesObj[ubi.id_conductor] = ubi;
      });
      setVehiculos(ubicacionesObj);
    });

    socket.on('actualizacion_gps', (datosGPS) => {
      setVehiculos((prev) => ({
        ...prev,
        [datosGPS.id_conductor]: datosGPS
      }));
    });

    return () => {
      socket.off('ubicaciones_iniciales');
      socket.off('actualizacion_gps');
    };
  }, [user]);

  const centroUrabá = [7.88299, -76.62587];

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="p-4 shrink-0 flex justify-between items-center bg-white border-b border-slate-100 z-10 relative">
        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <Truck className="text-[#47B3A8]" />
          Monitoreo de Flota en Vivo
        </h2>
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-sm">
          {Object.keys(vehiculos).length} Vehículos Activos
        </span>
      </div>

      <div className="flex-1 w-full relative z-0">
        <MapContainer center={centroUrabá} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {Object.values(vehiculos).map((vehiculo) => {
            
            // Cálculos para la barra de progreso
            let porcentajeProgreso = 0;
            if (vehiculo.stats && vehiculo.stats.totales > 0) {
              porcentajeProgreso = (vehiculo.stats.realizadas / vehiculo.stats.totales) * 100;
            }

            return (
              <Marker key={vehiculo.id_conductor} position={[vehiculo.lat, vehiculo.lng]} icon={truckIcon}>
                <Popup className="custom-popup">
                  <div className="w-[260px]">
                    
                    {/* CABECERA: Nombre y Hora */}
                    <div className="border-b border-slate-100 pb-2 mb-3">
                      <h3 className="font-extrabold text-slate-800 text-base leading-none mb-1">{vehiculo.nombre}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Última señal: <span className="text-slate-600 font-mono">{new Date(vehiculo.timestamp).toLocaleTimeString()}</span>
                      </p>
                    </div>

                    {/* CUERPO DEL POPUP: Estadísticas y Pedido (Si existen) */}
                    {vehiculo.stats ? (
                      <div className="space-y-3">
                        
                        {/* 1. Barra de Progreso de Entregas */}
                        <div>
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="font-bold text-slate-500 uppercase text-[10px] flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-[#47B3A8]"/> Entregas
                            </span>
                            <span className="font-black text-slate-700 text-xs">
                              {vehiculo.stats.realizadas} <span className="text-slate-400 font-medium">/ {vehiculo.stats.totales}</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-[#3b9c92] to-[#47B3A8] h-full rounded-full transition-all duration-500" 
                              style={{ width: `${porcentajeProgreso}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* 2. Información del Pedido Actual en Ruta */}
                        {vehiculo.stats.factura_actual ? (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 shadow-sm relative overflow-hidden">
                            {/* Decoración lateral */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                            
                            <p className="text-[9px] font-bold text-blue-500 uppercase mb-1.5 tracking-wider">Llevando Pedido</p>
                            
                            <div className="flex items-center gap-1.5 font-black text-slate-800 text-sm mb-1.5">
                              <FileText size={14} className="text-slate-400" />
                              {vehiculo.stats.factura_actual}
                            </div>
                            
                            <p className="text-[11px] text-slate-600 truncate flex items-center gap-1.5 font-medium mb-1">
                              <User size={12} className="text-slate-400 shrink-0" /> 
                              <span className="truncate">{vehiculo.stats.cliente_actual}</span>
                            </p>
                            
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                              <MapPin size={12} className="text-orange-400 shrink-0" /> 
                              <span className="truncate">{vehiculo.stats.destino_actual}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center border-dashed">
                            <p className="text-xs text-slate-400 font-medium">Sin pedido en ruta activa.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <span className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#47B3A8] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#47B3A8]"></span>
                          </span>
                          Esperando datos de ruta...
                        </span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })} {/* <-- AQUÍ ESTÁ EL PARÉNTESIS CORREGIDO */}
        </MapContainer>
      </div>

      {/* Estilos para quitarle los bordes blancos feos de Leaflet por defecto */}
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .custom-popup .leaflet-popup-content {
          margin: 16px; /* Ajustamos el margen interno general */
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
    </div>
  );
};

export default MapaRastreo;