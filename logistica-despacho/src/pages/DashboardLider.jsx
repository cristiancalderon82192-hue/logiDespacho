import React, { useState, useEffect } from 'react';
import { Calendar, Search, Package, Weight, FileText, MapPin, TrendingUp, Filter, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DashboardLider = () => {
  const { user } = useAuth();

  const date = new Date();
  const defaultInicio = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const defaultFin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(defaultInicio);
  const [fechaFin, setFechaFin] = useState(defaultFin);
  
  const [pedidos, setPedidos] = useState([]);
  const [datosGrafica, setDatosGrafica] = useState([]); 
  const [loading, setLoading] = useState(false);

  const fetchDatos = async () => {
    if (!user) return; 
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/lider/dashboard?inicio=${fechaInicio}&fin=${fechaFin}&usuario_id=${user.id}`);
      
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      
      const data = await response.json();
      
      setPedidos(data.lista || []);     
      setDatosGrafica(data.grafica || []); 
      
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin, user]);

  const totalPedidos = pedidos.length;
  const totalPeso = pedidos.reduce((sum, p) => sum + (Number(p.total_peso) || 0), 0);

  const getPriorityColor = (prioridad) => {
    switch(prioridad?.toUpperCase()) {
      case 'ALTA': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIA': return 'bg-orange-100 text-orange-700 border-orange-200'; 
      case 'BAJA': return 'bg-blue-100 text-blue-700 border-blue-200';       
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-3 md:p-6 bg-slate-50 min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        {/* ENCABEZADO Y FILTROS RESPONSIVOS */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600 w-6 h-6 md:w-8 md:h-8" /> Panel de Líder de Sala
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">
              Hola, <span className="font-bold text-slate-700">{user?.nombre_completo || 'Usuario'}</span>. Resumen filtrado por <span className="font-bold text-blue-500">Fecha Agendada</span>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100 w-full xl:w-auto">
            <div className="flex items-center gap-2 px-2 bg-white sm:bg-transparent p-2 sm:p-0 rounded border sm:border-none">
              <Calendar size={16} className="text-slate-400 shrink-0"/>
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none w-full"
              />
            </div>
            <span className="hidden sm:block text-slate-300">/</span>
            <div className="flex items-center gap-2 px-2 bg-white sm:bg-transparent p-2 sm:p-0 rounded border sm:border-none">
              <input 
                type="date" 
                value={fechaFin} 
                onChange={(e) => setFechaFin(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none w-full"
              />
            </div>
            <button onClick={fetchDatos} className="bg-blue-600 text-white p-2 md:px-4 md:py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm flex justify-center items-center gap-2 mt-2 sm:mt-0">
              <Search size={18} /> <span className="sm:hidden font-bold">Buscar</span>
            </button>
          </div>
        </div>

        {/* TARJETAS KPI Y GRÁFICA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          <div className="space-y-4">
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 transition-transform hover:scale-[1.02]">
              <div className="p-3 md:p-4 bg-blue-50 rounded-full text-blue-600">
                <Package size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wide">Mis Pedidos</p>
                <h3 className="text-2xl md:text-3xl font-black text-slate-800">{totalPedidos}</h3>
                <p className="text-[10px] md:text-xs text-slate-400 mt-1">En el periodo seleccionado</p>
              </div>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 transition-transform hover:scale-[1.02]">
              <div className="p-3 md:p-4 bg-purple-50 rounded-full text-purple-600">
                <Weight size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wide">Kilos Gestionados</p>
                <h3 className="text-2xl md:text-3xl font-black text-slate-800">{totalPeso.toLocaleString()} <span className="text-sm md:text-base font-medium text-slate-500">kg</span></h3>
                <p className="text-[10px] md:text-xs text-slate-400 mt-1">Peso total acumulado</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="text-sm font-bold text-slate-700 mb-4 md:mb-6 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={20}/> Comportamiento Diario
            </h3>
            
            <div className="h-64 w-full overflow-x-auto">
              <div className="min-w-[400px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosGrafica} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="fecha" 
                      tick={{fontSize: 10, fill: '#64748b'}} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(str) => str ? str.slice(5) : ''} 
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{fontSize: 10, fill: '#64748b'}} 
                      axisLine={false} 
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cantidad" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
                {datosGrafica.length === 0 && (
                  <div className="h-full flex items-center justify-center mt-[-150px]">
                     <p className="text-xs text-slate-400">Sin datos para graficar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE MIS PEDIDOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm md:text-base">
              <Filter size={16} className="text-slate-400"/> Detalle de Operaciones
            </h3>
            <span className="text-[10px] md:text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {pedidos.length} Registros
            </span>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white text-slate-500 text-[10px] md:text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="p-3 md:p-4 font-bold">Fecha Agendada</th>
                  <th className="p-3 md:p-4 font-bold">Documento</th>
                  <th className="p-3 md:p-4 font-bold">Cliente</th>
                  <th className="p-3 md:p-4 font-bold">Destino / Zona</th>
                  <th className="p-3 md:p-4 font-bold text-center">Peso</th>
                  <th className="p-3 md:p-4 font-bold text-center">Prioridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">Cargando información...</td></tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2"><AlertCircle size={24} className="opacity-50"/> No tienes pedidos en este rango.</div>
                    </td>
                  </tr>
                ) : (
                  pedidos.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors text-xs md:text-sm text-slate-700">
                      <td className="p-3 md:p-4 text-slate-500 font-medium">
                        {p.fecha_agendada ? p.fecha_agendada : <span className="text-slate-300 italic">Sin agendar</span>}
                      </td>
                      <td className="p-3 md:p-4 font-bold text-blue-600 font-mono text-sm md:text-base">{p.id_factura}</td>
                      <td className="p-3 md:p-4 font-medium"><p className="truncate max-w-[150px] md:max-w-xs" title={p.nombre_cliente}>{p.nombre_cliente}</p></td>
                      <td className="p-3 md:p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold flex items-center gap-1"><MapPin size={12} className="text-slate-400 shrink-0"/> {p.destino}</span>
                          <span className="text-[9px] md:text-[10px] text-slate-400 uppercase">{p.zona_envio || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-3 md:p-4 text-center font-bold font-mono">{Number(p.total_peso).toLocaleString()} kg</td>
                      <td className="p-3 md:p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] md:text-[10px] font-bold uppercase border ${getPriorityColor(p.prioridad)}`}>
                          {p.prioridad}
                        </span>
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
  );
};

export default DashboardLider;