import React from 'react';
import MapaRastreo from '../components/MapaRastreo'; // Ajusta la ruta si es necesario
import { MapPin } from 'lucide-react';

const UbicacionFlota = () => {
  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col bg-slate-50 font-sans">
      
      {/* Encabezado de la página */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-[#47B3A8]/10 rounded-xl">
            <MapPin className="text-[#47B3A8]" size={28} />
          </div>
          Ubicación en Tiempo Real
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">
          Monitoreo satelital activo de los vehículos en ruta de itSoluciones.
        </p>
      </div>

      {/* Contenedor principal que se estira */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg shadow-teal-900/5 border border-slate-200 overflow-hidden flex flex-col p-1">
        <MapaRastreo />
      </div>

    </div>
  );
};

export default UbicacionFlota;