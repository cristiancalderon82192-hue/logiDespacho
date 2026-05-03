import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import { LogOut, MapPin, Phone, Calendar, AlertCircle, FileText, CheckCircle, User, PlayCircle, XCircle, Truck, X, AlertTriangle, RefreshCw, PenTool, Eraser, DollarSign } from 'lucide-react';
import logoEmpresa from '../assets/rodeo.png';

// Importamos el socket
import { socket } from '../utils/socket'; 

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

  // Estados para Modal de Entrega Exitosa
  const [showModalFirma, setShowModalFirma] = useState(false);
  const [pedidoFirma, setPedidoFirma] = useState(null);
  const sigCanvas = useRef({});

  // Estados para Modal de Devolución/Novedad
  const [showModalDevolucion, setShowModalDevolucion] = useState(false);
  const [pedidoDevolucion, setPedidoDevolucion] = useState(null);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [valorDevolucion, setValorDevolucion] = useState('');
  // 👇 NUEVOS ESTADOS PARA EL FLUJO DE 2 PASOS EN DEVOLUCIÓN
  const [pasoDevolucion, setPasoDevolucion] = useState(1); 
  const sigCanvasDev = useRef({}); 

  // =========================================================================
  // 📍 LÓGICA DE RASTREO GPS BLINDADA
  // =========================================================================
  const ultimaPosicionRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const conductorId = user.id || user.id_usuario || user.email;

    socket.emit('registrar_usuario', { 
      id: conductorId, 
      email: user.email, 
      role: user.role 
    });

    let watchId;
    let intervalId;
    
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          ultimaPosicionRef.current = position;
        },
        (error) => {
          console.error("❌ Error obteniendo GPS:", error.message);
        },
        {
          enableHighAccuracy: true, 
          maximumAge: 0
        }
      );

      intervalId = setInterval(() => {
        if (ultimaPosicionRef.current) {
          const datosGPS = {
            id_conductor: conductorId,
            nombre: user.nombre_completo || user.email, 
            lat: ultimaPosicionRef.current.coords.latitude,
            lng: ultimaPosicionRef.current.coords.longitude,
            timestamp: new Date().toISOString()
          };
          
          socket.emit('enviar_ubicacion', datosGPS);
        }
      }, 5000);

    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);
  // =========================================================================

  const fetchRutas = async (mostrarCarga = true) => {
    if (!user) return;
    if (mostrarCarga) setLoading(true);
    try {
      const timestamp = new Date().getTime();
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
  }, [fechaFiltro, user]);

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/conductor/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (response.ok) fetchRutas(false);
    } catch (error) { alert("Error de conexión al servidor."); }
  };

  // ---- LÓGICA DE ENTREGA EXITOSA ----
  const iniciarEntrega = (pedido) => {
    setPedidoFirma(pedido);
    setShowModalFirma(true);
  };

  const limpiarFirma = () => {
    sigCanvas.current.clear();
  };

  const confirmarEntregaConFirma = async () => {
    if (sigCanvas.current.isEmpty()) return alert("El cliente debe firmar en el recuadro.");
    
    const firmaBase64 = sigCanvas.current.getCanvas().toDataURL('image/png');

    let valorACobrar = parseFloat(pedidoFirma.total_despachado);
    if (isNaN(valorACobrar) || valorACobrar <= 0) valorACobrar = parseFloat(pedidoFirma.valor_factura || 0);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/conductor/pedidos/${pedidoFirma.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: 'Entregado',
          firma_cliente: firmaBase64,
          valor_recaudado: valorACobrar 
        })
      });

      if (response.ok) {
        setShowModalFirma(false);
        setPedidoFirma(null);
        fetchRutas(true);
      }
    } catch (error) { alert("Error de conexión."); }
  };

  // ---- LÓGICA DE DEVOLUCIÓN / NOVEDAD (AHORA CON FIRMA) ----
  const abrirModalDevolucion = (pedido) => {
    setPedidoDevolucion(pedido);
    setMotivoDevolucion('');
    setValorDevolucion(''); 
    setPasoDevolucion(1); // Siempre arranca en el paso 1 (Formulario)
    setShowModalDevolucion(true);
  };

  // PASO 1: Valida los datos y pasa a la firma
  const validarDatosDevolucion = (e) => {
    e.preventDefault();
    if (!motivoDevolucion.trim()) return alert("Debes escribir el motivo.");
    
    let cargaEnCamion = parseFloat(pedidoDevolucion.total_despachado);
    if (isNaN(cargaEnCamion) || cargaEnCamion <= 0) cargaEnCamion = parseFloat(pedidoDevolucion.valor_factura || 0);
    
    const valorD = parseFloat(String(valorDevolucion).replace(/[^0-9]/g, '')) || 0; 

    if (valorD <= 0) return alert("El valor de la devolución no puede ser cero. Digita el valor correctamente.");
    if (valorD > cargaEnCamion) return alert(`Estás devolviendo $${valorD.toLocaleString()}, pero en el camión solo llevas $${cargaEnCamion.toLocaleString()}. Digita bien.`);

    // Si todo está bien, pasamos a capturar la firma
    setPasoDevolucion(2);
  };

  const limpiarFirmaDevolucion = () => {
    sigCanvasDev.current.clear();
  };

  // PASO 2: Guarda todo (Datos + Firma) en la Base de Datos
  const confirmarDevolucionConFirma = async () => {
    if (sigCanvasDev.current.isEmpty()) return alert("El cliente debe firmar la novedad para proceder.");
    
    const firmaBase64 = sigCanvasDev.current.getCanvas().toDataURL('image/png');

    let cargaEnCamion = parseFloat(pedidoDevolucion.total_despachado);
    if (isNaN(cargaEnCamion) || cargaEnCamion <= 0) cargaEnCamion = parseFloat(pedidoDevolucion.valor_factura || 0);
    
    const valorD = parseFloat(String(valorDevolucion).replace(/[^0-9]/g, '')) || 0; 
    const valorRecaudado = cargaEnCamion - valorD;
    const estadoReal = valorRecaudado > 0 ? 'Entregado Incompleto' : 'Devolución';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/conductor/pedidos/${pedidoDevolucion.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: estadoReal, 
          observaciones_entrega: motivoDevolucion,
          observacion_devolucion: motivoDevolucion, 
          valor_devolucion: valorD,
          valor_recaudado: valorRecaudado,
          firma_cliente: firmaBase64 // Aquí enviamos la firma de la novedad al backend
        })
      });
      if (response.ok) {
        setShowModalDevolucion(false);
        fetchRutas(true);
      }
    } catch (error) { alert("Error de conexión."); }
  };

  // Cálculos visuales
  let totalModal = parseFloat(pedidoDevolucion?.total_despachado);
  if (isNaN(totalModal) || totalModal <= 0) totalModal = parseFloat(pedidoDevolucion?.valor_factura || 0);

  const devModal = parseFloat(String(valorDevolucion).replace(/[^0-9]/g, '')) || 0;
  const aRecaudarModal = Math.max(0, totalModal - devModal);

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
                <Calendar size={16} className="text-[#47B3A8]" /> Hoy: {fechaFiltro}
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
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Entregas</p>
              <p className="text-2xl font-extrabold text-slate-800">{entregasPendientes} / {rutas.length}</p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Carga Total</p>
              <p className="text-xl font-extrabold text-[#47B3A8]">{totalPeso.toLocaleString()} <span className="text-sm">Kg</span></p>
            </div>
          </div>
        </div>

        {/* TARJETAS DE PEDIDOS */}
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
              const finalizado = fueExitoso || ruta.estado_entrega === 'Devolución';

              let valorVisualCarga = parseFloat(ruta.total_despachado);
              if (isNaN(valorVisualCarga) || valorVisualCarga <= 0) valorVisualCarga = parseFloat(ruta.valor_factura || 0);

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
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Llevas (Peso)</p>
                        <p className="font-extrabold text-slate-700">{Number(ruta.total_peso).toLocaleString()} Kg</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] font-bold uppercase ${finalizado ? 'text-green-600' : 'text-slate-400'}`}>
                          {finalizado ? '✅ RECAUDO REALIZADO' : 'Valor a Cobrar'}
                        </p>
                        <p className={`font-extrabold text-lg ${finalizado ? 'text-green-700' : 'text-slate-900'}`}>
                          ${finalizado 
                              ? Number(ruta.valor_recaudado || 0).toLocaleString('es-CO') 
                              : valorVisualCarga.toLocaleString('es-CO')
                          }
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      {ruta.estado_entrega === 'Asignado' && (
                        <button onClick={() => handleCambiarEstado(ruta.id, 'En Ruta')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md active:scale-95 transition-transform">
                          <PlayCircle size={18} /> Iniciar Ruta de Entrega
                        </button>
                      )}

                      {ruta.estado_entrega === 'En Ruta' && (
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => iniciarEntrega(ruta)} className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md active:scale-95 transition-transform">
                            <PenTool size={18} /> Entregado
                          </button>
                          <button onClick={() => abrirModalDevolucion(ruta)} className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md active:scale-95 transition-transform text-sm">
                            <AlertCircle size={18} /> Novedad / Dev.
                          </button>
                        </div>
                      )}

                      {finalizado && (
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

      {/* ================= MODAL DE FIRMA PARA ENTREGA TOTAL EXITOSA ================= */}
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

      {/* ================= MODAL INTELIGENTE DE NOVEDADES Y DEVOLUCIONES (EN 2 PASOS) ================= */}
      {showModalDevolucion && pedidoDevolucion && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex justify-center items-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            
            {/* Cabecera dinámica según el paso */}
            <div className={`${pasoDevolucion === 1 ? 'bg-red-600' : 'bg-orange-600'} p-4 flex justify-between items-center text-white transition-colors`}>
              <div className="flex items-center gap-2">
                {pasoDevolucion === 1 ? <AlertCircle size={20} /> : <PenTool size={20} />}
                <h3 className="font-bold text-lg">{pasoDevolucion === 1 ? 'Reportar Novedad' : 'Firma de Conformidad'}</h3>
              </div>
              <button onClick={() => setShowModalDevolucion(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
            </div>

            {/* PASO 1: Llenar motivo y valor */}
            {pasoDevolucion === 1 ? (
              <form onSubmit={validarDatosDevolucion} className="p-5 overflow-y-auto">
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4 shadow-sm">
                  <label className="text-[11px] font-bold text-red-800 uppercase mb-2 block">¿Cuánta plata en mercancía se está devolviendo?</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-red-700 font-bold"><DollarSign size={18}/></span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={valorDevolucion ? Number(String(valorDevolucion).replace(/[^0-9]/g, '')).toLocaleString('es-CO') : ''} 
                      onChange={(e) => {
                        const numerosPuros = e.target.value.replace(/[^0-9]/g, '');
                        setValorDevolucion(numerosPuros);
                      }} 
                      className="w-full pl-9 border-2 border-red-200 p-3 rounded-xl focus:border-red-500 outline-none text-red-900 font-extrabold text-lg bg-white transition-colors" 
                      placeholder="Ej: 350000" 
                      required 
                    />
                  </div>
                </div>

                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-5 space-y-3">
                  <div className="flex justify-between items-center text-slate-500 text-sm">
                    <span className="font-bold uppercase text-[11px]">Total Carga Llevada:</span>
                    <span className="font-bold">${totalModal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-500 text-sm">
                    <span className="font-bold uppercase text-[11px]">Se Devuelve:</span>
                    <span className="font-bold">- ${devModal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="h-px w-full bg-slate-300"></div>
                  <div className="flex justify-between items-center text-green-700">
                    <span className="font-black uppercase text-xs">A Recaudar del Cliente:</span>
                    <span className="font-black text-xl">${aRecaudarModal.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block flex items-center gap-1.5"><FileText size={14}/> Motivo de la Novedad</label>
                  <textarea value={motivoDevolucion} onChange={(e) => setMotivoDevolucion(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-red-500 outline-none text-slate-700 bg-white resize-none text-sm" rows="3" placeholder="Explica detalladamente por qué no se entregó todo..." required />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModalDevolucion(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2">
                    Siguiente <PlayCircle size={18}/>
                  </button>
                </div>
              </form>
            ) : (
              /* PASO 2: Capturar Firma del Cliente */
              <div className="p-5 flex-1 flex flex-col animate-fadeIn">
                <p className="text-sm text-slate-600 mb-4 text-center">
                  Pide al cliente <b>{pedidoDevolucion.nombre_cliente}</b> que firme en el recuadro para confirmar que entrega/recibe con esta novedad.
                </p>
                
                <div className="border-2 border-dashed border-orange-300 rounded-xl bg-orange-50 mb-4 relative overflow-hidden touch-none" style={{ height: '250px' }}>
                  <SignatureCanvas 
                    ref={sigCanvasDev} 
                    penColor="black"
                    canvasProps={{ className: 'w-full h-full' }}
                  />
                </div>

                <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setPasoDevolucion(1)} className="text-slate-500 text-xs font-bold flex items-center gap-1 hover:text-slate-800">
                    &larr; Volver
                  </button>
                  <button onClick={limpiarFirmaDevolucion} className="text-slate-500 text-xs font-bold flex items-center gap-1 hover:text-slate-800">
                    <Eraser size={14}/> Borrar firma
                  </button>
                </div>

                <div className="flex gap-3 mt-auto">
                  <button onClick={confirmarDevolucionConFirma} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2">
                    <CheckCircle size={18}/> Finalizar Novedad
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardConductor;