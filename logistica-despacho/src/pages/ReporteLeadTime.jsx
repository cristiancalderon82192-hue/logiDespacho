import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Search, Target, CheckCircle, AlertTriangle, Truck, FileText, Loader2, User, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReporteLeadTime = () => {
  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };
  const hoy = obtenerFechaLocal();

  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Meta de la empresa basada en el Excel (2 días)
  const SLA_META_DIAS = 2; 

  const fetchLeadTime = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos-rango?inicio=${fechaInicio}&fin=${fechaFin}`);
      const pedidos = await res.json();

      const procesados = pedidos
        .filter(p => p.estado_entrega === 'Entregado' || p.estado_entrega === 'Entregado Incompleto')
        .map(p => {
          const fFacturacion = p.fecha_facturacion ? new Date(p.fecha_facturacion) : new Date(p.fecha_agendada);
          const fEntrega = p.fecha_agendada ? new Date(p.fecha_agendada) : new Date();

          const diffTime = Math.abs(fEntrega - fFacturacion);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const cumple = diffDays <= SLA_META_DIAS;

          return { ...p, lead_time: diffDays, cumple };
        });

      setDatos(procesados);
    } catch (error) {
      console.error("Error al cargar Lead Time:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadTime();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalEntregas = datos.length;
  const promedioLeadTime = totalEntregas > 0 
    ? (datos.reduce((acc, curr) => acc + curr.lead_time, 0) / totalEntregas).toFixed(1) 
    : 0;
  
  const entregasCumplidas = datos.filter(d => d.cumple).length;
  const porcentajeCumplimiento = totalEntregas > 0 
    ? Math.round((entregasCumplidas / totalEntregas) * 100) 
    : 0;

  const pieData = [
    { name: 'Cumple (≤ 2 días)', value: entregasCumplidas, color: '#10b981' }, 
    { name: 'No Cumple (> 2 días)', value: totalEntregas - entregasCumplidas, color: '#ef4444' } 
  ];

  const driverMap = {};
  datos.forEach(d => {
    const driver = d.conductor_nombre || 'Sin asignar';
    if(!driverMap[driver]) driverMap[driver] = { driver, totalDays: 0, count: 0 };
    driverMap[driver].totalDays += d.lead_time;
    driverMap[driver].count += 1;
  });

  const barData = Object.values(driverMap).map(d => ({
    name: d.driver,
    'Promedio Días': Number((d.totalDays / d.count).toFixed(1))
  })).sort((a, b) => a['Promedio Días'] - b['Promedio Días']); 

  // ================= FUNCIONES DE EXPORTACIÓN =================

  const exportarExcel = () => {
    const datosFormateados = datos.map(d => ({
      'Factura': d.id_factura,
      'Cliente': d.nombre_cliente || 'N/A',
      'Fecha Factura': d.fecha_facturacion || 'N/A',
      'Fecha Entrega': d.fecha_agendada || 'N/A',
      'Conductor': d.conductor_nombre || 'Sin asignar',
      'Días Lead Time': d.lead_time,
      'Cumplimiento SLA': d.cumple ? 'Cumple (≤ 2 Días)' : 'No Cumple (> 2 Días)'
    }));

    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Lead Time");
    XLSX.writeFile(libro, `LeadTime_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF('landscape');
    
    // HEADER (Fondo Oscuro Corporativo)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 300, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Análisis de Lead Time", 14, 20);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Rango evaluado: ${fechaInicio} hasta ${fechaFin}`, 14, 30);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 200, 30);

    // TARJETAS DE INDICADORES (KPIs visuales)
    let startY = 48;
    
    // Tarjeta 1: Entregas
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(14, startY, 85, 35, 3, 3, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ENTREGAS EVALUADAS", 20, startY + 8);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(`${totalEntregas}`, 20, startY + 22);

    // Tarjeta 2: Promedio General
    doc.setFillColor(255, 247, 237); // orange-50
    doc.roundedRect(105, startY, 85, 35, 3, 3, 'F');
    doc.setTextColor(234, 88, 12); // orange-600
    doc.setFontSize(10);
    doc.text("PROMEDIO GENERAL", 111, startY + 8);
    doc.setFontSize(24);
    doc.text(`${promedioLeadTime} Días`, 111, startY + 22);

    // Tarjeta 3: Cumplimiento
    if(porcentajeCumplimiento >= 80) {
       doc.setFillColor(240, 253, 244); // green-50
       doc.setTextColor(22, 163, 74); // green-600
    } else {
       doc.setFillColor(254, 242, 242); // red-50
       doc.setTextColor(220, 38, 38); // red-600
    }
    doc.roundedRect(196, startY, 85, 35, 3, 3, 'F');
    doc.setFontSize(10);
    doc.text("CUMPLIMIENTO (SLA <= 2)", 202, startY + 8);
    doc.setFontSize(24);
    doc.text(`${porcentajeCumplimiento}%`, 202, startY + 22);

    // TABLA DE DATOS
    const columnas = ["Factura", "Cliente", "Fecha Factura", "Fecha Entrega", "Conductor", "Lead Time", "Cumplimiento"];
    const filas = datos.map(d => [
      d.id_factura,
      d.nombre_cliente || 'N/A',
      d.fecha_facturacion || 'N/A',
      d.fecha_agendada || 'N/A',
      d.conductor_nombre || '---',
      `${d.lead_time} días`,
      d.cumple ? 'Sí Cumple' : 'No Cumple'
    ]);

    autoTable(doc, {
      startY: startY + 45,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [71, 179, 168], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw === 'Sí Cumple') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`LeadTime_${fechaInicio}_al_${fechaFin}.pdf`);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 w-full max-w-full overflow-x-hidden animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
          
          {/* ================= HEADER Y FILTROS RESPONSIVOS ================= */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
            
            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="bg-teal-100 p-3 rounded-lg text-[#47B3A8] shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-tight">Análisis de Lead Time</h1>
                <p className="text-xs sm:text-sm text-slate-500">Mide el tiempo desde la facturación hasta la entrega.</p>
              </div>
            </div>
            
            {/* Controles: Fechas y Botón (Adaptable a Móvil) */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch lg:items-center gap-3 w-full lg:w-auto">
              
              {/* Caja de Fechas */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 sm:px-4 sm:py-2 shadow-sm focus-within:border-[#47B3A8] transition-colors w-full sm:w-auto">
                
                {/* Fecha Desde */}
                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-[#47B3A8]" />
                    <span className="text-xs font-bold text-slate-400 uppercase">Desde</span>
                  </div>
                  <input 
                    type="date" 
                    value={fechaInicio} 
                    onChange={(e) => setFechaInicio(e.target.value)} 
                    className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer" 
                  />
                </div>
                
                {/* Separador */}
                <div className="h-px w-full sm:w-px sm:h-6 bg-slate-200 sm:bg-slate-300"></div>
                
                {/* Fecha Hasta */}
                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-400 uppercase">Hasta</span>
                  <input 
                    type="date" 
                    value={fechaFin} 
                    onChange={(e) => setFechaFin(e.target.value)} 
                    className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer" 
                  />
                </div>
              </div>

              {/* Botón Filtrar y Exportar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto mt-1 sm:mt-0">
                <button 
                  onClick={fetchLeadTime} 
                  className="w-full sm:w-auto bg-[#47B3A8] hover:bg-[#3A948C] text-white px-4 py-2.5 sm:py-2 rounded-lg flex justify-center items-center gap-2 shadow-sm transition-all active:scale-95 font-medium text-sm"
                >
                  <Search size={18} /> Filtrar
                </button>
                
                <div className="w-px h-8 bg-slate-200 hidden sm:block mx-1"></div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={exportarExcel} disabled={loading || datos.length === 0} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm">
                    <FileText size={18} /> Excel
                  </button>
                  <button onClick={exportarPDF} disabled={loading || datos.length === 0} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm">
                    <Download size={18} /> PDF
                  </button>
                </div>
              </div>

            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <Loader2 size={40} className="animate-spin text-[#47B3A8] mb-4" />
              <p className="font-bold animate-pulse">Analizando tiempos de entrega...</p>
            </div>
          ) : (
            <>
              {/* ================= KPIs PRINCIPALES ================= */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Truck size={28}/></div>
                  <div>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Entregas Evaluadas</p>
                    <h3 className="text-3xl font-extrabold text-slate-800">{totalEntregas}</h3>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
                  <div className="p-4 bg-orange-50 text-orange-600 rounded-xl"><Clock size={28}/></div>
                  <div>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Promedio General</p>
                    <h3 className="text-3xl font-extrabold text-slate-800">{promedioLeadTime} <span className="text-base text-slate-400 font-medium">Días</span></h3>
                  </div>
                </div>
                <div className={`p-6 rounded-2xl shadow-sm border flex items-center gap-5 text-white ${porcentajeCumplimiento >= 80 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400' : 'bg-gradient-to-br from-red-500 to-red-600 border-red-400'}`}>
                  <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm"><Target size={28}/></div>
                  <div>
                    <p className="text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-widest">Cumplimiento (SLA ≤ 2 Días)</p>
                    <h3 className="text-3xl font-extrabold">{porcentajeCumplimiento}%</h3>
                  </div>
                </div>
              </div>

              {/* ================= GRÁFICAS INTERACTIVAS ================= */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Target className="text-indigo-500" size={20}/> Tasa de Éxito</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', fontWeight: 'bold' }} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><User className="text-[#47B3A8]" size={20}/> Tiempos Promedio por Conductor</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11, fontWeight: 'bold'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                        <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '10px', fontWeight: 'bold', border: '1px solid #E2E8F0' }} />
                        <Bar dataKey="Promedio Días" radius={[6, 6, 0, 0]} maxBarSize={50}>
                          {barData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry['Promedio Días'] <= SLA_META_DIAS ? '#4ade80' : '#f87171'} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 mt-2 font-bold uppercase">* Barras rojas indican un promedio por encima de los 2 días (Incumplimiento).</p>
                </div>
              </div>

              {/* ================= TABLA DE AUDITORÍA ================= */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-slate-400"/> Detalle de Facturas Evaluadas</h3>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-white border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="p-4 font-bold">Documento</th>
                        <th className="p-4 font-bold">Fecha Factura</th>
                        <th className="p-4 font-bold">Fecha Entrega</th>
                        <th className="p-4 font-bold">Conductor</th>
                        <th className="p-4 font-bold text-center">Días Lead Time</th>
                        <th className="p-4 font-bold text-center">Cumplimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {datos.length === 0 ? (
                        <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay entregas registradas en este periodo.</td></tr>
                      ) : (
                        datos.map((d, index) => (
                          <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-blue-600">{d.id_factura}</td>
                            <td className="p-4 text-slate-600">{d.fecha_facturacion || 'N/A'}</td>
                            <td className="p-4 text-slate-600 font-medium">{d.fecha_agendada || 'N/A'}</td>
                            <td className="p-4 text-slate-700 font-bold">{d.conductor_nombre || '---'}</td>
                            <td className="p-4 text-center font-extrabold text-slate-800">{d.lead_time}</td>
                            <td className="p-4 text-center">
                              {d.cumple ? (
                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1"><CheckCircle size={12}/> Sí Cumple</span>
                              ) : (
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1"><AlertTriangle size={12}/> No Cumple</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReporteLeadTime;