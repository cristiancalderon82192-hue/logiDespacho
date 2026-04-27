import React, { useState, useEffect } from 'react';
import { Download, FileText, Truck, Loader2, Calendar, Target, Package, DollarSign, CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReporteProductividad = () => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  // 👇 NUEVA LÓGICA DE FECHAS: Desde el primer día del mes hasta hoy 👇
  const fechaActual = new Date();
  
  // Obtenemos el día de hoy (YYYY-MM-DD)
  const hoyStr = fechaActual.toISOString().split('T')[0];
  
  // Forzamos la fecha al día 1 del mes y año en curso
  const primerDiaMesStr = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDiaMesStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  // 👆 ----------------------------------------------------------- 👆
  
  const [animacionEfectividad, setAnimacionEfectividad] = useState(0);

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  };

  useEffect(() => {
    const obtenerDatos = async () => {
      setCargando(true);
      setError(null);
      setAnimacionEfectividad(0);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const respuesta = await fetch(`${apiUrl}/api/reportes/productividad?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        
        if (!respuesta.ok) throw new Error('Error al cargar los datos del reporte');
        
        const data = await respuesta.json();
        setDatos(data);

        if (data.length > 0) {
          const totalAsignados = data.reduce((acc, curr) => acc + Number(curr.total_viajes_asignados || 0), 0);
          const totalCompletas = data.reduce((acc, curr) => acc + Number(curr.entregas_completas || 0), 0);
          
          const porcentaje = totalAsignados > 0 ? Math.round((totalCompletas / totalAsignados) * 100) : 0;
          setTimeout(() => setAnimacionEfectividad(porcentaje), 200);
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
      'Conductor': fila.conductor,
      'Viajes Asignados': fila.total_viajes_asignados,
      'Entregas Completas': fila.entregas_completas,
      'Entregas Incompletas': fila.entregas_incompletas,
      'Devoluciones': fila.devoluciones,
      'Total Kilos (kg)': Number(fila.total_kilos_transportados),
      'Valor Entregado ($)': Number(fila.valor_total_entregado)
    }));

    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Productividad");
    XLSX.writeFile(libro, `Productividad_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text("Reporte de Productividad de Flota", 14, 22);
    doc.setFontSize(11);
    doc.text(`Rango evaluado: ${fechaInicio} al ${fechaFin}`, 14, 30);

    const columnas = ["Conductor", "Asignados", "Completas", "Incompletas", "Devoluciones", "Total Kilos (kg)", "Valor Entregado"];
    const filas = datos.map(fila => [
      fila.conductor,
      fila.total_viajes_asignados,
      fila.entregas_completas,
      fila.entregas_incompletas,
      fila.devoluciones,
      fila.total_kilos_transportados,
      formatearMoneda(fila.valor_total_entregado)
    ]);

    autoTable(doc, {
      startY: 40,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [71, 179, 168] },
    });

    doc.save(`Productividad_${fechaInicio}_al_${fechaFin}.pdf`);
  };

  const totales = datos.reduce((acc, curr) => ({
    asignados: acc.asignados + Number(curr.total_viajes_asignados || 0),
    completas: acc.completas + Number(curr.entregas_completas || 0),
    incompletas: acc.incompletas + Number(curr.entregas_incompletas || 0),
    devoluciones: acc.devoluciones + Number(curr.devoluciones || 0),
    kilos: acc.kilos + Number(curr.total_kilos_transportados || 0),
    valor: acc.valor + Number(curr.valor_total_entregado || 0),
  }), { asignados: 0, completas: 0, incompletas: 0, devoluciones: 0, kilos: 0, valor: 0 });

  const radio = 40;
  const circunferencia = 2 * Math.PI * radio;
  const strokeOffset = circunferencia - ((animacionEfectividad / 100) * circunferencia);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[80vh] overflow-x-hidden">
      
      {/* ================= ENCABEZADO Y FILTROS ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-3 rounded-lg text-[#47B3A8]">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Productividad de Flota</h1>
            <p className="text-sm text-slate-500">Rendimiento global y por conductor</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus-within:border-[#47B3A8] transition-colors">
            <Calendar size={18} className="text-[#47B3A8]" />
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Desde</span>
              <input 
                type="date" 
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer w-[110px]"
              />
            </div>

            <div className="w-px h-5 bg-slate-300"></div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Hasta</span>
              <input 
                type="date" 
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio}
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
          <p>Calculando métricas del {fechaInicio} al {fechaFin}...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center">
          {error}
        </div>
      )}

      {/* ================= SECCIÓN DE GRÁFICAS ================= */}
      {!cargando && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
          
          <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-10 [background-size:10px_10px]"></div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 z-10 flex items-center gap-2">
              <Target size={16} className="text-[#a2ffec]" /> Efectividad Flota
            </h3>
            
            <div className="relative flex items-center justify-center z-10 hover:scale-105 transition-transform duration-500">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r={radio} stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="64" cy="64" r={radio} 
                  stroke={totales.asignados === 0 ? "#475569" : (animacionEfectividad >= 90 ? "#4ade80" : animacionEfectividad >= 70 ? "#facc15" : "#f87171")} 
                  strokeWidth="12" fill="transparent" 
                  strokeDasharray={circunferencia}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-3xl font-extrabold ${totales.asignados === 0 ? 'text-slate-400' : 'text-white'}`}>
                  {animacionEfectividad}%
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 z-10 text-center">De <span className="font-bold text-white">{totales.asignados}</span> viajes asignados</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col justify-center relative overflow-hidden hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">Desglose de Entregas</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500"/> Completas</span>
                  <span className="font-extrabold text-green-600">{totales.completas}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${totales.asignados === 0 ? 'bg-slate-300' : 'bg-green-500'}`} style={{ width: totales.asignados === 0 ? '0%' : `${(totales.completas / totales.asignados) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5"><AlertTriangle size={14} className="text-orange-500"/> Incompletas</span>
                  <span className="font-extrabold text-orange-500">{totales.incompletas}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${totales.asignados === 0 ? 'bg-slate-300' : 'bg-orange-400'}`} style={{ width: totales.asignados === 0 ? '0%' : `${(totales.incompletas / totales.asignados) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5"><XCircle size={14} className="text-red-500"/> Devoluciones</span>
                  <span className="font-extrabold text-red-500">{totales.devoluciones}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${totales.asignados === 0 ? 'bg-slate-300' : 'bg-red-500'}`} style={{ width: totales.asignados === 0 ? '0%' : `${(totales.devoluciones / totales.asignados) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-bl-full -z-0"></div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 relative z-10">Balance del Rango</h3>
            
            <div className="space-y-6 relative z-10 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${totales.asignados === 0 ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Volumen Transportado</p>
                  <p className={`text-2xl font-extrabold ${totales.asignados === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                    {totales.kilos.toLocaleString()} <span className="text-sm font-medium text-slate-500">kg</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${totales.asignados === 0 ? 'bg-slate-100 text-slate-400' : 'bg-teal-50 text-[#47B3A8]'}`}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Valor Recaudado</p>
                  <p className={`text-2xl font-extrabold ${totales.asignados === 0 ? 'text-slate-400' : 'text-[#47B3A8]'}`}>
                    {formatearMoneda(totales.valor)}
                  </p>
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
                <th className="p-4 font-semibold rounded-tl-lg">Conductor</th>
                <th className="p-4 font-semibold text-center">Asignados</th>
                <th className="p-4 font-semibold text-center">Completas</th>
                <th className="p-4 font-semibold text-center">Incompletas</th>
                <th className="p-4 font-semibold text-center">Devoluciones</th>
                <th className="p-4 font-semibold text-right">Total Kilos</th>
                <th className="p-4 font-semibold text-right bg-teal-50/50 rounded-tr-lg">Valor Entregado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datos.length > 0 ? (
                datos.map((fila, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <Truck size={16} className="text-slate-400" />
                      {fila.conductor}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-600">{fila.total_viajes_asignados}</td>
                    <td className="p-4 text-center text-green-600 font-bold bg-green-50/30">{fila.entregas_completas}</td>
                    <td className="p-4 text-center text-orange-500 font-bold bg-orange-50/30">{fila.entregas_incompletas}</td>
                    <td className="p-4 text-center text-red-500 font-bold bg-red-50/30">{fila.devoluciones}</td>
                    <td className="p-4 text-right text-slate-800 font-extrabold">
                      {Number(fila.total_kilos_transportados).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
                    </td>
                    <td className="p-4 text-right text-[#47B3A8] font-extrabold bg-teal-50/30">
                      {formatearMoneda(fila.valor_total_entregado)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                    <TrendingUp size={48} className="text-slate-200 mb-4" />
                    <p className="text-lg font-bold">No hay despachos registrados</p>
                    <p className="text-sm">En el rango de fechas seleccionado no hay datos de productividad.</p>
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

export default ReporteProductividad;