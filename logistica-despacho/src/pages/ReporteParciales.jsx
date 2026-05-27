import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, MapPin, Calendar, CheckCircle, Truck, User, X, Weight, Building2, Plus, Trash2, CheckSquare, Square } from 'lucide-react';

const ReporteParciales = () => {
  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const hoyLocal = obtenerFechaLocal();

  const [fechaInicio, setFechaInicio] = useState(hoyLocal);
  const [fechaFin, setFechaFin] = useState(hoyLocal);
  const [pedidos, setPedidos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [bodegas, setBodegas] = useState([]); 
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA SELECCIÓN MÚLTIPLE (LOTES DE SALDOS)
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState([]);
  const [showModalLote, setShowModalLote] = useState(false);
  const [asignacionLote, setAsignacionLote] = useState({ 
    conductor_id: '', vehiculo_id: '', fecha_agendada: hoyLocal 
  });
  const [detallesLote, setDetallesLote] = useState({});

  const fetchParciales = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos-parciales?inicio=${fechaInicio}&fin=${fechaFin}`);
      if (response.ok) setPedidos(await response.json());
    } catch (error) { console.error("Error:", error); } 
    finally { setLoading(false); }
  };

  const fetchCatalogos = async () => {
    try {
      const [resC, resV, resB] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/conductores`), 
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/vehiculos`),
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/bodegas`) 
      ]);
      if(resC.ok) setConductores(await resC.json());
      if(resV.ok) setVehiculos(await resV.json());
      if(resB.ok) setBodegas(await resB.json());
    } catch (error) { console.error("Error:", error); }
  };

  useEffect(() => {
    fetchParciales();
    fetchCatalogos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin]);

  const formatFecha = (fechaStr) => {
    if (!fechaStr) return '---';
    return fechaStr.split('T')[0];
  };

  // ================= LÓGICA DE SELECCIÓN MÚLTIPLE (LOTES DE SALDOS) =================
  const toggleSeleccion = (id) => {
    setPedidosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleAbrirModalLote = () => {
    const valoresIniciales = {};
    pedidos
      .filter(p => pedidosSeleccionados.includes(p.id))
      .forEach(p => {
        valoresIniciales[p.id] = {
          valor_despachar: p.valor_factura_pendiente || 0,
          observacion: '',
          detalles: [{ bodega_id: '', peso: '' }] // Bodegas individuales por factura en el lote
        };
      });
    setDetallesLote(valoresIniciales);
    setAsignacionLote({ conductor_id: '', vehiculo_id: '', fecha_agendada: hoyLocal });
    setShowModalLote(true);
  };

  const handleDetalleLoteChange = (pId, index, field, value) => {
    setDetallesLote(prev => {
      const pedidoInfo = prev[pId];
      const nuevosDetalles = [...pedidoInfo.detalles];
      nuevosDetalles[index][field] = value;
      return { ...prev, [pId]: { ...pedidoInfo, detalles: nuevosDetalles } };
    });
  };

  const handleAddDetalleLote = (pId) => {
    setDetallesLote(prev => {
      const pedidoInfo = prev[pId];
      return { 
        ...prev, 
        [pId]: { ...pedidoInfo, detalles: [...pedidoInfo.detalles, { bodega_id: '', peso: '' }] } 
      };
    });
  };

  const handleRemoveDetalleLote = (pId, index) => {
    setDetallesLote(prev => {
      const pedidoInfo = prev[pId];
      const nuevosDetalles = pedidoInfo.detalles.filter((_, i) => i !== index);
      return { ...prev, [pId]: { ...pedidoInfo, detalles: nuevosDetalles } };
    });
  };

  const handleAsignarLoteSaldos = async (e) => {
    e.preventDefault();
    if (!asignacionLote.conductor_id || !asignacionLote.vehiculo_id || !asignacionLote.fecha_agendada) {
      return alert("Debes seleccionar conductor, vehículo y fecha de salida.");
    }

    const payloadDetalles = [];

    // Validaciones estrictas por cada saldo del lote
    for (const pId of pedidosSeleccionados) {
      const pedidoOriginal = pedidos.find(p => p.id === pId);
      const det = detallesLote[pId];
      
      if (Number(det.valor_despachar) > Number(pedidoOriginal.valor_factura_pendiente)) {
        return alert(`❌ ALERTA: La factura ${pedidoOriginal.id_factura} no puede despachar más de lo que debe ($${Number(pedidoOriginal.valor_factura_pendiente).toLocaleString()}).`);
      }

      if (Number(det.valor_despachar) < Number(pedidoOriginal.valor_factura_pendiente) && det.observacion.trim() === '') {
        return alert(`❌ ALERTA: La factura ${pedidoOriginal.id_factura} sigue incompleta. Es OBLIGATORIO escribir una justificación.`);
      }

      const detallesValidos = det.detalles.every(d => d.bodega_id !== '' && d.peso !== '' && Number(d.peso) > 0);
      if (!detallesValidos) {
        return alert(`❌ ALERTA: Verifica las bodegas y pesos de la factura ${pedidoOriginal.id_factura}. Deben ser válidos.`);
      }

      // Agrupamos la info de esta factura
      payloadDetalles.push({
        id: pId,
        valor_despachar: det.valor_despachar,
        observaciones_entrega: det.observacion,
        detalles: det.detalles,
        nota_despacho: "(LOTE SALDOS)" 
      });
    }

    try {
      // ENVIAMOS UN SOLO REQUEST CON TODOS LOS DATOS AGRUPADOS
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos/despachar-lote-saldos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conductor_id: asignacionLote.conductor_id,
          vehiculo_id: asignacionLote.vehiculo_id,
          fecha_agendada: asignacionLote.fecha_agendada,
          detalles_lote: payloadDetalles
        })
      });

      if (res.ok) {
        alert("✅ Lote de saldos agrupado en un solo viaje exitosamente.");
        setShowModalLote(false);
        setPedidosSeleccionados([]);
        fetchParciales();
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.error}`);
      }

    } catch (error) {
      alert("Error de conexión al asignar el lote de saldos.");
    }
  };

  // ================= CÁLCULOS UI =================
  const totalPendientePlata = pedidos.reduce((acc, p) => acc + Number(p.valor_factura_pendiente || 0), 0);
  
  // Cálculos Modal Lote
  const pedidosSeleccionadosObj = pedidos.filter(p => pedidosSeleccionados.includes(p.id));
  const valorDeudaLoteTotal = pedidosSeleccionadosObj.reduce((acc, p) => acc + Number(p.valor_factura_pendiente || 0), 0);

  return (
    <div className="bg-slate-50 min-h-screen p-3 md:p-8 w-full max-w-full overflow-x-hidden pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ENCABEZADO */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 md:p-6 flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 md:gap-4 w-full xl:w-auto text-center md:text-left flex-col md:flex-row">
            <div className="bg-red-100 p-3 rounded-full text-red-600 shrink-0">
              <AlertCircle size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">Envíos Parciales</h1>
              <p className="text-slate-500 text-[10px] md:text-sm mt-1">Selecciona la mercancía pendiente para enviarla en lote.</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto justify-end">
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit">
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none px-2 cursor-pointer"
              />
              <span className="text-slate-300">/</span>
              <input 
                type="date" 
                value={fechaFin} 
                onChange={(e) => setFechaFin(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none px-2 cursor-pointer"
              />
            </div>

            <div className="bg-red-50 border border-red-200 px-4 py-3 md:px-6 md:py-3 rounded-xl text-center w-full md:w-auto">
              <p className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Total Deuda Bodega</p>
              <p className="text-xl md:text-2xl font-extrabold text-red-600">${totalPendientePlata.toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>

        {/* TABLA DE RESULTADOS */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left table-fixed min-w-[950px]">
              <thead className="bg-slate-900 text-white text-[10px] md:text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3 md:p-4 w-[5%] text-center"></th>
                  <th className="p-3 md:p-4 w-[25%] font-bold text-center md:text-left">Doc / Nota</th>
                  <th className="p-3 md:p-4 w-[15%] font-bold">Fecha / Sala</th>
                  <th className="p-3 md:p-4 w-[20%] font-bold">Cliente / Destino</th>
                  <th className="p-3 md:p-4 w-[10%] font-bold text-right">V. Factura</th>
                  <th className="p-3 md:p-4 w-[15%] font-extrabold text-right bg-red-900/50">DEUDA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm text-slate-700">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400">
                      <CheckCircle size={48} className="mx-auto text-green-400 mb-3 opacity-50" />
                      <p className="font-bold">¡Todo al día!</p>
                    </td>
                  </tr>
                ) : (
                  pedidos.map((p) => {
                    const estaSeleccionado = pedidosSeleccionados.includes(p.id);

                    return (
                      <tr key={p.id} className={`transition-colors ${estaSeleccionado ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="p-3 md:p-4 align-middle text-center">
                          <button 
                            onClick={() => toggleSeleccion(p.id)}
                            className={`p-1 rounded ${estaSeleccionado ? 'text-red-600' : 'text-slate-300 hover:text-slate-400'}`}
                          >
                            {estaSeleccionado ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        </td>
                        <td className="p-3 md:p-4 align-middle">
                          <div className="font-bold text-blue-600 font-mono text-base md:text-lg">{p.id_factura}</div>
                          <div className="text-[9px] text-slate-400 font-bold mb-1.5">{p.tipo_documento}</div>
                          
                          {/* 👇 CONTENEDOR SEPARADO PARA EVITAR DESBORDAMIENTO VERTICAL Y HORIZONTAL 👇 */}
                          {p.observaciones_entrega && (
                            <div className="w-full max-w-[180px] p-1.5 md:p-2 rounded-lg border shadow-sm bg-red-50 border-red-200 text-red-700 overflow-hidden" title={p.observaciones_entrega}>
                              <div className="text-[9px] md:text-[10px] leading-snug whitespace-normal break-words">
                                <b>Falta:</b> {p.observaciones_entrega}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 md:p-4 align-middle">
                          <div className="flex items-center gap-1 text-slate-600 mb-1"><Calendar size={12}/> {formatFecha(p.fecha_agendada)}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{p.bodega}</div>
                        </td>
                        <td className="p-3 md:p-4 align-middle">
                          <p className="font-bold text-slate-800 truncate">{p.nombre_cliente}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin size={10} className="text-orange-500"/> {p.destino}</p>
                        </td>
                        <td className="p-3 md:p-4 align-middle text-right font-medium text-slate-600">
                          ${Number(p.valor_factura || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="p-3 md:p-4 align-middle text-right font-extrabold text-red-600 text-sm md:text-lg bg-red-50/50">
                          ${Number(p.valor_factura_pendiente || 0).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= BARRA FLOTANTE DE ASIGNACIÓN DE SALDOS POR LOTE ================= */}
        {pedidosSeleccionados.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl z-40 flex items-center gap-6 animate-fadeIn">
            <div className="text-white hidden sm:block">
              <p className="font-bold text-lg leading-tight">{pedidosSeleccionados.length} Saldos</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Seleccionados</p>
            </div>
            <div className="h-10 w-px bg-slate-700 hidden sm:block"></div>
            <div className="text-white">
              <p className="font-extrabold text-red-500 text-xl leading-tight">${valorDeudaLoteTotal.toLocaleString('es-CO')}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Deuda Acumulada</p>
            </div>
            <button onClick={handleAbrirModalLote} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 ml-4">
              Armar Ruta de Saldos <Truck size={18} />
            </button>
          </div>
        )}

        {/* ================= MODAL LOTE DE SALDOS ================= */}
        {showModalLote && (
          <div className="fixed inset-0 bg-slate-900/80 z-50 flex justify-center items-center p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
              
              <div className="bg-[#172033] p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 p-2 rounded-lg"><Truck size={20} className="text-white"/></div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">Ruta de Saldos</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Lote de: {pedidosSeleccionados.length} facturas incompletas</p>
                  </div>
                </div>
                <button onClick={() => setShowModalLote(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleAsignarLoteSaldos} className="p-6 flex flex-col md:flex-row gap-6 overflow-y-auto custom-scrollbar">
                
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN DEL VIAJE */}
                <div className="w-full md:w-1/3 space-y-4 border-r border-slate-200 pr-0 md:pr-6">
                  
                  <div className="bg-red-50 border border-red-200 p-3 rounded-xl shadow-sm text-center">
                    <p className="text-[10px] font-bold text-red-600 uppercase">Deuda Total del Lote</p>
                    <p className="text-2xl font-black text-red-700">${valorDeudaLoteTotal.toLocaleString('es-CO')}</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><Calendar size={14} className="text-blue-500"/> FECHA DE SALIDA</label>
                    <input type="date" value={asignacionLote.fecha_agendada} onChange={(e) => setAsignacionLote({...asignacionLote, fecha_agendada: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-lg focus:border-blue-500 outline-none text-slate-700 font-bold bg-white" required />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><User size={14} /> CONDUCTOR</label>
                    <select value={asignacionLote.conductor_id} onChange={(e) => setAsignacionLote({...asignacionLote, conductor_id: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-lg focus:border-blue-500 outline-none text-slate-700 bg-white text-sm" required>
                      <option value="">-- Elige conductor --</option>
                      {conductores.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><Truck size={14} /> VEHÍCULO</label>
                    <select value={asignacionLote.vehiculo_id} onChange={(e) => setAsignacionLote({...asignacionLote, vehiculo_id: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-lg focus:border-blue-500 outline-none text-slate-700 bg-white text-sm" required>
                      <option value="">-- Elige vehículo --</option>
                      {vehiculos.map(v => (
                        <option key={v.id} value={v.id} disabled={Number(v.estado) === 0}>
                          {v.placa} {Number(v.estado) === 0 ? '🚫 TALLER' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* COLUMNA DERECHA: DESGLOSE POR FACTURA Y BODEGAS */}
                <div className="w-full md:w-2/3 space-y-4">
                  <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 border-b border-slate-200 pb-2"><FileText size={14} /> DESGLOSE DE MERCANCÍA POR FACTURA</label>
                  
                  <div className="space-y-4">
                    {pedidosSeleccionadosObj.map(p => {
                      const det = detallesLote[p.id] || { valor_despachar: 0, observacion: '', detalles: [] };
                      const esParcial = Number(det.valor_despachar) < Number(p.valor_factura_pendiente);
                      
                      return (
                        <div key={p.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl animate-fadeIn shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 pr-2">
                              <span className="font-bold text-blue-600 text-sm md:text-base block">{p.id_factura}</span>
                              <span className="text-[10px] text-slate-500 block mb-1.5">{p.destino}</span>
                              
                              {/* 👇 AQUÍ APARECE LA NOTA DE LA NOVEDAD EN EL MODAL 👇 */}
                              {p.observaciones_entrega && (
                                <div className="w-full mt-1.5 p-1.5 md:p-2 rounded-lg border shadow-sm bg-red-50 border-red-200 text-red-700 overflow-hidden">
                                  <div className="text-[9px] md:text-[10px] leading-snug whitespace-normal break-words">
                                    <b>Falta:</b> {p.observaciones_entrega}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Deuda Original</span>
                              <span className="text-sm font-bold text-red-600">${Number(p.valor_factura_pendiente).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {/* Control de Bodegas por Factura */}
                          <div className="space-y-2 mb-3 bg-white p-2 rounded border border-slate-200">
                             <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Building2 size={10} className="text-orange-500"/> Origen</label>
                                <button type="button" onClick={() => handleAddDetalleLote(p.id)} className="text-[9px] text-blue-600 font-bold hover:underline">+ Fila</button>
                             </div>
                             {det.detalles.map((filaBodega, iBod) => (
                               <div key={iBod} className="flex gap-2">
                                 <select value={filaBodega.bodega_id} onChange={(e) => handleDetalleLoteChange(p.id, iBod, 'bodega_id', e.target.value)} className="flex-1 border border-slate-300 p-1.5 rounded text-xs outline-none bg-slate-50" required>
                                   <option value="">Bodega...</option>
                                   {bodegas.map(b => (<option key={b.id} value={b.id}>{b.nombre}</option>))}
                                 </select>
                                 <div className="w-20 relative">
                                   <input type="number" value={filaBodega.peso} onChange={(e) => handleDetalleLoteChange(p.id, iBod, 'peso', e.target.value)} className="w-full border border-slate-300 p-1.5 rounded text-xs outline-none bg-slate-50 text-center" placeholder="Kg" required />
                                 </div>
                                 {det.detalles.length > 1 && (
                                   <button type="button" onClick={() => handleRemoveDetalleLote(p.id, iBod)} className="text-red-500"><Trash2 size={12}/></button>
                                 )}
                               </div>
                             ))}
                          </div>

                          {/* Valor a Despachar de esta factura */}
                          <div className="relative mb-2">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-bold pointer-events-none">$</span>
                            <input 
                              type="number" step="0.01" min="0" max={p.valor_factura_pendiente}
                              value={det.valor_despachar} 
                              onChange={(e) => setDetallesLote({...detallesLote, [p.id]: {...det, valor_despachar: e.target.value}})}
                              className="w-full pl-8 py-2 border border-slate-300 rounded bg-white text-slate-700 font-bold outline-none focus:border-blue-500 text-sm" 
                              required
                            />
                          </div>

                          {esParcial && (
                            <div className="mt-2 animate-fadeIn">
                              <textarea 
                                value={det.observacion}
                                onChange={(e) => setDetallesLote({...detallesLote, [p.id]: {...det, observacion: e.target.value}})}
                                placeholder={`Aún falta mercancía de la factura ${p.id_factura}...`}
                                className="w-full border border-red-300 bg-red-50 p-2 rounded text-xs outline-none focus:border-red-500 text-slate-800 resize-none"
                                rows="2" required={esParcial}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </form>

              <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end items-center gap-4 shrink-0">
                <button type="button" onClick={() => setShowModalLote(false)} className="text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Cancelar</button>
                <button onClick={handleAsignarLoteSaldos} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95">Asignar Lote <CheckCircle size={16} /></button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReporteParciales;