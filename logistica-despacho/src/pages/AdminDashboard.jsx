import React, { useEffect, useState } from 'react';
import { LayoutDashboard, TrendingUp, Package, Weight, Calendar, Search, BarChart as BarIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const date = new Date();
  const defaultInicio = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const defaultFin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(defaultInicio);
  const [fechaFin, setFechaFin] = useState(defaultFin);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3000/api/dashboard?inicio=${fechaInicio}&fin=${fechaFin}`);
      if (!response.ok) throw new Error('Error al obtener datos del servidor');
      const data = await response.json();
      setStats(data);

      if (data.bodegas) {
        const bodegasArray = [
          { name: 'B1', peso: Number(data.bodegas.b1 || 0) },
          { name: 'B2', peso: Number(data.bodegas.b2 || 0) },
          { name: 'B3', peso: Number(data.bodegas.b3 || 0) },
          { name: 'B4', peso: Number(data.bodegas.b4 || 0) },
          { name: 'B5', peso: Number(data.bodegas.b5 || 0) },
          { name: 'B6', peso: Number(data.bodegas.b6 || 0) },
          { name: 'B7', peso: Number(data.bodegas.b7 || 0) },
          { name: 'B8', peso: Number(data.bodegas.b8 || 0) },
        ];
        setChartData(bodegasArray);
      }
    } catch (err) {
      console.error("Error Dashboard:", err);
      setError("No se pudo conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin]);

  if (loading) return <div className="p-4 md:p-8 text-center text-slate-500">Cargando indicadores...</div>;
  if (error) return <div className="p-4 md:p-8 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full max-w-full overflow-x-hidden">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" size={28} /> Panel de Control
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            Hola, <span className="font-bold text-slate-800">{user?.nombre_completo}</span>. Resumen filtrado por <span className="font-bold text-blue-500">Fecha Agendada</span>.
          </p>
        </div>
        
        {/* FILTROS RESPONSIVOS */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-200 w-full xl:w-auto">
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1">Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"/>
          </div>
          <span className="hidden sm:block text-slate-300 pb-2">/</span>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1">Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"/>
          </div>
          <button onClick={fetchDashboard} className="w-full sm:w-auto mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg flex justify-center items-center gap-2 transition-colors">
            <Search size={18} /> <span className="sm:hidden font-bold">Buscar</span>
          </button>
        </div>
      </div>

      {/* KPIs RESPONSIVOS */}
      {stats && stats.kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 md:p-4 bg-blue-50 text-blue-600 rounded-lg"><Package size={28} /></div>
            <div>
              <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Total Pedidos</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{stats.kpis.total_pedidos}</h3>
            </div>
          </div>
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 md:p-4 bg-purple-50 text-purple-600 rounded-lg"><Weight size={28} /></div>
            <div>
              <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Kilos Despachados</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{Number(stats.kpis.total_peso).toLocaleString('es-CO')} <span className="text-sm md:text-lg text-slate-400">kg</span></h3>
            </div>
          </div>
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
            <div className="p-3 md:p-4 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={28} /></div>
            <div>
              <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Valor Facturado</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800">$ {Number(stats.kpis.total_valor).toLocaleString('es-CO')}</h3>
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICA RESPONSIVA (SCROLL TÁCTIL) */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <h3 className="text-base md:text-lg font-bold text-slate-700 mb-4 md:mb-6 flex items-center gap-2">
          <BarIcon className="text-purple-600" size={20}/> Distribución de Carga
        </h3>
        <div className="h-64 md:h-80 w-full overflow-x-auto">
          <div className="min-w-[500px] h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 'bold'}} />
                <YAxis tickFormatter={(value) => `${value}kg`} width={60} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="peso" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#8b5cf6'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLAS RESPONSIVAS */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-700">Top Destinos por Peso</h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm min-w-[400px]">
                <thead className="text-slate-400 font-medium border-b">
                  <tr>
                    <th className="px-4 md:px-6 py-3">Ciudad</th>
                    <th className="px-4 py-3 text-center">Entregas</th>
                    <th className="px-4 md:px-6 py-3 text-right">Peso Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.destinos && stats.destinos.length > 0 ? (
                    stats.destinos.map((d, index) => (
                      <tr key={index}>
                        <td className="px-4 md:px-6 py-3 font-medium text-slate-700">{d.destino}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{d.entregas}</td>
                        <td className="px-4 md:px-6 py-3 text-right font-bold text-blue-600">{Number(d.peso).toLocaleString()} kg</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-400">No hay datos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-700">Pedidos por Prioridad</h3>
            </div>
            <div className="p-4 md:p-6">
              {stats.prioridad && stats.prioridad.length > 0 ? (
                <div className="space-y-4">
                  {stats.prioridad.map((p, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-sm font-bold ${p.prioridad === 'Alta' ? 'text-red-500' : p.prioridad === 'Media' ? 'text-orange-500' : 'text-blue-500'}`}>{p.prioridad}</span>
                        <span className="text-sm text-slate-500">{p.cantidad} pedidos</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${p.prioridad === 'Alta' ? 'bg-red-500' : p.prioridad === 'Media' ? 'bg-orange-400' : 'bg-blue-400'}`} style={{ width: `${(p.cantidad / stats.kpis.total_pedidos) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-4">Sin datos de prioridad en este rango</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;