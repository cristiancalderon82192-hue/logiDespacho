import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

const DateRangeSelector = ({ fechaInicio, setFechaInicio, fechaFin, setFechaFin }) => {
  const [isRangoFechas, setIsRangoFechas] = useState(true);

  const getHoyStr = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const getPrimerDiaMes = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-01`;
  };

  const handleToggleRango = (checked) => {
    setIsRangoFechas(checked);
    const hoyStr = getHoyStr();
    
    if (checked) {
      setFechaInicio(getPrimerDiaMes());
      setFechaFin(hoyStr);
    } else {
      setFechaInicio(hoyStr);
      setFechaFin(hoyStr);
    }
  };

  // Al montar el componente en cualquier vista del proyecto, forzamos por defecto el rango del mes
  useEffect(() => {
    if (isRangoFechas) {
      setFechaInicio(getPrimerDiaMes());
      setFechaFin(getHoyStr());
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <label className="flex items-center justify-center sm:justify-start gap-2 cursor-pointer text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors h-10">
        <input 
          type="checkbox" 
          checked={isRangoFechas}
          onChange={(e) => handleToggleRango(e.target.checked)}
          className="w-4 h-4 text-[#47B3A8] rounded border-slate-300 focus:ring-[#47B3A8]"
        />
        Rango de fechas
      </label>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 sm:px-4 sm:py-2 shadow-sm focus-within:border-[#47B3A8] transition-colors w-full sm:w-auto h-auto sm:h-10">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#47B3A8]" />
            <span className="text-xs font-bold text-slate-400 uppercase">{isRangoFechas ? 'Desde' : 'Día'}</span>
          </div>
          <input 
            type="date" 
            value={fechaInicio}
            onChange={(e) => {
              setFechaInicio(e.target.value);
              if (!isRangoFechas) setFechaFin(e.target.value);
            }}
            className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer w-full"
          />
        </div>

        {isRangoFechas && (
          <>
            <div className="h-px w-full sm:w-px sm:h-6 bg-slate-200 sm:bg-slate-300 my-2 sm:my-0"></div>
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase">Hasta</span>
              <input 
                type="date" 
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio}
                className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer w-full"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DateRangeSelector;
