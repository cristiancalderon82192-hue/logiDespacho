import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { socket } from '../utils/socket';
import { Truck } from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapaRastreo = () => {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState({});

  useEffect(() => {
    if (!user) return;

    // 1. Nos registramos
    socket.emit('registrar_usuario', { 
      id: user.id_usuario, 
      email: user.email, 
      role: user.role 
    });

    // 👇 NUEVO: Escuchamos la "foto inicial" apenas abrimos el mapa 👇
    socket.on('ubicaciones_iniciales', (listaUbicaciones) => {
      console.log("📥 Recibiendo foto inicial de la flota:", listaUbicaciones);
      const ubicacionesObj = {};
      listaUbicaciones.forEach(ubi => {
        ubicacionesObj[ubi.id_conductor] = ubi;
      });
      setVehiculos(ubicacionesObj);
    });

    // 2. Escuchamos los pequeños movimientos uno a uno
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
            <Marker key={vehiculo.id_conductor} position={[vehiculo.lat, vehiculo.lng]}>
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