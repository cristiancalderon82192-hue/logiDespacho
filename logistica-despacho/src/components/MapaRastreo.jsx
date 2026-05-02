import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { socket } from '../utils/socket';
import { Truck } from 'lucide-react';

// =====================================================================
// 👇 NUEVO: DISEÑO DEL CAMIÓN PERSONALIZADO PARA EL MAPA 👇
// =====================================================================
const truckIconHTML = `
  <div style="
    background-color: #47B3A8; 
    width: 38px; 
    height: 38px; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 4px 8px rgba(0,0,0,0.4);
    display: flex; 
    align-items: center; 
    justify-content: center;
    position: relative;
  ">
    <!-- SVG del camión dibujado en blanco -->
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
    <!-- Pequeño triángulo abajo para hacer efecto de "Pin" -->
    <div style="
      position: absolute;
      bottom: -6px;
      left: 14px;
      width: 0; 
      height: 0; 
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid white;
    "></div>
  </div>
`;

// Registramos el ícono en Leaflet
const truckIcon = L.divIcon({
  html: truckIconHTML,
  className: 'custom-leaflet-truck', // Anula el cuadro blanco por defecto de Leaflet
  iconSize: [38, 44],
  iconAnchor: [19, 44], // El ancla es la punta del pin
  popupAnchor: [0, -44] // El cuadro de texto sale arriba del camión
});
// =====================================================================

const MapaRastreo = () => {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState({});

  useEffect(() => {
    if (!user) return;

    socket.emit('registrar_usuario', { 
      id: user.id_usuario, 
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

  // Coordenadas centrales de Apartadó
  const centroUrabá = [7.88299, -76.62587];

  return (
    <div className="flex flex-col h-full w-full">
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
          {Object.values(vehiculos).map((vehiculo) => (
            // 👇 Le aplicamos nuestro icon={truckIcon} al Marker 👇
            <Marker key={vehiculo.id_conductor} position={[vehiculo.lat, vehiculo.lng]} icon={truckIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-slate-800 text-sm mb-1">{vehiculo.nombre}</p>
                  <p className="text-xs text-slate-500">Última señal: {new Date(vehiculo.timestamp).toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapaRastreo;