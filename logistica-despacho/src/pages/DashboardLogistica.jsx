import React, { useState, useEffect } from 'react';
// 👇 AQUÍ ESTÁ EL ARREGLO: Agregué Loader2 al final de esta lista 👇
import { Calendar, Package, Weight, MapPin, Truck, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
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
  
  const [fechaFiltro, setFechaFiltro] = useState(hoyLocal);
  const [loading, setLoading] = useState(false);
  
  // Estados de datos
  const [kpis, setKpis] = useState({ total_pedidos: 0, total_peso: 0 });
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [destinosTop, setDestinosTop] = useState([]);
  const [flotaDia, setFlotaDia] = useState([]); 

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Llamamos a las 2 APIs al mismo tiempo (Dashboard general + Ocupación de flota del día)
      const [resDash, resFlota] = await Promise.all([
        fetch(`${apiUrl}/api/dashboard?inicio=${fechaFiltro}&fin=${fechaFiltro}`),
        fetch(`${apiUrl}/api/reportes/flota?fechaInicio=${fechaFiltro}&fechaFin=${fechaFiltro}`)
      ]);
      
      const dataDash = await resDash.json();
      const dataFlota = await resFlota.json();
      
      // 1. Setear KPIs Generales
      setKpis({ 
        total_pedidos: dataDash.kpis?.total_pedidos || 0, 
        total_peso: dataDash.kpis?.total_peso || 0 
      });

      // 2. Setear Gráfica de Bodegas
      if (dataDash.bodegas) {
        setDatosGrafica(Object.keys(dataDash.bodegas).map(key => ({
          name: key.toUpperCase(), peso: Number(dataDash.bodegas[key])
        })));
      }

      // 3. Setear Destinos
      setDestinosTop(dataDash.destinos || []);

      // 4. Setear Flota y ordenarla (Los que tienen carga primero, luego los vacíos)
      if (Array.isArray(dataFlota)) {
        const flotaOrdenada = dataFlota.sort((a, b) => b.porcentaje_ocupacion - a.porcentaje_ocupacion);
        setFlotaDia(flotaOrdenada);
      }

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

  // Función para dar color a la barra de peso del camión
  const colorOcupacion = (porcentaje) => {
    if (porcentaje > 100) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'; // Peligro: Sobrecarga
    if (porcentaje >= 85) return 'bg-orange-500'; // Advertencia: Casi lleno
    if (porcentaje >= 40) return 'bg-green-500'; // Óptimo
    if (porcentaje > 0) return 'bg-[#47B3A8]'; // Ligero
    return 'bg-slate-300'; // Vacío
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* ================= HEADER Y FILTRO ================= */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <TrendingUp className="text-[#47B3A8]" size={32} /> 
              Operación Logística
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Monitoreo de carga, rutas y ocupación por fecha de salida</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-200 focus-within:border-[#47B3A8] transition-colors shadow-inner">
            <Calendar className="text-[#47B3A8] ml-1" size={20} />
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider hidden sm:block">Fecha de Salida:</span>
            <input 
              type="date" 
              value={fechaFiltro} 
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-transparent border-none text-slate-700 text-sm md:text-base block p-1 outline-none font-bold cursor-pointer"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 size={40} className="animate-spin text-[#47B3A8] mb-4" />
            <p className="font-bold animate-pulse">Calculando logísticas y pesos...</p>
          </div>
        ) : (
          <>
            {/* ================= KPIs PRINCIPALES ANIMADOS ================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up-1">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 shadow-lg text-white flex items-center gap-6 hover:shadow-xl transition-shadow group overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-5 [background-size:20px_20px]"></div>
                <div className="bg-white/10 p-4 md:p-5 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform"><Package size={40} className="text-[#47B3A8] drop-shadow-md"/></div>
                <div className="relative z-10">
                  <p className="text-slate-400 font-extrabold tracking-widest text-[10px] md:text-xs uppercase mb-1">Despachos Agendados</p>
                  <h3 className="text-4xl md:text-5xl font-black">{kpis.total_pedidos}</h3>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#3b9c92] to-[#2C7A73] rounded-2xl p-6 md:p-8 shadow-lg text-white flex items-center gap-6 hover:shadow-xl transition-shadow group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -z-0"></div>
                <div className="bg-white/20 p-4 md:p-5 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform relative z-10"><Weight size={40} className="text-white drop-shadow-md"/></div>
                <div className="relative z-10">
                  <p className="text-teal-100 font-extrabold tracking-widest text-[10px] md:text-xs uppercase mb-1">Peso Total a Mover</p>
                  <h3 className="text-4xl md:text-5xl font-black">{Number(kpis.total_peso).toLocaleString()} <span className="text-xl md:text-2xl font-medium opacity-80">Kg</span></h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
              
              {/* ================= MONITOR DE VEHÍCULOS (NUEVO Y ANIMADO) ================= */}
              <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 xl:col-span-1 animate-fade-in-up-2 flex flex-col">
                <h3 className="text-base md:text-lg font-extrabold text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
                  <Truck className="text-indigo-500" /> Estado de Flota en Ruta
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 max-h-[400px]">
                  {flotaDia.length > 0 ? (
                    flotaDia.map((v, idx) => {
                      const ocupacion = Number(v.porcentaje_ocupacion);
                      const sobrecargado = ocupacion > 100;
                      const sinCarga = ocupacion === 0;

                      return (
                        <div key={idx} className="group">
                          <div className="flex justify-between items-end mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${sinCarga ? 'bg-slate-100' : sobrecargado ? 'bg-red-100 animate-pulse' : 'bg-teal-50'}`}>
                                <Truck size={14} className={sinCarga ? 'text-slate-400' : sobrecargado ? 'text-red-600' : 'text-[#47B3A8]'} />
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-700 text-sm block leading-none">{v.placa}</span>
                                <span className="font-medium text-[10px] text-slate-400">{v.modelo}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-black ${sobrecargado ? 'text-red-600' : 'text-slate-700'}`}>
                                {Number(v.kilos_reales_cargados).toLocaleString()} 
                                <span className="font-medium text-slate-400"> / {Number(v.capacidad_kg).toLocaleString()} kg</span>
                              </span>
                            </div>
                          </div>
                          
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner relative">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${colorOcupacion(ocupacion)}`}
                              style={{ width: `${Math.min(ocupacion, 100)}%` }}
                            >
                              {!sinCarga && <div className="absolute top-0 left-0 bottom-0 w-full bg-white/20 animate-[shimmer_2s_infinite]"></div>}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <span className={`text-[10px] font-bold ${sobrecargado ? 'text-red-500 flex items-center gap-1' : 'text-slate-400'}`}>
                              {sobrecargado && <AlertTriangle size={10} />}
                              {sobrecargado ? '¡ALERTA DE SOBRECARGA!' : sinCarga ? 'Vehículo disponible' : `${v.total_pedidos_cargados} pedidos asignados`}
                            </span>
                            <span className={`text-[10px] font-black ${sobrecargado ? 'text-red-600' : 'text-slate-500'}`}>{ocupacion}%</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                      <Truck size={40} className="text-slate-200 mb-3" />
                      <p className="text-sm font-bold">Sin flota registrada</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= GRÁFICA Y DESTINOS ================= */}
              <div className="xl:col-span-2 flex flex-col gap-6 md:gap-8">
                
                {/* GRÁFICA DE PESOS */}
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up-3">
                  <h3 className="text-base md:text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                    <Weight className="text-[#47B3A8]" /> Distribución de Carga por Bodega
                  </h3>
                  <div className="h-64 md:h-72 w-full">
                    {datosGrafica.length === 0 || kpis.total_peso === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No hay carga agendada para esta fecha.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datosGrafica} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 'bold', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} tickFormatter={(value) => `${value}kg`} />
                          <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', color: '#1e293b'}} />
                          <Bar dataKey="peso" radius={[6, 6, 0, 0]} maxBarSize={50}>
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
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up-4">
                  <h3 className="text-base md:text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                    <MapPin className="text-orange-500" /> Destinos de la Jornada
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] md:text-xs uppercase text-slate-500 border-b border-slate-200 tracking-wider">
                        <tr>
                          <th className="p-3 md:p-4 font-extrabold rounded-tl-lg">Ciudad / Destino</th>
                          <th className="p-3 md:p-4 font-extrabold text-center">Despachos</th>
                          <th className="p-3 md:p-4 font-extrabold text-right rounded-tr-lg">Peso (Kg)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {destinosTop.length === 0 ? (
                          <tr><td colSpan="3" className="p-8 text-center text-slate-400 font-medium">No hay rutas agendadas hoy.</td></tr>
                        ) : (
                          destinosTop.map((d, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors group">
                              <td className="p-3 md:p-4 font-bold text-slate-700 flex items-center gap-2">
                                <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                  <MapPin size={14} />
                                </div>
                                {d.destino}
                              </td>
                              <td className="p-3 md:p-4 text-center">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold text-xs">{d.entregas}</span>
                              </td>
                              <td className="p-3 md:p-4 text-right font-black text-slate-800">
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
          </>
        )}
      </div>

      {/* ESTILOS DE ANIMACIÓN EN CADENA Y SCROLL */}
      <style>{`
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up-1 { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-fade-in-up-2 { animation: fadeInUp 0.5s ease-out 0.1s forwards; opacity: 0; }
        .animate-fade-in-up-3 { animation: fadeInUp 0.5s ease-out 0.2s forwards; opacity: 0; }
        .animate-fade-in-up-4 { animation: fadeInUp 0.5s ease-out 0.3s forwards; opacity: 0; }
        
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 20px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.2); }
      `}</style>
    </div>
  );
};

export default DashboardLogistica;