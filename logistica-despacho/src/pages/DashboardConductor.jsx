import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import { LogOut, MapPin, Phone, Calendar, AlertCircle, FileText, CheckCircle, User, PlayCircle, XCircle, Truck, X, AlertTriangle, RefreshCw, PenTool, Eraser } from 'lucide-react';
import logoEmpresa from '../assets/rodeo.png';

const DashboardConductor = () => {
  const { user, logout } = useAuth();

  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const [fechaFiltro] = useState(obtenerFechaLocal()); 
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS MODAL DEVOLUCIÓN
  const [showModalDevolucion, setShowModalDevolucion] = useState(false);
  const [pedidoDevolucion, setPedidoDevolucion] = useState(null);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [valorDevolucion, setValorDevolucion] = useState('');

  // 👇 NUEVOS ESTADOS PARA EL MODAL DE FIRMA 👇
  const [showModalFirma, setShowModalFirma] = useState(false);
  const [pedidoFirma, setPedidoFirma] = useState(null);
  const sigCanvas = useRef({});

  const fetchRutas = async (mostrarCarga = true) => {
    if (!user) return;
    if (mostrarCarga) setLoading(true);
    try {
      const timestamp = new Date().getTime();
      // CORREGIDO: Uso de backticks (``)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/conductor/mis-rutas?conductor_id=${user.id}&fecha=${fechaFiltro}&_t=${timestamp}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (response.ok) {
        setRutas(await response.json());
      }
    } catch (error) {
      console.error("Error al cargar rutas:", error);
    } finally {
      if (mostrarCarga) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRutas(true);
    const intervalId = setInterval(() => { fetchRutas(false); }, 5000);
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaFiltro, user]);

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      // CORREGIDO: Uso de backticks (``)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/conductor/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (response.ok) fetchRutas(false);
    } catch (error) { alert("Error de conexión al servidor."); }
  };

  // 👇 LÓGICA DE FIRMA Y ENTREGA EXITOSA 👇
  const iniciarEntrega = (pedido) => {
    setPedidoFirma(pedido);
    setShowModalFirma(true);
  };

  const limpiarFirma = () => {
    sigCanvas.current.clear();
  };

  const confirmarEntregaConFirma = async () => {
    if (sigCanvas.current.isEmpty()) {
      return alert("El cliente debe firmar en el recuadro blanco para confirmar la entrega.");
    }
    
    // Extrae la imagen en formato Base64
    const firmaBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

    try {
      // CORREGIDO: Uso de backticks (``)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/conductor/pedidos/${pedidoFirma.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: 'Entregado',
          firma_cliente: firmaBase64 // Enviamos la firma al backend
        })
      });

      if (response.ok) {
        setShowModalFirma(false);
        setPedidoFirma(null);
        fetchRutas(true);
      } else {
        alert("Hubo un error al registrar la entrega.");
      }
    } catch (error) {
      alert("Error de conexión al servidor.");
    }
  };

  const abrirModalDevolucion = (pedido) => {
    setPedidoDevolucion(pedido);
    setMotivoDevolucion('');
    setValorDevolucion(pedido.total_despachado); 
    setShowModalDevolucion(true);
  };

  const confirmarDevolucion = async (e) => {
    e.preventDefault();
    if (!motivoDevolucion.trim()) return alert("Debes escribir el motivo.");
    const valorD = parseFloat(valorDevolucion);
    if (isNaN(valorD) || valorD <= 0 || valorD > parseFloat(pedidoDevolucion.total_despachado)) {
      return alert(`Valor no válido.`);
    }

    try {
      // CORREGIDO: Uso de backticks (``)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/conductor/pedidos/${pedidoDevolucion.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Devolución', observacion_devolucion: motivoDevolucion, valor_devolucion: valorD })
      });
      if (response.ok) {
        setShowModalDevolucion(false);
        fetchRutas(true);
      }
    } catch (error) { alert("Error de conexión."); }
  };

  const totalPeso = rutas.reduce((acc, r) => acc + Number(r.total_peso || 0), 0);
  const entregasPendientes = rutas.filter(r => r.estado_entrega === 'Asignado' || r.estado_entrega === 'En Ruta').length;
  const vehiculoAsignado = rutas.length > 0 && rutas[0].vehiculo_placa ? rutas[0].vehiculo_placa : 'Sin asignar';

  return (
    <div className="bg-slate-100 min-h-screen pb-20 font-sans">
      
      {/* NAVBAR */}
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logoEmpresa} alt="Logo" className="h-10 w-auto bg-white p-1 rounded-lg" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Conductor</p>
              <p className="font-bold text-sm leading-tight truncate max-w-[160px]">{user?.nombre_completo || 'Conductor'}</p>
            </div>
          </div>
          <button onClick={logout} className="bg-slate-800 p-2.5 rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        
        {/* RESUMEN */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Calendar size={16} className="text-[#47B3A8]" /> Mi Jornada (Hoy)
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchRutas(true)} disabled={loading} className="bg-[#47B3A8]/10 text-[#47B3A8] p-1.5 rounded-lg shadow-sm hover:bg-[#47B3A8]/20 active:scale-95 transition-all">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md">
                  <Truck size={14} className="text-[#47B3A8]"/> {vehiculoAsignado}
                </div>
              </div>
            </div>
            <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-700 outline-none flex items-center justify-between">
              <span>{fechaFiltro}</span>
              <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase">Día Actual</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Por Entregar</p>
              <p className="text-2xl font-extrabold text-slate-800">{entregasPendientes} <span className="text-sm font-medium text-slate-400">/ {rutas.length}</span></p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Carga Total</p>
              <p className="text-xl font-extrabold text-[#47B3A8]">{totalPeso.toLocaleString()} <span className="text-sm">Kg</span></p>
            </div>
          </div>
        </div>

        {/* TARJETAS */}
        {loading && rutas.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-medium flex flex-col items-center gap-2">
            <RefreshCw size={24} className="animate-spin text-[#47B3A8]" /> Cargando ruta...
          </div>
        ) : rutas.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-slate-200 mt-6">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-3 opacity-50" />
            <h3 className="text-lg font-bold text-slate-800">Día libre o sin asignar</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {rutas.map((ruta) => {
              const fueExitoso = ruta.estado_entrega === 'Entregado' || ruta.estado_entrega === 'Entregado Incompleto';

              return (
                <div key={ruta.id} className={`bg-white rounded-2xl shadow-md border overflow-hidden relative transition-all ${
                  fueExitoso ? 'border-green-300 opacity-70' : 
                  ruta.estado_entrega === 'Devolución' ? 'border-red-300 opacity-70' : 'border-slate-200'
                }`}>
                  <div className={`h-1.5 w-full ${
                    ruta.estado_entrega === 'Entregado' ? 'bg-green-500' : 
                    ruta.estado_entrega === 'Entregado Incompleto' ? 'bg-orange-500' :
                    ruta.estado_entrega === 'Devolución' ? 'bg-red-500' : 'bg-blue-400'
                  }`}></div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase border border-slate-200">{ruta.tipo_documento}</span>
                        <p className={`font-extrabold text-lg mt-1 flex items-center gap-1 ${fueExitoso ? 'text-green-600' : ruta.estado_entrega === 'Devolución' ? 'text-red-600' : 'text-[#47B3A8]'}`}>
                          <FileText size={18} /> {ruta.id_factura}
                        </p>
                      </div>
                      {ruta.estado_entrega === 'En Ruta' && (
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase animate-pulse flex items-center gap-1"><Truck size={12}/> En Ruta</span>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex gap-3 items-center">
                          <div className="bg-blue-100 p-2 rounded-full text-blue-600"><User size={16}/></div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Cliente</p>
                            <p className="font-bold text-slate-700 leading-tight text-sm">{ruta.nombre_cliente}</p>
                          </div>
                        </div>
                        <a href={`tel:${ruta.telefono}`} className="p-3 bg-green-100 text-green-600 rounded-full shadow-sm hover:bg-green-200 active:scale-95 transition-transform"><Phone size={18}/></a>
                      </div>
                      <div className="flex gap-3 px-2">
                        <div className="text-orange-500 mt-0.5"><MapPin size={16}/></div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase">Destino</p>
                          <p className="font-bold text-slate-800 text-sm">{ruta.destino} <span className="text-xs font-normal text-slate-500">({ruta.zona_envio})</span></p>
                        </div>
                      </div>
                      {(ruta.nota_manual || ruta.observaciones_entrega) && (
                        <div className={`p-3 rounded-xl flex gap-2 items-start mt-2 border ${ruta.estado_entrega === 'Devolución' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <AlertCircle size={16} className={`${ruta.estado_entrega === 'Devolución' ? 'text-red-600' : 'text-yellow-600'} mt-0.5 shrink-0`}/>
                          <p className={`text-xs font-medium leading-snug ${ruta.estado_entrega === 'Devolución' ? 'text-red-800' : 'text-yellow-800'}`}>
                            <span className="font-bold block">NOTAS:</span>
                            {ruta.nota_manual} {ruta.observaciones_entrega ? ` | ${ruta.observaciones_entrega}` : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center px-2 mb-4">
                      <div><p className="text-[10px] text-slate-400 font-bold uppercase">Llevas (Peso)</p><p className="font-extrabold text-slate-700">{Number(ruta.total_peso).toLocaleString()} Kg</p></div>
                      <div className="text-right"><p className="text-[10px] text-slate-400 font-bold uppercase">Valor de Carga</p><p className="font-extrabold text-slate-900">${Number(ruta.total_despachado).toLocaleString('es-CO')}</p></div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      {ruta.estado_entrega === 'Asignado' && (
                        <button onClick={() => handleCambiarEstado(ruta.id, 'En Ruta')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md active:scale-95 transition-transform">
                          <PlayCircle size={18} /> Iniciar Ruta de Entrega
                        </button>
                      )}

                      {ruta.estado_entrega === 'En Ruta' && (
                        <div className="grid grid-cols-2 gap-3">
                          {/* 👇 AL HACER CLIC, AHORA ABRE EL MODAL DE FIRMA 👇 */}
                          <button onClick={() => iniciarEntrega(ruta)} className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md active:scale-95 transition-transform">
                            <PenTool size={18} /> Entregado
                          </button>
                          <button onClick={() => abrirModalDevolucion(ruta)} className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md active:scale-95 transition-transform">
                            <XCircle size={18} /> Devolución
                          </button>
                        </div>
                      )}

                      {(fueExitoso || ruta.estado_entrega === 'Devolución') && (
                        <div className={`py-3 rounded-xl flex justify-center items-center gap-2 font-bold text-sm border ${ruta.estado_entrega === 'Entregado' ? 'bg-green-50 text-green-700 border-green-200' : ruta.estado_entrega === 'Entregado Incompleto' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {ruta.estado_entrega === 'Devolución' ? <XCircle size={20}/> : ruta.estado_entrega === 'Entregado Incompleto' ? <AlertTriangle size={20} /> : <CheckCircle size={20}/>}
                          {ruta.estado_entrega === 'Devolución' ? 'Retornado a Bodega' : ruta.estado_entrega === 'Entregado Incompleto' ? 'Entregado Parcialmente' : 'Entrega Exitosa'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL DE FIRMA PARA ENTREGA EXITOSA ================= */}
      {showModalFirma && pedidoFirma && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex justify-center items-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-green-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <PenTool size={20} />
                <h3 className="font-bold text-lg">Firma de Recibido</h3>
              </div>
              <button onClick={() => setShowModalFirma(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <p className="text-sm text-slate-600 mb-4 text-center">
                Pide al cliente <b>{pedidoFirma.nombre_cliente}</b> que firme en el recuadro para confirmar la entrega del pedido <b>{pedidoFirma.id_factura}</b>.
              </p>
              
              {/* LIENZO DE FIRMA */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 mb-4 relative overflow-hidden touch-none" style={{ height: '250px' }}>
                <SignatureCanvas 
                  ref={sigCanvas} 
                  penColor="black"
                  canvasProps={{ className: 'w-full h-full' }}
                />
              </div>

              <div className="flex justify-end mb-6">
                <button onClick={limpiarFirma} className="text-slate-500 text-xs font-bold flex items-center gap-1 hover:text-slate-800">
                  <Eraser size={14}/> Borrar firma y repetir
                </button>
              </div>

              <div className="flex gap-3 mt-auto">
                <button type="button" onClick={() => setShowModalFirma(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmarEntregaConFirma} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2">
                  <CheckCircle size={18}/> Finalizar Entrega
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE DEVOLUCIÓN PARCIAL / TOTAL ================= */}
      {showModalDevolucion && pedidoDevolucion && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex justify-center items-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} />
                <h3 className="font-bold text-lg">Registrar Devolución</h3>
              </div>
              <button onClick={() => setShowModalDevolucion(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
            </div>

            <form onSubmit={confirmarDevolucion} className="p-5">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-5 shadow-inner">
                <label className="text-xs font-bold text-red-800 uppercase mb-2 block">¿Cuánta plata en mercancía está devolviendo?</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-red-700 font-bold">$</span>
                  <input type="number" step="0.01" min="1" max={pedidoDevolucion.total_despachado} value={valorDevolucion} onChange={(e) => setValorDevolucion(e.target.value)} className="w-full pl-8 border-2 border-red-200 p-3 rounded-xl focus:border-red-500 outline-none text-red-900 font-extrabold text-lg bg-white" required />
                </div>
              </div>
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><FileText size={14}/> Motivo de la Devolución</label>
                <textarea value={motivoDevolucion} onChange={(e) => setMotivoDevolucion(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-red-500 outline-none text-slate-700 bg-white resize-none" rows="3" placeholder="Ej: Cliente devolvió 1 caja..." required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModalDevolucion(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2"><XCircle size={18}/> Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardConductor;