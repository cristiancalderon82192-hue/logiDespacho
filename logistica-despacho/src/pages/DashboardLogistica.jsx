import React, { useState, useEffect } from 'react';
import { Calendar, Package, Weight, MapPin, Truck, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DashboardLogistica = () => {
  // --- FUNCIÓN PARA OBTENER FECHA LOCAL EXACTA DEL PC ---
  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const hoyLocal = obtenerFechaLocal();
  
  // Por defecto, vemos los despachos agendados para HOY (hora local)
  const [fechaFiltro, setFechaFiltro] = useState(hoyLocal);
  
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState({ total_pedidos: 0, total_peso: 0 });
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [destinosTop, setDestinosTop] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Como tu backend ya filtra por fecha_agendada, usamos el mismo endpoint
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard?inicio=${fechaFiltro}&fin=${fechaFiltro}`);
      const data = await res.json();
      
      setKpis({ 
        total_pedidos: data.kpis?.total_pedidos || 0, 
        total_peso: data.kpis?.total_peso || 0 
      });

      if (data.bodegas) {
        setDatosGrafica(Object.keys(data.bodegas).map(key => ({
          name: key.toUpperCase(), peso: Number(data.bodegas[key])
        })));
      }

      setDestinosTop(data.destinos || []);
    } catch (error) {
      console.error("Error al cargar dashboard logístico", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaFiltro]);

  const COLORS = ['#47B3A8', '#3A948C', '#2C7A73', '#1F5F59', '#124540'];

  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER Y FILTRO DE FECHA AGENDADA */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <TrendingUp className="text-[#47B3A8]" size={32} /> 
              Operación Logística
            </h1>
            <p className="text-slate-500 mt-1">Monitoreo de carga y rutas por fecha de salida</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-3 bg-slate-100 p-2 rounded-xl border border-slate-200">
            <Calendar className="text-slate-500 ml-2" size={20} />
            <span className="text-sm font-bold text-slate-600 uppercase">Fecha Salida:</span>
            <input 
              type="date" 
              value={fechaFiltro} 
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-[#47B3A8] focus:border-[#47B3A8] block p-2 outline-none font-bold"
            />
          </div>
        </div>

        {/* KPIs PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-lg text-white flex items-center gap-6">
            <div className="bg-white/10 p-4 rounded-xl"><Package size={40} className="text-[#47B3A8]"/></div>
            <div>
              <p className="text-slate-400 font-bold tracking-wider text-sm uppercase">Despachos Agendados</p>
              <h3 className="text-5xl font-extrabold mt-1">{kpis.total_pedidos}</h3>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#47B3A8] to-[#2C7A73] rounded-2xl p-6 shadow-lg text-white flex items-center gap-6">
            <div className="bg-white/20 p-4 rounded-xl"><Weight size={40} className="text-white"/></div>
            <div>
              <p className="text-teal-100 font-bold tracking-wider text-sm uppercase">Peso Total a Mover</p>
              <h3 className="text-5xl font-extrabold mt-1">{Number(kpis.total_peso).toLocaleString()} <span className="text-2xl font-medium opacity-80">Kg</span></h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GRÁFICA DE PESOS */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Weight className="text-[#47B3A8]" /> Distribución de Carga por Bodega
            </h3>
            <div className="h-80 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400">Cargando gráfica...</div>
              ) : datosGrafica.length === 0 || kpis.total_peso === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">No hay carga agendada para esta fecha.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafica} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8'}} />
                    <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="peso" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {datosGrafica.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* TABLA DE DESTINOS */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <MapPin className="text-orange-500" /> Destinos de la Jornada
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold">Ciudad / Destino</th>
                    <th className="p-4 font-bold text-center">Despachos</th>
                    <th className="p-4 font-bold text-right">Peso (Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {loading ? (
                    <tr><td colSpan="3" className="p-8 text-center text-slate-400">Cargando destinos...</td></tr>
                  ) : destinosTop.length === 0 ? (
                    <tr><td colSpan="3" className="p-8 text-center text-slate-400">No hay rutas agendadas hoy.</td></tr>
                  ) : (
                    destinosTop.map((d, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-700 flex items-center gap-2">
                          <Truck size={16} className="text-slate-400" /> {d.destino}
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">{d.entregas}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-800">
                          {Number(d.peso).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardLogistica;