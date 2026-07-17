import React, { useState, useEffect } from 'react';
import { Package, Search, Calendar, FileText, Link as LinkIcon, RefreshCw, Trash2 } from 'lucide-react';
import DateRangeSelector from '../components/DateRangeSelector';
import { useAuth } from '../context/AuthContext';

const ReporteBodegaParciales = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Super Admin' || user?.rol === 'Admin';

  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };
  const hoyLocal = obtenerFechaLocal();

  const [fechaInicio, setFechaInicio] = useState(hoyLocal);
  const [fechaFin, setFechaFin] = useState(hoyLocal);

  const [reporte, setReporte] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroFactura, setFiltroFactura] = useState('');

  const abortControllerRef = React.useRef(null);

  const cargarReporte = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setCargando(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/reportes/parciales?inicio=${fechaInicio}&fin=${fechaFin}`, {
        signal: abortControllerRef.current.signal
      });
      if (res.ok) {
        const data = await res.json();
        setReporte(data);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error("Error al cargar reporte:", error);
    } finally {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setCargando(false);
      }
    }
  };

  const eliminarGrupo = async (facturaBase) => {
    if (!window.confirm(`¿Estás seguro de eliminar TODO el historial de la factura ${facturaBase}? Esta acción borrará todas las entregas parciales y de mostrador asociadas y no se puede deshacer.`)) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/reportes/parciales/${facturaBase}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setReporte(reporte.filter(r => r.factura_base !== facturaBase));
      } else {
        alert("Error al eliminar el grupo de facturas.");
      }
    } catch (error) {
      console.error("Error eliminando grupo:", error);
      alert("Error de red al intentar eliminar.");
    }
  };

  useEffect(() => {
    cargarReporte();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin]);

  const reporteFiltrado = reporte.filter(r => 
    filtroFactura ? r.factura_base?.toLowerCase().includes(filtroFactura.toLowerCase()) : true
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-2xl font-extrabold text-slate-800">Trazabilidad de Entregas Parciales</h1>
          <p className="text-sm text-slate-500">Consulta el ciclo de vida y cantidad de despachos por cada factura original</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <DateRangeSelector 
            fechaInicio={fechaInicio} 
            setFechaInicio={setFechaInicio} 
            fechaFin={fechaFin} 
            setFechaFin={setFechaFin} 
          />

          <button 
            onClick={cargarReporte} 
            className="bg-white border text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors w-full md:w-auto justify-center"
          >
            <RefreshCw size={16} className={cargando ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="w-full max-w-md">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
            <Search size={12}/> Buscar Factura Base
          </label>
          <input 
            type="text" 
            placeholder="Ej: F-100..." 
            value={filtroFactura} 
            onChange={(e) => setFiltroFactura(e.target.value)}
            className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#47B3A8] transition-all bg-slate-50"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-900 text-white flex items-center gap-2">
          <LinkIcon size={18}/> <h2 className="font-bold">Facturas Vinculadas</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b">
                <th className="p-4">Factura Original</th>
                <th className="p-4">Cliente y Origen</th>
                <th className="p-4">Creado Por</th>
                <th className="p-4">Total Entregas</th>
                <th className="p-4">Traza de Facturas (Consecutivos)</th>
                <th className="p-4">Última Entrega</th>
                {isAdmin && <th className="p-4 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {cargando ? (
                <tr><td colSpan={isAdmin ? "7" : "6"} className="p-8 text-center text-slate-400">Cargando datos...</td></tr>
              ) : reporteFiltrado.length === 0 ? (
                <tr><td colSpan={isAdmin ? "7" : "6"} className="p-8 text-center text-slate-400">No se encontraron registros vinculados.</td></tr>
              ) : (
                reporteFiltrado.map((r, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-black text-lg text-blue-600">{r.factura_base}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{r.cliente}</p>
                      <p className="text-xs text-[#47B3A8] font-bold mt-0.5">{r.punto_venta}</p>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {r.nombre_creador ? (
                        <span className="text-slate-700">{r.nombre_creador}</span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">No registrado</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm
                        ${r.cantidad_entregas > 1 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {r.cantidad_entregas}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {r.historial_facturas?.split(', ').map((f, i) => (
                          <span key={i} className="bg-white border shadow-sm px-2.5 py-1 rounded-md text-xs font-mono text-slate-600 flex items-center gap-1">
                            <FileText size={12} className="text-slate-400"/> {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-600 text-xs font-medium">
                        <Calendar size={14} className="text-slate-400"/> 
                        {r.ultima_entrega ? new Date(r.ultima_entrega).toLocaleString() : 'N/A'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <button onClick={() => eliminarGrupo(r.factura_base)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 p-2 rounded-lg transition-colors shadow-sm inline-flex justify-center items-center" title="Eliminar todo el grupo">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReporteBodegaParciales;
