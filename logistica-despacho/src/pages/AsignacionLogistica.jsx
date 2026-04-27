import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Calendar, CheckCircle, X, User, Edit, Search, Filter, Trash2, Printer, AlertCircle, XCircle, Lock, AlertTriangle } from 'lucide-react';

const AsignacionLogistica = () => {
  
  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const hoyLocal = obtenerFechaLocal();

  const [fechaFiltro, setFechaFiltro] = useState(hoyLocal);
  const [destinoFiltro, setDestinoFiltro] = useState(''); 
  const [conductorFiltro, setConductorFiltro] = useState(''); 
  
  const [pedidos, setPedidos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  
  const [asignacion, setAsignacion] = useState({ 
    conductor_id: '', vehiculo_id: '', total_despachado: '', observaciones_entrega: '' 
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async (mostrarPantallaCarga = true) => {
    if (mostrarPantallaCarga) setLoading(true);
    try {
      const [resP, resC, resV] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos-dia?fecha=${fechaFiltro}`),
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/conductores`), 
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/vehiculos`)
      ]);
      
      if(resP.ok) setPedidos(await resP.json());
      if(resC.ok) setConductores(await resC.json());
      if(resV.ok) setVehiculos(await resV.json());
      
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      if (mostrarPantallaCarga) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const intervalId = setInterval(() => { fetchData(false); }, 5000);
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaFiltro]);

  const handleAbrirAsignacion = (pedido) => {
    if (['En Ruta', 'Entregado', 'Entregado Incompleto', 'Devolución'].includes(pedido.estado_entrega)) return;

    setPedidoSeleccionado(pedido);
    setAsignacion({ 
      conductor_id: pedido.conductor_id || '', 
      vehiculo_id: pedido.vehiculo_id || '',
      total_despachado: pedido.total_despachado || '',
      observaciones_entrega: pedido.observaciones_entrega || '' 
    });
    setShowModal(true);
  };

  const handleAsignar = async (e) => {
    e.preventDefault();
    if (!asignacion.conductor_id || !asignacion.vehiculo_id || asignacion.total_despachado === '') {
      return alert("Debes seleccionar un conductor, un vehículo y el valor despachado.");
    }

    // VALIDACIÓN ESTRICTA DE VALOR DESPACHADO vs VALOR FACTURA
    const valorIngresado = Number(asignacion.total_despachado);
    const valorFactura = Number(pedidoSeleccionado.valor_factura || 0);

    if (valorIngresado > valorFactura) {
      return alert(`❌ ALERTA DE SEGURIDAD:\n\nEl valor a despachar ($${valorIngresado.toLocaleString('es-CO')}) NO puede superar el valor total de la factura ($${valorFactura.toLocaleString('es-CO')}).`);
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos/${pedidoSeleccionado.id}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asignacion)
      });
      if (res.ok) {
        alert("✅ Ruta asignada exitosamente");
        setShowModal(false);
        fetchData(true); 
      }
    } catch (error) { alert("Error de conexión"); }
  };

  const handleQuitarAsignacion = async () => {
    if (!window.confirm("¿Estás seguro de quitar la asignación?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos/${pedidoSeleccionado.id}/desasignar`, {
        method: 'PUT'
      });
      if (res.ok) {
        setShowModal(false);
        fetchData(true); 
      }
    } catch (error) { alert("Error de conexión"); }
  };

  const obtenerPesoFormateado = (p) => Number(p.total_peso || p.peso || 0).toLocaleString();
  const obtenerPesoNumerico = (p) => Number(p.total_peso || p.peso || 0);

  const destinosUnicos = [...new Set(pedidos.map(p => p.destino))].sort();
  
  const pedidosFiltrados = pedidos.filter(p => {
    const matchDestino = destinoFiltro ? p.destino === destinoFiltro : true;
    const matchConductor = conductorFiltro ? String(p.conductor_id) === conductorFiltro : true;
    return matchDestino && matchConductor;
  });

  const conductorSeleccionadoInfo = conductores.find(c => String(c.id) === conductorFiltro);
  const vehiculoPlanilla = pedidosFiltrados.length > 0 && pedidosFiltrados[0].vehiculo_placa ? pedidosFiltrados[0].vehiculo_placa : 'Múltiples / Sin asignar';
  const totalPesoPlanilla = pedidosFiltrados.reduce((acc, p) => acc + obtenerPesoNumerico(p), 0);
  const totalValorPlanilla = pedidosFiltrados.reduce((acc, p) => acc + Number(p.total_despachado || 0), 0);

  const vehiculoPreasignado = (showModal && pedidoSeleccionado && asignacion.conductor_id)
    ? pedidos.find(p => String(p.conductor_id) === String(asignacion.conductor_id) && p.vehiculo_id && p.id !== pedidoSeleccionado.id)?.vehiculo_id
    : null;

  const esEnvioParcial = showModal && pedidoSeleccionado && Number(asignacion.total_despachado) > 0 && Number(asignacion.total_despachado) < Number(pedidoSeleccionado.valor_factura);

  const handleImprimir = () => {
    const tituloOriginal = document.title; 
    document.title = `Planilla_${conductorSeleccionadoInfo?.nombre || 'Despacho'}_${fechaFiltro}`; 
    window.print(); 
    setTimeout(() => { document.title = tituloOriginal; }, 1000);
  };

  return (
    <>
      <style>
        {`
          .solo-impresion { display: none; }
          @media print {
            @page { size: landscape; margin: 10mm; }
            body, html, #root { height: auto !important; overflow: visible !important; background-color: white !important; }
            aside, nav, .sidebar, .w-64.fixed { display: none !important; }
            .ml-64, .lg\\:pl-64 { margin-left: 0 !important; padding-left: 0 !important; }
            .ocultar-al-imprimir { display: none !important; }
            .solo-impresion { display: block !important; position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 0; }
            tr { break-inside: avoid; page-break-inside: avoid; }
          }
        `}
      </style>

      <div className="ocultar-al-imprimir bg-slate-50 min-h-screen space-y-4 md:space-y-8 p-3 md:p-6 w-full max-w-full overflow-x-hidden">
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 md:gap-3">
              <Truck className="text-[#47B3A8]" size={24} /> Programación de Rutas
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Monitoreo en tiempo real de operaciones</p>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 md:gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg md:rounded-xl border border-slate-200 w-full sm:w-auto">
              <User className="text-slate-500 ml-1 shrink-0" size={16} />
              <select value={conductorFiltro} onChange={(e) => setConductorFiltro(e.target.value)} className="bg-transparent text-slate-700 text-xs md:text-sm outline-none font-bold w-full sm:min-w-[130px] cursor-pointer">
                <option value="">Todos los Conductores</option>
                {conductores.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg md:rounded-xl border border-slate-200 w-full sm:w-auto">
              <Filter className="text-slate-500 ml-1 shrink-0" size={16} />
              <select value={destinoFiltro} onChange={(e) => setDestinoFiltro(e.target.value)} className="bg-transparent text-slate-700 text-xs md:text-sm outline-none font-bold w-full sm:min-w-[130px] cursor-pointer">
                <option value="">Todos los Destinos</option>
                {destinosUnicos.map(d => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg md:rounded-xl border border-slate-200 w-full sm:w-auto">
              <Calendar className="text-slate-500 ml-1 shrink-0" size={18} />
              <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="bg-transparent text-slate-700 text-xs md:text-sm outline-none font-bold w-full cursor-pointer"/>
            </div>
            {conductorFiltro && pedidosFiltrados.length > 0 && (
              <button onClick={handleImprimir} className="w-full sm:w-auto bg-slate-900 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl text-sm font-bold shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95">
                <Printer size={16} /> Planilla
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-900 text-white text-[10px] md:text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3 md:p-4 w-[15%]">Documento</th>
                  <th className="p-3 md:p-4 w-[20%]">Destino / Cliente</th>
                  <th className="p-3 md:p-4 w-[10%] text-center">Peso (Kg)</th>
                  <th className="p-3 md:p-4 w-[15%] text-center">Estado</th>
                  <th className="p-3 md:p-4 w-[25%]">Asignación Actual</th>
                  <th className="p-3 md:p-4 w-[15%] text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm text-slate-700">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">Buscando despachos...</td></tr>
                ) : pedidosFiltrados.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 md:p-12 text-center text-slate-400">No hay resultados.</td></tr>
                ) : (
                  pedidosFiltrados.map((p) => {
                    const estaBloqueado = ['En Ruta', 'Entregado', 'Entregado Incompleto', 'Devolución'].includes(p.estado_entrega);
                    const esIncompleto = p.estado_entrega === 'Entregado' && parseFloat(p.valor_factura_pendiente) > 0;
                    
                    return (
                      <tr key={p.id} className={`transition-colors ${estaBloqueado ? 'bg-slate-50 opacity-75' : 'bg-white'}`}>
                        <td className="p-3 md:p-4 align-middle font-bold text-blue-600 font-mono text-base md:text-lg">{p.id_factura}</td>
                        <td className="p-3 md:p-4 align-middle">
                          <div className="flex items-start gap-2">
                            <MapPin size={14} className={`${p.estado_entrega === 'Devolución' ? 'text-red-500' : 'text-orange-500'} mt-0.5 shrink-0`} />
                            <div>
                              <p className="font-bold text-slate-800">{p.destino} <span className="text-[10px] text-slate-400 font-normal">({p.zona_envio})</span></p>
                              <p className="text-[10px] md:text-xs text-slate-600 mt-1 line-clamp-1" title={p.nombre_cliente}>{p.nombre_cliente}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 md:p-4 align-middle text-center font-extrabold text-slate-800 text-base md:text-lg">{obtenerPesoFormateado(p)}</td>
                        
                        <td className="p-3 md:p-4 align-middle text-center">
                          <div className="flex flex-col items-center gap-1.5 w-full">
                            {p.estado_entrega === 'Pendiente' && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-orange-200 animate-pulse">Pendiente</span>}
                            {p.estado_entrega === 'Asignado' && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-slate-300">Asignado</span>}
                            {p.estado_entrega === 'En Ruta' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-blue-300 flex items-center gap-1 shadow-sm"><Truck size={10}/> En Ruta</span>}
                            
                            {p.estado_entrega === 'Entregado' && !esIncompleto && <span className="bg-green-100 text-green-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-green-300 flex items-center gap-1 shadow-sm"><CheckCircle size={10}/> Entregado</span>}
                            {p.estado_entrega === 'Entregado Incompleto' && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-orange-300 flex items-center gap-1 shadow-sm"><AlertTriangle size={10}/> Incompleto</span>}
                            {p.estado_entrega === 'Devolución' && <span className="bg-red-100 text-red-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-red-300 flex items-center gap-1 shadow-sm"><X size={10}/> Devolución</span>}

                            {p.estado_entrega !== 'Devolución' && parseFloat(p.valor_factura_pendiente) > 0 && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 italic mt-0.5">Parcial</span>}
                            {p.observaciones_entrega && <span className="text-[8px] md:text-[9px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded w-full truncate block mt-0.5" title={p.observaciones_entrega}>Nota: {p.observaciones_entrega}</span>}
                          </div>
                        </td>
                        
                        <td className="p-3 md:p-4 align-middle">
                          {p.conductor_id && (
                            <div className={`text-[10px] md:text-xs p-2 rounded border shadow-sm ${p.estado_entrega === 'Devolución' ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
                              <p className="flex items-center gap-1.5 font-medium text-slate-700 mb-1"><User size={10}/> {p.conductor_nombre}</p>
                              <p className="flex items-center gap-1.5 font-bold text-slate-800"><Truck size={10}/> {p.vehiculo_placa}</p>
                            </div>
                          )}
                        </td>
                        <td className="p-3 md:p-4 align-middle text-center">
                          <button onClick={() => handleAbrirAsignacion(p)} disabled={estaBloqueado} className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-[10px] md:text-xs transition-all flex items-center justify-center gap-1.5 w-full ${estaBloqueado ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none' : p.conductor_id ? 'bg-slate-900 text-white hover:bg-black shadow-sm' : 'bg-[#47B3A8] text-white hover:bg-[#3A948C] shadow-sm'}`}>
                            {estaBloqueado ? (
                              <>{p.estado_entrega === 'En Ruta' ? <Lock size={12}/> : p.estado_entrega === 'Devolución' ? <XCircle size={12}/> : <CheckCircle size={12}/>} Cerrado</>
                            ) : p.conductor_id ? (
                              <><Edit size={12} /> Modificar</>
                            ) : (
                              <><Truck size={12} /> Asignar</>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && pedidoSeleccionado && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
              
              <div className="bg-slate-900 p-4 md:p-5 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-[#47B3A8] p-1.5 md:p-2 rounded-lg"><Truck size={18} className="text-white"/></div>
                  <div>
                    <h3 className="font-bold text-base md:text-lg leading-none">Asignar Ruta</h3>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-1">Pedido: {pedidoSeleccionado.id_factura}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={18}/></button>
              </div>

              <form onSubmit={handleAsignar} className="flex flex-col flex-1 overflow-hidden">
                
                <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                  
                  <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs md:text-sm font-medium text-slate-700 mb-1">Destino:</p>
                    <p className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <MapPin size={16} className="text-orange-500" /> {pedidoSeleccionado.destino} <span className="font-normal text-sm text-slate-500">({pedidoSeleccionado.zona_envio})</span>
                    </p>
                    <div className="mt-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs md:text-sm text-slate-500">
                      <span>Peso: <span className="font-bold text-slate-700">{obtenerPesoFormateado(pedidoSeleccionado)} Kg</span></span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md font-bold">
                        V. Factura: ${Number(pedidoSeleccionado.valor_factura || 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><User size={14} /> Seleccionar Conductor</label>
                      <select value={asignacion.conductor_id} onChange={(e) => { const n = e.target.value; const v = pedidos.find(p => String(p.conductor_id) === String(n) && p.vehiculo_id && p.id !== pedidoSeleccionado.id)?.vehiculo_id; setAsignacion({...asignacion, conductor_id: n, vehiculo_id: v || '' }); }} className="w-full border-2 border-slate-200 p-2.5 md:p-3 rounded-xl focus:border-[#47B3A8] outline-none text-slate-700 font-medium bg-white text-sm" required>
                        <option value="">-- Elige un conductor --</option>
                        {conductores.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Truck size={14} /> Vehículo (Placa)</label>
                      <select 
                        value={asignacion.vehiculo_id} 
                        onChange={(e) => setAsignacion({...asignacion, vehiculo_id: e.target.value})} 
                        className={`w-full border-2 p-2.5 md:p-3 rounded-xl outline-none font-medium text-sm transition-colors ${vehiculoPreasignado ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-[#47B3A8] text-slate-700'}`} 
                        required 
                        disabled={!!vehiculoPreasignado}
                      >
                        <option value="">-- Elige un vehículo --</option>
                        {vehiculos.map(v => (
                          <option key={v.id} value={v.id} disabled={Number(v.estado) === 0}>
                            {v.placa} {v.modelo ? `- ${v.modelo}` : ''} ({v.capacidad_kg} Kg) {Number(v.estado) === 0 ? ' 🚫 (EN TALLER)' : ''}
                          </option>
                        ))}
                      </select>
                      {vehiculoPreasignado && (
                        <p className="mt-1.5 text-[10px] md:text-xs text-orange-600 font-bold flex items-center gap-1">* Vehículo ya asignado a este conductor hoy.</p>
                      )}
                    </div>
                    
                    <div className="pb-2">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5">Valor a Despachar</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-bold text-base pointer-events-none">$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max={pedidoSeleccionado.valor_factura || ''}
                          value={asignacion.total_despachado} 
                          onChange={(e) => setAsignacion({...asignacion, total_despachado: e.target.value})} 
                          className="w-full pl-10 md:pl-12 py-2.5 pr-2.5 md:py-3 md:pr-3 border-2 border-slate-200 rounded-xl focus:border-[#47B3A8] outline-none text-slate-700 font-bold bg-white text-sm" 
                          placeholder="Ingresa el valor..." 
                          required 
                        />
                      </div>
                    </div>

                    {esEnvioParcial && (
                      <div className="animate-fadeIn p-4 bg-red-50 border border-red-200 rounded-xl">
                        <label className="text-[10px] md:text-xs font-bold text-red-700 uppercase flex items-center gap-2 mb-2"><AlertCircle size={14} /> Observación Parcial Requerida</label>
                        <textarea value={asignacion.observaciones_entrega} onChange={(e) => setAsignacion({...asignacion, observaciones_entrega: e.target.value})} className="w-full border border-red-300 p-2.5 rounded-lg focus:border-red-500 outline-none text-sm text-slate-800 bg-white" placeholder="Justifica el saldo pendiente..." rows="2" required={esEnvioParcial} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 p-4 md:p-5 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                  <div className="w-full sm:w-auto text-center sm:text-left">
                    {pedidoSeleccionado.conductor_id && (
                      <button type="button" onClick={handleQuitarAsignacion} className="text-red-500 hover:bg-red-100 px-3 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"><Trash2 size={16} /> Quitar Asignación</button>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 sm:flex-none px-4 py-2.5 text-slate-500 font-bold text-xs md:text-sm hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" className="flex-1 sm:flex-none bg-[#47B3A8] hover:bg-[#3A948C] text-white px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2">Asignar <CheckCircle size={16} /></button>
                  </div>
                </div>

              </form>
            </div>
          </div>
        )}
      </div>

      {conductorFiltro && (
        <div className="solo-impresion bg-white text-black p-4 font-sans w-full">
          <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-end">
            <div><h1 className="text-2xl font-extrabold tracking-tight uppercase">Manifiesto de Carga</h1><p className="text-xs font-bold mt-1 text-gray-600">Deposito y Ceramicas El Rodeo ZOMAC</p></div>
            <div className="text-right text-xs"><p><strong>Fecha:</strong> {fechaFiltro}</p><p><strong>Generado:</strong> {new Date().toLocaleTimeString()}</p></div>
          </div>
          <div className="flex mb-6 bg-gray-100 p-3 border border-black rounded text-sm items-center">
            <div className="flex-1"><p className="text-[10px] text-gray-500 uppercase font-bold">Conductor</p><p className="font-bold">{conductorSeleccionadoInfo?.nombre}</p></div>
            <div className="flex-1 border-l border-gray-400 pl-4"><p className="text-[10px] text-gray-500 uppercase font-bold">Vehículo</p><p className="font-bold">{vehiculoPlanilla}</p></div>
            <div className="flex-1 border-l border-gray-400 pl-4"><p className="text-[10px] text-gray-500 uppercase font-bold">Carga Total</p><p className="font-bold">{totalPesoPlanilla.toLocaleString()} Kg</p></div>
            <div className="flex-1 border-l border-gray-400 pl-4"><p className="text-[10px] text-gray-800 uppercase font-bold">Valor</p><p className="font-bold text-lg leading-none">${totalValorPlanilla.toLocaleString('es-CO')}</p></div>
          </div>
          <table className="w-full text-left text-[9px] border-collapse border border-black">
            <thead className="bg-gray-200">
              <tr><th className="border border-black p-1 text-center">DOC</th><th className="border border-black p-1">CLIENTE</th><th className="border border-black p-1">DESTINO</th><th className="border border-black p-1 text-center">PESO</th><th className="border border-black p-1 text-center">VALOR</th><th className="border border-black p-1">FIRMA</th></tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map(p => (
                <tr key={p.id}><td className="border border-black p-1 text-center font-bold">{p.id_factura}</td><td className="border border-black p-1">{p.nombre_cliente}</td><td className="border border-black p-1">{p.destino}</td><td className="border border-black p-1 text-center">{obtenerPesoFormateado(p)} Kg</td><td className="border border-black p-1 text-center">${Number(p.total_despachado || 0).toLocaleString('es-CO')}</td><td className="border border-black p-1"></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default AsignacionLogistica;