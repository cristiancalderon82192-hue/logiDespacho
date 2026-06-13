import React, { useState, useEffect, useRef } from 'react';
import { Package, FilePlus, Calendar, Plus, Trash2, Search, User, UserPlus, X, CheckCircle, Camera, Upload, PenTool, Eye } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { socket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';

const PendientesBodega = () => {
  const { user } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [bodegasExistentes, setBodegasExistentes] = useState([]); 
  const [clientesExistentes, setClientesExistentes] = useState([]); 
  const [modalAbierto, setModalAbierto] = useState(false);
  
  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };
  const hoy = obtenerFechaLocal();

  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [filtroFactura, setFiltroFactura] = useState('');
  
  const [formMaster, setFormMaster] = useState({ fecha_factura: '', factura_num: '', punto_venta_id: '', cliente_id: '', fecha_promesa: '', tipo_entrega: 'Retiro Bodega' });
  const [items, setItems] = useState([{ codigo: '', nombre: '', cantidad: '', unidad: 'UND', bodega_id: '' }]);

  // ESTADOS MODAL DE CLIENTES
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
  const [savingClient, setSavingClient] = useState(false);
  const [clienteSeleccionadoNombre, setClienteSeleccionadoNombre] = useState('');

  // ESTADOS MODAL DE CONFIRMAR ENTREGA
  const [modalEntrega, setModalEntrega] = useState(false);
  const [pendienteSeleccionado, setPendienteSeleccionado] = useState(null);
  const [imagenSoporte, setImagenSoporte] = useState(null);
  const [firmaSoporte, setFirmaSoporte] = useState(null);
  const [procesandoEntrega, setProcesandoEntrega] = useState(false);
  
  // ESTADOS CÁMARA NATIVA Y FIRMA
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sigCanvasRef = useRef(null);

  const cargarDatos = async () => {
    const resPend = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes`);
    const resBodegas = await fetch(`${import.meta.env.VITE_API_URL}/api/bodegas`);
    const resClientes = await fetch(`${import.meta.env.VITE_API_URL}/api/clientes`);

    if (resPend.ok) setPendientes(await resPend.json());
    if (resBodegas.ok) setBodegasExistentes(await resBodegas.json());
    if (resClientes.ok) setClientesExistentes(await resClientes.json());
  };

  useEffect(() => { 
    cargarDatos(); 
    
    // Conexión WebSockets para actualizaciones en tiempo real (adiós setInterval)
    const handleActualizacion = async () => {
      try {
        const resPend = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes`);
        if (resPend.ok) setPendientes(await resPend.json());
      } catch (e) { /* ignorar errores de red temporales */ }
    };
    
    socket.on('actualizacion_bodega', handleActualizacion);
    return () => socket.off('actualizacion_bodega', handleActualizacion);
  }, []);

  const handleAddItem = () => setItems([...items, { codigo: '', nombre: '', cantidad: '', unidad: 'UND', bodega_id: '' }]);
  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));

  const handleItemChange = (index, field, value) => {
    const list = [...items];
    list[index][field] = value;
    setItems(list);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formMaster.punto_venta_id || !formMaster.cliente_id || items.some(i => !i.bodega_id)) {
      mostrarInfo("Por favor selecciona opciones de las listas");
      return;
    }

    const payload = { 
      ...formMaster, 
      productos: items,
      usuario_id: user?.id 
    };
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes/nuevo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setModalAbierto(false);
      setItems([{ codigo: '', nombre: '', cantidad: '', unidad: 'UND', bodega_id: '' }]);
      setFormMaster({ fecha_factura: '', factura_num: '', punto_venta_id: '', cliente_id: '', fecha_promesa: '', tipo_entrega: 'Retiro Bodega' });
      setClienteSeleccionadoNombre('');
      cargarDatos();
    } else {
      const errorData = await res.json();
      mostrarError(`❌ Error: ${errorData.error || errorData.message || 'No se pudo guardar el registro'}`);
    }
  };

  const abrirModalEntrega = async (pendiente) => {
    // 1. Parseo inicial para armar la tabla antes del fetch
    let initialProductos = [];
    try {
      let raw = pendiente.productos || pendiente.detalles || pendiente.items || pendiente.materiales;
      if (!raw) {
        for (const key in pendiente) {
          const val = pendiente[key];
          if (Array.isArray(val) && val.length > 0) { raw = val; break; }
          if (typeof val === 'string' && val.trim().startsWith('[') && val.trim().endsWith(']')) { raw = val; break; }
        }
      }
      let parsed = raw;
      while (typeof parsed === 'string') parsed = JSON.parse(parsed);
      initialProductos = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    } catch(e) { initialProductos = []; }

    // Inyectamos la variable editable 'cantidad_a_entregar_ahora'
    const productosListos = initialProductos.map(p => {
      const max = parseFloat(p.cant_a_entregar !== undefined ? p.cant_a_entregar : (p.cantidad || p.peso || 0));
      return { ...p, cantidad_a_entregar_ahora: max };
    });

    setPendienteSeleccionado({ ...pendiente, productos: productosListos });
    setImagenSoporte(null);
    setFirmaSoporte(null);
    setIsCameraOpen(false);
    setIsSigning(false);
    setModalEntrega(true);
    
    // 2. Fetch para traer los saldos reales y actualizados desde BD
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes/${pendiente.id}`);
      if (res.ok) {
        const dataDetalle = await res.json();
        if (dataDetalle.productos) {
          dataDetalle.productos = dataDetalle.productos.map(p => ({
            ...p,
            cantidad_a_entregar_ahora: parseFloat(p.cant_a_entregar !== undefined ? p.cant_a_entregar : (p.cantidad || 0))
          }));
        }
        setPendienteSeleccionado(prev => ({ ...prev, ...dataDetalle, productos: dataDetalle.productos || prev.productos }));
      }
    } catch (e) {
      console.warn("No se pudo obtener el detalle extra del pendiente");
    }
  };

  const handleCantidadCambio = (idx, val) => {
    setPendienteSeleccionado(prev => {
      if (!prev || !prev.productos) return prev;
      const nuevosProductos = [...prev.productos];
      const item = nuevosProductos[idx];
      const maxVal = parseFloat(item.cant_a_entregar !== undefined ? item.cant_a_entregar : (item.cantidad || item.peso || 0));
      
      let newVal = val === '' ? '' : parseFloat(val);
      if (newVal !== '') {
        if (newVal > maxVal) newVal = maxVal;
        if (newVal < 0) newVal = 0;
      }
      
      nuevosProductos[idx] = { ...item, cantidad_a_entregar_ahora: newVal };
      return { ...prev, productos: nuevosProductos };
    });
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const startCamera = async () => {
    setImagenSoporte(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accediendo a la cámara: ", err);
      mostrarError("No se pudo acceder a la cámara. Verifica los permisos de tu navegador o dispositivo.");
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setImagenSoporte(dataUrl);
      stopCamera();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenSoporte(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const cerrarModalEntrega = () => {
    stopCamera();
    setIsSigning(false);
    setModalEntrega(false);
    setPendienteSeleccionado(null);
    setImagenSoporte(null);
    setFirmaSoporte(null);
  };

  const confirmarEntrega = async () => {
    if (!firmaSoporte) return mostrarError("Debes adjuntar la firma digital del cliente (Obligatoria).");
    
    const totalAEntregar = pendienteSeleccionado.productos?.reduce((acc, p) => acc + (parseFloat(p.cantidad_a_entregar_ahora) || 0), 0) || 0;
    if (totalAEntregar <= 0) return mostrarError("Debes indicar al menos una cantidad mayor a cero para poder despachar.");

    setProcesandoEntrega(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes/${pendienteSeleccionado.id}/entregar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firma_cliente: firmaSoporte,
          firma_bodeguero: imagenSoporte || '',
          usuario_id: user?.id || 1,
          productos_entregados: pendienteSeleccionado.productos
        })
      });
      if (res.ok) {
        mostrarExito("✅ Entrega confirmada exitosamente.");
        cerrarModalEntrega();
        cargarDatos();
      } else {
        const data = await res.json(); mostrarError(`❌ Error: ${data.error || 'No se pudo confirmar la entrega'}`);
      }
    } catch (error) { mostrarError("Error de conexión al confirmar la entrega."); } finally { setProcesandoEntrega(false); }
  };

  const handleSelectCliente = (cliente) => {
    setFormMaster(prev => ({ ...prev, cliente_id: cliente.id }));
    setClienteSeleccionadoNombre(cliente.nombre);
    setShowClientModal(false); 
    setClientSearchTerm('');
    setIsCreatingClient(false);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientData.nombre || !newClientData.documento) return mostrarInfo("Nombre y Cédula obligatorios");
    setSavingClient(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/clientes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newClientData)
      });
      if (response.ok) {
        mostrarExito("✅ Cliente creado");
        const resC = await fetch(`${import.meta.env.VITE_API_URL}/api/clientes`);
        const clientesActualizados = await resC.json();
        setClientesExistentes(clientesActualizados);
        
        const nuevoC = clientesActualizados.find(c => c.documento === newClientData.documento);
        if(nuevoC) {
          setFormMaster(prev => ({ ...prev, cliente_id: nuevoC.id }));
          setClienteSeleccionadoNombre(nuevoC.nombre);
        }
        
        setNewClientData({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
        setIsCreatingClient(false); 
        setShowClientModal(false);
      } else {
        const resData = await response.json(); mostrarError(`❌ Error: ${resData.error}`);
      }
    } catch (error) { mostrarError("Error de conexión"); } finally { setSavingClient(false); }
  };

  const eliminarPendiente = async (id) => {
    if (!(await confirmarAccion("Confirmar", "¿Estás seguro de eliminar este registro pendiente de forma permanente?"))) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        mostrarExito("✅ Registro eliminado");
        cargarDatos();
      } else {
        const data = await res.json(); mostrarError(`❌ Error: ${data.error || 'No se pudo eliminar'}`);
      }
    } catch (e) {
      mostrarError("Error al intentar eliminar.");
    }
  };

  const clientesFiltrados = clientesExistentes.filter(c => 
    c.nombre.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
    (c.documento && c.documento.includes(clientSearchTerm))
  );

  const pendientesFiltrados = pendientes.filter(p => {
    // REGLA: Si es lider_sala, SOLO ve los suyos (creado_por_id)
    if (user?.role === 'lider_sala' && p.creado_por_id !== user.id) return false;

    const cumpleFactura = filtroFactura ? p.factura_num?.toLowerCase().includes(filtroFactura.toLowerCase()) : true;
    
    const fecha = p.fecha_factura ? p.fecha_factura.split('T')[0] : '';
    let cumpleFecha = true;
    if (fechaInicio && fecha) cumpleFecha = cumpleFecha && fecha >= fechaInicio;
    if (fechaFin && fecha) cumpleFecha = cumpleFecha && fecha <= fechaFin;
    
    return cumpleFactura && cumpleFecha;
  });

  const isLectura = !(user?.role === 'admin' || user?.role === 'logistica' || user?.role === 'bodeguero');

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Material Pendiente por Entregar</h1>
          <p className="text-sm text-slate-500">Listado de mercancía facturada en espera de retiro</p>
        </div>
        {(!isLectura || user?.role === 'lider_sala') && (
          <button onClick={() => setModalAbierto(true)} className="bg-[#47B3A8] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md">
            <FilePlus size={18} /> Cargar Pendiente
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Search size={12}/> Buscar Factura</label>
          <input 
            type="text" 
            placeholder="No. de Factura..." 
            value={filtroFactura} 
            onChange={(e) => setFiltroFactura(e.target.value)}
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#47B3A8]"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Calendar size={12}/> Fecha Factura (Desde)</label>
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#47B3A8]"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Calendar size={12}/> Fecha Factura (Hasta)</label>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#47B3A8]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-900 text-white"><h2 className="font-bold flex items-center gap-2"><Package size={18}/> Listado en Tiempo Real</h2></div>
        {/* VISTA ESCRITORIO (TABLA) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b">
                <th className="p-4">Factura No.</th><th className="p-4">Origen</th><th className="p-4">Cliente</th><th className="p-4">Creado Por</th><th className="p-4">Total</th><th className="p-4">Fecha Factura</th><th className="p-4">Estado</th><th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {pendientesFiltrados.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-400">No hay materiales pendientes.</td></tr>
              ) : (
                pendientesFiltrados.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{p.factura_num}</td>
                    <td className="p-4 text-[#47B3A8] font-bold">{p.nombre_punto_venta}</td>
                    <td className="p-4">{p.nombre_cliente}</td>
                    <td className="p-4">
                      {p.nombre_creador ? (
                        <span className="text-slate-700 font-medium">{p.nombre_creador}</span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">No registrado</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-700">{p.total_items} Unds</td>
                    <td className="p-4"><span className="flex items-center gap-1 text-slate-600"><Calendar size={14}/> {new Date(p.fecha_factura).toLocaleDateString()}</span></td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase ${p.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{p.estado}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!isLectura ? (
                          <button 
                            onClick={() => abrirModalEntrega(p)} 
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={14}/> Entregar
                          </button>
                        ) : (
                          <button 
                            onClick={() => abrirModalEntrega(p)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye size={14}/> Ver Detalle
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button 
                            onClick={() => eliminarPendiente(p.id)} 
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center"
                            title="Eliminar Pendiente"
                          >
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* VISTA MÓVIL (TARJETAS) */}
        <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-slate-50">
          {pendientesFiltrados.length === 0 ? (
            <p className="text-center text-slate-400 p-4">No hay materiales pendientes.</p>
          ) : (
            pendientesFiltrados.map((p) => (
              <div key={p.id} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-3 relative">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Factura No.</p>
                    <p className="text-lg font-black text-slate-800">{p.factura_num}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase ${p.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{p.estado}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm border-t border-b border-slate-100 py-3 my-1">
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Origen</p><p className="font-bold text-[#47B3A8] text-xs">{p.nombre_punto_venta}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Fecha</p><p className="font-medium text-slate-700 text-xs flex items-center gap-1"><Calendar size={12}/>{new Date(p.fecha_factura).toLocaleDateString()}</p></div>
                  <div className="col-span-2"><p className="text-[10px] text-slate-400 font-bold uppercase">Cliente</p><p className="font-bold text-slate-700 text-xs">{p.nombre_cliente}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Total Items</p><p className="font-bold text-slate-700 text-xs">{p.total_items} Unds</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Creado Por</p><p className="font-medium text-slate-700 text-xs truncate">{p.nombre_creador || <span className="italic text-slate-400">No registrado</span>}</p></div>
                </div>

                <div className="flex gap-2 justify-end mt-1">
                  {user?.role === 'admin' && (
                    <button onClick={() => eliminarPendiente(p.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0"><Trash2 size={16}/></button>
                  )}
                  {!isLectura ? (
                    <button onClick={() => abrirModalEntrega(p)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"><CheckCircle size={16}/> Entregar</button>
                  ) : (
                    <button onClick={() => abrirModalEntrega(p)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"><Eye size={16}/> Ver Detalle</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 bg-slate-900 text-white flex justify-between"><h3 className="font-bold">Cargar Registro</h3><button onClick={() => setModalAbierto(false)}>✕</button></div>
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="text-xs font-bold text-slate-500">Factura</label><input type="text" className="w-full border p-2 rounded-lg" required onChange={(e) => setFormMaster({...formMaster, factura_num: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500">Fecha</label><input type="date" className="w-full border p-2 rounded-lg" required onChange={(e) => setFormMaster({...formMaster, fecha_factura: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500">Promesa</label><input type="date" className="w-full border p-2 rounded-lg" required onChange={(e) => setFormMaster({...formMaster, fecha_promesa: e.target.value})} /></div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Origen</label>
                  <select className="w-full border p-2 rounded-lg" required onChange={(e) => setFormMaster({...formMaster, punto_venta_id: e.target.value})}>
                    <option value="">Selecciona Bodega</option>
                    {bodegasExistentes.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs font-bold text-slate-500">Cliente Solicitante</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        readOnly
                        value={clienteSeleccionadoNombre}
                        onClick={() => setShowClientModal(true)}
                        className="w-full border p-2 pl-8 rounded-lg bg-slate-50 cursor-pointer text-sm"
                        placeholder="Haz clic para buscar o crear cliente..." 
                        required
                      />
                      <User size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
                    </div>
                    <button type="button" onClick={() => setShowClientModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm hover:bg-blue-700">
                      <Search size={16}/> Buscar
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-extrabold text-sm mb-3">Materiales en Espera</h4>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-2 md:flex gap-2 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg md:p-0 md:bg-transparent md:border-0 md:mb-2 relative">
                    <input type="text" placeholder="Código" className="border p-2 rounded w-full md:w-24 text-sm" required value={item.codigo} onChange={(e) => handleItemChange(index, 'codigo', e.target.value)} />
                    <input type="text" placeholder="Descripción" className="border p-2 rounded col-span-2 md:col-span-1 md:flex-1 text-sm" required value={item.nombre} onChange={(e) => handleItemChange(index, 'nombre', e.target.value)} />
                    <input type="number" step="any" placeholder="Cant" className="border p-2 rounded w-full md:w-20 text-sm" required value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} />
                    <select className="border p-2 rounded w-full md:w-24 text-sm" value={item.unidad} onChange={(e) => handleItemChange(index, 'unidad', e.target.value)}><option>UND</option><option>MTS2</option><option>KG</option></select>
                    <select className="border p-2 rounded col-span-2 md:col-span-1 md:w-36 text-purple-700 text-sm" required value={item.bodega_id} onChange={(e) => handleItemChange(index, 'bodega_id', e.target.value)}>
                      <option value="">Bodega Ubicación</option>
                      {bodegasExistentes.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                    {items.length > 1 && <button type="button" onClick={() => handleRemoveItem(index)} className="absolute -top-2 -right-2 md:relative md:top-0 md:right-0 text-red-500 bg-white border md:border-0 rounded-full p-1 md:p-0"><Trash2 size={16}/></button>}
                  </div>
                ))}
                <button type="button" onClick={handleAddItem} className="text-[#47B3A8] text-xs font-bold mt-2"><Plus size={14} className="inline"/> Añadir línea</button>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-[#47B3A8] text-white rounded-lg">Guardar Pendiente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE CLIENTES ================= */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-3 md:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 p-3 md:p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                {isCreatingClient ? <UserPlus size={18}/> : <Search size={18}/>} 
                {isCreatingClient ? 'Registrar Nuevo Cliente' : 'Buscar Cliente'}
              </h3>
              <button onClick={() => { setShowClientModal(false); setIsCreatingClient(false); }} className="hover:bg-white/20 p-1.5 rounded-full"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {isCreatingClient ? (
                <form onSubmit={handleCreateClient} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Nombre Completo *</label>
                      <input type="text" value={newClientData.nombre} onChange={(e) => setNewClientData({...newClientData, nombre: e.target.value})} className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:border-blue-500" required placeholder="Ej: Empresa S.A.S"/>
                    </div>
                    <div>
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Cédula / NIT *</label>
                      <input type="text" value={newClientData.documento} onChange={(e) => setNewClientData({...newClientData, documento: e.target.value})} className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:border-blue-500" required placeholder="Ej: 123456789"/>
                    </div>
                    <div>
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                      <input type="text" value={newClientData.telefono} onChange={(e) => setNewClientData({...newClientData, telefono: e.target.value})} className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:border-blue-500" placeholder="Ej: 3001234567"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Dirección Exacta</label>
                      <input type="text" value={newClientData.direccion_exacta} onChange={(e) => setNewClientData({...newClientData, direccion_exacta: e.target.value})} className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:border-blue-500" placeholder="Ej: Calle 123..."/>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                    <button type="button" onClick={() => setIsCreatingClient(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded text-sm">Volver a Búsqueda</button>
                    <button type="submit" disabled={savingClient} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-bold shadow flex items-center gap-2 text-sm">{savingClient ? 'Guardando...' : 'Guardar y Seleccionar'} <CheckCircle size={16}/></button>
                  </div>
                </form>
              ) : (
                <div className="p-3 md:p-4 space-y-3 flex-1 overflow-hidden flex flex-col bg-slate-50">
                  <input type="text" placeholder="Buscar por nombre o cédula..." className="w-full border p-2.5 md:p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100 text-sm" value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} autoFocus />
                  
                  <div className="flex-1 overflow-y-auto border rounded-lg bg-white custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] md:text-xs text-slate-500 uppercase sticky top-0 shadow-sm">
                        <tr><th className="p-2 md:p-3">Nombre / Cédula</th><th className="p-2 md:p-3 text-right">Acción</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                        {clientesFiltrados.length === 0 ? (
                          <tr><td colSpan="2" className="p-8 text-center text-slate-400">No se encontraron clientes.</td></tr>
                        ) : (
                          clientesFiltrados.map(c => (
                            <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                              <td className="p-2 md:p-3">
                                <span className="font-medium text-slate-700 block">{c.nombre}</span>
                                <span className="text-[9px] md:text-[10px] text-slate-400">{c.documento || 'Sin registrar'}</span>
                              </td>
                              <td className="p-2 md:p-3 text-right">
                                <button onClick={() => handleSelectCliente(c)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[10px] md:text-xs font-bold flex items-center justify-center gap-1 ml-auto">
                                  Seleccionar <CheckCircle size={10}/>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {!isCreatingClient && (
              <div className="p-3 md:p-4 bg-slate-100 border-t flex justify-between items-center shrink-0">
                <button onClick={() => setIsCreatingClient(true)} className="text-blue-600 font-bold text-xs md:text-sm flex items-center gap-1 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded">
                  <UserPlus size={16}/> Crear Cliente
                </button>
                <button onClick={() => setShowClientModal(false)} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold text-xs md:text-sm hover:bg-slate-300 rounded">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL DE ENTREGA (CONFIRMACIÓN) ================= */}
      {modalEntrega && pendienteSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2">
                {isLectura ? <Eye size={18}/> : <CheckCircle size={18}/>} 
                {isLectura ? 'Detalles del Material Pendiente' : 'Confirmar Entrega de Material'}
              </h3>
              <button onClick={cerrarModalEntrega} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 space-y-5">
              
              {/* Información de la factura */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Factura</p>
                  <p className="text-xl font-black text-blue-600">{pendienteSeleccionado.factura_num}</p>
                </div>
                <div className="md:text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Cliente</p>
                  <p className="text-sm font-bold text-slate-800">{pendienteSeleccionado.nombre_cliente}</p>
                </div>
              </div>
              
              {/* Tabla de Artículos a entregar */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Package size={14}/> Artículos a Entregar</p>
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  {/* ESCRITORIO */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
                        <tr><th className="p-3 font-bold">Código</th><th className="p-3 font-bold">Descripción</th><th className="p-3 text-center font-bold">Cantidad</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendienteSeleccionado.productos && pendienteSeleccionado.productos.length > 0 ? (
                          pendienteSeleccionado.productos.map((item, idx) => {
                            const codigo = item.codigo || item.codigo_producto || item.id_producto || item.cod || '';
                            const nombre = item.nombre || item.nombre_producto || item.descripcion || item.desc || item.producto || '-';
                            const maxVal = parseFloat(item.cant_a_entregar !== undefined ? item.cant_a_entregar : (item.cantidad || item.peso || 0));
                            const actualVal = item.cantidad_a_entregar_ahora !== undefined ? item.cantidad_a_entregar_ahora : maxVal;
                            const unidad = item.unidad || item.unidad_medida || item.medida || '';
                            
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-600 text-xs">{codigo || '-'}</td>
                                <td className="p-3 font-medium text-slate-800">{nombre}</td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {isLectura ? (
                                      <span className="text-sm font-bold text-[#47B3A8]">{actualVal}</span>
                                    ) : (
                                      <input 
                                        type="number" min="0" max={maxVal} step="any"
                                        value={actualVal === 0 && actualVal !== '0' ? '' : actualVal} 
                                        onChange={(e) => handleCantidadCambio(idx, e.target.value)}
                                        className="w-20 border border-slate-300 bg-white rounded p-1 text-center text-sm font-bold text-[#47B3A8] outline-none focus:ring-2 focus:ring-[#47B3A8] transition-all"
                                      />
                                    )}
                                    <span className="text-[10px] text-slate-400">{unidad}</span>
                                  </div>
                                  {!isLectura && actualVal !== '' && actualVal < maxVal && (
                                    <p className="text-[9px] text-orange-600 mt-1 font-bold tracking-tight">Queda saldo: {parseFloat((maxVal - actualVal).toFixed(2))}</p>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr><td colSpan="3" className="p-4 text-center text-slate-400">No hay detalle de productos disponible para esta factura.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MÓVIL */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                    {pendienteSeleccionado.productos && pendienteSeleccionado.productos.length > 0 ? (
                      pendienteSeleccionado.productos.map((item, idx) => {
                        const codigo = item.codigo || item.codigo_producto || item.id_producto || item.cod || '';
                        const nombre = item.nombre || item.nombre_producto || item.descripcion || item.desc || item.producto || '-';
                        const maxVal = parseFloat(item.cant_a_entregar !== undefined ? item.cant_a_entregar : (item.cantidad || item.peso || 0));
                        const actualVal = item.cantidad_a_entregar_ahora !== undefined ? item.cantidad_a_entregar_ahora : maxVal;
                        const unidad = item.unidad || item.unidad_medida || item.medida || '';

                        return (
                          <div key={idx} className="p-3 flex flex-col gap-2 bg-slate-50">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Código: <span className="font-mono text-slate-600 normal-case">{codigo || '-'}</span></p>
                              <p className="font-bold text-slate-800 text-sm mt-1">{nombre}</p>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                              <p className="text-xs font-bold text-slate-500 uppercase">A entregar:</p>
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1">
                                  {isLectura ? (
                                    <span className="text-sm font-bold text-[#47B3A8]">{actualVal}</span>
                                  ) : (
                                    <input 
                                      type="number" min="0" max={maxVal} step="any"
                                      value={actualVal === 0 && actualVal !== '0' ? '' : actualVal} 
                                      onChange={(e) => handleCantidadCambio(idx, e.target.value)}
                                      className="w-16 border border-slate-300 bg-white rounded p-1 text-center text-sm font-bold text-[#47B3A8] outline-none focus:ring-2 focus:ring-[#47B3A8] transition-all"
                                    />
                                  )}
                                  <span className="text-[10px] text-slate-400 font-bold">{unidad}</span>
                                </div>
                                {!isLectura && actualVal !== '' && actualVal < maxVal && (
                                  <p className="text-[9px] text-orange-600 mt-1 font-bold tracking-tight">Saldo: {parseFloat((maxVal - actualVal).toFixed(2))}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="p-4 text-center text-slate-400 text-sm">No hay detalle de productos disponible.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Opción de Soporte */}
              {!isLectura && (
                <div className="flex flex-col gap-4 mt-4">
                  
                  {/* Bloque Firma */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><PenTool size={14}/> Firma del Cliente (Obligatoria)</p>
                    
                    {!firmaSoporte ? (
                      <div className="flex flex-col items-center">
                        <div className="border-2 border-dashed border-slate-300 rounded-lg w-full max-w-sm bg-slate-50 overflow-hidden shadow-inner">
                          <SignatureCanvas ref={sigCanvasRef} penColor="black" canvasProps={{ className: 'w-full h-40' }} />
                        </div>
                        <div className="flex gap-2 w-full max-w-sm mt-2">
                          <button type="button" onClick={() => sigCanvasRef.current.clear()} className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 text-sm transition-colors shadow-sm">Limpiar</button>
                          <button type="button" onClick={() => {
                            if (!sigCanvasRef.current?.isEmpty()) {
                              setFirmaSoporte(sigCanvasRef.current.getCanvas().toDataURL('image/png'));
                            } else {
                              mostrarInfo("Por favor firme antes de guardar.");
                            }
                          }} className="flex-1 px-4 py-2 bg-[#47B3A8] text-white font-bold rounded-lg hover:bg-[#3d9a90] text-sm flex justify-center items-center gap-2 transition-colors shadow-sm">Guardar Firma</button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative inline-block mt-2">
                        <p className="text-[10px] font-bold text-green-600 mb-1 uppercase">✓ Firma Guardada</p>
                        <img src={firmaSoporte} alt="Firma Cliente" className="h-24 md:h-32 object-contain rounded-lg border border-slate-200 shadow-sm bg-white" />
                        <button type="button" onClick={() => setFirmaSoporte(null)} className="absolute top-6 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"><X size={12}/></button>
                      </div>
                    )}
                  </div>

                  {/* Bloque Foto/Documento */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Upload size={14}/> Soporte de Entrega (Foto o Documento)</p>
                    
                    <div className="flex gap-2">
                      <button type="button" onClick={startCamera} className={`flex-1 p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-colors ${isCameraOpen ? 'bg-[#47B3A8] text-white border-[#47B3A8]' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        <Camera size={14}/> Tomar Foto
                      </button>
                      <label className="flex-1 p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                        <Upload size={14}/> Subir Archivo
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                    </div>

                    {isCameraOpen && (
                      <div className="mt-4 flex flex-col items-center">
                        <div className="relative w-full max-w-sm rounded-lg overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center shadow-inner">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="flex gap-2 w-full max-w-sm mt-2">
                          <button type="button" onClick={stopCamera} className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 text-sm transition-colors shadow-sm">Cancelar</button>
                          <button type="button" onClick={capturePhoto} className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm flex justify-center items-center gap-2 transition-colors shadow-sm"><Camera size={16}/> Capturar</button>
                        </div>
                      </div>
                    )}

                    {imagenSoporte && !isCameraOpen && (
                      <div className="mt-4 relative inline-block">
                        <p className="text-[10px] font-bold text-green-600 mb-1 uppercase">✓ Soporte Adjunto</p>
                        <img src={imagenSoporte} alt="Soporte" className="h-24 md:h-32 object-contain rounded-lg border border-slate-200 shadow-sm bg-white" />
                        <button type="button" onClick={() => setImagenSoporte(null)} className="absolute top-6 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"><X size={12}/></button>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

            <div className="p-4 border-t bg-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={cerrarModalEntrega} className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors text-sm">{isLectura ? 'Cerrar' : 'Cancelar'}</button>
              {!isLectura && (
                <button onClick={confirmarEntrega} disabled={procesandoEntrega || !firmaSoporte} className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2 disabled:opacity-50 transition-colors text-sm">{procesandoEntrega ? 'Procesando...' : 'Confirmar Entrega'} <CheckCircle size={18}/></button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PendientesBodega;