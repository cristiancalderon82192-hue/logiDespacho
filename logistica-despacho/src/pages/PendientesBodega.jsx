import React, { useState, useEffect, useRef } from 'react';
import { Package, FilePlus, Calendar, Plus, Trash2, Search, User, UserPlus, X, CheckCircle, Camera, Upload, PenTool, Eye, UploadCloud, Weight, Edit2 } from 'lucide-react';
import DateRangeSelector from '../components/DateRangeSelector';
import SignatureCanvas from 'react-signature-canvas';
import { socket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const PendientesBodega = () => {
  const { user } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [bodegasExistentes, setBodegasExistentes] = useState([]); 
  const [clientesExistentes, setClientesExistentes] = useState([]); 
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
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
  const [filtroTipo, setFiltroTipo] = useState({
    pendiente: false,
    inmediata: false,
    domicilio: false
  });
  
  const [formMaster, setFormMaster] = useState({ fecha_factura: '', factura_num: '', punto_venta_id: '', cliente_id: '', fecha_promesa: '', tipo_entrega: 'Retiro Bodega', valor_factura: '' });
  const [items, setItems] = useState([{ codigo: '', nombre: '', cantidad: '', unidad: 'UND', bodega_id: '', precio_unitario: '', valor_total: '', peso_kg: '' }]);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

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
  
  // ESTADO ACCIÓN POST-GUARDADO EN CARGAR REGISTRO
  const [modalAction, setModalAction] = useState('Pendiente');
  
  // ESTADOS MODAL AGENDAR DOMICILIO
  const [modalDomicilio, setModalDomicilio] = useState(false);
  const [pendienteParaDomicilio, setPendienteParaDomicilio] = useState(null);
  const [domicilioForm, setDomicilioForm] = useState({ 
    destino_id: '', tipo_documento: '', prioridad: 'Media', valor_factura: '', fecha_agendada: '', nota_manual: '' 
  });
  const [listaDestinos, setListaDestinos] = useState([]);
  const [listaTiposDoc, setListaTiposDoc] = useState([]);
  const [procesandoDomicilio, setProcesandoDomicilio] = useState(false);

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
    const resDest = await fetch(`${import.meta.env.VITE_API_URL}/api/destinos`);
    const resTipos = await fetch(`${import.meta.env.VITE_API_URL}/api/tipos-documento`);

    if (resPend.ok) setPendientes(await resPend.json());
    if (resBodegas.ok) setBodegasExistentes(await resBodegas.json());
    if (resClientes.ok) setClientesExistentes(await resClientes.json());
    if (resDest.ok) setListaDestinos(await resDest.json());
    if (resTipos.ok) setListaTiposDoc(await resTipos.json());
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

  const handleAddItem = () => setItems([...items, { codigo: '', nombre: '', cantidad: '', unidad: 'UND', bodega_id: '', precio_unitario: '', valor_total: '', peso_kg: '' }]);
  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));

  const handleItemChange = (index, field, value) => {
    const list = [...items];
    list[index][field] = value;

    // Autocalculate valor_total if cantidad or precio_unitario changes
    if (field === 'cantidad' || field === 'precio_unitario') {
      const cant = parseFloat(list[index].cantidad) || 0;
      const unit = parseFloat(list[index].precio_unitario) || 0;
      if (cant > 0 && unit > 0) {
        list[index].valor_total = cant * unit;
      }
    }

    setItems(list);
  };

  const handleUploadPdf = async (e) => {
    if (!formMaster.cliente_id) {
      mostrarError("❌ Primero se debe ingresar los datos del cliente antes de subir el archivo PDF.");
      e.target.value = null;
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      return mostrarError("Solo se permiten archivos PDF.");
    }

    setIsUploadingPdf(true);
    const formDataPdf = new FormData();
    formDataPdf.append('facturaPdf', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pdf/extraer-factura`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataPdf
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar PDF');
      }

      const data = await response.json();
      
      let matchCliente = '';
      let matchClienteId = '';
      if (data.cliente) {
        const cli = clientesExistentes.find(c => c.nombre.toLowerCase().includes(data.cliente.toLowerCase()) || data.cliente.toLowerCase().includes(c.nombre.toLowerCase()));
        if (cli) {
          matchCliente = cli.nombre;
          matchClienteId = cli.id;
        } else {
          matchCliente = data.cliente;
          setNewClientData(prev => ({ 
            ...prev, 
            nombre: data.cliente,
            documento: data.nit_cliente || '',
            telefono: data.telefono_cliente || ''
          }));
          setIsCreatingClient(true);
          setShowClientModal(true);
          mostrarInfo("El cliente extraído no existe. Por favor completa sus datos para crearlo.");
        }
      } else {
        setIsCreatingClient(false);
        setShowClientModal(true);
        mostrarInfo("No se detectó un cliente en el PDF. Por favor selecciónalo o créalo.");
      }

      let nuevosItems = [];
      if (data.productos && data.productos.length > 0) {
        nuevosItems = data.productos.map(p => ({
          codigo: p.codigo_producto || '',
          nombre: p.descripcion || '',
          cantidad: p.cantidad || 1,
          unidad: p.unidad_medida || 'UND',
          bodega_id: p.bodega_id || 1,
          precio_unitario: p.precio_unitario || '',
          valor_total: p.precio_total || '',
          peso_kg: p.peso || ''
        }));
      } else {
        nuevosItems = [{ codigo: '', nombre: '', cantidad: '', unidad: 'UND', bodega_id: '', precio_unitario: '', valor_total: '', peso_kg: '' }];
      }

      setFormMaster(prev => ({
        ...prev,
        factura_num: data.id_factura || prev.factura_num,
        fecha_factura: data.fecha_facturacion ? data.fecha_facturacion.split('T')[0] : prev.fecha_factura,
        fecha_promesa: data.fecha_promesa ? data.fecha_promesa.split('T')[0] : prev.fecha_promesa,
        cliente_id: matchClienteId || prev.cliente_id,
        valor_factura: data.valor_factura || prev.valor_factura
      }));
      
      if(matchCliente) {
         setClienteSeleccionadoNombre(matchCliente);
      }

      setItems(nuevosItems);
      mostrarExito("PDF Procesado correctamente. Verifica los datos extraídos.");

    } catch (error) {
      console.error(error);
      mostrarError("Error procesando PDF: " + error.message);
    } finally {
      setIsUploadingPdf(false);
      e.target.value = null; 
    }
  };

  const cerrarModalRegistro = () => {
    setEditId(null);
    setModalAbierto(false);
    setItems([{ codigo: '', nombre: '', cantidad: '', unidad: 'UND', bodega_id: '', precio_unitario: '', valor_total: '', peso_kg: '' }]);
    setFormMaster({ fecha_factura: '', factura_num: '', punto_venta_id: '', cliente_id: '', fecha_promesa: '', tipo_entrega: 'Retiro Bodega', valor_factura: '' });
    setClienteSeleccionadoNombre('');
    setModalAction('Pendiente');
  };

  const abrirModalEdicion = async (pendiente) => {
    setEditId(pendiente.id);
    setFormMaster({
      fecha_factura: pendiente.fecha_factura ? new Date(pendiente.fecha_factura).toISOString().split('T')[0] : '',
      factura_num: pendiente.factura_num,
      punto_venta_id: pendiente.punto_venta_id,
      cliente_id: pendiente.cliente_id,
      fecha_promesa: pendiente.fecha_promesa ? new Date(pendiente.fecha_promesa).toISOString().split('T')[0] : '',
      tipo_entrega: pendiente.tipo_entrega || 'Material Pendiente',
      valor_factura: pendiente.valor_factura || ''
    });
    setClienteSeleccionadoNombre(pendiente.nombre_cliente);
    
    // Set modalAction depending on type
    if (pendiente.tipo_entrega === 'Domicilio') setModalAction('Domicilio');
    else if (pendiente.tipo_entrega === 'Entrega Inmediata') setModalAction('Inmediata');
    else setModalAction('Pendiente');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes/${pendiente.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.productos && data.productos.length > 0) {
          setItems(data.productos);
        } else {
          setItems([{ codigo: '', nombre: '', cantidad: '', unidad: 'UND', bodega_id: '', precio_unitario: '', valor_total: '', peso_kg: '' }]);
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    setModalAbierto(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formMaster.cliente_id) {
      mostrarInfo("El cliente no está registrado o no ha sido seleccionado correctamente. Haz clic en el campo de cliente para crearlo o buscarlo.");
      setShowClientModal(true);
      return;
    }
    
    setIsSaving(true);

    let tipoEntregaDerived = formMaster.tipo_entrega;
    if (modalAction === 'Inmediata') tipoEntregaDerived = 'Entrega Inmediata';
    else if (modalAction === 'Domicilio') tipoEntregaDerived = 'Domicilio';
    else if (modalAction === 'Pendiente') tipoEntregaDerived = 'Entrega Pendiente';

    const payload = { 
      ...formMaster, 
      tipo_entrega: tipoEntregaDerived,
      productos: items,
      usuario_id: user?.id 
    };

    const url = editId 
      ? `${import.meta.env.VITE_API_URL}/api/bodega/pendientes/${editId}`
      : `${import.meta.env.VITE_API_URL}/api/bodega/pendientes/nuevo`;
    
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const dataRes = await res.json();
        cerrarModalRegistro();
        mostrarExito(editId ? "Registro actualizado exitosamente" : "Registro guardado exitosamente");
        
        const resPend = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes`);
        if (resPend.ok) {
          const updatedPendientes = await resPend.json();
          setPendientes(updatedPendientes);
        } else {
          cargarDatos();
        }
      } else {
        try {
          const errorData = await res.json();
          mostrarError(`❌ Error: ${errorData.error || errorData.message || 'No se pudo guardar el registro'}`);
        } catch (err) {
          mostrarError(`❌ Error de conexión al servidor (Ruta no encontrada). ¿Reiniciaste el backend?`);
        }
      }
    } catch (err) {
      console.error(err);
      mostrarError(`❌ Error de red o servidor no disponible.`);
    } finally {
      setIsSaving(false);
    }
  };

  const abrirModalDomicilio = async (pendiente) => {
    setPendienteParaDomicilio(pendiente);
    
    // Traer el detalle completo del pendiente para mandarlo a pedidos
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes/${pendiente.id}`);
      if(res.ok) {
        const data = await res.json();
        
        const calcValorTotal = (data.productos || []).reduce((acc, p) => acc + (parseFloat(p.valor_total) || parseFloat(p.precio_total) || 0), 0);
        const calcPesoTotal = (data.productos || []).reduce((acc, p) => acc + (parseFloat(p.peso_kg) || parseFloat(p.peso) || 0), 0);
        const valorFinal = parseFloat(data.valor_factura) > 0 ? parseFloat(data.valor_factura) : calcValorTotal;

        const pesoPorBodega = {};
        (data.productos || []).forEach(p => {
          const bId = p.bodega_id;
          if (!pesoPorBodega[bId]) pesoPorBodega[bId] = 0;
          pesoPorBodega[bId] += (parseFloat(p.peso_kg) || parseFloat(p.peso) || 0);
        });

        setPendienteParaDomicilio({ ...pendiente, productos: data.productos, valor_factura: valorFinal, peso_total: calcPesoTotal, peso_por_bodega: pesoPorBodega }); 
        setDomicilioForm({ 
          destino_id: '', tipo_documento: '', prioridad: 'Media', valor_factura: valorFinal || 0, fecha_agendada: '', nota_manual: '', telefono: pendiente.telefono || '',
          hora_registro: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit" })
        });
      } else {
        setDomicilioForm({ 
          destino_id: '', tipo_documento: '', prioridad: 'Media', valor_factura: 0, fecha_agendada: '', nota_manual: '', telefono: pendiente.telefono || '',
          hora_registro: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit" })
        });
      }
    } catch(e) { 
      console.error(e); 
      setDomicilioForm({ 
        destino_id: '', tipo_documento: '', prioridad: 'Media', valor_factura: '', fecha_agendada: '', nota_manual: '', telefono: '',
        hora_registro: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit" })
      });
    }

    setModalDomicilio(true);
  };

  const handleGuardarDomicilio = async (e) => {
    e.preventDefault();
    setProcesandoDomicilio(true);
    try {
      const payloadPedido = {
        usuario_id: user?.id,
        id_factura: pendienteParaDomicilio.factura_num,
        nombre_cliente: pendienteParaDomicilio.nombre_cliente || 'Cliente Bodega',
        telefono: domicilioForm.telefono || 'Sin teléfono', 
        destino_id: domicilioForm.destino_id,
        tipo_documento: domicilioForm.tipo_documento,
        prioridad: domicilioForm.prioridad,
        valor_factura: domicilioForm.valor_factura || 0,
        fecha_facturacion: pendienteParaDomicilio.fecha_factura ? String(pendienteParaDomicilio.fecha_factura).substring(0, 10) : null,
        fecha_promesa: pendienteParaDomicilio.fecha_promesa ? String(pendienteParaDomicilio.fecha_promesa).substring(0, 10) : null,
        fecha_agendada: domicilioForm.fecha_agendada,
        hora_registro: domicilioForm.hora_registro || new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit" }),
        nota_manual: domicilioForm.nota_manual,
        productos: (pendienteParaDomicilio.productos || []).map(p => ({
          codigo_producto: p.codigo || p.codigo_producto,
          descripcion: p.nombre || p.nombre_producto,
          cantidad: p.cantidad || p.cantidad_original,
          unidad_medida: p.unidad || p.unidad_medida,
          bodega_id: p.bodega_id,
          precio_unitario: p.precio_unitario || 0,
          precio_total: p.valor_total || 0,
          peso: p.peso_kg || 0
        }))
      };

      for (let i = 1; i <= 8; i++) {
        const peso_bodega = (pendienteParaDomicilio.productos || [])
          .filter(p => p.bodega_id === i || p.bodega_id === String(i))
          .reduce((acc, p) => acc + (parseFloat(p.peso_kg) || 0), 0);
        payloadPedido[`peso_b${i}`] = peso_bodega;
      }

      const resPedido = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payloadPedido)
      });

      if (!resPedido.ok) {
        const errData = await resPedido.json();
        throw new Error(errData.error || 'Error al crear el pedido en logística');
      }

      const resBodega = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/pendientes/${pendienteParaDomicilio.id}/tipo-entrega`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_entrega: 'Domicilio' })
      });

      if (!resBodega.ok) throw new Error('Pedido creado en logística, pero falló la actualización en bodega.');

      mostrarExito('¡Domicilio agendado correctamente en Logística!');
      setModalDomicilio(false);
      cargarDatos();
    } catch (error) {
      mostrarError(`Error: ${error.message}`);
    } finally {
      setProcesandoDomicilio(false);
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

    // Inyectamos la variable editable 'cantidad_a_entregar_ahora' y validamos rol
    const productosListos = initialProductos.map(p => {
      let puedeEntregar = true;
      if (user?.bodega_id) {
        if (p.bodega_id) {
          if (String(p.bodega_id) !== String(user.bodega_id)) puedeEntregar = false;
        } else if (p.bodega_nombre) {
          const miBodega = bodegasExistentes.find(b => String(b.id) === String(user.bodega_id));
          if (miBodega && miBodega.nombre.toLowerCase() !== p.bodega_nombre.toLowerCase()) {
            puedeEntregar = false;
          }
        }
      }
      
      const max = parseFloat(p.cant_a_entregar !== undefined ? p.cant_a_entregar : (p.cantidad || p.peso || 0));
      return { ...p, cantidad_a_entregar_ahora: puedeEntregar ? max : 0, puede_entregar: puedeEntregar };
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
          dataDetalle.productos = dataDetalle.productos.map(p => {
            let puedeEntregar = true;
            if (user?.bodega_id) {
              if (p.bodega_id) {
                if (String(p.bodega_id) !== String(user.bodega_id)) puedeEntregar = false;
              } else if (p.bodega_nombre) {
                const miBodega = bodegasExistentes.find(b => String(b.id) === String(user.bodega_id));
                if (miBodega && miBodega.nombre.toLowerCase() !== p.bodega_nombre.toLowerCase()) {
                  puedeEntregar = false;
                }
              }
            }
            
            return {
              ...p,
              cantidad_a_entregar_ahora: puedeEntregar ? parseFloat(p.cant_a_entregar !== undefined ? p.cant_a_entregar : (p.cantidad || 0)) : 0,
              puede_entregar: puedeEntregar
            };
          });
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
        // generarSoporteEntregaPDF(pendienteSeleccionado, pendienteSeleccionado.productos, firmaSoporte);
        cerrarModalEntrega();
        cargarDatos();
      } else {
        const data = await res.json(); mostrarError(`❌ Error: ${data.error || 'No se pudo confirmar la entrega'}`);
      }
    } catch (error) { mostrarError("Error de conexión al confirmar la entrega."); } finally { setProcesandoEntrega(false); }
  };

  const generarSoporteEntregaPDF = (pendiente, productosEntregados, firmaDigital) => {
    try {
      const doc = new jsPDF();
      const colorHeader = [71, 179, 168]; 
      
      doc.setFillColor(colorHeader[0], colorHeader[1], colorHeader[2]); 
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SOPORTE DE ENTREGA BODEGA", 105, 18, { align: 'center' });
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.text(`Documento / Factura: ${pendiente.factura_num}`, 14, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha Entrega: ${obtenerFechaLocal()}`, 14, 52);
      
      autoTable(doc, {
          startY: 60,
          head: [['Cliente', 'Bodega de Retiro']],
          body: [
              [`Nombre: ${pendiente.nombre_cliente}\nTeléfono: ${pendiente.telefono || 'N/A'}`, `${pendiente.nombre_punto_venta || 'Principal'}`]
          ],
          theme: 'grid',
          headStyles: { fillColor: colorHeader } 
      });

      const bodyProductos = productosEntregados
        .filter(p => parseFloat(p.cantidad_a_entregar_ahora) > 0)
        .map(p => [
          p.codigo || p.codigo_producto || '-',
          p.nombre || p.nombre_producto || '-',
          `${p.cantidad_a_entregar_ahora} ${p.unidad || p.unidad_medida || 'UND'}`
        ]);

      autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Código', 'Producto Entregado', 'Cantidad']],
          body: bodyProductos,
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50] }
      });

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Firma del Cliente de Recibido:", 14, finalY);
      
      if (firmaDigital) {
          doc.addImage(firmaDigital, 'PNG', 14, finalY + 5, 80, 40);
          doc.setDrawColor(200, 200, 200);
          doc.rect(14, finalY + 5, 80, 40);
      } 
      
      doc.save(`Soporte_Bodega_${pendiente.factura_num}.pdf`);

    } catch (error) {
      console.error("Error generando PDF soporte", error);
      mostrarError("Error al generar el PDF de soporte.");
    }
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
    
    const esDomicilio = p.tipo_entrega === 'Domicilio';
    const esInmediata = p.tipo_entrega === 'Entrega Inmediata';
    const esPendiente = !esDomicilio && !esInmediata;

    const algunFiltroActivo = filtroTipo.pendiente || filtroTipo.inmediata || filtroTipo.domicilio;
    let cumpleTipo = true;

    if (algunFiltroActivo) {
      cumpleTipo = false;
      if (esDomicilio && filtroTipo.domicilio) cumpleTipo = true;
      if (esInmediata && filtroTipo.inmediata) cumpleTipo = true;
      if (esPendiente && filtroTipo.pendiente) cumpleTipo = true;
    }

    return cumpleFactura && cumpleFecha && cumpleTipo;
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col xl:flex-row flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[200px] w-full xl:w-auto">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Search size={12}/> Buscar Factura</label>
          <input 
            type="text" 
            placeholder="No. de Factura..." 
            value={filtroFactura} 
            onChange={(e) => setFiltroFactura(e.target.value)}
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-[#47B3A8]"
          />
        </div>
        <div className="flex-shrink-0 w-full xl:w-auto overflow-x-auto">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Calendar size={12}/> Rango de Fechas</label>
          <DateRangeSelector 
            fechaInicio={fechaInicio} 
            setFechaInicio={setFechaInicio} 
            fechaFin={fechaFin} 
            setFechaFin={setFechaFin} 
          />
        </div>
        <div className="flex-1 min-w-[300px] w-full xl:w-auto">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">Filtrar por Entrega</label>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={filtroTipo.pendiente} onChange={(e) => setFiltroTipo({...filtroTipo, pendiente: e.target.checked})} className="w-4 h-4 rounded text-[#47B3A8] focus:ring-[#47B3A8] border-slate-300" />
              Pendiente
            </label>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={filtroTipo.inmediata} onChange={(e) => setFiltroTipo({...filtroTipo, inmediata: e.target.checked})} className="w-4 h-4 rounded text-green-600 focus:ring-green-600 border-slate-300" />
              Inmediata
            </label>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={filtroTipo.domicilio} onChange={(e) => setFiltroTipo({...filtroTipo, domicilio: e.target.checked})} className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300" />
              Domicilio
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-900 text-white"><h2 className="font-bold flex items-center gap-2"><Package size={18}/> Listado en Tiempo Real</h2></div>
        {/* VISTA ESCRITORIO (TABLA) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b">
                <th className="p-4">Factura No.</th><th className="p-4">Origen</th><th className="p-4">Cliente</th><th className="p-4">Creado Por</th><th className="p-4">Total</th><th className="p-4">Fecha Factura</th><th className="p-4">Promesa Entrega</th><th className="p-4">Estado</th><th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {pendientesFiltrados.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-slate-400">No hay materiales pendientes.</td></tr>
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
                    <td className="p-4">
                        {p.fecha_promesa ? (
                          <span className="flex items-center gap-1 text-slate-600"><Calendar size={14}/> {new Date(p.fecha_promesa).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Sin Fecha</span>
                        )}
                    </td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase ${p.estado === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{p.estado}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {p.tipo_entrega === 'Domicilio' ? (
                          <button 
                            onClick={() => abrirModalDomicilio(p)} 
                            className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1"
                          >
                            Domicilio
                          </button>
                        ) : !isLectura ? (
                          <button 
                            onClick={() => abrirModalEntrega(p)} 
                            className="bg-green-600 hover:bg-green-700 text-white min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={14}/> {p.tipo_entrega === 'Entrega Inmediata' ? 'Entrega Inmediata' : 'Entrega Pendiente'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => abrirModalEntrega(p)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye size={14}/> Ver Detalle
                          </button>
                        )}
                        
                        {/* ADMIN / SUPER ADMIN CONTROLS */}
                        {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'Super Admin') && (
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => abrirModalEdicion(p)} 
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-xs font-bold transition-colors flex items-center justify-center"
                              title="Editar Pendiente"
                            >
                              <Edit2 size={14}/>
                            </button>
                            <button 
                              onClick={() => eliminarPendiente(p.id)} 
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold transition-colors flex items-center justify-center"
                              title="Eliminar Pendiente"
                            >
                              <Trash2 size={14}/>
                            </button>
                          </div>
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
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Promesa</p><p className="font-medium text-slate-700 text-xs flex items-center gap-1">{p.fecha_promesa ? <><Calendar size={12}/>{new Date(p.fecha_promesa).toLocaleDateString()}</> : <span className="text-slate-400 italic text-[10px]">Sin Fecha</span>}</p></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase">Total Items</p><p className="font-bold text-slate-700 text-xs">{p.total_items} Unds</p></div>
                  <div className="col-span-2"><p className="text-[10px] text-slate-400 font-bold uppercase">Creado Por</p><p className="font-medium text-slate-700 text-xs truncate">{p.nombre_creador || <span className="italic text-slate-400">No registrado</span>}</p></div>
                </div>

                <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
                  {p.tipo_entrega === 'Domicilio' ? (
                    <button onClick={() => abrirModalDomicilio(p)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 min-w-[140px]">Domicilio</button>
                  ) : !isLectura ? (
                    <button onClick={() => abrirModalEntrega(p)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 min-w-[140px]"><CheckCircle size={16}/> {p.tipo_entrega === 'Entrega Inmediata' ? 'Entrega Inmediata' : 'Entrega Pendiente'}</button>
                  ) : (
                    <button onClick={() => abrirModalEntrega(p)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 min-w-[140px]"><Eye size={16}/> Ver Detalle</button>
                  )}

                  {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'Super Admin') && (
                    <div className="flex gap-1">
                      <button onClick={() => abrirModalEdicion(p)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0"><Edit2 size={16}/></button>
                      <button onClick={() => eliminarPendiente(p.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0"><Trash2 size={16}/></button>
                    </div>
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
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold">{editId ? 'Editar Registro' : 'Cargar Registro'}</h3>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-[#47B3A8] hover:bg-[#3d9a90] px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                  <UploadCloud size={16} />
                  {isUploadingPdf ? 'Procesando...' : 'Cargar de PDF'}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleUploadPdf} disabled={isUploadingPdf} />
                </label>
                <button onClick={cerrarModalRegistro} className="hover:bg-white/20 p-1 rounded-full"><X size={18}/></button>
              </div>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div><label className="text-xs font-bold text-slate-500">#Factura</label><input type="text" className="w-full border p-2 rounded-lg" required value={formMaster.factura_num} onChange={(e) => setFormMaster({...formMaster, factura_num: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500">Valor Factura</label><input type="number" step="any" className="w-full border p-2 rounded-lg" value={formMaster.valor_factura || ''} onChange={(e) => setFormMaster({...formMaster, valor_factura: e.target.value})} placeholder="Opcional" /></div>
                <div><label className="text-xs font-bold text-slate-500">Fecha Factura</label><input type="date" className="w-full border p-2 rounded-lg" required value={formMaster.fecha_factura} onChange={(e) => setFormMaster({...formMaster, fecha_factura: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-slate-500">Promesa De Entrega</label><input type="date" className="w-full border p-2 rounded-lg" required value={formMaster.fecha_promesa} onChange={(e) => setFormMaster({...formMaster, fecha_promesa: e.target.value})} /></div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Punto De Venta</label>
                  <select className="w-full border p-2 rounded-lg" required value={formMaster.punto_venta_id} onChange={(e) => setFormMaster({...formMaster, punto_venta_id: e.target.value})}>
                    <option value="">Selecciona Bodega</option>
                    {bodegasExistentes.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="md:col-span-5">
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

              {/* OPCIÓN DE ACCIÓN */}
              <div className="mb-4">
                <h4 className="font-extrabold text-sm mb-2 text-slate-700">Acción a realizar tras guardar:</h4>
                <div className="flex flex-wrap gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input type="radio" name="modalAction" value="Pendiente" checked={modalAction === 'Pendiente'} onChange={(e) => setModalAction(e.target.value)} className="w-4 h-4 text-[#47B3A8] focus:ring-[#47B3A8]" />
                    Solo Guardar Pendiente
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input type="radio" name="modalAction" value="Inmediata" checked={modalAction === 'Inmediata'} onChange={(e) => setModalAction(e.target.value)} className="w-4 h-4 text-green-600 focus:ring-green-600" />
                    Entrega Inmediata
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input type="radio" name="modalAction" value="Domicilio" checked={modalAction === 'Domicilio'} onChange={(e) => setModalAction(e.target.value)} className="w-4 h-4 text-orange-500 focus:ring-orange-500" />
                    Enviar a Domicilio
                  </label>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-extrabold text-sm mb-3">Materiales en Espera</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm bg-white mb-3">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2 border-r border-slate-200 text-center w-20 font-bold">Código</th>
                        <th className="p-2 border-r border-slate-200 font-bold">Descripción</th>
                        <th className="p-2 border-r border-slate-200 text-center w-16 font-bold">Cant.</th>
                        <th className="p-2 border-r border-slate-200 text-center w-20 font-bold">Unidad</th>
                        <th className="p-2 border-r border-slate-200 text-center w-24 font-bold">Vr. Unitario</th>
                        <th className="p-2 border-r border-slate-200 text-center w-24 font-bold">Vr. Total</th>
                        <th className="p-2 border-r border-slate-200 text-center w-20 font-bold">Peso(KG)</th>
                        <th className="p-2 border-r border-slate-200 text-center w-28 font-bold">Bodega</th>
                        <th className="p-2 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-1 border-r border-slate-200">
                            <input type="text" placeholder="Cód..." className="w-full p-1.5 bg-transparent outline-none text-center" required value={item.codigo} onChange={(e) => handleItemChange(index, 'codigo', e.target.value)} />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="text" placeholder="Descripción del material..." className="w-full p-1.5 bg-transparent outline-none font-medium text-slate-700 uppercase" required value={item.nombre} onChange={(e) => handleItemChange(index, 'nombre', e.target.value)} />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="number" step="any" placeholder="0" className="w-full p-1.5 bg-transparent outline-none text-center" required value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <select className="w-full p-1.5 bg-transparent outline-none text-center" value={item.unidad} onChange={(e) => handleItemChange(index, 'unidad', e.target.value)}>
                              <option>UND</option><option>MTS2</option><option>KG</option>
                            </select>
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="number" step="any" placeholder="0.00" className="w-full p-1.5 bg-transparent outline-none text-center" value={item.precio_unitario} onChange={(e) => handleItemChange(index, 'precio_unitario', e.target.value)} />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="number" step="any" placeholder="0.00" className="w-full p-1.5 bg-transparent outline-none text-center" value={item.valor_total} onChange={(e) => handleItemChange(index, 'valor_total', e.target.value)} />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input type="number" step="any" placeholder="0.00" className="w-full p-1.5 bg-transparent outline-none text-center" value={item.peso_kg} onChange={(e) => handleItemChange(index, 'peso_kg', e.target.value)} />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <select className="w-full p-1.5 bg-transparent outline-none text-center font-bold text-slate-700" required value={item.bodega_id} onChange={(e) => handleItemChange(index, 'bodega_id', e.target.value)}>
                              <option value="">Bodega...</option>
                              {bodegasExistentes.map(b => <option key={b.id} value={b.id}>B{b.id}</option>)}
                            </select>
                          </td>
                          <td className="p-1 text-center">
                            {items.length > 1 && (
                              <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1.5 transition-colors">
                                <Trash2 size={16}/>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={handleAddItem} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors">
                  <Plus size={14} className="inline"/> Añadir Material
                </button>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={cerrarModalRegistro} className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={isSaving} className={`px-5 py-2 text-white rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50 ${modalAction === 'Inmediata' ? 'bg-green-600 hover:bg-green-700' : modalAction === 'Domicilio' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#47B3A8] hover:bg-[#3d9a90]'}`}>
                  {isSaving ? 'Procesando...' : (modalAction === 'Inmediata' ? 'Guardar y Entregar' : modalAction === 'Domicilio' ? 'Guardar y Agendar Domicilio' : 'Guardar Pendiente')}
                </button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            
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
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase">
                        <tr>
                          <th className="p-2 border font-bold">Código</th>
                          <th className="p-2 border font-bold w-1/3">Descripción</th>
                          <th className="p-2 border text-center font-bold text-blue-600">Cant. a Entregar</th>
                          <th className="p-2 border text-center font-bold">Unidad</th>
                          <th className="p-2 border text-right font-bold">Vr. Unitario</th>
                          <th className="p-2 border text-right font-bold">Vr. Total</th>
                          <th className="p-2 border text-center font-bold">Bodega</th>
                          <th className="p-2 border text-center font-bold">Peso(Kg)</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {pendienteSeleccionado.productos && pendienteSeleccionado.productos.length > 0 ? (
                          pendienteSeleccionado.productos.map((item, idx) => {
                            const codigo = item.codigo || item.codigo_producto || item.id_producto || item.cod || '';
                            const nombre = item.nombre || item.nombre_producto || item.descripcion || item.desc || item.producto || '-';
                            const maxVal = parseFloat(item.cant_a_entregar !== undefined ? item.cant_a_entregar : (item.cantidad || item.peso || 0));
                            const actualVal = item.cantidad_a_entregar_ahora !== undefined ? item.cantidad_a_entregar_ahora : maxVal;
                            const unidad = item.unidad || item.unidad_medida || item.medida || '';
                            
                            return (
                              <tr key={idx} className="hover:bg-slate-50 text-[11px]">
                                <td className="p-1.5 border font-mono text-slate-600">{codigo || '-'}</td>
                                <td className="p-1.5 border font-medium text-slate-800 leading-tight">{nombre}</td>
                                <td className="p-1.5 border text-center bg-blue-50/30">
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {isLectura ? (
                                        <span className="text-sm font-bold text-[#47B3A8]">{actualVal}</span>
                                      ) : (
                                        <input 
                                          type="number" min="0" max={maxVal} step="any"
                                          value={actualVal === 0 && actualVal !== '0' ? '' : actualVal} 
                                          onChange={(e) => handleCantidadCambio(idx, e.target.value)}
                                          disabled={item.puede_entregar === false}
                                          className={`w-20 border rounded p-1 text-center text-sm font-bold outline-none shadow-sm transition-all ${item.puede_entregar === false ? 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed' : 'border-blue-300 bg-white text-blue-700 focus:ring-2 focus:ring-blue-400'}`}
                                        />
                                      )}
                                    </div>
                                    {!isLectura && actualVal !== '' && actualVal < maxVal && (
                                      <p className="text-[9px] text-orange-600 mt-1 font-bold tracking-tight">Queda saldo: {parseFloat((maxVal - actualVal).toFixed(2))}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="p-1.5 border text-center text-slate-500">{unidad}</td>
                                <td className="p-1.5 border text-right text-slate-500">{Number(item.precio_unitario || 0).toLocaleString('es-CO', {style: 'currency', currency: 'COP', minimumFractionDigits: 0})}</td>
                                <td className="p-1.5 border text-right font-bold text-slate-700 bg-slate-50">{Number(item.valor_total || item.precio_total || 0).toLocaleString('es-CO', {style: 'currency', currency: 'COP', minimumFractionDigits: 0})}</td>
                                <td className="p-1.5 border text-center font-bold text-indigo-600 uppercase">{item.bodega_nombre || `B${item.bodega_id}` || 'N/A'}</td>
                                <td className="p-1.5 border text-center font-bold text-blue-600">{Number(item.peso_kg || item.peso || 0).toFixed(2)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr><td colSpan="8" className="p-4 text-center text-slate-400">No hay detalle de productos disponible para esta factura.</td></tr>
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
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Código: <span className="font-mono text-slate-600 normal-case">{codigo || '-'}</span></p>
                                <p className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">{item.bodega_nombre || `B${item.bodega_id}` || 'N/A'}</p>
                              </div>
                              <p className="font-bold text-slate-800 text-sm">{nombre}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mt-1 bg-white p-2 rounded border border-slate-100 shadow-sm">
                              <div><span className="text-slate-400">Vr. Unitario:</span> <span className="font-medium text-slate-700">{Number(item.precio_unitario || 0).toLocaleString('es-CO', {style: 'currency', currency: 'COP', minimumFractionDigits: 0})}</span></div>
                              <div className="text-right"><span className="text-slate-400">Vr. Total:</span> <span className="font-bold text-slate-700">{Number(item.valor_total || item.precio_total || 0).toLocaleString('es-CO', {style: 'currency', currency: 'COP', minimumFractionDigits: 0})}</span></div>
                              <div className="col-span-2 text-center"><span className="text-slate-400">Peso:</span> <span className="font-bold text-blue-600">{Number(item.peso_kg || item.peso || 0).toFixed(2)} Kg</span></div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-2">
                              <p className="text-xs font-bold text-blue-600 uppercase">A entregar:</p>
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1">
                                  {isLectura ? (
                                    <span className="text-sm font-bold text-[#47B3A8]">{actualVal}</span>
                                  ) : (
                                    <input 
                                      type="number" min="0" max={maxVal} step="any"
                                      value={actualVal === 0 && actualVal !== '0' ? '' : actualVal} 
                                      onChange={(e) => handleCantidadCambio(idx, e.target.value)}
                                      disabled={item.puede_entregar === false}
                                      className={`w-20 border rounded p-1.5 text-center text-sm font-bold outline-none transition-all shadow-sm ${item.puede_entregar === false ? 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed' : 'border-blue-300 bg-white text-blue-700 focus:ring-2 focus:ring-blue-400'}`}
                                    />
                                  )}
                                  <span className="text-[10px] text-slate-500 font-bold">{unidad}</span>
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
      {/* ================= MODAL DE AGENDAR DOMICILIO ================= */}
      {/* ================= MODAL DE AGENDAR DOMICILIO (ESTILO LOGÍSTICA) ================= */}
      {modalDomicilio && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* HEADER */}
            <div className="p-4 md:p-5 border-b bg-[#1e293b] text-white flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Package size={18}/> Registrar Nuevo Despacho
                </h3>
                <span className="text-xs text-slate-300">Administración general</span>
              </div>
              <button onClick={() => setModalDomicilio(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleGuardarDomicilio} className="p-5 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              {/* FORMULARIO SUPERIOR (Grid estilo Logística) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* ID_FACTURA */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">ID_FACTURA</label>
                  <input type="text" readOnly value={pendienteParaDomicilio?.factura_num || ''} className="w-full border p-2 rounded text-sm bg-slate-50 outline-none font-bold text-slate-700" />
                </div>
                
                {/* TIPO DOC */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">TIPO DOC</label>
                  <select name="tipo_documento" value={domicilioForm.tipo_documento} onChange={(e) => setDomicilioForm({...domicilioForm, tipo_documento: e.target.value})} className="w-full border p-2 rounded text-sm outline-none bg-white">
                    <option value="">-- Seleccione --</option>
                    {listaTiposDoc.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                  </select>
                </div>
                
                {/* CLIENTE */}
                <div className="col-span-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">CLIENTE</label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={pendienteParaDomicilio?.nombre_cliente || ''} className="w-full border p-2 rounded text-sm bg-blue-50/50 outline-none font-bold text-slate-700" />
                  </div>
                </div>

                {/* PRIORIDAD */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">PRIORIDAD</label>
                  <select name="prioridad" value={domicilioForm.prioridad} onChange={(e) => setDomicilioForm({...domicilioForm, prioridad: e.target.value})} className="w-full border p-2 rounded text-sm outline-none bg-white">
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                
                {/* VALOR */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase text-blue-600">$ VALOR *</label>
                  <input type="number" min="0" step="any" required value={domicilioForm.valor_factura} onChange={(e) => setDomicilioForm({...domicilioForm, valor_factura: e.target.value})} className="w-full border p-2 rounded text-sm outline-none bg-white" placeholder="Ej: 150000" />
                </div>
                
                {/* TELÉFONO */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">TELÉFONO</label>
                  <input type="text" value={domicilioForm.telefono} onChange={(e) => setDomicilioForm({...domicilioForm, telefono: e.target.value})} className="w-full border p-2 rounded text-sm outline-none bg-white" placeholder="Ej: 3001234567" />
                </div>
                
                {/* ZONA */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">ZONA</label>
                  <input type="text" readOnly value={listaDestinos.find(d => d.id === parseInt(domicilioForm.destino_id))?.zona_nombre || ''} className="w-full border p-2 rounded text-sm bg-slate-50 outline-none" />
                </div>

                {/* FECHA FAC. */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">FECHA FAC.</label>
                  <input type="date" readOnly value={pendienteParaDomicilio?.fecha_factura ? String(pendienteParaDomicilio.fecha_factura).substring(0, 10) : ''} className="w-full border p-2 rounded text-sm bg-slate-50 outline-none" />
                </div>
                
                {/* HORA REGISTRO ENTREGA */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">HORA REGISTRO ENTREGA</label>
                  <div className="relative">
                    <input type="time" value={domicilioForm.hora_registro || ''} onChange={(e) => setDomicilioForm({...domicilioForm, hora_registro: e.target.value})} className="w-full border border-slate-300 p-2 rounded text-sm outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                
                {/* DESTINO */}
                <div className="col-span-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">DESTINO *</label>
                  <select name="destino_id" value={domicilioForm.destino_id} onChange={(e) => setDomicilioForm({...domicilioForm, destino_id: e.target.value})} required className="w-full border p-2 rounded text-sm outline-none bg-white">
                    <option value="">-- Seleccione --</option>
                    {listaDestinos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>

                {/* FECHA PROMESA */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">FECHA PROMESA</label>
                  <input type="date" readOnly value={pendienteParaDomicilio?.fecha_promesa ? String(pendienteParaDomicilio.fecha_promesa).substring(0, 10) : ''} className="w-full border p-2 rounded text-sm bg-slate-50 outline-none" />
                </div>
                
                {/* FECHA AGENDADA */}
                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-blue-600 uppercase">FECHA AGENDADA *</label>
                  <input type="date" required value={domicilioForm.fecha_agendada} onChange={(e) => setDomicilioForm({...domicilioForm, fecha_agendada: e.target.value})} className="w-full border p-2 rounded text-sm bg-blue-50/50 border-blue-200 outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                
                {/* NOTA MANUAL */}
                <div className="col-span-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">NOTA MANUAL</label>
                  <input type="text" value={domicilioForm.nota_manual} onChange={(e) => setDomicilioForm({...domicilioForm, nota_manual: e.target.value})} className="w-full border p-2 rounded text-sm outline-none bg-white" placeholder="Instrucciones especiales para logística..." />
                </div>
              </div>

              {/* DETALLE DE PRODUCTOS */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 md:p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FilePlus size={16} className="text-blue-600" /> Detalle de Productos
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase">
                      <tr>
                        <th className="p-2 border">Código</th>
                        <th className="p-2 border w-1/3">Descripción</th>
                        <th className="p-2 border text-center">Cant.</th>
                        <th className="p-2 border text-center">Unidad</th>
                        <th className="p-2 border text-right">Vr. Unitario</th>
                        <th className="p-2 border text-right">Vr. Total</th>
                        <th className="p-2 border text-center">Bodega</th>
                        <th className="p-2 border text-center">Peso(Kg)</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {pendienteParaDomicilio?.productos && pendienteParaDomicilio.productos.length > 0 ? (
                        pendienteParaDomicilio.productos.map((prod, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="p-1 border"><input type="text" readOnly value={prod.codigo || prod.codigo_producto || ''} className="w-full p-1 bg-transparent outline-none text-slate-500" /></td>
                            <td className="p-1 border"><input type="text" readOnly value={prod.nombre || prod.nombre_producto || prod.descripcion || ''} className="w-full p-1 bg-transparent outline-none font-medium text-slate-700" /></td>
                            <td className="p-1 border"><input type="number" readOnly value={prod.cantidad || prod.cantidad_original || 0} className="w-full p-1 bg-transparent text-center outline-none text-slate-500" /></td>
                            <td className="p-1 border"><input type="text" readOnly value={prod.unidad || prod.unidad_medida || ''} className="w-full p-1 bg-transparent text-center outline-none text-slate-500" /></td>
                            <td className="p-1 border"><input type="number" readOnly value={prod.precio_unitario || 0} className="w-full p-1 bg-transparent text-right outline-none text-slate-500" /></td>
                            <td className="p-1 border bg-slate-50 font-bold text-right text-slate-700">{Number(prod.valor_total || prod.precio_total || 0).toLocaleString('es-CO', {style: 'currency', currency: 'COP', minimumFractionDigits: 0})}</td>
                            <td className="p-1 border text-center font-bold text-slate-500">B{prod.bodega_id}</td>
                            <td className="p-1 border"><input type="number" readOnly value={prod.peso_kg || prod.peso || 0} className="w-full p-1 bg-transparent text-center outline-none font-bold text-blue-600" /></td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="p-4 text-center text-slate-500 italic">No hay productos. Sube un PDF o añade manualmente.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PESOS POR BODEGA */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
                <h3 className="text-xs md:text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Weight size={16} className="text-slate-500" /> Carga Total por Bodega (Kg)
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <div key={`peso_b${num}`} className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 text-center mb-1">B{num}</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={pendienteParaDomicilio?.peso_por_bodega?.[num] ? pendienteParaDomicilio.peso_por_bodega[num].toFixed(2).replace('.', ',') : '0'} 
                        className="w-full border border-slate-300 p-1.5 rounded text-center font-bold text-slate-700 bg-slate-50 text-xs outline-none shadow-inner"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 mt-4 flex justify-end gap-3 pb-2">
                <button type="button" onClick={() => setModalDomicilio(false)} className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={procesandoDomicilio} className="px-6 py-2.5 bg-[#47B3A8] text-white font-bold rounded-lg hover:bg-[#3d9a90] shadow-md transition-colors disabled:opacity-50 text-sm">
                  {procesandoDomicilio ? 'Enviando...' : 'Guardar y Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default PendientesBodega;