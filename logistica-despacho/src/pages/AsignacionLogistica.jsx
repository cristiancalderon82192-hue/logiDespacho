import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Calendar, CheckCircle, X, User, Edit, Search } from 'lucide-react';

const AsignacionLogistica = () => {
  
  // 1. Por defecto cargamos la fecha de HOY
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaFiltro, setFechaFiltro] = useState(hoy);
  
  const [pedidos, setPedidos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  
  // Estados Modal
  const [showModal, setShowModal] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [asignacion, setAsignacion] = useState({ conductor_id: '', vehiculo_id: '' });
  const [loading, setLoading] = useState(false);

  // --- CARGA DE DATOS POR FECHA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resP, resC, resV] = await Promise.all([
        fetch(`http://localhost:3000/api/logistica/pedidos-dia?fecha=${fechaFiltro}`),
        fetch('http://localhost:3000/api/logistica/conductores'), 
        fetch('http://localhost:3000/api/logistica/vehiculos')
      ]);
      
      if(resP.ok) setPedidos(await resP.json());
      if(resC.ok) setConductores(await resC.json());
      if(resV.ok) setVehiculos(await resV.json());
      
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaFiltro]);

  // --- ABRIR MODAL (PRECARGA DATOS SI YA ESTÁ ASIGNADO) ---
  const handleAbrirAsignacion = (pedido) => {
    setPedidoSeleccionado(pedido);
    setAsignacion({ 
      conductor_id: pedido.conductor_id || '', 
      vehiculo_id: pedido.vehiculo_id || '' 
    });
    setShowModal(true);
  };

  // --- GUARDAR O MODIFICAR ASIGNACIÓN ---
  const handleAsignar = async (e) => {
    e.preventDefault();
    if (!asignacion.conductor_id || !asignacion.vehiculo_id) {
      return alert("Debes seleccionar un conductor y un vehículo.");
    }

    try {
      const res = await fetch(`http://localhost:3000/api/logistica/pedidos/${pedidoSeleccionado.id}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asignacion)
      });

      if (res.ok) {
        alert("✅ Ruta asignada exitosamente");
        setShowModal(false);
        fetchData(); // Recarga la tabla
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.error}`);
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen space-y-8 p-2 md:p-6">
      
      {/* HEADER Y FILTRO DE FECHA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Truck className="text-[#47B3A8]" size={28} /> 
            Programación de Rutas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Consulta y modifica las asignaciones de despachos</p>
        </div>
        
        {/* CALENDARIO FILTRO */}
        <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-xl border border-slate-200 shadow-inner">
          <Calendar className="text-slate-500 ml-2" size={20} />
          <span className="text-sm font-bold text-slate-600 uppercase">Fecha Salida:</span>
          <input 
            type="date" 
            value={fechaFiltro} 
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-[#47B3A8] focus:border-[#47B3A8] block p-2 outline-none font-bold cursor-pointer"
          />
        </div>
      </div>

      {/* TABLA DE PEDIDOS */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed min-w-[900px]">
            <thead className="bg-slate-900 text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 w-[15%]">Documento</th>
                <th className="p-4 w-[20%]">Destino / Cliente</th>
                <th className="p-4 w-[10%] text-center">Peso (Kg)</th>
                <th className="p-4 w-[15%] text-center">Estado</th>
                <th className="p-4 w-[25%]">Asignación Actual</th>
                <th className="p-4 w-[15%] text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Buscando despachos...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Search size={48} className="text-slate-300 mb-3 opacity-50" />
                    <p className="text-lg font-bold">Sin agendamientos</p>
                    <p className="text-sm">No hay pedidos programados para salir en la fecha seleccionada.</p>
                  </td>
                </tr>
              ) : (
                pedidos.map((p) => (
                  <tr key={p.id} className={`hover:bg-blue-50/50 transition-colors group ${p.conductor_id ? 'bg-slate-50/50' : 'bg-white'}`}>
                    
                    <td className="p-4 align-middle">
                      <div className="font-bold text-blue-600 font-mono text-lg">{p.id_factura}</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{p.tipo_documento_id === 3 ? 'Traslado' : 'Factura'}</div>
                    </td>
                    
                    <td className="p-4 align-middle">
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-orange-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800">{p.destino} <span className="text-xs text-slate-400 font-normal">({p.zona_envio})</span></p>
                          <p className="text-xs text-slate-600 mt-1 truncate">{p.nombre_cliente}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* 👇 AQUÍ ESTÁ LA CORRECCIÓN LIMPIA DEL PESO PARA LA TABLA 👇 */}
                    <td className="p-4 align-middle text-center font-extrabold text-slate-800 text-lg">
                      {p.peso && parseFloat(p.peso) > 0 ? parseFloat(p.peso).toLocaleString() : '0'}
                    </td>
                    
                    <td className="p-4 align-middle text-center">
                      {p.conductor_id ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">Asignado</span>
                      ) : (
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 animate-pulse">Pendiente</span>
                      )}
                    </td>

                    <td className="p-4 align-middle">
                      {p.conductor_id ? (
                        <div className="text-xs space-y-1 bg-white p-2 rounded border border-slate-200 shadow-sm">
                          <p className="flex items-center gap-1.5 font-medium text-slate-700"><User size={12} className="text-blue-500"/> {p.conductor_nombre}</p>
                          <p className="flex items-center gap-1.5 font-bold text-slate-800"><Truck size={12} className="text-slate-500"/> {p.vehiculo_placa}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Sin asignar</span>
                      )}
                    </td>
                    
                    <td className="p-4 align-middle text-center">
                      <button 
                        onClick={() => handleAbrirAsignacion(p)}
                        className={`px-4 py-2 rounded-lg font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 w-full ${p.conductor_id ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-[#47B3A8] text-white hover:bg-[#3A948C]'}`}
                      >
                        {p.conductor_id ? <><Edit size={14} /> Modificar</> : <><Truck size={14} /> Asignar</>}
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL DE ASIGNACIÓN ================= */}
      {showModal && pedidoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="bg-[#47B3A8] p-2 rounded-lg"><Truck size={20} className="text-white"/></div>
                <div>
                  <h3 className="font-bold text-lg leading-none">Asignar Ruta</h3>
                  <p className="text-xs text-slate-400 mt-1">Pedido: {pedidoSeleccionado.id_factura}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleAsignar} className="p-6 space-y-6">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-1">Destino de entrega:</p>
                <p className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MapPin size={18} className="text-orange-500" /> {pedidoSeleccionado.destino} ({pedidoSeleccionado.zona_envio})
                </p>
                {/* 👇 AQUÍ ESTÁ LA CORRECCIÓN LIMPIA DEL PESO PARA EL MODAL 👇 */}
                <p className="text-xs text-slate-500 mt-2">
                  Carga total: <span className="font-bold text-slate-700">{pedidoSeleccionado.peso && parseFloat(pedidoSeleccionado.peso) > 0 ? parseFloat(pedidoSeleccionado.peso).toLocaleString() : '0'} Kg</span>
                </p>
              </div>

              <div className="space-y-4">
                {/* SELECT CONDUCTOR */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                    <User size={14} /> Seleccionar Conductor
                  </label>
                  <select 
                    value={asignacion.conductor_id} 
                    onChange={(e) => setAsignacion({...asignacion, conductor_id: e.target.value})}
                    className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-[#47B3A8] outline-none text-slate-700 font-medium bg-white"
                    required
                  >
                    <option value="">-- Elige un conductor --</option>
                    {conductores.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* SELECT VEHÍCULO */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                    <Truck size={14} /> Seleccionar Vehículo (Placa)
                  </label>
                  <select 
                    value={asignacion.vehiculo_id} 
                    onChange={(e) => setAsignacion({...asignacion, vehiculo_id: e.target.value})}
                    className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-[#47B3A8] outline-none text-slate-700 font-medium bg-white"
                    required
                  >
                    <option value="">-- Elige un vehículo --</option>
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>{v.placa} - {v.marca} ({v.capacidad_kg} Kg)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="bg-[#47B3A8] hover:bg-[#3A948C] text-white px-6 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2">
                  Guardar Cambios <CheckCircle size={18} />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AsignacionLogistica;