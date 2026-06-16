import React, { useState, useEffect } from 'react';
import { Clock, LayoutDashboard, CheckCircle, Package, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DateRangeSelector from '../components/DateRangeSelector';

const DashboardBodega = () => {
  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const obtenerPrimerDiaMesLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${año}-${mes}-01`;
  };

  const hoy = obtenerFechaLocal();
  const primerDiaMes = obtenerPrimerDiaMesLocal();

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [stats, setStats] = useState({ total_pendientes: 0, total_parciales: 0, total_entregados: 0, items_totales_espera: 0 });

  const cargarKpis = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/dashboard?inicio=${fechaInicio}&fin=${fechaFin}`);
      if (res.ok) setStats(await res.json());
    } catch (error) { console.error("Error", error); }
  };

  useEffect(() => {
    cargarKpis();

    // Actualización en tiempo real silenciosa (cada 5 segundos)
    const interval = setInterval(cargarKpis, 5000);
    return () => clearInterval(interval);
  }, [fechaInicio, fechaFin]);

  // Datos para las gráficas basados en los KPIs actuales
  const dataDistribucion = [
    { name: 'Pendientes', value: Number(stats.total_pendientes) || 0, color: '#f97316' },
    { name: 'Parciales', value: Number(stats.total_parciales) || 0, color: '#3b82f6' },
    { name: 'Entregados', value: Number(stats.total_entregados) || 0, color: '#22c55e' }
  ];

  const dataBarras = [
    { 
      name: 'Volumen', 
      Pendientes: Number(stats.total_pendientes) || 0, 
      Parciales: Number(stats.total_parciales) || 0, 
      Entregados: Number(stats.total_entregados) || 0 
    }
  ];

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen w-full max-w-full overflow-x-hidden animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Dashboard Operativo de Mostrador</h1>
          <p className="text-sm text-slate-500">Métricas en tiempo real de entregas y materiales en espera</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit animate-fade-in-up-1">
          <DateRangeSelector 
            fechaInicio={fechaInicio} 
            setFechaInicio={setFechaInicio} 
            fechaFin={fechaFin} 
            setFechaFin={setFechaFin} 
          />
          <button onClick={cargarKpis} className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition-colors shadow-sm" title="Actualizar datos">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow animate-fade-in-up-1">
          <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl"><Clock size={28}/></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase">Facturas Pendientes</p><p className="text-3xl font-black text-slate-800">{stats.total_pendientes}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow animate-fade-in-up-2">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl"><LayoutDashboard size={28}/></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase">Entregas Parciales</p><p className="text-3xl font-black text-slate-800">{stats.total_parciales}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow animate-fade-in-up-3">
          <div className="p-4 bg-green-100 text-green-600 rounded-2xl"><CheckCircle size={28}/></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase">Total Entregados</p><p className="text-3xl font-black text-slate-800">{stats.total_entregados}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow animate-fade-in-up-4">
          <div className="p-4 bg-purple-100 text-purple-600 rounded-2xl"><Package size={28}/></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase">Items en Espera</p><p className="text-3xl font-black text-slate-800">{parseFloat(stats.items_totales_espera).toFixed(0)}</p></div>
        </div>
      </div>

      {/* ================= SECCIÓN DE GRÁFICAS ANIMADAS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 md:mt-8">
        
        {/* GRÁFICA DE DONA: Distribución */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up-3">
          <h2 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-6">
            <PieChartIcon size={20} className="text-orange-500"/> Distribución de Operaciones
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataDistribucion} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" animationDuration={1500}>
                  {dataDistribucion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICA DE BARRAS: Comparativa */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up-4">
          <h2 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-6">
            <BarChart2 size={20} className="text-blue-500"/> Comparativa de Volumen
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataBarras} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                <Bar dataKey="Pendientes" fill="#f97316" radius={[4, 4, 0, 0]} animationDuration={1500} barSize={40} />
                <Bar dataKey="Parciales" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1500} barSize={40} />
                <Bar dataKey="Entregados" fill="#22c55e" radius={[4, 4, 0, 0]} animationDuration={1500} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up-1 { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-fade-in-up-2 { animation: fadeInUp 0.5s ease-out 0.1s forwards; opacity: 0; }
        .animate-fade-in-up-3 { animation: fadeInUp 0.5s ease-out 0.2s forwards; opacity: 0; }
        .animate-fade-in-up-4 { animation: fadeInUp 0.5s ease-out 0.3s forwards; opacity: 0; }
      `}</style>
    </div>
  );
};
export default DashboardBodega;