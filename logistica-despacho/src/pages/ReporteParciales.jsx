import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, MapPin, DollarSign, Calendar, CheckCircle, Truck, User, X, Edit, Weight, Building2, Plus, Trash2, Clock } from 'lucide-react';

const ReporteParciales = () => {
  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const hoyLocal = obtenerFechaLocal();

  const [pedidos, setPedidos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [bodegas, setBodegas] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  
  const [asignacion, setAsignacion] = useState({ 
    conductor_id: '', vehiculo_id: '', valor_despachar: '', observaciones_entrega: '', 
    fecha_agendada: hoyLocal,
    hora_limite: '18:00', // <-- NUEVO ESTADO PARA LA HORA LÍMITE
    detalles: [{ bodega_id: '', peso: '' }],
    nota_despacho: ''
  });

  const fetchParciales = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos-parciales`);
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
  }, []);

  const formatFecha = (fechaStr) => {
    if (!fechaStr) return '---';
    return fechaStr.split('T')[0];
  };

  const handleAddDetalle = () => {
    setAsignacion({ ...asignacion, detalles: [...asignacion.detalles, { bodega_id: '', peso: '' }] });
  };

  const handleRemoveDetalle = (index) => {
    const nuevosDetalles = asignacion.detalles.filter((_, i) => i !== index);
    setAsignacion({ ...asignacion, detalles: nuevosDetalles });
  };

  const handleDetalleChange = (index, field, value) => {
    const nuevosDetalles = [...asignacion.detalles];
    nuevosDetalles[index][field] = value;
    setAsignacion({ ...asignacion, detalles: nuevosDetalles });
  };

  const handleAbrirAsignacion = (pedido) => {
    setPedidoSeleccionado(pedido);
    setAsignacion({ 
      conductor_id: '', vehiculo_id: '',
      valor_despachar: pedido.valor_factura_pendiente, 
      observaciones_entrega: '', 
      fecha_agendada: hoyLocal, 
      hora_limite: '18:00', // <-- RESETEO DE LA HORA AL ABRIR
      detalles: [{ bodega_id: '', peso: '' }],
      nota_despacho: `[SALDO] `
    });
    setShowModal(true);
  };

  const handleAsignarSaldo = async (e) => {
    e.preventDefault();
    if (!asignacion.conductor_id || !asignacion.vehiculo_id || !asignacion.valor_despachar || !asignacion.fecha_agendada || !asignacion.hora_limite || !asignacion.nota_despacho) {
      return alert("Por favor completa todos los campos, incluyendo la Hora Límite y la Nota de Despacho.");
    }
    const detallesValidos = asignacion.detalles.every(d => d.bodega_id !== '' && d.peso !== '' && Number(d.peso) > 0);
    if (!detallesValidos) {
      return alert("Todas las filas de mercancía deben tener una bodega seleccionada y un peso mayor a 0.");
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos/${pedidoSeleccionado.id}/despachar-saldo`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asignacion) 
      });
      if (res.ok) {
        alert("✅ Viaje de saldo agendado exitosamente.");
        setShowModal(false);
        fetchParciales(); 
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.error}`);
      }
    } catch (error) { alert("Error de conexión"); }
  };

  const totalPendientePlata = pedidos.reduce((acc, p) => acc + Number(p.valor_factura_pendiente || 0), 0);
  const esEnvioParcial = showModal && pedidoSeleccionado && Number(asignacion.valor_despachar) > 0 && Number(asignacion.valor_despachar) < Number(pedidoSeleccionado.valor_factura_pendiente);

  return (
    <div className="bg-slate-50 min-h-screen p-3 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ENCABEZADO RESPONSIVO */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto text-center md:text-left flex-col md:flex-row">
            <div className="bg-red-100 p-3 rounded-full text-red-600 shrink-0">
              <AlertCircle size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">Envíos Parciales</h1>
              <p className="text-slate-500 text-[10px] md:text-sm mt-1">Mercancía pendiente por facturas iniciadas.</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 px-4 py-3 md:px-6 md:py-3 rounded-xl text-center w-full md:w-auto">
            <p className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Total Deuda Bodega</p>
            <p className="text-xl md:text-2xl font-extrabold text-red-600">${totalPendientePlata.toLocaleString('es-CO')}</p>
          </div>
        </div>

        {/* TABLA DE RESULTADOS */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left table-fixed min-w-[950px]">
              <thead className="bg-slate-900 text-white text-[10px] md:text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3 md:p-4 w-[20%] font-bold text-center md:text-left">Doc / Nota</th>
                  <th className="p-3 md:p-4 w-[15%] font-bold">Fecha / Sala</th>
                  <th className="p-3 md:p-4 w-[20%] font-bold">Cliente / Destino</th>
                  <th className="p-3 md:p-4 w-[12%] font-bold text-right">V. Factura</th>
                  <th className="p-3 md:p-4 w-[15%] font-extrabold text-right bg-red-900/50">DEUDA</th>
                  <th className="p-3 md:p-4 w-[18%] font-bold text-center">Acción</th>
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
                  pedidos.map((p) => (
                    <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="p-3 md:p-4 align-middle">
                        <div className="font-bold text-blue-600 font-mono text-base md:text-lg">{p.id_factura}</div>
                        <div className="text-[9px] text-slate-400 font-bold">{p.tipo_documento}</div>
                        {p.observaciones_entrega && (
                          <div className="mt-1 text-[9px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded line-clamp-2" title={p.observaciones_entrega}>
                            <b>Falta:</b> {p.observaciones_entrega}
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
                      <td className="p-3 md:p-4 align-middle text-center">
                        <button 
                          onClick={() => handleAbrirAsignacion(p)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg font-bold text-[10px] md:text-xs shadow-md active:scale-95 flex items-center justify-center gap-1 md:gap-2 w-full transition-transform"
                        >
                          <Truck size={14} /> Agendar Saldo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL RESPONSIVO (SCROLL INTERNO Y VALIDACIÓN DE TALLER) */}
        {showModal && pedidoSeleccionado && (
          <div className="fixed inset-0 bg-slate-900/80 z-[70] flex justify-center items-center p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
              <div className="bg-slate-900 p-4 md:p-5 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-[#47B3A8] p-1.5 md:p-2 rounded-lg"><Truck size={18} className="text-white"/></div>
                  <div>
                    <h3 className="font-bold text-base md:text-lg leading-none">Generar Viaje de Saldo</h3>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-1">Pedido: {pedidoSeleccionado.id_factura}-S</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-white/20 transition-colors"><X size={18}/></button>
              </div>

              <form onSubmit={handleAsignarSaldo} className="p-4 md:p-6 space-y-4 md:space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                
                <div className="bg-red-50 p-3 md:p-4 rounded-xl border border-red-200 shadow-sm flex justify-between items-center">
                  <p className="text-[10px] md:text-sm font-medium text-red-800 uppercase">Por despachar:</p>
                  <p className="text-lg md:text-xl font-extrabold text-red-600">${Number(pedidoSeleccionado.valor_factura_pendiente).toLocaleString('es-CO')}</p>
                </div>

                {/* 👇 MODIFICACIÓN: FECHA Y HORA LÍMITE 👇 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5">
                      <Calendar size={12} className="text-[#47B3A8]"/> Fecha Salida
                    </label>
                    <input 
                      type="date" 
                      value={asignacion.fecha_agendada} 
                      onChange={(e) => setAsignacion({...asignacion, fecha_agendada: e.target.value})} 
                      className="w-full border-2 border-slate-200 p-2 md:p-2.5 rounded-lg md:rounded-xl text-sm font-bold bg-white outline-none focus:border-[#47B3A8]" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] md:text-xs font-bold text-blue-600 uppercase flex items-center gap-2 mb-1.5">
                      <Clock size={12} /> Hora Límite
                    </label>
                    <input 
                      type="time" 
                      value={asignacion.hora_limite} 
                      onChange={(e) => setAsignacion({...asignacion, hora_limite: e.target.value})} 
                      className="w-full border-2 border-blue-200 bg-blue-50 p-2 md:p-2.5 rounded-lg md:rounded-xl text-blue-900 font-bold text-sm outline-none focus:border-blue-500" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><User size={12} /> Conductor</label>
                    <select value={asignacion.conductor_id} onChange={(e) => setAsignacion({ ...asignacion, conductor_id: e.target.value })} className="w-full border-2 border-slate-200 p-2 md:p-2.5 rounded-lg text-sm bg-white outline-none focus:border-[#47B3A8]" required>
                      <option value="">Selecciona...</option>
                      {conductores.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><Truck size={12} /> Vehículo</label>
                    <select 
                      value={asignacion.vehiculo_id} 
                      onChange={(e) => setAsignacion({...asignacion, vehiculo_id: e.target.value})} 
                      className="w-full border-2 border-slate-200 p-2 md:p-2.5 rounded-lg text-sm bg-white outline-none focus:border-[#47B3A8]" 
                      required
                    >
                      <option value="">Selecciona...</option>
                      {vehiculos.map(v => (
                        <option 
                          key={v.id} 
                          value={v.id} 
                          disabled={Number(v.estado) === 0}
                        >
                          {v.placa} {Number(v.estado) === 0 ? ' 🚫 (TALLER)' : ''}
                        </option>
                      ))}
                    </select>

                  </div>
                </div>

                <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Building2 size={14} className="text-orange-500"/> Origen Mercancía</label>
                    <button type="button" onClick={handleAddDetalle} className="text-[9px] bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"><Plus size={10}/> Agregar</button>
                  </div>

                  {asignacion.detalles.map((det, index) => (
                    <div key={index} className="flex gap-2 items-center animate-fadeIn">
                      <select value={det.bodega_id} onChange={(e) => handleDetalleChange(index, 'bodega_id', e.target.value)} className="flex-1 border-2 border-slate-200 p-1.5 md:p-2 rounded-lg text-[11px] md:text-sm font-medium bg-white outline-none focus:border-[#47B3A8]" required>
                        <option value="">-- Bodega --</option>
                        {bodegas.map(b => (<option key={b.id} value={b.id}>{b.nombre}</option>))}
                      </select>
                      <div className="w-24 md:w-28 relative">
                        <input type="number" step="0.1" value={det.peso} onChange={(e) => handleDetalleChange(index, 'peso', e.target.value)} className="w-full border-2 border-slate-200 p-1.5 md:p-2 pl-6 md:pl-7 rounded-lg font-bold bg-white text-[11px] md:text-sm outline-none focus:border-[#47B3A8]" placeholder="Kg" required />
                        <Weight size={12} className="absolute left-1.5 md:left-2 top-2 md:top-2.5 text-teal-600"/>
                      </div>
                      {asignacion.detalles.length > 1 && (
                        <button type="button" onClick={() => handleRemoveDetalle(index)} className="p-1.5 md:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5">Valor del Viaje actual</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-bold text-sm">$</span>
                    <input type="number" step="0.01" min="0" max={pedidoSeleccionado.valor_factura_pendiente} value={asignacion.valor_despachar} onChange={(e) => setAsignacion({...asignacion, valor_despachar: e.target.value})} className="w-full pl-7 md:pl-8 border-2 border-blue-300 bg-blue-50 p-2 md:p-2.5 rounded-lg md:rounded-xl text-blue-900 font-bold text-base md:text-lg outline-none focus:ring-2 focus:ring-blue-400" required />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1.5"><FileText size={12} className="text-blue-500"/> Nota del Despacho (Planilla)</label>
                  <textarea value={asignacion.nota_despacho} onChange={(e) => setAsignacion({...asignacion, nota_despacho: e.target.value})} className="w-full border-2 border-slate-200 p-2 md:p-3 rounded-lg md:rounded-xl text-xs md:text-sm bg-white outline-none focus:border-[#47B3A8]" placeholder="Ej: Se envía 1 inodoro..." rows="2" required />
                </div>

                {esEnvioParcial && (
                  <div className="animate-fadeIn p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl">
                    <label className="text-[10px] md:text-xs font-bold text-red-700 uppercase flex items-center gap-2 mb-1.5"><AlertCircle size={14} /> Sigue faltando:</label>
                    <textarea value={asignacion.observaciones_entrega} onChange={(e) => setAsignacion({...asignacion, observaciones_entrega: e.target.value})} className="w-full border border-red-300 p-2 md:p-3 rounded-lg text-[11px] md:text-sm text-slate-800 bg-white outline-none focus:border-red-500" placeholder="Ej: Queda pendiente cerámica..." rows="2" required={esEnvioParcial} />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2 md:gap-3 pt-4 border-t border-slate-100 shrink-0">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 md:py-2.5 text-slate-500 font-bold text-xs md:text-sm hover:bg-slate-100 rounded-lg order-2 sm:order-1 transition-colors">Cancelar</button>
                  <button type="submit" className="bg-[#47B3A8] hover:bg-[#3A948C] text-white px-6 py-2.5 md:py-3 rounded-lg font-bold text-xs md:text-sm shadow-lg flex items-center justify-center gap-2 order-1 sm:order-2 transition-transform active:scale-95">Generar Viaje <CheckCircle size={16} /></button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReporteParciales;