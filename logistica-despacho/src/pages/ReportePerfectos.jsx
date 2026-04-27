import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle, Loader2, Calendar, Target, AlertOctagon, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportePerfectos = () => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);

  // Estado para la animación de la gráfica circular
  const [animacionOtif, setAnimacionOtif] = useState(0);

  useEffect(() => {
    const obtenerDatos = async () => {
      setCargando(true);
      setError(null);
      setAnimacionOtif(0); // Reiniciar animación al buscar
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const respuesta = await fetch(`${apiUrl}/api/reportes/perfectos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        
        if (!respuesta.ok) throw new Error('Error al cargar el reporte de pedidos perfectos');
        
        const data = await respuesta.json();
        setDatos(data);

        // Disparar la animación de la gráfica después de que los datos cargan
        if (data.length > 0) {
          const perfectos = data.filter(d => d.calificacion === 'Perfecto').length;
          const porcentaje = Math.round((perfectos / data.length) * 100);
          setTimeout(() => setAnimacionOtif(porcentaje), 200);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    obtenerDatos();
  }, [fechaInicio, fechaFin]); 

  const exportarExcel = () => {
    const datosFormateados = datos.map(fila => ({
      'Factura': fila.id_factura,
      'Cliente': fila.cliente,
      'Conductor': fila.conductor,
      'Estado Entrega': fila.estado_entrega,
      'Fecha Agendada': fila.fecha_agendada,
      'Hora Límite': fila.hora_limite,
      'Entrega Real': fila.fecha_real_entrega || 'N/A',
      'Calificación': fila.calificacion
    }));

    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pedidos Perfectos");
    XLSX.writeFile(libro, `OTIF_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text("Auditoría de Pedidos Perfectos (OTIF)", 14, 22);
    doc.setFontSize(11);
    doc.text(`Rango evaluado: ${fechaInicio} al ${fechaFin}`, 14, 30);

    const columnas = ["Factura", "Cliente", "Conductor", "Estado", "Hora Límite", "Entrega Real", "Calificación"];
    const filas = datos.map(fila => [
      fila.id_factura,
      fila.cliente,
      fila.conductor,
      fila.estado_entrega,
      fila.hora_limite,
      fila.fecha_real_entrega || 'N/A',
      fila.calificacion
    ]);

    autoTable(doc, {
      startY: 40,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [71, 179, 168] },
    });

    doc.save(`OTIF_${fechaInicio}_al_${fechaFin}.pdf`);
  };

  // Cálculos para las gráficas
  const totalPedidos = datos.length;
  const perfectos = datos.filter(d => d.calificacion === 'Perfecto').length;
  const noPerfectos = totalPedidos - perfectos;
  const porcentajePerfectos = totalPedidos > 0 ? Math.round((perfectos / totalPedidos) * 100) : 0;
  const porcentajeNoPerfectos = totalPedidos > 0 ? Math.round((noPerfectos / totalPedidos) * 100) : 0;

  // Variables matemáticas para el SVG circular
  const radio = 40;
  const circunferencia = 2 * Math.PI * radio;
  const strokeOffset = circunferencia - ((animacionOtif / 100) * circunferencia);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[80vh] overflow-x-hidden">
      
      {/* ================= ENCABEZADO Y FILTROS ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-3 rounded-lg text-[#47B3A8]">
            <Target size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nivel de Servicio (OTIF)</h1>
            <p className="text-sm text-slate-500">Evaluación analítica de Pedidos Perfectos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus-within:border-[#47B3A8] transition-colors">
            <Calendar size={18} className="text-[#47B3A8]" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Desde</span>
              <input 
                type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer w-[110px]"
              />
            </div>
            <div className="w-px h-5 bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Hasta</span>
              <input 
                type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} min={fechaInicio}
                className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer w-[110px]"
              />
            </div>
          </div>

          <div className="w-px h-8 bg-slate-200 hidden xl:block mx-1"></div>

          <button onClick={exportarExcel} disabled={cargando || datos.length === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm">
            <FileText size={18} /> Excel
          </button>
          <button onClick={exportarPDF} disabled={cargando || datos.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm">
            <Download size={18} /> PDF
          </button>
        </div>
      </div>

      {cargando && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 size={40} className="animate-spin text-[#47B3A8] mb-4" />
          <p>Analizando métricas de cumplimiento...</p>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center">{error}</div>}

      {/* ================= SECCIÓN DE GRÁFICAS (SIEMPRE VISIBLE) ================= */}
      {!cargando && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
          
          {/* TARJETA 1: SCORE GLOBAL OTIF (DONUT CHART) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-10 [background-size:10px_10px]"></div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 z-10">Score Global (OTIF)</h3>
            
            <div className="relative flex items-center justify-center z-10 hover:scale-105 transition-transform duration-500">
              <svg className="w-32 h-32 transform -rotate-90">
                {/* Círculo de fondo */}
                <circle cx="64" cy="64" r={radio} stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="transparent" />
                {/* Círculo animado (Progreso) - Si no hay datos, se pinta gris neutro */}
                <circle 
                  cx="64" cy="64" r={radio} 
                  stroke={totalPedidos === 0 ? "#475569" : (animacionOtif >= 90 ? "#4ade80" : animacionOtif >= 70 ? "#facc15" : "#f87171")} 
                  strokeWidth="12" fill="transparent" 
                  strokeDasharray={circunferencia}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-3xl font-extrabold ${totalPedidos === 0 ? 'text-slate-400' : 'text-white'}`}>
                  {animacionOtif}%
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 z-10 text-center">De <span className="font-bold text-white">{totalPedidos}</span> pedidos evaluados</p>
          </div>

          {/* TARJETA 2: PEDIDOS PERFECTOS */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -z-0 ${totalPedidos === 0 ? 'bg-slate-50' : 'bg-green-50'}`}></div>
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Pedidos Perfectos</h3>
                <p className={`text-3xl font-extrabold ${totalPedidos === 0 ? 'text-slate-400' : 'text-slate-800'}`}>{perfectos}</p>
              </div>
              <div className={`p-3 rounded-xl ${totalPedidos === 0 ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-600'}`}>
                <CheckCircle size={24} />
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Tasa de éxito</span>
                <span className={totalPedidos === 0 ? 'text-slate-400' : 'text-green-600'}>{porcentajePerfectos}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${totalPedidos === 0 ? 'bg-slate-300' : 'bg-green-500'}`}
                  style={{ width: `${animacionOtif}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* TARJETA 3: PEDIDOS NO PERFECTOS */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -z-0 ${totalPedidos === 0 ? 'bg-slate-50' : 'bg-red-50'}`}></div>
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Entregas Fallidas</h3>
                <p className={`text-3xl font-extrabold ${totalPedidos === 0 ? 'text-slate-400' : 'text-slate-800'}`}>{noPerfectos}</p>
              </div>
              <div className={`p-3 rounded-xl ${totalPedidos === 0 ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-500'}`}>
                <AlertOctagon size={24} />
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Margen de error</span>
                <span className={totalPedidos === 0 ? 'text-slate-400' : 'text-red-500'}>{100 - animacionOtif}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${totalPedidos === 0 ? 'bg-slate-300' : 'bg-red-400'}`}
                  style={{ width: totalPedidos === 0 ? '0%' : `${100 - animacionOtif}%` }}
                ></div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ================= TABLA DE DATOS ================= */}
      {!cargando && !error && (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold rounded-tl-lg">Factura</th>
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold">Estado Actual</th>
                <th className="p-4 font-semibold text-center">Hora Límite</th>
                <th className="p-4 font-semibold text-center">Entrega Real</th>
                <th className="p-4 font-semibold text-center rounded-tr-lg">Calificación OTIF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datos.length > 0 ? (
                datos.map((fila, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors text-sm">
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      {fila.id_factura}
                    </td>
                    <td className="p-4 text-slate-600 truncate max-w-[200px]" title={fila.cliente}>{fila.cliente}</td>
                    <td className="p-4 text-slate-600">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        fila.estado_entrega === 'Entregado' ? 'text-green-700 bg-green-50' : 
                        fila.estado_entrega === 'Devolución' ? 'text-red-700 bg-red-50' : 'text-orange-700 bg-orange-50'
                      }`}>
                        {fila.estado_entrega}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-600 font-medium">{fila.hora_limite}</td>
                    <td className="p-4 text-center text-slate-600 font-bold">{fila.fecha_real_entrega || '-- : --'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-transform hover:scale-105 ${
                        fila.calificacion === 'Perfecto' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {fila.calificacion === 'Perfecto' ? <CheckCircle size={14} /> : <AlertOctagon size={14} />}
                        {fila.calificacion}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                    <TrendingUp size={48} className="text-slate-200 mb-4" />
                    <p className="text-lg font-bold">No hay datos para analizar</p>
                    <p className="text-sm">Ajusta el rango de fechas para ver las estadísticas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ESTILOS DE ANIMACIÓN */}
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ReportePerfectos;