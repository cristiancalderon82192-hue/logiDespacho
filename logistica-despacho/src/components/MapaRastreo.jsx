import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { socket } from '../utils/socket';
import { Truck } from 'lucide-react';

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
  className: '', // <-- Esto es vital, anula el cuadro blanco y el pin azul de Leaflet
  iconSize: [44, 44],
  iconAnchor: [22, 22], // El centro exacto del círculo
  popupAnchor: [0, -25] // El letrero del nombre sale arriba
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
            // APLICAMOS NUESTRO ICONO AL MARCADOR
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