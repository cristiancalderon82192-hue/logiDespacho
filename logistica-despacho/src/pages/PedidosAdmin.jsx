import React, { useState, useEffect } from 'react';
import { 
  Save, Truck, FileText, Calendar, User, Weight, MapPin, Search, 
  ChevronDown, ChevronUp, PlusCircle, DollarSign, Phone, X, CheckCircle, 
  Edit, Trash2, RefreshCw, AlertTriangle, Lock, Eye, XCircle, UserPlus, CreditCard,
  Printer, Plus, UploadCloud, Store
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import DateRangeSelector from '../components/DateRangeSelector';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';

const PedidosAdmin = () => {
  const { user } = useAuth();

  const [showFormModal, setShowFormModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [isSaving, setIsSaving] = useState(false);

  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
  const [savingClient, setSavingClient] = useState(false);

  const [listaClientes, setListaClientes] = useState([]);
  const [listaZonas, setListaZonas] = useState([]);
  const [listaDestinos, setListaDestinos] = useState([]);
  const [listaTiposDoc, setListaTiposDoc] = useState([]);
  
  const [listaConductores, setListaConductores] = useState([]);
  const [listaVehiculos, setListaVehiculos] = useState([]);

  const initialFormState = {
    id_factura: '', tipo_documento: 'Factura', prioridad: 'Media',
    valor_factura: '', fecha_facturacion: new Date().toISOString().split('T')[0], 
    fecha_promesa: '', fecha_agendada: '', hora_registro: '', nota_manual: '',
    nombre_cliente: '', telefono: '', zona_envio: '', destino: '', destino_id: '', 
    estado_entrega: 'Pendiente', 
    peso_b1: 0, peso_b2: 0, peso_b3: 0, peso_b4: 0, peso_b5: 0, peso_b6: 0, peso_b7: 0, peso_b8: 0,
    productos: [],
    deja_en_bodega: false,
    bodega_acopio_id: 1,
  };
  const [formData, setFormData] = useState(initialFormState);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };
  const hoy = obtenerFechaLocal();

  const [pedidos, setPedidos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [habilitarRetiro, setHabilitarRetiro] = useState(false);

  const isReadOnly = !!editingId;

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [resC, resZ, resD, resT, resCond, resVeh] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/clientes`),
          fetch(`${import.meta.env.VITE_API_URL}/api/zonas`),
          fetch(`${import.meta.env.VITE_API_URL}/api/destinos`),
          fetch(`${import.meta.env.VITE_API_URL}/api/tipos-documento`),
          fetch(`${import.meta.env.VITE_API_URL}/api/logistica/conductores`).catch(() => ({ ok: false })),
          fetch(`${import.meta.env.VITE_API_URL}/api/logistica/vehiculos`).catch(() => ({ ok: false }))
        ]);
        
        if (resC.ok) setListaClientes(await resC.json());
        if (resZ.ok) setListaZonas(await resZ.json());
        if (resD.ok) setListaDestinos(await resD.json());
        
        if (resT.ok) {
          const tipos = await resT.json();
          setListaTiposDoc(tipos);
          if (tipos.length > 0) setFormData(prev => ({ ...prev, tipo_documento: tipos[0].nombre }));
        }
        
        if (resCond && resCond.ok) setListaConductores(await resCond.json());
        if (resVeh && resVeh.ok) setListaVehiculos(await resVeh.json());

      } catch (error) { console.error(error); }
    };
    fetchCatalogos();
  }, []);

  const abortControllerRef = React.useRef(null);

  const fetchPedidos = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos-rango?inicio=${fechaInicio}&fin=${fechaFin}`, {
        signal: abortControllerRef.current.signal
      });
      setPedidos(await response.json());
    } catch (err) { 
      if (err.name === 'AbortError') return;
      console.error(err); 
    } finally { 
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setLoading(false); 
      }
    }
  };

  useEffect(() => { fetchPedidos(); }, [fechaInicio, fechaFin]);

  const handleChange = async (e) => {
    if (isReadOnly) return; 
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'tipo_documento' && value === 'Nota Manual') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/siguiente-nota-manual`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({ ...prev, id_factura: data.nextId }));
        }
      } catch (err) {
        console.error("Error obteniendo consecutivo", err);
      }
    }
  };

  const handleUploadPdf = async (e) => {
    if (!formData.nombre_cliente || formData.nombre_cliente.trim() === '') {
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
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataPdf
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar PDF');
      }

      const data = await response.json();
      
      const nuevosPesos = { peso_b1: 0, peso_b2: 0, peso_b3: 0, peso_b4: 0, peso_b5: 0, peso_b6: 0, peso_b7: 0, peso_b8: 0 };
      if (data.productos && data.productos.length > 0) {
        data.productos.forEach(p => {
          const bId = p.bodega_id || 1;
          const peso = Number(p.peso) || 0;
          if (bId >= 1 && bId <= 8) {
            nuevosPesos[`peso_b${bId}`] += peso;
          }
        });
      }

      setFormData(prev => ({
        ...prev,
        id_factura: data.id_factura || prev.id_factura,
        valor_factura: data.valor_factura || prev.valor_factura,
        productos: data.productos || [],
        ...nuevosPesos
      }));

      mostrarExito("PDF Procesado correctamente. Verifica los datos extraídos.");

    } catch (error) {
      console.error(error);
      mostrarError("Error procesando PDF: " + error.message);
    } finally {
      setIsUploadingPdf(false);
      e.target.value = null; 
    }
  };

  const handleProductoChange = (index, field, value) => {
    const nuevosProductos = [...(formData.productos || [])];
    nuevosProductos[index][field] = value;

    if (field === 'cantidad' || field === 'precio_unitario') {
      nuevosProductos[index].precio_total = (Number(nuevosProductos[index].cantidad) || 0) * (Number(nuevosProductos[index].precio_unitario) || 0);
    }

    setFormData(prev => ({ ...prev, productos: nuevosProductos }));
  };

  const eliminarProducto = (index) => {
    const nuevosProductos = (formData.productos || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, productos: nuevosProductos }));
  };

  const agregarProducto = () => {
    const nuevosProductos = [...(formData.productos || []), { descripcion: '', codigo_producto: '', peso: 0, bodega_id: 1, cantidad: 1, unidad_medida: 'und', precio_unitario: 0, precio_total: 0 }];
    setFormData(prev => ({ ...prev, productos: nuevosProductos }));
  };

  const recalcularPesos = () => {
    const nuevosPesos = { peso_b1: 0, peso_b2: 0, peso_b3: 0, peso_b4: 0, peso_b5: 0, peso_b6: 0, peso_b7: 0, peso_b8: 0 };
    if (formData.productos && formData.productos.length > 0) {
      formData.productos.forEach(p => {
        const bId = Number(p.bodega_id) || 1;
        const peso = Number(p.peso) || 0;
        if (bId >= 1 && bId <= 8) {
          nuevosPesos[`peso_b${bId}`] += peso;
        }
      });
    }
    setFormData(prev => ({ ...prev, ...nuevosPesos }));
    mostrarInfo("Pesos de bodegas recalculados.");
  };

  const handleSelectCliente = (cliente) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, nombre_cliente: cliente.nombre, telefono: cliente.telefono || prev.telefono }));
    setShowClientModal(false); setClientSearchTerm(''); setIsCreatingClient(false);
  };

  const handleDestinoChange = (e) => {
    if (isReadOnly) return;
    const id = e.target.value;
    const destinoObj = listaDestinos.find(d => d.id.toString() === id);
    if (destinoObj) {
      setFormData(prev => ({ ...prev, destino: destinoObj.nombre, destino_id: destinoObj.id, zona_envio: destinoObj.zona_nombre || '' }));
    } else {
      setFormData(prev => ({ ...prev, destino_id: '', destino: '', zona_envio: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre_cliente || formData.nombre_cliente.trim() === '') {
      mostrarError("❌ Debes seleccionar un cliente utilizando el buscador antes de guardar el pedido.");
      setShowClientModal(true);
      return;
    }
    if (formData.tipo_documento !== 'Nota Manual' && (!formData.id_factura || formData.id_factura.trim() === '')) return mostrarError("❌ El campo 'Id_Factura' es obligatorio.");
    if (formData.valor_factura === '' || Number(formData.valor_factura) < 0) return mostrarError("❌ Debes ingresar un 'Valor de Factura' válido (No negativo).");
    if (!formData.fecha_facturacion) return mostrarError("❌ La 'Fecha Fac.' es obligatoria.");
    if (!formData.hora_registro) return mostrarError("❌ La 'Hora Registro Entrega' es obligatoria.");
    if (!formData.fecha_promesa) return mostrarError("❌ La 'Fecha Promesa' es obligatoria.");
    if (!formData.fecha_agendada) return mostrarError("❌ La 'Fecha Agendada' es obligatoria.");
    if (!formData.telefono || formData.telefono.trim() === '') return mostrarError("❌ El campo 'Teléfono' es obligatorio.");
    if (!formData.destino_id) return mostrarError("❌ Debes seleccionar un 'Destino'.");
    if (!formData.nota_manual || formData.nota_manual.trim() === '') return mostrarError("❌ El campo 'Nota Manual' es obligatorio. Escribe una descripción o 'Ninguna'.");

    const totalPeso = [1, 2, 3, 4, 5, 6, 7, 8].reduce((acc, num) => acc + Number(formData[`peso_b${num}`] || 0), 0);
    if (totalPeso <= 0) {
      return mostrarError("❌ El peso total no puede ser 0 kg. Debes ingresar carga en al menos una bodega para poder despachar.");
    }
    
    setIsSaving(true);

    const url = editingId ? `${import.meta.env.VITE_API_URL}/api/pedidos/${editingId}` : `${import.meta.env.VITE_API_URL}/api/pedidos`;
    const method = editingId ? 'PUT' : 'POST';

    // Auto-generar nota manual para retiros en mostrador
    let finalNotaManual = formData.nota_manual || '';
    
    // Limpiar notas anteriores de retiros para no duplicarlas
    finalNotaManual = finalNotaManual
        .replace(/\|\s*\[Retir[oó]s? en Mostrador:[^\]]*\]/g, '')
        .replace(/\[Retir[oó]s? en Mostrador:[^\]]*\]\s*\|?/g, '')
        .trim();
        
    if (finalNotaManual.endsWith('|')) {
        finalNotaManual = finalNotaManual.slice(0, -1).trim();
    }

    if (formData.productos) {
      const productosRetirados = formData.productos
          .filter(prod => Number(prod.cantidad_retirada_cliente || 0) > 0)
          .map(prod => `${prod.cantidad_retirada_cliente} ${prod.unidad_medida || 'und'} de ${prod.descripcion}`);
          
      if (productosRetirados.length > 0) {
          const nota = `[Retiro en Mostrador: ${productosRetirados.join(' / ')}]`;
          finalNotaManual += (finalNotaManual ? ' | ' : '') + nota;
      }
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, nota_manual: finalNotaManual, usuario_id: user.id })
      });
      if (response.ok) {
        mostrarExito(editingId ? "✅ Pedido Actualizado" : "✅ Pedido Guardado");
        resetForm(); 
        fetchPedidos();
      } else {
        const errorData = await response.json(); mostrarError(`❌ Error: ${errorData.error}`);
      }
    } catch (error) { 
      console.error(error); 
      mostrarError("❌ Error de red.");
    } finally {
      setIsSaving(false);
    }
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
        setListaClientes(await resC.json());
        setFormData(prev => ({ ...prev, nombre_cliente: newClientData.nombre, telefono: newClientData.telefono }));
        setNewClientData({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
        setIsCreatingClient(false); setShowClientModal(false);
      } else {
        const resData = await response.json(); mostrarError(`❌ Error: ${resData.error}`);
      }
    } catch (error) { mostrarError("Error"); } finally { setSavingClient(false); }
  };

  const handleEdit = async (pedidoId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/${pedidoId}`);
      if (!res.ok) throw new Error("No se pudo cargar el pedido");
      const data = await res.json();
      const formatearFecha = (fecha) => fecha ? new Date(fecha).toISOString().split('T')[0] : '';
      setFormData({
        ...initialFormState, ...data,
        fecha_facturacion: formatearFecha(data.fecha_facturacion),
        fecha_promesa: formatearFecha(data.fecha_promesa),
        fecha_agendada: formatearFecha(data.fecha_agendada),
        telefono: data.telefono || '', destino_id: data.destino_id || '' 
      });
      setHabilitarRetiro(data.productos && data.productos.some(p => Number(p.cantidad_retirada_cliente || 0) > 0));
      setEditingId(pedidoId); 
      setShowFormModal(true); 
    } catch (error) { mostrarError("Error al cargar datos"); }
  };

  const handleDelete = async (pedidoFila) => {
    const estaBloqueado = ['En Ruta', 'Entregado', 'Entregado Incompleto', 'Devolución'].includes(pedidoFila.estado_entrega);
    
    let mensaje = `¿Estás seguro de ELIMINAR el pedido ${pedidoFila.id_factura}?`;
    
    if (estaBloqueado) {
      mensaje = `⚠️ ADVERTENCIA DE ADMINISTRADOR ⚠️\n\nEl pedido ${pedidoFila.id_factura} está en estado "${pedidoFila.estado_entrega}". Normalmente no se debería borrar.\n\n¿Estás seguro de forzar la eliminación por mantenimiento?`;
    }

    if (!(await confirmarAccion("Confirmar", mensaje))) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/${pedidoFila.id}`, { method: 'DELETE' });
      if (res.ok) { 
        mostrarInfo("🗑️ Pedido eliminado correctamente."); 
        fetchPedidos(); 
      } else {
        const errorData = await res.json();
        mostrarError(`❌ Error al eliminar: ${errorData.error || 'Desconocido'}`);
      }
    } catch (error) { 
      console.error(error); 
      mostrarError("Error de conexión al intentar eliminar el pedido.");
    }
  };

  const generarComprobantePDF = async (pedidoFila) => {
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/${pedidoFila.id}?_t=${timestamp}`);
      if (!res.ok) throw new Error("No se pudo cargar el pedido");
      
      const fetchExtraData = await res.json();
      const data = { ...fetchExtraData, ...pedidoFila };

      const doc = new jsPDF();
      
      let colorHeader = [71, 179, 168]; 
      
      if (data.estado_entrega === 'Entregado Incompleto') {
        colorHeader = [245, 158, 11]; 
      } else if (data.estado_entrega === 'Devolución') {
        colorHeader = [239, 68, 68]; 
      }

      doc.setFillColor(colorHeader[0], colorHeader[1], colorHeader[2]); 
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("COMPROBANTE DE ENTREGA Y CARGA", 105, 18, { align: 'center' });
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.text(`Documento / Factura: ${data.id_factura}`, 14, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha Agendada: ${data.fecha_agendada || 'N/A'}`, 14, 52);
      doc.setFont("helvetica", "bold");
      
      doc.setTextColor(colorHeader[0], colorHeader[1], colorHeader[2]);
      doc.text(`Estado Actual: ${data.estado_entrega}`, 14, 59);

      autoTable(doc, {
          startY: 65,
          head: [['Datos del Cliente', 'Ubicación']],
          body: [
              [`Nombre: ${data.nombre_cliente}\nTeléfono: ${data.telefono || 'N/A'}`, `Destino: ${data.destino}\nZona: ${data.zona_envio || 'N/A'}`]
          ],
          theme: 'grid',
          headStyles: { fillColor: colorHeader } 
      });

      const bodegas = [];
      let pesoTotalCalculado = 0;

      for(let i=1; i<=8; i++) {
          const pesoBodega = Number(data[`peso_b${i}`] || 0);
          if(pesoBodega > 0) {
              bodegas.push([`Bodega ${i}`, `${pesoBodega} Kg`]);
              pesoTotalCalculado += pesoBodega;
          }
      }
      
      const pesoFinal = (data.total_peso && data.total_peso !== "undefined") ? data.total_peso : pesoTotalCalculado;
      bodegas.push(['PESO TOTAL', `${pesoFinal} Kg`]);

      bodegas.push(['VALOR FACTURA', `$${Number(data.valor_factura || 0).toLocaleString('es-CO')}`]);
      if (data.total_despachado) {
          bodegas.push(['VALOR DESPACHADO', `$${Number(data.total_despachado).toLocaleString('es-CO')}`]);
      }

      autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Detalle de Carga', 'Valores']],
          body: bodegas,
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50] }
      });

      const conductorObj = listaConductores.find(c => String(c.id) === String(data.conductor_id));
      const vehiculoObj = listaVehiculos.find(v => String(v.id) === String(data.vehiculo_id));

      const nombreConductor = data.conductor_nombre || data.conductor || (conductorObj ? conductorObj.nombre : 'Sin asignar');
      const placaVehiculo = data.vehiculo_placa || data.placa || (vehiculoObj ? vehiculoObj.placa : 'Sin asignar');

      autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Conductor', 'Placa Vehículo', 'Observaciones de Entrega']],
          body: [
              [nombreConductor, placaVehiculo, data.observaciones_entrega || data.nota_manual || 'Ninguna']
          ],
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50] }
      });

      if (data.productos && data.productos.length > 0) {
        const prodData = data.productos.map(p => [
          p.codigo_producto || 'S/N',
          p.descripcion || 'Sin descripción',
          `${p.cantidad_despachada !== null && p.cantidad_despachada !== undefined ? p.cantidad_despachada : p.cantidad} ${p.unidad_medida || 'und'}`
        ]);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Código', 'Producto Entregado', 'Cantidad']],
            body: prodData,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50] }
        });
      }

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Firma de Recibido:", 14, finalY);
      
      if (data.firma_cliente) {
          doc.addImage(data.firma_cliente, 'PNG', 14, finalY + 5, 80, 40);
          doc.setDrawColor(200, 200, 200);
          doc.rect(14, finalY + 5, 80, 40);
      } else {
          doc.setDrawColor(200, 200, 200);
          doc.rect(14, finalY + 5, 80, 40);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150, 150, 150);
          doc.text("Sin firma registrada", 30, finalY + 25);
      }

      doc.save(`Comprobante_${data.id_factura}.pdf`);

    } catch (error) {
      console.error("Error generando PDF", error);
      mostrarError("Error al generar el comprobante. Intenta de nuevo.");
    }
  };

  const resetForm = () => {
    setFormData({ ...initialFormState, tipo_documento: listaTiposDoc.length > 0 ? listaTiposDoc[0].nombre : 'Factura' });
    setEditingId(null); 
    setShowFormModal(false); 
  };

  const clientesFiltrados = listaClientes.filter(c => 
    c.nombre.toLowerCase().includes(clientSearchTerm.toLowerCase()) || (c.telefono && c.telefono.includes(clientSearchTerm)) || (c.documento && c.documento.includes(clientSearchTerm))
  );

  return (
    <div className="bg-slate-50 min-h-screen p-3 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

        {/* ================= TABLA DE PEDIDOS Y FILTRO DE FECHAS RESPONSIVO ================= */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 pb-2 border-b border-slate-300">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-slate-600" /> Historial de Pedidos</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-2 md:gap-3">
              <button 
                onClick={() => { resetForm(); setShowFormModal(true); }} 
                className="bg-blue-600 text-white px-5 py-2.5 sm:py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors w-full sm:w-auto h-full"
              >
                <Plus size={18} /> Nuevo Despacho
              </button>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                <DateRangeSelector 
                  fechaInicio={fechaInicio} 
                  setFechaInicio={setFechaInicio} 
                  fechaFin={fechaFin} 
                  setFechaFin={setFechaFin} 
                />
                
                <button onClick={fetchPedidos} className="mt-2 sm:mt-0 w-full sm:w-auto flex justify-center items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 sm:py-1.5 rounded-md transition-colors font-bold text-sm">
                  <Search size={16} /> 
                  <span className="sm:hidden">Buscar Pedidos</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-900 text-[10px] md:text-xs uppercase text-white border-b border-slate-100">
                  <tr>
                    <th className="p-3 md:p-4 font-bold">Doc</th>
                    <th className="p-3 md:p-4 font-bold">Fecha Despacho</th>
                    <th className="p-3 md:p-4 font-bold">Cliente</th>
                    <th className="p-3 md:p-4 font-bold">Destino</th>
                    <th className="p-3 md:p-4 font-bold text-center">Peso</th>
                    <th className="p-3 md:p-4 font-bold text-center">Estado (Logística)</th>
                    <th className="p-3 md:p-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                  {loading ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-400">Cargando...</td></tr>
                  ) : pedidos.length === 0 ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay datos en esta fecha.</td></tr>
                  ) : (
                    pedidos.map((p) => {
                      const estaBloqueado = ['En Ruta', 'Entregado', 'Entregado Incompleto', 'Devolución'].includes(p.estado_entrega);

                      return (
                        <tr key={p.id} className={`transition-colors ${estaBloqueado ? 'bg-slate-50' : 'bg-white hover:bg-blue-50'}`}>
                          <td className="p-3 md:p-4 align-middle">
                            <p className="font-mono font-bold text-blue-600 text-sm md:text-lg">{p.id_factura}</p>
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-sans mt-0.5">{p.tipo_documento}</p>
                            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-bold uppercase border ${p.prioridad === 'Alta' ? 'bg-red-50 text-red-600 border-red-200' : p.prioridad === 'Media' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>P. {p.prioridad}</span>
                          </td>
                          <td className="p-3 md:p-4 align-middle text-slate-600 font-medium">{p.fecha_agendada}</td>
                          <td className="p-3 md:p-4 align-middle">
                            <p className="font-bold text-slate-700 leading-tight">{p.nombre_cliente}</p>
                            <p className="text-[10px] md:text-[11px] text-slate-500 mt-0.5">Zona: {p.zona_envio}</p>
                          </td>
                          <td className="p-3 md:p-4 align-middle text-slate-800 font-medium flex items-center gap-1 md:gap-1.5 pt-4 md:pt-6"><MapPin size={14} className="text-slate-400 shrink-0"/> {p.destino}</td>
                          <td className="p-3 md:p-4 align-middle text-center font-extrabold text-slate-800">{Number(p.total_peso).toLocaleString()} kg</td>
                          
                          <td className="p-3 md:p-4 align-middle text-center">
                            <div className="flex flex-col items-center gap-1 w-full max-w-[140px] md:max-w-[160px] mx-auto">
                              {p.estado_entrega === 'Pendiente' && <span className="bg-slate-100 text-slate-600 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-slate-200">Pendiente</span>}
                              {p.estado_entrega === 'Asignado' && <span className="bg-blue-50 text-blue-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-blue-200">Asignado</span>}
                              {p.estado_entrega === 'En Ruta' && <span className="bg-blue-100 text-blue-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-blue-300 flex items-center gap-1"><Truck size={10} className="md:w-3 md:h-3"/> En Ruta</span>}
                              {p.estado_entrega === 'Entregado' && <span className="bg-green-100 text-green-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-green-300 flex items-center gap-1"><CheckCircle size={10} className="md:w-3 md:h-3"/> Entregado</span>}
                              {p.estado_entrega === 'Entregado Incompleto' && <span className="bg-orange-100 text-orange-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-orange-300 flex items-center gap-1"><AlertTriangle size={10} className="md:w-3 md:h-3"/> Incompleto</span>}
                              {p.estado_entrega === 'Devolución' && <span className="bg-red-100 text-red-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-red-300 flex items-center gap-1"><X size={10} className="md:w-3 md:h-3"/> Devolución</span>}
                              
                              {p.observaciones_entrega && (
                                <div className={`mt-1 text-[9px] md:text-[10px] px-2 py-1 rounded-lg border leading-tight text-center w-full shadow-sm whitespace-normal break-words line-clamp-3 ${p.estado_entrega === 'Devolución' ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`} title={p.observaciones_entrega}>
                                  <b>Nota:</b> {p.observaciones_entrega}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="p-3 md:p-4 align-middle text-center">
                            <div className="flex justify-center gap-1.5 md:gap-2">
                              {estaBloqueado ? (
                                <>
                                  <button onClick={() => handleEdit(p.id)} className="flex items-center gap-1 px-2 py-1.5 md:px-3 md:py-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-lg text-[10px] md:text-xs font-bold transition-colors">
                                    <Eye size={12} className="md:w-[14px] md:h-[14px]" /> Ver
                                  </button>
                                  <button onClick={() => generarComprobantePDF(p)} className="flex items-center gap-1 px-2 py-1.5 md:px-3 md:py-1.5 bg-teal-100 text-teal-700 hover:bg-teal-200 rounded-lg text-[10px] md:text-xs font-bold transition-colors" title="Descargar Comanda">
                                    <Printer size={12} className="md:w-[14px] md:h-[14px]" /> PDF
                                  </button>
                                  <button onClick={() => handleDelete(p)} className="p-1.5 md:p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors" title="Eliminar (Modo Admin)">
                                    <Trash2 size={14} className="md:w-[16px] md:h-[16px]" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleEdit(p.id)} className="p-1.5 md:p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"><Edit size={14} className="md:w-[16px] md:h-[16px]" /></button>
                                  <button onClick={() => handleDelete(p)} className="p-1.5 md:p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors" title="Eliminar"><Trash2 size={14} className="md:w-[16px] md:h-[16px]" /></button>
                                  <button onClick={() => generarComprobantePDF(p)} className="p-1.5 md:p-2 bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white rounded-lg transition-colors" title="Descargar Comanda">
                                    <Printer size={14} className="md:w-[16px] md:h-[16px]" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ================= MODAL DEL FORMULARIO DE PEDIDOS ================= */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex justify-center items-center p-3 md:p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] relative">
            
            {/* Encabezado del Modal del Formulario */}
            <div className={`px-4 md:px-6 py-4 flex items-center justify-between gap-3 border-b shrink-0 ${editingId ? 'bg-orange-600 text-white' : 'bg-slate-900 text-white'}`}>
              <div className="flex items-center gap-3">
                {editingId ? <Edit size={24} /> : <Truck size={24} />}
                <div>
                  <h2 className="text-lg md:text-xl font-bold">{editingId ? `Editando Pedido #${editingId}` : 'Registrar Nuevo Despacho'}</h2>
                  <p className="text-[10px] md:text-xs opacity-80">Administración general</p>
                </div>
              </div>
              <button onClick={() => setShowFormModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            {/* Contenido del Formulario */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                
                {isReadOnly && (
                  <div className="col-span-1 lg:col-span-2 bg-slate-100 border border-slate-300 p-3 md:p-4 rounded-xl flex items-center gap-3">
                    <Lock className="text-slate-500 shrink-0" size={20} />
                    <div>
                      <p className="font-bold text-slate-700 text-sm md:text-base">Formulario Protegido por Seguridad</p>
                      <p className="text-[10px] md:text-sm text-slate-600">Por seguridad, la información del pedido está bloqueada. Solo puedes utilizar esta vista para ingresar un <b>Retiro en Mostrador</b> si aplica.</p>
                    </div>
                  </div>
                )}

                {/* GRUPO A: DOCUMENTACIÓN */}
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-xs md:text-sm font-bold text-slate-700 border-b pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2"><FileText size={16} className={isReadOnly ? "text-slate-400" : "text-blue-600"}/> Datos del Documento</span>
                    {!isReadOnly && (
                      <label className="cursor-pointer bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                        <UploadCloud size={16} />
                        {isUploadingPdf ? 'Procesando PDF...' : 'Subir Factura PDF'}
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleUploadPdf} disabled={isUploadingPdf} />
                      </label>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Id_Factura</label><input type="text" name="id_factura" value={formData.tipo_documento === 'Nota Manual' ? 'Auto-generado' : formData.id_factura} onChange={handleChange} disabled={isReadOnly || formData.tipo_documento === 'Nota Manual'} required={formData.tipo_documento !== 'Nota Manual'} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 bg-white" /></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Tipo Doc</label><select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 px-3 text-sm rounded bg-white disabled:bg-slate-100">{listaTiposDoc.map(t => (<option key={t.id} value={t.nombre}>{t.nombre}</option>))}</select></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Prioridad</label><select name="prioridad" value={formData.prioridad} onChange={handleChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 px-3 text-sm rounded bg-white disabled:bg-slate-100"><option>Alta</option><option>Media</option><option>Baja</option></select></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><DollarSign size={10}/> Valor *</label><input type="number" name="valor_factura" value={formData.valor_factura} onChange={handleChange} disabled={isReadOnly} required min="0" step="any" className="w-full border py-2.5 md:py-2 px-3 text-sm rounded focus:ring-2 focus:ring-green-500 outline-none font-semibold text-slate-700 disabled:bg-slate-100 bg-white placeholder:text-slate-300" placeholder="Ej: 150000"/></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Fecha Fac.</label><input type="date" name="fecha_facturacion" value={formData.fecha_facturacion} onChange={handleChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 px-3 text-sm rounded disabled:bg-slate-100 bg-white" /></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Hora Registro Entrega</label><input type="time" name="hora_registro" value={formData.hora_registro} onChange={handleChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 px-3 text-sm rounded disabled:bg-slate-100 bg-white" /></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Fecha Promesa</label><input type="date" name="fecha_promesa" value={formData.fecha_promesa} onChange={handleChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 px-3 text-sm rounded disabled:bg-slate-100 bg-white" /></div>
                    <div><label className="text-[10px] md:text-xs font-bold text-blue-600 uppercase">Fecha Agendada</label><input type="date" name="fecha_agendada" value={formData.fecha_agendada} onChange={handleChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 px-3 text-sm rounded border-blue-200 bg-blue-50 focus:ring-blue-500 disabled:bg-slate-100" /></div>
                  </div>
                </div>

                {/* GRUPO B: CLIENTE Y UBICACIÓN */}
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-xs md:text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-2"><User size={16} className={isReadOnly ? "text-slate-400" : "text-blue-600"}/> Cliente & Destino</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Cliente</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="text" 
                            name="nombre_cliente" 
                            value={formData.nombre_cliente} 
                            readOnly
                            onClick={() => !isReadOnly && setShowClientModal(true)}
                            disabled={isReadOnly} 
                            required
                            className={`w-full border py-2.5 md:py-2 pr-3 pl-8 text-sm rounded disabled:bg-slate-100 ${!isReadOnly ? 'bg-blue-50 border-blue-200 cursor-pointer hover:border-blue-400 text-blue-900 font-semibold' : 'bg-white'}`}
                            placeholder="Haz clic para buscar cliente..." 
                          />
                          <User size={14} className={`absolute left-2.5 top-3 md:top-2.5 ${!isReadOnly ? 'text-blue-500' : 'text-slate-400'}`}/>
                        </div>
                        {!isReadOnly && <button type="button" onClick={() => setShowClientModal(true)} className="bg-blue-600 text-white py-2.5 px-4 md:py-2 rounded w-full sm:w-auto flex justify-center gap-2 font-bold text-sm shadow-sm"><Search size={16} /> Buscar</button>}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                      <div className="relative">
                        <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 pr-3 pl-8 text-sm rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 bg-white"/>
                        <Phone size={14} className="absolute left-2.5 top-3 md:top-2.5 text-slate-400"/>
                      </div>
                    </div>
                    <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Zona</label><input type="text" name="zona_envio" value={formData.zona_envio} readOnly required className="w-full border py-2.5 md:py-2 px-3 text-sm rounded bg-slate-100 text-slate-500" /></div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Destino</label>
                      <div className="relative">
                        <select name="destino_id" value={formData.destino_id} onChange={handleDestinoChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 pr-3 pl-8 text-sm rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
                          <option value="">-- Seleccione --</option>
                          {listaDestinos.map(d => (<option key={d.id} value={d.id}>{d.nombre} {d.zona_nombre ? `(${d.zona_nombre})` : ''}</option>))}
                        </select>
                        <MapPin size={14} className="absolute left-2.5 top-3 md:top-2.5 text-slate-400"/>
                      </div>
                    </div>
                    <div className="sm:col-span-2 border border-blue-200 bg-blue-50/50 p-3 rounded-lg flex flex-col gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="deja_en_bodega" checked={formData.deja_en_bodega} onChange={(e) => setFormData(prev => ({...prev, deja_en_bodega: e.target.checked}))} disabled={isReadOnly} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-sm font-bold text-slate-700">Se deja en bodega y el cliente recoge en mostrador</span>
                      </label>
                      {formData.deja_en_bodega && (
                        <div>
                          <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 block">Bodega de Acopio (Responsable de entregar)</label>
                          <select name="bodega_acopio_id" value={formData.bodega_acopio_id} onChange={(e) => setFormData(prev => ({...prev, bodega_acopio_id: Number(e.target.value)}))} disabled={isReadOnly} required className="w-full sm:w-1/2 border py-2 px-3 text-sm rounded bg-white disabled:bg-slate-100 font-bold">
                            {[1,2,3,4,5,6,7,8].map(b => <option key={b} value={b}>Bodega {b}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Nota Manual</label>
                      <input type="text" name="nota_manual" value={formData.nota_manual} onChange={handleChange} disabled={isReadOnly} required className="w-full border py-2.5 md:py-2 px-3 text-sm rounded disabled:bg-slate-100 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                </div>

                {/* GRUPO C: PRODUCTOS */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-3 md:p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FileText size={16} className={isReadOnly ? "text-slate-400" : "text-blue-600"} /> 
                      Detalle de Productos
                    </h3>
                    <div className="flex gap-2">
                      {(!formData.id || formData.estado_entrega === 'Pendiente') && (
                        <button type="button" onClick={() => setHabilitarRetiro(!habilitarRetiro)} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${habilitarRetiro ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
                          <Store size={14} /> {habilitarRetiro ? 'Ocultar Retiro' : 'Habilitar Retiro'}
                        </button>
                      )}
                      {!isReadOnly && (
                        <>
                          <button type="button" onClick={agregarProducto} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors">
                            <PlusCircle size={14} /> Añadir Producto
                          </button>
                          <button type="button" onClick={recalcularPesos} className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors">
                            <RefreshCw size={14} /> Recalcular Pesos
                          </button>
                        </>
                      )}
                    </div>
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
                          {habilitarRetiro && <th className="p-2 border text-center text-orange-600">Retiro Mostrador</th>}
                          {!isReadOnly && <th className="p-2 border text-center">Acción</th>}
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {formData.productos && formData.productos.length > 0 ? (
                          formData.productos.map((prod, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="p-1 border"><input type="text" value={prod.codigo_producto || ''} onChange={(e) => handleProductoChange(index, 'codigo_producto', e.target.value)} disabled={isReadOnly} className="w-full p-1 bg-transparent outline-none disabled:text-slate-500" placeholder="Cód..." /></td>
                              <td className="p-1 border"><input type="text" value={prod.descripcion || ''} onChange={(e) => handleProductoChange(index, 'descripcion', e.target.value)} disabled={isReadOnly} required className="w-full p-1 bg-transparent outline-none font-medium text-slate-700 disabled:text-slate-500" placeholder="Nombre del producto..." /></td>
                              <td className="p-1 border"><input type="number" step="0.01" value={prod.cantidad} onChange={(e) => handleProductoChange(index, 'cantidad', e.target.value)} disabled={isReadOnly} required className="w-full p-1 bg-transparent text-center outline-none disabled:text-slate-500" /></td>
                              <td className="p-1 border"><input type="text" value={prod.unidad_medida || ''} onChange={(e) => handleProductoChange(index, 'unidad_medida', e.target.value)} disabled={isReadOnly} className="w-full p-1 bg-transparent text-center outline-none disabled:text-slate-500" placeholder="und" /></td>
                              <td className="p-1 border"><input type="number" step="0.01" value={prod.precio_unitario} onChange={(e) => handleProductoChange(index, 'precio_unitario', e.target.value)} disabled={isReadOnly} className="w-full p-1 bg-transparent text-right outline-none disabled:text-slate-500" /></td>
                              <td className="p-1 border bg-slate-50 font-bold text-right text-slate-700">{Number(prod.precio_total || 0).toLocaleString('es-CO', {style: 'currency', currency: 'COP', minimumFractionDigits: 0})}</td>
                              <td className="p-1 border">
                                <select value={prod.bodega_id || 1} onChange={(e) => handleProductoChange(index, 'bodega_id', e.target.value)} disabled={isReadOnly} className="w-full p-1 bg-transparent outline-none text-center disabled:text-slate-500">
                                  {[1,2,3,4,5,6,7,8].map(b => <option key={b} value={b}>B{b}</option>)}
                                </select>
                              </td>
                              <td className="p-1 border"><input type="number" step="0.01" value={prod.peso} onChange={(e) => handleProductoChange(index, 'peso', e.target.value)} disabled={isReadOnly} className="w-full p-1 bg-transparent text-center outline-none font-bold text-blue-600 disabled:text-slate-500" /></td>
                              {habilitarRetiro && (
                                <td className="p-1 border">
                                  <input type="number" step="0.01" min="0" max={prod.cantidad} value={prod.cantidad_retirada_cliente || ''} onChange={(e) => handleProductoChange(index, 'cantidad_retirada_cliente', e.target.value)} disabled={formData.retiro_mostrador_entregado || (formData.id && formData.estado_entrega !== 'Pendiente')} className="w-full p-1 bg-orange-50 border border-orange-200 rounded text-center outline-none font-bold text-orange-600 focus:border-orange-400 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed" placeholder="0" title="Cantidad retirada por el cliente en mostrador" />
                                </td>
                              )}
                              {!isReadOnly && (
                                <td className="p-1 border text-center">
                                  <button type="button" onClick={() => eliminarProducto(index)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={14}/></button>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={isReadOnly ? "8" : "9"} className="p-4 text-center text-slate-400">No hay productos. Sube un PDF o añade manualmente.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GRUPO D: PESOS */}
                <div className="lg:col-span-2 bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-200">
                  <h3 className="text-xs md:text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Weight size={16} className={isReadOnly ? "text-slate-400" : ""} /> Carga Total por Bodega (Kg)</h3>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <div key={num}><label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase text-center">B{num}</label><input type="number" name={`peso_b${num}`} value={formData[`peso_b${num}`]} onChange={handleChange} disabled={isReadOnly} required step="any" className="w-full text-center py-2 md:py-1 px-1 border rounded font-bold text-sm text-slate-700 disabled:bg-slate-100 bg-white focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                    ))}
                  </div>
                  
                  {/* CONTROLES DE GUARDADO DENTRO DEL MODAL */}
                  <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-2 md:gap-3">
                    <button type="button" onClick={() => setShowFormModal(false)} className="w-full sm:w-auto text-slate-600 hover:bg-slate-200 bg-slate-200/50 px-6 py-2.5 md:py-2.5 rounded-lg font-bold text-sm text-center transition-colors">
                      {isReadOnly ? 'Cerrar Vista' : 'Cancelar'}
                    </button>
                    {( !isReadOnly || editingId ) && (
                      <button type="submit" disabled={isSaving} className={`w-full sm:w-auto text-white px-8 py-2.5 md:py-2.5 rounded-lg font-extrabold flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>
                        {isSaving ? 'Procesando...' : (
                          <>
                            {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} 
                            {editingId ? (isReadOnly ? 'Guardar Retiros' : 'Actualizar Pedido') : 'Guardar Pedido'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE CLIENTES AVANZADO ================= */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center p-3 md:p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 p-3 md:p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                {isCreatingClient ? <UserPlus size={18}/> : <Search size={18}/>} 
                {isCreatingClient ? 'Registrar Nuevo Cliente' : 'Buscar Cliente'}
              </h3>
              <button onClick={() => { 
                setShowClientModal(false); 
                setIsCreatingClient(false); 
                setNewClientData({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
              }} className="hover:bg-white/20 p-1.5 rounded-full"><X size={18}/></button>
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
                  <input type="text" placeholder="Buscar por nombre, cédula o teléfono..." className="w-full border p-2.5 md:p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100 text-sm" value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} autoFocus />
                  
                  <div className="flex-1 overflow-y-auto border rounded-lg bg-white custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] md:text-xs text-slate-500 uppercase sticky top-0 shadow-sm">
                        <tr><th className="p-2 md:p-3">Nombre / Cédula</th><th className="p-2 md:p-3 hidden sm:table-cell">Teléfono</th><th className="p-2 md:p-3 text-right">Acción</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                        {clientesFiltrados.length === 0 ? (
                          <tr><td colSpan="3" className="p-8 text-center text-slate-400">No se encontraron clientes.</td></tr>
                        ) : (
                          clientesFiltrados.map(c => (
                            <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                              <td className="p-2 md:p-3">
                                <span className="font-medium text-slate-700 block line-clamp-1" title={c.nombre}>{c.nombre}</span>
                                <span className="text-[9px] md:text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><CreditCard size={10} className="text-slate-300" />{c.documento || 'Sin registrar'}</span>
                              </td>
                              <td className="p-2 md:p-3 text-slate-500 hidden sm:table-cell">{c.telefono || '---'}</td>
                              <td className="p-2 md:p-3 text-right">
                                <button onClick={() => handleSelectCliente(c)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded text-[10px] md:text-xs font-bold flex items-center justify-center gap-1 ml-auto w-full sm:w-auto">
                                  Select <CheckCircle size={10}/>
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
              <div className="p-3 md:p-4 bg-slate-100 border-t flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                <button onClick={() => setIsCreatingClient(true)} className="text-blue-600 font-bold text-xs md:text-sm flex items-center justify-center gap-1 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded w-full sm:w-auto">
                  <UserPlus size={16}/> Crear Cliente
                </button>
                <button onClick={() => setShowClientModal(false)} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold text-xs md:text-sm hover:bg-slate-300 rounded w-full sm:w-auto">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidosAdmin;