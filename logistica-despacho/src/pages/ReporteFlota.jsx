import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart2, Loader2, Truck, Calendar, Target, Package, Zap, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReporteFlota = () => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  // 👇 LÓGICA DE FECHAS: Desde el día 1 del mes hasta hoy 👇
  const fechaActual = new Date();
  const hoyStr = fechaActual.toISOString().split('T')[0];
  const primerDiaMesStr = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDiaMesStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [animacionOcupacion, setAnimacionOcupacion] = useState(0);

  useEffect(() => {
    const obtenerDatos = async () => {
      setCargando(true);
      setError(null);
      setAnimacionOcupacion(0);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const respuesta = await fetch(`${apiUrl}/api/reportes/flota?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        
        if (!respuesta.ok) throw new Error('Error al cargar los datos de ocupación de flota');
        
        const data = await respuesta.json();
        setDatos(data);

        // Cálculo de ocupación promedio solo para vehículos que sí trabajaron
        const vehiculosActivos = data.filter(d => Number(d.total_pedidos_cargados) > 0);
        if (vehiculosActivos.length > 0) {
          const sumaOcupacion = vehiculosActivos.reduce((acc, curr) => acc + Number(curr.porcentaje_ocupacion), 0);
          const promedio = Math.round(sumaOcupacion / vehiculosActivos.length);
          setTimeout(() => setAnimacionOcupacion(promedio), 200);
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
      'Placa': fila.placa,
      'Modelo': fila.modelo || 'N/A',
      'Capacidad Diaria (kg)': Number(fila.capacidad_kg),
      'Días Trabajados': Number(fila.dias_trabajados),
      'Pedidos Cargados': fila.total_pedidos_cargados,
      'Kilos Totales Cargados': Number(fila.kilos_reales_cargados),
      'Ocupación Promedio (%)': Number(fila.porcentaje_ocupacion)
    }));

    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Ocupación Flota");
    XLSX.writeFile(libro, `Ocupacion_Flota_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF('landscape'); 
    
    doc.setFontSize(18);
    doc.text(`Reporte de Ocupación de Flota`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Rango evaluado: ${fechaInicio} al ${fechaFin}`, 14, 30);

    const columnas = ["Placa", "Modelo", "Capacidad", "Días Activo", "Pedidos", "Total Cargado", "Ocupación Promedio"];
    const filas = datos.map(fila => [
      fila.placa,
      fila.modelo || 'N/A',
      `${fila.capacidad_kg} kg`,
      fila.dias_trabajados,
      fila.total_pedidos_cargados,
      `${fila.kilos_reales_cargados} kg`,
      `${fila.porcentaje_ocupacion}%`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [71, 179, 168] },
    });

    doc.save(`Ocupacion_Flota_${fechaInicio}_al_${fechaFin}.pdf`);
  };

  const colorBarra = (porcentaje) => {
    if (porcentaje > 90) return 'bg-red-500'; // Sobrecargado
    if (porcentaje >= 70) return 'bg-green-500'; // Óptimo
    if (porcentaje >= 40) return 'bg-amber-400'; // Regular
    return 'bg-slate-400'; // Vacío o muy bajo
  };

  // --- CÁLCULOS DEL DASHBOARD ---
  const totales = datos.reduce((acc, curr) => ({
    kilos: acc.kilos + Number(curr.kilos_reales_cargados || 0),
    pedidos: acc.pedidos + Number(curr.total_pedidos_cargados || 0)
  }), { kilos: 0, pedidos: 0 });

  const vehiculosActivos = datos.filter(d => Number(d.total_pedidos_cargados) > 0).length;
  const totalVehiculos = datos.length;
  const sinDatos = totalVehiculos === 0 || totales.pedidos === 0;

  const radio = 40;
  const circunferencia = 2 * Math.PI * radio;
  const strokeOffset = circunferencia - ((animacionOcupacion / 100) * circunferencia);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[80vh] overflow-x-hidden">
      
      {/* ================= ENCABEZADO Y FILTROS ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-3 rounded-lg text-[#47B3A8]">
            <BarChart2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Ocupación de Flota</h1>
            <p className="text-sm text-slate-500">Optimización de capacidad y volumen de carga</p>
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

          <button onClick={exportarExcel} disabled={cargando || totalVehiculos === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm">
            <FileText size={18} /> Excel
          </button>
          <button onClick={exportarPDF} disabled={cargando || totalVehiculos === 0} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm">
            <Download size={18} /> PDF
          </button>
        </div>
      </div>

      {cargando && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 size={40} className="animate-spin text-[#47B3A8] mb-4" />
          <p>Calculando volumetrías de flota...</p>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center">{error}</div>}

      {/* ================= SECCIÓN DE GRÁFICAS (DASHBOARD) ================= */}
      {!cargando && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
          
          {/* TARJETA 1: OCUPACIÓN PROMEDIO */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-10 [background-size:10px_10px]"></div>
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-4 z-10 flex items-center gap-2">
              <Target size={16} /> Ocupación Promedio
            </h3>
            
            <div className="relative flex items-center justify-center z-10 hover:scale-105 transition-transform duration-500">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r={radio} stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="64" cy="64" r={radio} 
                  stroke={sinDatos ? "#475569" : (animacionOcupacion > 90 ? "#ef4444" : animacionOcupacion >= 70 ? "#22c55e" : "#fbbf24")} 
                  strokeWidth="12" fill="transparent" 
                  strokeDasharray={circunferencia}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-3xl font-extrabold ${sinDatos ? 'text-slate-400' : 'text-white'}`}>
                  {animacionOcupacion}%
                </span>
              </div>
            </div>
            <p className="text-xs text-indigo-200 mt-4 z-10 text-center">De la flota que estuvo en ruta</p>
          </div>

          {/* TARJETA 2: VOLUMEN TOTAL */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col justify-between relative overflow-hidden hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-0"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Volumen Total</h3>
                  <p className={`text-3xl font-extrabold mt-2 ${sinDatos ? 'text-slate-400' : 'text-slate-800'}`}>
                    {totales.kilos.toLocaleString()} <span className="text-lg font-medium text-slate-500">kg</span>
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${sinDatos ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Package size={24} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-400"/> Movilizados en <span className="text-indigo-600">{totales.pedidos}</span> pedidos
                </p>
              </div>
            </div>
          </div>

          {/* TARJETA 3: USO DE FLOTA */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col justify-between relative overflow-hidden hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full -z-0"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Uso de Flota</h3>
                  <p className={`text-3xl font-extrabold mt-2 ${sinDatos ? 'text-slate-400' : 'text-slate-800'}`}>
                    {vehiculosActivos} <span className="text-lg font-medium text-slate-500">/ {totalVehiculos}</span>
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${sinDatos ? 'bg-slate-100 text-slate-400' : 'bg-teal-100 text-teal-600'}`}>
                  <Zap size={24} />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Vehículos Activos</span>
                  <span className="text-teal-600">{totalVehiculos > 0 ? Math.round((vehiculosActivos/totalVehiculos)*100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${sinDatos ? 'bg-slate-300' : 'bg-teal-500'}`}
                    style={{ width: `${totalVehiculos > 0 ? (vehiculosActivos/totalVehiculos)*100 : 0}%` }}
                  ></div>
                </div>
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
                <th className="p-4 font-semibold rounded-tl-lg">Vehículo</th>
                <th className="p-4 font-semibold text-center">Capacidad Diaria</th>
                <th className="p-4 font-semibold text-center text-indigo-600 bg-indigo-50/50">Días Activo</th>
                <th className="p-4 font-semibold text-center">Pedidos</th>
                <th className="p-4 font-semibold text-center">Volumen Total Cargado</th>
                <th className="p-4 font-semibold rounded-tr-lg min-w-[200px]">Ocupación Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datos.length > 0 ? (
                datos.map((fila, index) => {
                  const noTrabajo = Number(fila.dias_trabajados) === 0;

                  return (
                    <tr key={index} className={`transition-colors text-sm ${noTrabajo ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50'}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className={noTrabajo ? "text-slate-300" : "text-indigo-500"} />
                          <div>
                            <p className={`font-bold ${noTrabajo ? 'text-slate-500' : 'text-slate-800'}`}>{fila.placa}</p>
                            <p className="text-xs text-slate-500">{fila.modelo || 'S/N'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center text-slate-600">{Number(fila.capacidad_kg).toLocaleString()} kg</td>
                      
                      <td className="p-4 text-center font-bold text-indigo-600 bg-indigo-50/30">
                        {fila.dias_trabajados} <span className="text-[10px] text-indigo-400 font-normal">días</span>
                      </td>
                      
                      <td className="p-4 text-center font-medium text-slate-700">{fila.total_pedidos_cargados}</td>
                      <td className="p-4 text-center font-bold text-[#47B3A8]">{Number(fila.kilos_reales_cargados).toLocaleString()} kg</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`min-w-[50px] text-right font-bold ${noTrabajo ? 'text-slate-400' : 'text-slate-700'}`}>
                            {fila.porcentaje_ocupacion}%
                          </span>
                          <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${noTrabajo ? 'bg-slate-300' : colorBarra(fila.porcentaje_ocupacion)}`}
                              style={{ width: `${Math.min(fila.porcentaje_ocupacion, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                    <Truck size={48} className="text-slate-200 mb-4" />
                    <p className="text-lg font-bold">No hay vehículos registrados</p>
                    <p className="text-sm">Agrega vehículos al sistema para poder medir su ocupación.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ESTILOS DE ANIMACIÓN */}
      <style>{`
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ReporteFlota;