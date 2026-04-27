import React, { useState, useEffect } from 'react';
// 👇 AQUÍ ESTÁ EL ARREGLO: Agregué 'User' a la lista de importaciones 👇
import { Clock, Calendar, Search, Target, CheckCircle, AlertTriangle, Truck, FileText, Loader2, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const ReporteLeadTime = () => {
  const date = new Date();
  const defaultInicio = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const defaultFin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(defaultInicio);
  const [fechaFin, setFechaFin] = useState(defaultFin);
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Meta de la empresa basada en el Excel (2 días)
  const SLA_META_DIAS = 2; 

  const fetchLeadTime = async () => {
    setLoading(true);
    try {
      // Usamos la API existente de rango para traer los pedidos (¡Por eso no ocupas backend nuevo!)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos-rango?inicio=${fechaInicio}&fin=${fechaFin}`);
      const pedidos = await res.json();

      // Procesamos solo los pedidos que ya fueron entregados para medir el Lead Time real
      const procesados = pedidos
        .filter(p => p.estado_entrega === 'Entregado' || p.estado_entrega === 'Entregado Incompleto')
        .map(p => {
          // Asegurarnos de que existan las fechas
          const fFacturacion = p.fecha_facturacion ? new Date(p.fecha_facturacion) : new Date(p.fecha_agendada);
          const fEntrega = p.fecha_agendada ? new Date(p.fecha_agendada) : new Date();

          // Cálculo de diferencia en días
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

  // ================= CÁLCULO DE KPIs =================
  const totalEntregas = datos.length;
  const promedioLeadTime = totalEntregas > 0 
    ? (datos.reduce((acc, curr) => acc + curr.lead_time, 0) / totalEntregas).toFixed(1) 
    : 0;
  
  const entregasCumplidas = datos.filter(d => d.cumple).length;
  const porcentajeCumplimiento = totalEntregas > 0 
    ? Math.round((entregasCumplidas / totalEntregas) * 100) 
    : 0;

  // ================= DATOS PARA GRÁFICAS =================
  // Gráfica 1: Pastel (Cumplimiento)
  const pieData = [
    { name: 'Cumple (≤ 2 días)', value: entregasCumplidas, color: '#10b981' }, // Verde
    { name: 'No Cumple (> 2 días)', value: totalEntregas - entregasCumplidas, color: '#ef4444' } // Rojo
  ];

  // Gráfica 2: Barras (Promedio por Conductor)
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
  })).sort((a, b) => a['Promedio Días'] - b['Promedio Días']); // Ordenar de más rápido a más lento

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 w-full max-w-full overflow-x-hidden animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER Y FILTROS */}
        <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-4 border-b border-slate-200 pb-6 bg-white p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <Clock className="text-[#47B3A8]" size={32} /> Análisis de Lead Time
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Mide el tiempo transcurrido desde la facturación hasta la entrega al cliente.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full sm:w-auto">
              <Calendar className="text-slate-400 ml-1" size={18}/>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none font-bold"/>
              <span className="text-slate-300">/</span>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none font-bold"/>
            </div>
            <button onClick={fetchLeadTime} className="w-full sm:w-auto bg-[#47B3A8] hover:bg-[#3A948C] text-white p-2.5 px-5 rounded-xl flex justify-center items-center gap-2 shadow-md transition-all active:scale-95 font-bold">
              <Search size={18} /> Filtrar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 size={40} className="animate-spin text-[#47B3A8] mb-4" />
            <p className="font-bold animate-pulse">Analizando tiempos de entrega...</p>
          </div>
        ) : (
          <>
            {/* ================= KPIs PRINCIPALES ================= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Gráfica de Pastel: Cumplimiento */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                  <Target className="text-indigo-500" size={20}/> Tasa de Éxito
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '10px', fontWeight: 'bold' }} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfica de Barras: Promedio por Conductor */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                  <User className="text-[#47B3A8]" size={20}/> Tiempos Promedio por Conductor
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                      <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '10px', fontWeight: 'bold', border: '1px solid #E2E8F0' }} />
                      <Bar dataKey="Promedio Días" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry['Promedio Días'] <= SLA_META_DIAS ? '#4ade80' : '#f87171'} />
                        ))}
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
  );
};

export default ReporteLeadTime;