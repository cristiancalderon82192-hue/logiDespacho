import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Filter, MapPin, Truck, BarChart2, PackageOpen } from 'lucide-react';
import DateRangeSelector from '../components/DateRangeSelector';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReporteMovimientos = () => {
  const [filtros, setFiltros] = useState({
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    zona: '',
    ciudad: '',
    vehiculo: ''
  });

  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [opciones, setOpciones] = useState({ ciudades: [], zonas: [], vehiculos: [] });

  useEffect(() => {
    const cargarOpcionesFiltros = async () => {
      try {
        const token = localStorage.getItem('token'); 
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reportes/movimientos/filtros`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '' 
          }
        });
        if (res.ok) setOpciones(await res.json());
      } catch (error) {
        console.error("Error cargando filtros:", error);
      }
    };
    cargarOpcionesFiltros();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => {
      const nuevosFiltros = { ...prev, [name]: value };
      if (name === 'ciudad') nuevosFiltros.zona = ''; 
      return nuevosFiltros;
    });
  };

  const setFechaInicioWrapper = (val) => setFiltros(prev => ({...prev, fechaInicio: val}));
  const setFechaFinWrapper = (val) => setFiltros(prev => ({...prev, fechaFin: val}));

  const zonasFiltradas = filtros.ciudad 
    ? opciones.zonas.filter(z => z.ciudad === filtros.ciudad).map(z => z.zona_envio)
    : [...new Set(opciones.zonas.map(z => z.zona_envio))];

  const generarReporte = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reportes/movimientos?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '' 
        }
      });
      
      if (res.ok) setDatos(await res.json());
    } catch (error) {
      console.error("Error en la petición:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PROCESAMIENTO DE GRÁFICA 1: ESTADOS
  // ==========================================
  const procesarDatosEstados = () => {
    if (datos.length === 0) {
      const zonasParaGraficar = zonasFiltradas.length > 0 ? zonasFiltradas : [...new Set(opciones.zonas.map(z => z.zona_envio))];
      if (zonasParaGraficar.length === 0) return [{ name: 'Cargando...', Entregados: 0, Devoluciones: 0, Pendientes: 0 }];
      return zonasParaGraficar.map(zona => ({ name: zona, Entregados: 0, Devoluciones: 0, Pendientes: 0 }));
    }

    const agrupado = datos.reduce((acc, pedido) => {
      const zona = pedido.zona_envio || 'Sin Zona';
      if (!acc[zona]) acc[zona] = { name: zona, Entregados: 0, Devoluciones: 0, Pendientes: 0 };
      if (pedido.estado_entrega === 'Entregado') acc[zona].Entregados += 1;
      else if (pedido.estado_entrega === 'Devolución') acc[zona].Devoluciones += 1;
      else acc[zona].Pendientes += 1;
      return acc;
    }, {});
    return Object.values(agrupado);
  };

  // ==========================================
  // PROCESAMIENTO DE GRÁFICA 2: PESO BODEGA
  // ==========================================
  const procesarDatosBodegas = () => {
    if (datos.length === 0) return [{ name: 'Sin Datos', 'Total Kg': 0 }];

    const agrupado = datos.reduce((acc, pedido) => {
      const bodega = pedido.bodega || 'Sin Bodega';
      const zona = pedido.zona_envio || 'Sin Zona';
      const peso = parseFloat(pedido.peso) || 0;

      if (!acc[bodega]) acc[bodega] = { name: bodega };
      if (!acc[bodega][zona]) acc[bodega][zona] = 0;
      
      acc[bodega][zona] += peso;
      return acc;
    }, {});

    return Object.values(agrupado);
  };

  const datosGraficaEstados = procesarDatosEstados();
  const datosGraficaBodegas = procesarDatosBodegas();
  
  // Extraemos las zonas únicas que tienen peso para generar los colores dinámicos de las barras
  const zonasConPeso = [...new Set(datos.filter(d => d.peso > 0).map(d => d.zona_envio))].filter(Boolean);
  const coloresZonas = ['#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16']; // Tonos vibrantes

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <FileText className="text-[#47B3A8]" /> Reporte de Movimientos
        </h1>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-md">
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <h2 className="text-sm font-bold text-slate-600 uppercase mb-4 flex items-center gap-2">
          <Filter size={16} /> Filtros Dinámicos
        </h2>
        
        <form onSubmit={generarReporte} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <DateRangeSelector 
              fechaInicio={filtros.fechaInicio} 
              setFechaInicio={setFechaInicioWrapper} 
              fechaFin={filtros.fechaFin} 
              setFechaFin={setFechaFinWrapper} 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><MapPin size={12}/> Ciudad</label>
            <select name="ciudad" value={filtros.ciudad} onChange={handleInputChange} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:border-[#47B3A8] cursor-pointer">
              <option value="">Todas las ciudades</option>
              {opciones.ciudades.map((c, index) => <option key={index} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">Zona {filtros.ciudad && <span className="text-[9px] text-[#47B3A8] ml-1 bg-[#47B3A8]/10 px-1 rounded">Filtrado</span>}</label>
            <select name="zona" value={filtros.zona} onChange={handleInputChange} disabled={zonasFiltradas.length === 0 && filtros.ciudad !== ''} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:border-[#47B3A8] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="">Todas las zonas</option>
              {zonasFiltradas.map((z, index) => <option key={index} value={z}>{z}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Truck size={12}/> Vehículo (Placa)</label>
            <select name="vehiculo" value={filtros.vehiculo} onChange={handleInputChange} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors outline-none focus:border-[#47B3A8] cursor-pointer">
              <option value="">Toda la flota</option>
              {opciones.vehiculos.map((v, index) => <option key={index} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="md:col-span-5 flex justify-end mt-2">
            <button type="submit" disabled={loading} className="bg-[#47B3A8] hover:bg-[#3d9a90] text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95 disabled:opacity-50">
              <Search size={18} /> {loading ? 'Consultando...' : 'Generar Reporte'}
            </button>
          </div>
        </form>
      </div>

      {/* 👇 CONTENEDOR GRID PARA LAS DOS GRÁFICAS 👇 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* GRÁFICA 1: RENDIMIENTO POR ZONA */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in relative">
          <h2 className="text-sm font-bold text-slate-600 uppercase mb-6 flex items-center gap-2">
            <BarChart2 size={18} className="text-[#47B3A8]" /> Rendimiento por Zona
          </h2>
          {datos.length === 0 && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none mt-8">
              <span className="bg-slate-100/80 px-4 py-2 rounded-lg text-slate-500 font-bold text-sm backdrop-blur-sm border border-slate-200">
                Aún no hay movimientos
              </span>
            </div>
          )}
          <div className={`h-80 w-full transition-opacity duration-500 ${datos.length === 0 ? 'opacity-40' : 'opacity-100'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGraficaEstados} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="Entregados" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
                <Bar dataKey="Devoluciones" fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={1500} />
                <Bar dataKey="Pendientes" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICA 2: PESO MOVIDO POR BODEGA */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in relative">
          <h2 className="text-sm font-bold text-slate-600 uppercase mb-6 flex items-center gap-2">
            <PackageOpen size={18} className="text-[#8b5cf6]" /> Peso Movido por Bodega (Kg)
          </h2>
          {datos.length === 0 && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none mt-8">
              <span className="bg-slate-100/80 px-4 py-2 rounded-lg text-slate-500 font-bold text-sm backdrop-blur-sm border border-slate-200">
                Aún no hay movimientos
              </span>
            </div>
          )}
          <div className={`h-80 w-full transition-opacity duration-500 ${datos.length === 0 ? 'opacity-40' : 'opacity-100'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGraficaBodegas} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                
                {/* Dibujamos una barra apilada dinámica por cada zona que tenga peso */}
                {datos.length > 0 ? (
                  zonasConPeso.map((zona, index) => (
                    <Bar key={zona} dataKey={zona} stackId="a" fill={coloresZonas[index % coloresZonas.length]} animationDuration={1500} />
                  ))
                ) : (
                  <Bar dataKey="Total Kg" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Factura</th>
                <th className="p-4 font-bold">Bodega / Peso</th>
                <th className="p-4 font-bold">Ciudad / Zona</th>
                <th className="p-4 font-bold">Contacto</th>
                <th className="p-4 font-bold">Vehículo</th>
                <th className="p-4 font-bold">Estado</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {datos.length === 0 && !loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                    Selecciona los filtros y haz clic en "Generar Reporte" para ver los movimientos.
                  </td>
                </tr>
              ) : (
                datos.map((fila, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="block font-bold text-slate-900">{fila.id_factura}</span>
                      <span className="text-[10px] text-slate-500">{new Date(fila.fecha_creacion).toLocaleDateString()}</span>
                    </td>
                    <td className="p-4">
                      <span className="block font-bold text-[#8b5cf6]">{fila.bodega || 'N/A'}</span>
                      <span className="text-xs text-slate-600 font-medium">{fila.peso ? `${fila.peso} Kg` : '0 Kg'}</span>
                    </td>
                    <td className="p-4">
                      <span className="block font-bold">{fila.ciudad}</span>
                      <span className="text-xs text-slate-500">{fila.zona_envio}</span>
                    </td>
                    <td className="p-4">
                      <span className="block">{fila.nombre_cliente}</span>
                      <span className="text-xs text-slate-500 font-medium">{fila.telefono}</span>
                    </td>
                    <td className="p-4 font-bold text-[#47B3A8]">
                      {fila.vehiculo_placa ? (
                        <span className="bg-[#47B3A8]/10 px-2 py-1 rounded border border-[#47B3A8]/20">{fila.vehiculo_placa}</span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        fila.estado_entrega === 'Entregado' ? 'bg-green-100 text-green-700 border border-green-200' :
                        fila.estado_entrega === 'Devolución' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {fila.estado_entrega}
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
  );
};

export default ReporteMovimientos;