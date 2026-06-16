import React, { useEffect, useState } from 'react';
import { LayoutDashboard, TrendingUp, Package, Weight, Calendar, Search, BarChart as BarIcon, Target, Truck, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import DateRangeSelector from '../components/DateRangeSelector';

const AdminDashboard = () => {
  const { user } = useAuth();

  // Estados generales
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para fechas (Por defecto: Mes a la fecha)
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

  // Estados para los 4 indicadores principales
  const [indicadores, setIndicadores] = useState({ otif: 0, prod: 0, fin: 0, flota: 0 });
  const [animVal, setAnimVal] = useState({ otif: 0, prod: 0, fin: 0, flota: 0 });

  const fetchDashboard = async (mostrarCarga = true) => {
    if (mostrarCarga) {
      setLoading(true);
      setAnimVal({ otif: 0, prod: 0, fin: 0, flota: 0 }); 
    }
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Llamamos a las 5 APIs en paralelo
      const [resDash, resOtif, resProd, resFin, resFlota] = await Promise.all([
        fetch(`${apiUrl}/api/dashboard?inicio=${fechaInicio}&fin=${fechaFin}`),
        fetch(`${apiUrl}/api/reportes/perfectos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`),
        fetch(`${apiUrl}/api/reportes/productividad?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`),
        fetch(`${apiUrl}/api/reportes/financiero?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`),
        fetch(`${apiUrl}/api/reportes/flota?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`)
      ]);

      const dataDash = await resDash.json();
      const dataOtif = await resOtif.json();
      const dataProd = await resProd.json();
      const dataFin = await resFin.json();
      const dataFlota = await resFlota.json();

      // 1. CARGAR DATOS GENÉRICOS DEL DASHBOARD
      setStats(dataDash);
      if (dataDash.bodegas) {
        const bodegasArray = [
          { name: 'B1', peso: Number(dataDash.bodegas.b1 || 0) },
          { name: 'B2', peso: Number(dataDash.bodegas.b2 || 0) },
          { name: 'B3', peso: Number(dataDash.bodegas.b3 || 0) },
          { name: 'B4', peso: Number(dataDash.bodegas.b4 || 0) },
          { name: 'B5', peso: Number(dataDash.bodegas.b5 || 0) },
          { name: 'B6', peso: Number(dataDash.bodegas.b6 || 0) },
          { name: 'B7', peso: Number(dataDash.bodegas.b7 || 0) },
          { name: 'B8', peso: Number(dataDash.bodegas.b8 || 0) },
        ];
        setChartData(bodegasArray);
      }

      // 2. CÁLCULOS DE LOS 4 INDICADORES
      let valOtif = 0, valProd = 0, valFin = 0, valFlota = 0;

      // OTIF
      if (dataOtif.length > 0) {
        const perfectos = dataOtif.filter(d => d.calificacion === 'Perfecto').length;
        valOtif = Math.round((perfectos / dataOtif.length) * 100);
      }
      
      // Productividad
      if (dataProd.length > 0) {
        const asignados = dataProd.reduce((acc, curr) => acc + Number(curr.total_viajes_asignados || 0), 0);
        const completas = dataProd.reduce((acc, curr) => acc + Number(curr.entregas_completas || 0), 0);
        valProd = asignados > 0 ? Math.round((completas / asignados) * 100) : 0;
      }

      // Financiero (Cruce inteligente de padres e hijos replicado del reporte financiero)
      if (dataFin.length > 0) {
        const facturasRaw = dataFin.map(f => ({
          ...f,
          id_factura_raw: f.id_factura ? String(f.id_factura).trim().toUpperCase() : 'SIN-FACTURA',
          valFac: Number(f.valor_factura || 0),
          valRec: Number(f.valor_recaudado || 0)
        }));

        const allIds = new Set(facturasRaw.map(f => f.id_factura_raw));
        const facturasMap = {};

        facturasRaw.forEach(fila => {
          let idFacRaw = fila.id_factura_raw;
          let idFacBase = idFacRaw;

          if (idFacBase.includes('-')) {
            let partes = idFacBase.split('-');
            while (partes.length > 1) {
              partes.pop(); 
              let posibleBase = partes.join('-');
              if (allIds.has(posibleBase)) idFacBase = posibleBase; 
            }
          }

          if (!facturasMap[idFacBase]) {
            facturasMap[idFacBase] = {
              estado_entrega: fila.estado_entrega,
              max_positivo: fila.valFac > 0 ? fila.valFac : 0,
              suma_negativos: fila.valFac < 0 ? fila.valFac : 0, 
              valor_recaudado_cruzado: fila.valRec
            };
          } else {
            if (fila.valFac > 0) {
              facturasMap[idFacBase].max_positivo = Math.max(facturasMap[idFacBase].max_positivo, fila.valFac);
            } else {
              facturasMap[idFacBase].suma_negativos += fila.valFac;
            }
            facturasMap[idFacBase].valor_recaudado_cruzado += fila.valRec;
          }
        });

        // Extraemos las facturas netas reales después de aplicar devoluciones
        const datosCruzados = Object.values(facturasMap).map(fac => {
          return {
            estado_entrega: fac.estado_entrega,
            valor_factura: fac.max_positivo + fac.suma_negativos,
            valor_recaudado: fac.valor_recaudado_cruzado
          };
        });

        // Filtramos solo las entregas que ya cerraron su ciclo logístico
        const facturasCerradas = datosCruzados.filter(f => 
          !['Pendiente', 'Asignado', 'En Ruta'].includes(f.estado_entrega)
        );

        const facturado = facturasCerradas.reduce((acc, curr) => acc + curr.valor_factura, 0);
        const recaudado = facturasCerradas.reduce((acc, curr) => acc + curr.valor_recaudado, 0);
        
        valFin = facturado > 0 ? Math.round((recaudado / facturado) * 100) : 0;
        
        // Evitamos que supere el 100% en caso de propinas o descuadres menores
        if(valFin > 100) valFin = 100;
      }

      // Flota
      if (dataFlota.length > 0) {
        const activos = dataFlota.filter(d => Number(d.total_pedidos_cargados) > 0);
        if (activos.length > 0) {
          const suma = activos.reduce((acc, curr) => acc + Number(curr.porcentaje_ocupacion || 0), 0);
          valFlota = Math.round(suma / activos.length);
        }
      }

      setIndicadores({ otif: valOtif, prod: valProd, fin: valFin, flota: valFlota });

      if (mostrarCarga) {
        setTimeout(() => {
          setAnimVal({ otif: valOtif, prod: valProd, fin: valFin, flota: valFlota });
        }, 150);
      } else {
        setAnimVal({ otif: valOtif, prod: valProd, fin: valFin, flota: valFlota });
      }

    } catch (err) {
      console.error("Error Dashboard:", err);
      setError("Error al calcular las métricas gerenciales.");
    } finally {
      if (mostrarCarga) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(true); 
    
    const intervalId = setInterval(() => { 
      fetchDashboard(false); 
    }, 5000);

    return () => clearInterval(intervalId); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin]);

  const radio = 36;
  const circunferencia = 2 * Math.PI * radio;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full max-w-full overflow-x-hidden bg-slate-50 min-h-screen">
      
      {/* ================= HEADER Y FILTROS ================= */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" size={32} /> Panel de Control
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            Bienvenido, <span className="font-bold text-slate-800">{user?.nombre_completo}</span>. Vista ejecutiva en tiempo real.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 bg-white p-3 rounded-2xl shadow-sm border border-slate-200 w-full xl:w-auto transition-all focus-within:ring-2 ring-blue-100">
          <DateRangeSelector 
            fechaInicio={fechaInicio} 
            setFechaInicio={setFechaInicio} 
            fechaFin={fechaFin} 
            setFechaFin={setFechaFin} 
          />
          <button onClick={() => fetchDashboard(true)} className="w-full sm:w-auto mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95">
            <Search size={18} /> <span className="sm:hidden font-bold">Analizar Periodo</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
          <p className="font-medium animate-pulse">Sincronizando métricas globales...</p>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center font-bold">{error}</div>}

      {!loading && !error && stats && (
        <>
          {/* ================= 4 MEDIDORES GERENCIALES ANIMADOS ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* 1. OTIF */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between animate-fade-in-up-1 hover:shadow-md transition-shadow group">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <CheckCircle size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Perfectos</span>
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800">{animVal.otif}%</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Score OTIF Global</p>
              </div>
              <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r={radio} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="40" cy="40" r={radio} stroke={animVal.otif > 80 ? "#10b981" : "#f59e0b"} strokeWidth="8" fill="transparent" strokeDasharray={circunferencia} strokeDashoffset={circunferencia - ((animVal.otif / 100) * circunferencia)} strokeLinecap="round" className="transition-all duration-1500 ease-out" />
                </svg>
              </div>
            </div>

            {/* 2. PRODUCTIVIDAD */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between animate-fade-in-up-2 hover:shadow-md transition-shadow group">
              <div>
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Target size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Efectividad</span>
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800">{animVal.prod}%</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Entregas Completas</p>
              </div>
              <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r={radio} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="40" cy="40" r={radio} stroke="#3b82f6" strokeWidth="8" fill="transparent" strokeDasharray={circunferencia} strokeDashoffset={circunferencia - ((animVal.prod / 100) * circunferencia)} strokeLinecap="round" className="transition-all duration-1500 ease-out" />
                </svg>
              </div>
            </div>

            {/* 3. FINANCIERO */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between animate-fade-in-up-3 hover:shadow-md transition-shadow group">
              <div>
                <div className="flex items-center gap-2 text-teal-500 mb-2">
                  <DollarSign size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Liquidez</span>
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800">{animVal.fin}%</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Dinero Recaudado</p>
              </div>
              <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r={radio} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="40" cy="40" r={radio} stroke="#14b8a6" strokeWidth="8" fill="transparent" strokeDasharray={circunferencia} strokeDashoffset={circunferencia - ((animVal.fin / 100) * circunferencia)} strokeLinecap="round" className="transition-all duration-1500 ease-out" />
                </svg>
              </div>
            </div>

            {/* 4. FLOTA */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between animate-fade-in-up-4 hover:shadow-md transition-shadow group">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                  <Truck size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Ocupación</span>
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800">{animVal.flota}%</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Uso de capacidad</p>
              </div>
              <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r={radio} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="40" cy="40" r={radio} stroke={animVal.flota > 90 ? "#ef4444" : "#6366f1"} strokeWidth="8" fill="transparent" strokeDasharray={circunferencia} strokeDashoffset={circunferencia - ((animVal.flota / 100) * circunferencia)} strokeLinecap="round" className="transition-all duration-1500 ease-out" />
                </svg>
              </div>
            </div>
          </div>

          {/* ================= KPIs DE VOLUMEN (DISEÑO MEJORADO) ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 md:p-6 rounded-2xl shadow-lg flex items-center gap-5 text-white transition-all duration-500">
              <div className="p-3.5 bg-white/10 rounded-xl backdrop-blur-sm"><Package size={28} className="text-blue-300"/></div>
              <div>
                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Total Pedidos</p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-0.5">{stats.kpis.total_pedidos}</h3>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 md:p-6 rounded-2xl shadow-lg flex items-center gap-5 text-white transition-all duration-500">
              <div className="p-3.5 bg-white/10 rounded-xl backdrop-blur-sm"><Weight size={28} className="text-purple-300"/></div>
              <div>
                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Carga Movilizada</p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-0.5">{Number(stats.kpis.total_peso).toLocaleString('es-CO')} <span className="text-sm md:text-lg text-slate-400 font-medium">kg</span></h3>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 md:p-6 rounded-2xl shadow-lg flex items-center gap-5 text-white sm:col-span-2 lg:col-span-1 transition-all duration-500">
              <div className="p-3.5 bg-white/20 rounded-xl backdrop-blur-sm"><TrendingUp size={28} className="text-white"/></div>
              <div>
                <p className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest">Valor Facturado Bruto</p>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-0.5">$ {Number(stats.kpis.total_valor).toLocaleString('es-CO')}</h3>
              </div>
            </div>
          </div>

          {/* ================= GRÁFICA RESPONSIVA ================= */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 transition-all duration-500">
            <h3 className="text-base md:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BarIcon className="text-indigo-500" size={20}/> Distribución de Carga por Bodega
            </h3>
            <div className="h-64 md:h-80 w-full overflow-x-auto">
              <div className="min-w-[500px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 'bold', fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `${value}kg`} width={60} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="peso" radius={[6, 6, 0, 0]} barSize={45}>
                      {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ================= TABLAS INFERIORES ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6">
            
            {/* Tabla Destinos */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full transition-all duration-500">
              <div className="px-5 md:px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <h3 className="font-bold text-slate-800">Top Destinos por Peso</h3>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm min-w-[400px]">
                  <thead className="text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b">
                    <tr>
                      <th className="px-5 md:px-6 py-3">Ciudad / Destino</th>
                      <th className="px-4 py-3 text-center">Entregas</th>
                      <th className="px-5 md:px-6 py-3 text-right">Peso Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.destinos && stats.destinos.length > 0 ? (
                      stats.destinos.map((d, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 md:px-6 py-3.5 font-bold text-slate-700">{d.destino}</td>
                          <td className="px-4 py-3.5 text-center text-slate-500 font-medium">{d.entregas}</td>
                          <td className="px-5 md:px-6 py-3.5 text-right font-extrabold text-indigo-600">{Number(d.peso).toLocaleString()} <span className="text-xs font-medium text-slate-400">kg</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-400">No hay datos en este periodo.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Prioridades */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full transition-all duration-500">
              <div className="px-5 md:px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <h3 className="font-bold text-slate-800">Urgencia de Pedidos</h3>
              </div>
              <div className="p-5 md:p-6">
                {stats.prioridad && stats.prioridad.length > 0 ? (
                  <div className="space-y-5">
                    {stats.prioridad.map((p, index) => {
                      const color = p.prioridad === 'Alta' ? 'red' : p.prioridad === 'Media' ? 'orange' : 'blue';
                      
                      return (
                        <div key={index}>
                          <div className="flex justify-between mb-2">
                            <span className={`text-sm font-extrabold uppercase tracking-wide text-${color}-500`}>{p.prioridad}</span>
                            <span className="text-sm font-bold text-slate-600">{p.cantidad} <span className="font-medium text-slate-400">pedidos</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full bg-${color}-500 transition-all duration-1000 ease-out`} style={{ width: `${(p.cantidad / stats.kpis.total_pedidos) * 100}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">Sin datos de prioridad en este rango</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ESTILOS DE ANIMACIÓN EN CADENA */}
      <style>{`
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up-1 { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-fade-in-up-2 { animation: fadeInUp 0.6s ease-out 0.1s forwards; opacity: 0; }
        .animate-fade-in-up-3 { animation: fadeInUp 0.6s ease-out 0.2s forwards; opacity: 0; }
        .animate-fade-in-up-4 { animation: fadeInUp 0.6s ease-out 0.3s forwards; opacity: 0; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;