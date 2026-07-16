import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Calendar, CheckCircle, X, User, Edit, Search, Filter, Trash2, Printer, AlertCircle, XCircle, Lock, AlertTriangle, ListChecks, CheckSquare, Square, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { socket } from '../utils/socket';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';

const AsignacionLogistica = () => {
  const { user } = useAuth(); 
  
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
  const [viajeFiltro, setViajeFiltro] = useState(''); 
  
  const [pedidos, setPedidos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  
  const [loading, setLoading] = useState(false);

  const [pedidosSeleccionados, setPedidosSeleccionados] = useState([]);
  const [showModalLote, setShowModalLote] = useState(false);
  const [asignacionLote, setAsignacionLote] = useState({ conductor_id: '', vehiculo_id: '' });
  const [detallesLote, setDetallesLote] = useState({});

  const [showModalIndividual, setShowModalIndividual] = useState(false);
  const [pedidoIndividual, setPedidoIndividual] = useState(null);
  const [asignacionIndividual, setAsignacionIndividual] = useState({ 
    conductor_id: '', vehiculo_id: '', total_despachado: '', observaciones_entrega: '' 
  });

  const fetchData = async (mostrarPantallaCarga = true) => {
    if (mostrarPantallaCarga) setLoading(true);
    try {
      const [resP, resC, resV] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos-dia?fecha=${fechaFiltro}`),
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/conductores`), 
        fetch(`${import.meta.env.VITE_API_URL}/api/logistica/vehiculos`)
      ]);
      
      if(resP.ok) {
        const data = await resP.json();
        // El backend ahora devuelve total_peso y valor_factura descontando retiros.
        const procesados = data.map(p => {
          let valor_retirado = 0;
          if (p.productos && p.productos.length > 0) {
            p.productos.forEach(prod => {
              const retirada = Number(prod.cantidad_retirada_cliente || 0);
              if (retirada > 0) {
                valor_retirado += (retirada * Number(prod.precio_unitario || 0));
              }
            });
          }
          return {
            ...p,
            valor_factura: Math.max(0, Number(p.valor_factura || 0) - valor_retirado)
            // total_peso ya viene descontado correctamente desde el backend (SQL)
          };
        });
        setPedidos(procesados);
      }
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
    setPedidosSeleccionados([]); 
    const intervalId = setInterval(() => { fetchData(false); }, 5000);
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaFiltro]);

  const toggleSeleccion = (id) => {
    setPedidosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };


  const handleProductoLoteChange = (pedidoId, prodId, nuevaCantidad) => {
    setDetallesLote(prev => {
      const det = prev[pedidoId];
      if (!det) return prev;
      const nuevosProductos = det.productos.map(p => 
        p.id === prodId ? { ...p, cantidad_despachada: Number(nuevaCantidad) } : p
      );
      
      let nuevoValor = 0;
      const faltantes = [];
      nuevosProductos.forEach(p => {
        nuevoValor += p.cantidad_despachada * Number(p.precio_unitario);
        if (p.cantidad_despachada < p.cantidad) {
          faltantes.push(`${p.cantidad - p.cantidad_despachada}x ${p.descripcion}`);
        }
      });
      nuevoValor = parseFloat(nuevoValor.toFixed(2));
      
      const observaciones = faltantes.length > 0 ? `FALTAN: ${faltantes.join(', ')}` : '';
      
      return {
        ...prev,
        [pedidoId]: {
          ...det,
          productos: nuevosProductos,
          valor_despachar: nuevoValor,
          observacion: observaciones
        }
      };
    });
  };

  const handleProductoIndividualChange = (prodId, nuevaCantidad) => {
    setAsignacionIndividual(prev => {
      const nuevosProductos = prev.productos_despachados.map(p => 
        p.id === prodId ? { ...p, cantidad_despachada: Number(nuevaCantidad) } : p
      );
      
      let nuevoValor = 0;
      const faltantes = [];
      nuevosProductos.forEach(p => {
        nuevoValor += p.cantidad_despachada * Number(p.precio_unitario);
        if (p.cantidad_despachada < p.cantidad) {
          faltantes.push(`${p.cantidad - p.cantidad_despachada}x ${p.descripcion}`);
        }
      });
      nuevoValor = parseFloat(nuevoValor.toFixed(2));
      
      const observaciones = faltantes.length > 0 ? `FALTAN: ${faltantes.join(', ')}` : '';
      
      return {
        ...prev,
        productos_despachados: nuevosProductos,
        total_despachado: nuevoValor,
        observaciones_entrega: observaciones
      };
    });
  };

  const toggleExpandirLote = (pedidoId) => {
    setDetallesLote(prev => ({
      ...prev,
      [pedidoId]: {
        ...prev[pedidoId],
        expandido: !prev[pedidoId].expandido
      }
    }));
  };

  const handleAbrirModalLote = () => {
    const valoresIniciales = {};
    pedidosFiltrados
      .filter(p => pedidosSeleccionados.includes(p.id))
      .forEach(p => {
    const productosInit = p.productos ? p.productos.map(prod => {
      const cantidadOrig = Number(prod.cantidad || 1);
      const cantidadReal = cantidadOrig - Number(prod.cantidad_retirada_cliente || 0);
      const pesoOriginal = Number(prod.peso_kg || prod.peso || 0);
      const nuevoPeso = cantidadOrig > 0 ? (pesoOriginal / cantidadOrig) * cantidadReal : 0;
      
      return {
        ...prod,
        cantidad: cantidadReal,
        cantidad_original: cantidadOrig,
        peso: nuevoPeso,
        peso_original: pesoOriginal,
        cantidad_despachada: prod.cantidad_despachada !== undefined && prod.cantidad_despachada !== null ? Number(prod.cantidad_despachada) : cantidadReal
      };
    }) : [];
        valoresIniciales[p.id] = {
          valor_despachar: p.valor_factura || 0,
          observacion: '',
          productos: productosInit,
          expandido: false
        };
      });
    setDetallesLote(valoresIniciales);
    setAsignacionLote({ conductor_id: '', vehiculo_id: '' });
    setShowModalLote(true);
  };

  const handleAsignarLote = async (e) => {
    e.preventDefault();
    if (!asignacionLote.conductor_id || !asignacionLote.vehiculo_id) {
      return mostrarError("Debes seleccionar conductor y vehículo.");
    }

    const payloadDetalles = [];
    const notificacionesParciales = []; 

    for (const pId of pedidosSeleccionados) {
      const pedidoOriginal = pedidos.find(p => p.id === pId);
      const det = detallesLote[pId];
      
      if (Number(det.valor_despachar) > Number(pedidoOriginal.valor_factura)) {
        return mostrarError(`❌ ALERTA: La factura ${pedidoOriginal.id_factura} no puede tener un despacho mayor al valor de la factura original.`);
      }

      if (Number(det.valor_despachar) < Number(pedidoOriginal.valor_factura)) {
        if (det.observacion.trim() === '') {
          return mostrarError(`❌ ALERTA: La factura ${pedidoOriginal.id_factura} va incompleta. Es OBLIGATORIO escribir una observación.`);
        }
        notificacionesParciales.push({
          factura: pedidoOriginal.id_factura,
          cliente: pedidoOriginal.nombre_cliente,
          estado: 'Entregado Incompleto', 
          motivo: `[Asignación en Bodega] ${det.observacion}`,
          conductor: user?.nombre_completo || 'Logística'
        });
      }

      payloadDetalles.push({
        id: pId,
        total_despachado: det.valor_despachar,
        observaciones_entrega: det.observacion,
        productos_despachados: det.productos
      });
    }

    window.dispatchEvent(new CustomEvent('show-loader', { detail: { message: 'Asignando ruta por lote...' } }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos/asignar-lote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detalles_lote: payloadDetalles,
          conductor_id: asignacionLote.conductor_id,
          vehiculo_id: asignacionLote.vehiculo_id,
          fecha: fechaFiltro
        })
      });

      if (res.ok) {
        setShowModalLote(false);
        setPedidosSeleccionados([]);

        // 👇 DISPARADOR 100% INSTANTÁNEO (LOTE) 👇
        if (notificacionesParciales.length > 0) {
          notificacionesParciales.forEach(notificacion => {
            socket.emit('reportar_novedad', notificacion); // Por internet a los demás
            window.dispatchEvent(new CustomEvent('alerta_local', { detail: notificacion })); // Instántaneo para ti
          });
        }

        mostrarExito("✅ Ruta por Lote generada exitosamente.");
        fetchData(true);
      }
    } catch (error) {
      mostrarError("Error de conexión al asignar el lote.");
    } finally {
      window.dispatchEvent(new CustomEvent('hide-loader'));
    }
  };

  const handleAbrirAsignacionIndividual = (pedido) => {
    if (['En Ruta', 'Entregado', 'Entregado Incompleto', 'Devolución'].includes(pedido.estado_entrega)) return;

    setPedidoIndividual(pedido);
    const productosInit = pedido.productos ? pedido.productos.map(prod => {
      const cantidadReal = Number(prod.cantidad) - Number(prod.cantidad_retirada_cliente || 0);
      return {
        ...prod,
        cantidad: cantidadReal,
        cantidad_original: Number(prod.cantidad),
        cantidad_despachada: prod.cantidad_despachada !== null ? Number(prod.cantidad_despachada) : cantidadReal
      };
    }) : [];

    setAsignacionIndividual({ 
      conductor_id: pedido.conductor_id || '', 
      vehiculo_id: pedido.vehiculo_id || '',
      total_despachado: pedido.total_despachado || pedido.valor_factura || '',
      observaciones_entrega: pedido.observaciones_entrega || '',
      productos_despachados: productosInit
    });
    setShowModalIndividual(true);
  };

  const handleAsignarIndividual = async (e) => {
    e.preventDefault();
    if (!asignacionIndividual.conductor_id || !asignacionIndividual.vehiculo_id || asignacionIndividual.total_despachado === '') {
      return mostrarError("Debes seleccionar un conductor, un vehículo y el valor despachado.");
    }

    const valorIngresado = Number(asignacionIndividual.total_despachado);
    const valorFactura = Number(pedidoIndividual.valor_factura || 0);
    const esParcial = valorIngresado < valorFactura;

    if (valorIngresado > valorFactura) {
      return mostrarError(`❌ ALERTA:\nEl valor a despachar no puede superar la factura.`);
    }

    window.dispatchEvent(new CustomEvent('show-loader', { detail: { message: 'Actualizando asignación...' } }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos/${pedidoIndividual.id}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asignacionIndividual)
      });
      if (res.ok) {
        setShowModalIndividual(false);

        // 👇 DISPARADOR 100% INSTANTÁNEO (INDIVIDUAL) 👇
        if (esParcial) {
          const payloadAlerta = {
            factura: pedidoIndividual.id_factura,
            cliente: pedidoIndividual.nombre_cliente,
            estado: 'Entregado Incompleto',
            motivo: `[Modificación en Bodega] ${asignacionIndividual.observaciones_entrega}`,
            conductor: user?.nombre_completo || 'Logística'
          };
          socket.emit('reportar_novedad', payloadAlerta); // Por internet a los demás
          window.dispatchEvent(new CustomEvent('alerta_local', { detail: payloadAlerta })); // Instántaneo para ti
        }

        mostrarExito("✅ Ruta actualizada exitosamente");
        fetchData(true); 
      }
    } catch (error) { 
      mostrarError("Error de conexión"); 
    } finally {
      window.dispatchEvent(new CustomEvent('hide-loader'));
    }
  };

  const handleQuitarAsignacion = async (pedidoId) => {
    if (!(await confirmarAccion("Confirmar", "¿Estás seguro de quitar la asignación?"))) return;
    window.dispatchEvent(new CustomEvent('show-loader', { detail: { message: 'Desasignando...' } }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logistica/pedidos/${pedidoId}/desasignar`, {
        method: 'PUT'
      });
      if (res.ok) {
        mostrarExito("Asignación removida correctamente");
        fetchData(true);
        setShowModalIndividual(false);
      }
    } catch (error) { 
      mostrarError("Error al desasignar"); 
    } finally {
      window.dispatchEvent(new CustomEvent('hide-loader'));
    }
  };

  const obtenerPesoNumerico = (p) => {
    if (p.total_peso !== undefined && p.total_peso !== null) return Number(p.total_peso);
    return Number(p.peso || 0);
  };
  const obtenerPesoFormateado = (p) => obtenerPesoNumerico(p).toLocaleString();

  const destinosUnicos = [...new Set(pedidos.map(p => p.destino))].sort();
  const viajesUnicos = [...new Set(pedidos.map(p => Number(p.numero_viaje || 0)))].filter(v => v > 0).sort((a, b) => a - b);
  
  const pedidosFiltrados = pedidos
    .filter(p => {
      const matchDestino = destinoFiltro ? p.destino === destinoFiltro : true;
      const matchConductor = conductorFiltro ? String(p.conductor_id) === conductorFiltro : true;
      const matchViaje = viajeFiltro ? String(p.numero_viaje || '') === viajeFiltro : true;
      return matchDestino && matchConductor && matchViaje;
    })
    .sort((a, b) => {
      const prioridadA = a.estado_entrega === 'Pendiente' ? 0 : 1;
      const prioridadB = b.estado_entrega === 'Pendiente' ? 0 : 1;
      if (prioridadA !== prioridadB) return prioridadA - prioridadB;
      const viajeA = Number(a.numero_viaje || 0);
      const viajeB = Number(b.numero_viaje || 0);
      if (viajeA !== viajeB) return viajeB - viajeA; 
      return String(a.id_factura).localeCompare(String(b.id_factura));
    });

  const conductorSeleccionadoInfo = conductores.find(c => String(c.id) === conductorFiltro);
  const vehiculoPlanilla = pedidosFiltrados.length > 0 && pedidosFiltrados[0].vehiculo_placa ? pedidosFiltrados[0].vehiculo_placa : 'Múltiples / Sin asignar';
  const totalPesoPlanilla = pedidosFiltrados.reduce((acc, p) => acc + obtenerPesoNumerico(p), 0);
  const totalValorPlanilla = pedidosFiltrados.reduce((acc, p) => acc + Number(p.total_despachado || 0), 0);

  const pedidosSeleccionadosObj = pedidosFiltrados.filter(p => pedidosSeleccionados.includes(p.id));
  const pesoLoteTotal = pedidosSeleccionadosObj.reduce((acc, p) => acc + obtenerPesoNumerico(p), 0);
  const valorLoteTotal = pedidosSeleccionadosObj.reduce((acc, p) => acc + Number(p.valor_factura || 0), 0);
  const destinosUnicosLote = [...new Set(pedidosSeleccionadosObj.map(p => p.destino))];
  const zonasUnicasLote = [...new Set(pedidosSeleccionadosObj.map(p => p.zona_envio))];
  
  const vehiculoLoteSelec = vehiculos.find(v => String(v.id) === String(asignacionLote.vehiculo_id));
  const excedeCapacidadLote = vehiculoLoteSelec && pesoLoteTotal > Number(vehiculoLoteSelec.capacidad_kg);

  // Lógica para Consolidar la Mercancía por Bodega
  const bodegasConsolidadasMap = {};
  pedidosFiltrados.forEach(pedido => {
    if (pedido.productos && Array.isArray(pedido.productos)) {
      pedido.productos.forEach(prod => {
        const bodegaFinal = prod.bodega_nombre || (prod.bodega_id ? `Bodega ${prod.bodega_id}` : 'Bodega Principal');
        
        if (!bodegasConsolidadasMap[bodegaFinal]) {
          bodegasConsolidadasMap[bodegaFinal] = { productos: {}, facturas: {} };
        }
        
        const codigo = prod.codigo_producto || 'S/C';
        if (!bodegasConsolidadasMap[bodegaFinal].productos[codigo]) {
          bodegasConsolidadasMap[bodegaFinal].productos[codigo] = {
            codigo: codigo,
            descripcion: prod.descripcion || prod.nombre_producto || 'Sin descripción',
            cantidad: 0,
            unidad_medida: prod.unidad_medida || 'UND'
          };
        }
        
        const baseCant = prod.cantidad_despachada !== undefined && prod.cantidad_despachada !== null ? parseFloat(prod.cantidad_despachada) : (parseFloat(prod.cantidad_pendiente || prod.cantidad || 0));
        const cant = Math.max(0, baseCant - parseFloat(prod.cantidad_retirada_cliente || 0));
        bodegasConsolidadasMap[bodegaFinal].productos[codigo].cantidad += cant;
        
        // --- DESGLOSE DETALLADO POR FACTURA ---
        if (cant > 0) {
          const facId = pedido.id_factura;
          if (!bodegasConsolidadasMap[bodegaFinal].facturas[facId]) {
            bodegasConsolidadasMap[bodegaFinal].facturas[facId] = {
              factura: facId,
              cliente: pedido.nombre_cliente,
              items: []
            };
          }
          bodegasConsolidadasMap[bodegaFinal].facturas[facId].items.push({
            codigo: codigo,
            descripcion: prod.descripcion || prod.nombre_producto,
            cantidad: cant,
            unidad_medida: prod.unidad_medida || 'UND',
            vr_unitario: prod.vr_unitario || 0,
            vr_total: prod.vr_total || 0,
            peso: prod.peso_kg || prod.peso || 0
          });
        }
      });
    }
  });

  const bodegasConsolidadasArr = Object.keys(bodegasConsolidadasMap).map(bodegaName => {
    return {
      bodega: bodegaName,
      productos: Object.values(bodegasConsolidadasMap[bodegaName].productos),
      facturas: Object.values(bodegasConsolidadasMap[bodegaName].facturas)
    };
  });

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

      <div className="ocultar-al-imprimir bg-slate-50 min-h-screen space-y-4 md:space-y-8 p-3 md:p-6 w-full max-w-full overflow-x-hidden pb-24">
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 md:gap-3">
              <ListChecks className="text-[#47B3A8]" size={28} /> Programación de Rutas
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Selecciona pedidos para asignar lotes o modifícalos individualmente.</p>
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
                <Truck className="text-slate-500 ml-1 shrink-0" size={16} />
                <select value={viajeFiltro} onChange={(e) => setViajeFiltro(e.target.value)} className="bg-transparent text-slate-700 text-xs md:text-sm outline-none font-bold w-full sm:min-w-[110px] cursor-pointer">
                  <option value="">Todos los Viajes</option>
                  {viajesUnicos.map(v => (<option key={v} value={String(v)}>Viaje #{v}</option>))}
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
                  <th className="p-3 md:p-4 w-[5%] text-center"></th>
                  <th className="p-3 md:p-4 w-[15%]">Documento</th>
                  <th className="p-3 md:p-4 w-[20%]">Destino / Cliente</th>
                  <th className="p-3 md:p-4 w-[10%] text-center">Peso (Kg)</th>
                  <th className="p-3 md:p-4 w-[15%] text-center">Estado</th>
                  <th className="p-3 md:p-4 w-[20%]">Asignación Actual</th>
                  <th className="p-3 md:p-4 w-[15%] text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm text-slate-700">
                {loading ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">Buscando despachos...</td></tr>
                ) : pedidosFiltrados.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 md:p-12 text-center text-slate-400">No hay resultados.</td></tr>
                ) : (
                  pedidosFiltrados.map((p) => {
                    const estaBloqueado = ['En Ruta', 'Entregado', 'Entregado Incompleto', 'Devolución'].includes(p.estado_entrega);
                    const esIncompleto = p.estado_entrega === 'Entregado' && parseFloat(p.valor_factura_pendiente) > 0;
                    const estaSeleccionado = pedidosSeleccionados.includes(p.id);

                    return (
                      <tr key={p.id} className={`transition-colors ${estaSeleccionado ? 'bg-teal-50/50' : estaBloqueado ? 'bg-slate-50 opacity-75' : 'bg-white hover:bg-slate-50'}`}>
                        
                        <td className="p-3 md:p-4 align-middle text-center">
                          <button 
                            disabled={estaBloqueado || p.conductor_id} 
                            onClick={() => toggleSeleccion(p.id)}
                            className={`p-1 rounded ${(estaBloqueado || p.conductor_id) ? 'text-slate-300 cursor-not-allowed' : estaSeleccionado ? 'text-[#47B3A8]' : 'text-slate-300 hover:text-slate-400'}`}
                          >
                            {estaSeleccionado ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        </td>

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
                          <div className="flex flex-col items-center gap-1 w-full max-w-[150px] mx-auto">
                            {p.estado_entrega === 'Pendiente' && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border border-orange-200 animate-pulse">Pendiente</span>}
                            {p.estado_entrega === 'Asignado' && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border border-slate-300">Asignado</span>}
                            {p.estado_entrega === 'En Ruta' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border border-blue-300 flex items-center gap-1 shadow-sm"><Truck size={10}/> En Ruta</span>}
                            
                            {p.estado_entrega === 'Entregado' && !esIncompleto && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border border-green-300 flex items-center gap-1 shadow-sm"><CheckCircle size={10}/> Entregado</span>}
                            
                            {(p.estado_entrega === 'Entregado Incompleto' || esIncompleto) && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border border-orange-300 flex items-center gap-1 shadow-sm"><AlertTriangle size={10}/> Incompleto</span>}
                            
                            {p.estado_entrega === 'Devolución' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border border-red-300 flex items-center gap-1 shadow-sm"><X size={10}/> Devolución</span>}

                            {p.observaciones_entrega && (
                              <div className={`mt-1 text-[9px] md:text-[10px] px-2 py-1 rounded border leading-tight text-center w-full shadow-sm ${
                                p.estado_entrega === 'Devolución' 
                                  ? 'text-red-700 bg-red-50 border-red-200' 
                                  : 'text-orange-700 bg-orange-50 border-orange-200'
                              }`}
                              title={p.observaciones_entrega}
                              >
                                <b>Nota:</b> {p.observaciones_entrega}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="p-3 md:p-4 align-middle">
                          {p.conductor_id && (
                            <div className={`text-[10px] md:text-xs p-2 rounded border shadow-sm ${p.estado_entrega === 'Devolución' ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
                              <p className="flex items-center gap-1.5 font-medium text-slate-700 mb-1"><User size={10}/> {p.conductor_nombre}</p>
                              <p className="flex items-center justify-between font-bold text-slate-800">
                                <span className="flex items-center gap-1.5"><Truck size={10}/> {p.vehiculo_placa}</span>
                                <span className="text-[9px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">Viaje #{p.numero_viaje || 1}</span>
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="p-3 md:p-4 align-middle text-center">
                          {estaBloqueado ? (
                            <button disabled className="px-2 py-1.5 md:px-3 md:py-2 rounded-lg font-bold text-[10px] md:text-xs bg-slate-100 text-slate-400 cursor-not-allowed w-full flex justify-center items-center gap-1.5 border border-slate-200">
                              <CheckCircle size={12}/> Cerrado
                            </button>
                          ) : p.conductor_id ? (
                            <button onClick={() => handleAbrirAsignacionIndividual(p)} className="px-2 py-1.5 md:px-3 md:py-2 rounded-lg font-bold text-[10px] md:text-xs bg-slate-50 text-slate-600 border border-slate-300 hover:bg-slate-200 shadow-sm w-full flex justify-center items-center gap-1.5">
                              <Edit size={12} /> Editar
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic">Seleccione para agrupar</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= BARRA FLOTANTE DE ASIGNACIÓN POR LOTE ================= */}
        {pedidosSeleccionados.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl z-40 flex items-center gap-6 animate-fadeIn">
            <div className="text-white hidden sm:block">
              <p className="font-bold text-lg leading-tight">{pedidosSeleccionados.length} Pedidos</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Seleccionados</p>
            </div>
            <div className="h-10 w-px bg-slate-700 hidden sm:block"></div>
            <div className="text-white">
              <p className="font-extrabold text-[#47B3A8] text-xl leading-tight">{pesoLoteTotal.toLocaleString()} Kg</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Carga Total</p>
            </div>
            <button onClick={handleAbrirModalLote} className="bg-[#47B3A8] hover:bg-[#3A948C] text-white px-6 py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 ml-4">
              Armar Ruta <Truck size={18} />
            </button>
          </div>
        )}

        {/* ================= MODAL LOTE CON DESGLOSE POR FACTURA ================= */}
        {showModalLote && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
              
              <div className="bg-[#172033] p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-[#47B3A8] p-2 rounded-lg"><Truck size={20} className="text-white"/></div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">Asignar Ruta</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Lote de: {pedidosSeleccionados.length} pedidos</p>
                  </div>
                </div>
                <button onClick={() => setShowModalLote(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleAsignarLote} className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                  <p className="text-sm font-medium text-slate-600 mb-2">Destino:</p>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={18} className="text-orange-500" />
                    <span className="text-lg font-bold text-slate-800">
                      {destinosUnicosLote.length === 1 ? destinosUnicosLote[0] : 'Múltiples Destinos'}
                    </span>
                    <span className="text-sm text-slate-400">
                      ({zonasUnicasLote.length === 1 ? zonasUnicasLote[0] : 'Varias'})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-slate-600">Peso: <span className="font-bold text-slate-800">{pesoLoteTotal.toLocaleString()} Kg</span></p>
                    <div className="bg-[#D1FAE5] text-[#065F46] px-3 py-1.5 rounded-md font-bold text-sm">
                      V. Factura: ${valorLoteTotal.toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><User size={14} /> SELECCIONAR CONDUCTOR</label>
                    <select value={asignacionLote.conductor_id} onChange={(e) => setAsignacionLote({...asignacionLote, conductor_id: e.target.value})} className="w-full border border-slate-300 p-3 rounded-lg focus:border-[#47B3A8] outline-none text-slate-700 bg-white" required>
                      <option value="">-- Elige un conductor --</option>
                      {conductores.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><Truck size={14} /> VEHÍCULO (PLACA)</label>
                    <select value={asignacionLote.vehiculo_id} onChange={(e) => setAsignacionLote({...asignacionLote, vehiculo_id: e.target.value})} className={`w-full border p-3 rounded-lg outline-none transition-colors ${excedeCapacidadLote ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300 bg-white text-slate-700 focus:border-[#47B3A8]'}`} required>
                      <option value="">-- Elige un vehículo --</option>
                      {vehiculos.map(v => (
                        <option key={v.id} value={v.id} disabled={Number(v.estado) === 0}>
                          {v.placa} ({v.capacidad_kg} Kg) {Number(v.estado) === 0 ? '🚫 TALLER' : ''}
                        </option>
                      ))}
                    </select>
                    {excedeCapacidadLote && (
                      <p className="mt-2 text-[10px] text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={12}/> Supera la capacidad del camión.</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-3"><FileText size={14} /> VALOR A DESPACHAR POR FACTURA</label>
                  <div className="space-y-3">
                    {pedidosSeleccionadosObj.map(p => {
                      const det = detallesLote[p.id] || { valor_despachar: 0, observacion: '' };
                      const esParcial = Number(det.valor_despachar) < Number(p.valor_factura);
                      
                      return (
                        <div key={p.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl animate-fadeIn">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-blue-600 text-sm">{p.id_factura}</span>
                            <span className="text-[10px] font-bold text-slate-500">Max: ${Number(p.valor_factura).toLocaleString()}</span>
                          </div>
                          
                          <div className="relative mb-2">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-bold pointer-events-none">$</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              max={p.valor_factura}
                              value={det.valor_despachar} 
                              onChange={(e) => setDetallesLote({...detallesLote, [p.id]: {...det, valor_despachar: e.target.value}})}
                              className="w-full pl-8 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 font-bold outline-none focus:border-[#47B3A8] text-sm" 
                              required
                            />
                          </div>

                          {esParcial && (
                            <div className="mt-2 animate-fadeIn">
                              <textarea 
                                value={det.observacion}
                                onChange={(e) => setDetallesLote({...detallesLote, [p.id]: {...det, observacion: e.target.value}})}
                                placeholder={`Falta mercancía de la factura ${p.id_factura}...`}
                                className="w-full border border-red-300 bg-red-50 p-2 rounded-lg text-xs outline-none focus:border-red-500 text-slate-800 resize-none"
                                rows="2"
                                required={esParcial}
                              />
                            </div>
                          )}

                          {det.productos && det.productos.length > 0 && (
                            <div className="mt-2 text-[10px] sm:text-xs">
                              <button type="button" onClick={() => toggleExpandirLote(p.id)} className="w-full text-left bg-slate-200 hover:bg-slate-300 transition-colors p-2 rounded flex justify-between items-center font-bold text-slate-700">
                                Detalle de Productos ({det.productos.length})
                                <span>{det.expandido ? '▲' : '▼'}</span>
                              </button>
                              {det.expandido && (
                                <div className="mt-1 border border-slate-200 rounded overflow-x-auto">
                                  <table className="w-full text-left bg-white text-[10px]">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 whitespace-nowrap">
                                      <tr>
                                        <th className="p-2 font-bold">Código</th>
                                        <th className="p-2 font-bold">Descripción</th>
                                        <th className="p-2 font-bold text-center text-slate-400">Orig.</th>
                                        <th className="p-2 font-bold text-center text-orange-600">Retirado</th>
                                        <th className="p-2 font-bold text-center text-blue-600">A Enviar</th>
                                        <th className="p-2 font-bold text-center">Und</th>
                                        <th className="p-2 font-bold text-right">Vr. Unit</th>
                                        <th className="p-2 font-bold text-right">Vr. Total</th>
                                        <th className="p-2 font-bold text-center">Bodega</th>
                                        <th className="p-2 font-bold text-right">Peso</th>
                                        <th className="p-2 font-bold text-center w-20">Despacho</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {det.productos.map(prod => (
                                        <tr key={prod.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                          <td className="p-2 whitespace-nowrap">{prod.codigo_producto}</td>
                                          <td className="p-2 min-w-[150px]">{prod.descripcion || prod.nombre_producto}</td>
                                          <td className="p-2 text-center text-slate-400">{prod.cantidad_original || prod.cantidad}</td>
                                          <td className="p-2 text-center text-orange-600 font-bold">{prod.cantidad_retirada_cliente || 0}</td>
                                          <td className="p-2 text-center text-blue-600 font-bold">{prod.cantidad}</td>
                                          <td className="p-2 text-center text-slate-500">{prod.unidad_medida}</td>
                                          <td className="p-2 text-right">${Number(prod.precio_unitario || 0).toLocaleString()}</td>
                                          <td className="p-2 text-right font-medium">${Number(prod.precio_total || 0).toLocaleString()}</td>
                                          <td className="p-2 text-center whitespace-nowrap">
                                            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                              {prod.bodega_nombre || (prod.bodega_id ? `B${prod.bodega_id}` : 'N/A')}
                                            </span>
                                          </td>
                                          <td className="p-2 text-right font-medium text-blue-600">{Number(prod.peso || 0).toLocaleString()}</td>
                                          <td className="p-2">
                                            <input 
                                              type="number" 
                                              step="0.01"
                                              min="0" 
                                              max={prod.cantidad} 
                                              value={prod.cantidad_despachada !== undefined ? prod.cantidad_despachada : prod.cantidad} 
                                              onChange={(e) => handleProductoLoteChange(p.id, prod.id, e.target.value)} 
                                              className="w-full border border-slate-300 rounded p-1 text-center font-bold text-blue-600 outline-none focus:border-[#47B3A8]" 
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 flex justify-end items-center gap-4 mt-2 shrink-0">
                  <button type="button" onClick={() => setShowModalLote(false)} className="text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Cancelar</button>
                  <button type="submit" className="bg-[#47B3A8] hover:bg-[#3A948C] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95">Asignar <CheckCircle size={16} /></button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL DE EDICIÓN INDIVIDUAL ================= */}
        {showModalIndividual && pedidoIndividual && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
              
              <div className="bg-[#172033] p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-[#47B3A8] p-2 rounded-lg"><Edit size={20} className="text-white"/></div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">Editar Asignación</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Pedido: {pedidoIndividual.id_factura}</p>
                  </div>
                </div>
                <button onClick={() => setShowModalIndividual(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleAsignarIndividual} className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                  <p className="text-sm font-medium text-slate-600 mb-2">Destino:</p>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={18} className="text-orange-500" />
                    <span className="text-lg font-bold text-slate-800">{pedidoIndividual.destino}</span>
                    <span className="text-sm text-slate-400">({pedidoIndividual.zona_envio})</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-slate-600">Peso: <span className="font-bold text-slate-800">{obtenerPesoFormateado(pedidoIndividual)} Kg</span></p>
                    <div className="bg-[#D1FAE5] text-[#065F46] px-3 py-1.5 rounded-md font-bold text-sm">
                      V. Factura: ${Number(pedidoIndividual.valor_factura || 0).toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><User size={14} /> SELECCIONAR CONDUCTOR</label>
                    <select value={asignacionIndividual.conductor_id} onChange={(e) => setAsignacionIndividual({...asignacionIndividual, conductor_id: e.target.value})} className="w-full border border-slate-300 p-3 rounded-lg focus:border-[#47B3A8] outline-none text-slate-700 bg-white" required>
                      <option value="">-- Elige un conductor --</option>
                      {conductores.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><Truck size={14} /> VEHÍCULO (PLACA)</label>
                    <select value={asignacionIndividual.vehiculo_id} onChange={(e) => setAsignacionIndividual({...asignacionIndividual, vehiculo_id: e.target.value})} className="w-full border border-slate-300 p-3 rounded-lg focus:border-[#47B3A8] outline-none text-slate-700 bg-white" required>
                      <option value="">-- Elige un vehículo --</option>
                      {vehiculos.map(v => (
                        <option key={v.id} value={v.id} disabled={Number(v.estado) === 0}>
                          {v.placa} ({v.capacidad_kg} Kg) {Number(v.estado) === 0 ? ' 🚫' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">VALOR A DESPACHAR</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-bold pointer-events-none">$</span>
                      <input type="number" step="0.01" min="0" max={pedidoIndividual.valor_factura || ''} value={asignacionIndividual.total_despachado} onChange={(e) => setAsignacionIndividual({...asignacionIndividual, total_despachado: e.target.value})} disabled={pedidoIndividual.estado_entrega === 'Asignado'} className="w-full pl-8 py-3 border border-slate-300 rounded-lg focus:border-[#47B3A8] outline-none text-slate-700 font-bold bg-white disabled:bg-slate-100 disabled:text-slate-500" required />
                    </div>
                  </div>

                  {Number(asignacionIndividual.total_despachado) < Number(pedidoIndividual.valor_factura) && (
                    <div className="animate-fadeIn">
                      <textarea 
                        value={asignacionIndividual.observaciones_entrega} 
                        onChange={(e) => setAsignacionIndividual({...asignacionIndividual, observaciones_entrega: e.target.value})} 
                        className="w-full border border-red-300 bg-red-50 p-3 rounded-lg focus:border-red-500 outline-none text-sm text-slate-800 resize-none" 
                        placeholder="Justifica el envío parcial..." 
                        rows="2" 
                        required 
                      />
                    </div>
                  )}

                  {asignacionIndividual.productos_despachados && asignacionIndividual.productos_despachados.length > 0 && (
                    <div className="mt-4 text-[10px] sm:text-xs animate-fadeIn">
                      <button 
                        type="button" 
                        onClick={() => setAsignacionIndividual({...asignacionIndividual, expandido: !asignacionIndividual.expandido})} 
                        className="w-full text-left bg-slate-200 hover:bg-slate-300 transition-colors p-2 rounded flex justify-between items-center font-bold text-slate-700 mb-1"
                      >
                        Detalle de Productos ({asignacionIndividual.productos_despachados.length})
                        <span>{asignacionIndividual.expandido ? '▲' : '▼'}</span>
                      </button>
                      
                      {asignacionIndividual.expandido && (
                        <div className="border border-slate-200 rounded overflow-x-auto">
                          <table className="w-full text-left bg-white text-[10px]">
                            <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 whitespace-nowrap">
                              <tr>
                                <th className="p-2 font-bold">Código</th>
                                <th className="p-2 font-bold">Descripción</th>
                                <th className="p-2 font-bold text-center text-slate-400">Orig.</th>
                                <th className="p-2 font-bold text-center text-orange-600">Retirado</th>
                                <th className="p-2 font-bold text-center text-blue-600">A Enviar</th>
                                <th className="p-2 font-bold text-center">Und</th>
                                <th className="p-2 font-bold text-right">Vr. Unit</th>
                                <th className="p-2 font-bold text-right">Vr. Total</th>
                                <th className="p-2 font-bold text-center">Bodega</th>
                                <th className="p-2 font-bold text-right">Peso</th>
                                <th className="p-2 font-bold text-center w-20">Despacho</th>
                              </tr>
                            </thead>
                            <tbody>
                              {asignacionIndividual.productos_despachados.map(prod => (
                                <tr key={prod.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                  <td className="p-2 whitespace-nowrap">{prod.codigo_producto}</td>
                                  <td className="p-2 min-w-[150px]">{prod.descripcion || prod.nombre_producto}</td>
                                  <td className="p-2 text-center text-slate-400">{prod.cantidad_original || prod.cantidad}</td>
                                  <td className="p-2 text-center text-orange-600 font-bold">{prod.cantidad_retirada_cliente || 0}</td>
                                  <td className="p-2 text-center text-blue-600 font-bold">{prod.cantidad}</td>
                                  <td className="p-2 text-center text-slate-500">{prod.unidad_medida}</td>
                                  <td className="p-2 text-right">${Number(prod.precio_unitario || 0).toLocaleString()}</td>
                                  <td className="p-2 text-right font-medium">${Number(prod.precio_total || 0).toLocaleString()}</td>
                                  <td className="p-2 text-center whitespace-nowrap">
                                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                      {prod.bodega_nombre || (prod.bodega_id ? `B${prod.bodega_id}` : 'N/A')}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right font-medium text-blue-600">{Number(prod.peso_kg || prod.peso || 0).toLocaleString()}</td>
                                  <td className="p-2">
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      min="0" 
                                      max={prod.cantidad} 
                                      value={prod.cantidad_despachada !== undefined ? prod.cantidad_despachada : prod.cantidad} 
                                      onChange={(e) => handleProductoIndividualChange(prod.id, e.target.value)} 
                                      disabled={pedidoIndividual.estado_entrega === 'Asignado'}
                                      className="w-full border border-slate-300 rounded p-1 text-center font-bold text-blue-600 outline-none focus:border-[#47B3A8] disabled:bg-slate-100 disabled:text-slate-400" 
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4 flex justify-between items-center gap-4 mt-2">
                  <button type="button" onClick={() => handleQuitarAsignacion(pedidoIndividual.id)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1.5"><Trash2 size={16} /> Quitar</button>
                  <div className="flex gap-4 items-center">
                    <button type="button" onClick={() => setShowModalIndividual(false)} className="text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Cancelar</button>
                    <button type="submit" className="bg-[#47B3A8] hover:bg-[#3A948C] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95">Actualizar <CheckCircle size={16} /></button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* PLANILLA DE IMPRESIÓN */}
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
                <tr key={p.id}>
                  <td className="border border-black p-1 text-center font-bold leading-tight">
                    {p.id_factura}
                    {p.tipo_documento && <span className="block text-[8px] font-normal text-gray-600 mt-0.5">{p.tipo_documento}</span>}
                  </td>
                  <td className="border border-black p-1 leading-tight">
                    <span className="font-bold">{p.nombre_cliente}</span>
                    {p.telefono && <span className="block text-[8px] text-gray-600 mt-0.5">Tel: {p.telefono}</span>}
                    {p.nota_manual && <span className="block text-[8px] text-gray-600 mt-0.5 italic max-w-[180px]">Nota: {p.nota_manual}</span>}
                  </td>
                  <td className="border border-black p-1">{p.destino}</td>
                  <td className="border border-black p-1 text-center">{obtenerPesoFormateado(p)} Kg</td>
                  <td className="border border-black p-1 text-center">${Number(p.total_despachado || 0).toLocaleString('es-CO')}</td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* CONSOLIDADOS POR BODEGA (CADA UNA EN NUEVA PÁGINA) */}
          {bodegasConsolidadasArr.map((bodegaGrp, bIdx) => (
            <div key={bIdx} style={{ pageBreakBefore: 'always' }} className="pt-4">
              <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight uppercase">Consolidado de Cargue</h1>
                  <p className="text-xs font-bold mt-1 text-gray-600">Conductor: {conductorSeleccionadoInfo?.nombre || 'Múltiples'}</p>
                </div>
                <div className="text-right text-xs">
                  <p><strong>Fecha:</strong> {fechaFiltro}</p>
                  <p><strong>Generado:</strong> {new Date().toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="mb-8">
                <div style={{ pageBreakInside: 'avoid' }}>
                  <h2 className="text-md font-bold uppercase mb-2 bg-gray-200 p-2 border border-black inline-block">
                    Bodega: {bodegaGrp.bodega}
                  </h2>
                  <table className="w-full text-left text-[10px] border-collapse border border-black">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-black p-1 text-center w-24">CÓDIGO</th>
                      <th className="border border-black p-1">DESCRIPCIÓN DEL PRODUCTO</th>
                      <th className="border border-black p-1 text-center w-24">CANT. TOTAL</th>
                      <th className="border border-black p-1 text-center w-20">MEDIDA</th>
                      <th className="border border-black p-1 text-center w-20">CHECK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodegaGrp.productos.map((prod, idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-1 text-center font-bold text-gray-700">{prod.codigo}</td>
                        <td className="border border-black p-1 font-semibold">{prod.descripcion}</td>
                        <td className="border border-black p-1 text-center font-extrabold text-[12px]">{prod.cantidad}</td>
                        <td className="border border-black p-1 text-center text-gray-600">{prod.unidad_medida}</td>
                        <td className="border border-black p-1"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                
                {/* DESGLOSE DETALLADO POR FACTURA */}
                {bodegaGrp.facturas && bodegaGrp.facturas.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-[11px] font-bold uppercase border-b-2 border-black mb-3 pb-1">Lista de Empaque (Detalle por Factura)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {bodegaGrp.facturas.map((fac, fIdx) => (
                        <div key={fIdx} className="border border-black p-0 bg-white break-inside-avoid">
                          <div className="flex justify-between items-center bg-gray-200 border-b border-black p-1.5">
                            <span className="font-extrabold text-[11px] text-blue-800">DOC: {fac.factura}</span>
                            <span className="font-bold text-[10px] truncate ml-2 text-right">{fac.cliente}</span>
                          </div>
                          <table className="w-full text-left text-[9px] border-collapse">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="border-b border-r border-black p-1 w-16">CÓDIGO</th>
                                <th className="border-b border-r border-black p-1">DESCRIPCIÓN</th>
                                <th className="border-b border-r border-black p-1 text-center w-10">CANT</th>
                                <th className="border-b border-r border-black p-1 text-center w-10">UND</th>
                                <th className="border-b border-black p-1 text-right w-14">PESO</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fac.items.map((item, iIdx) => (
                                <tr key={iIdx} className="border-b border-dashed border-gray-300 last:border-0">
                                  <td className="border-r border-gray-300 p-1 font-bold text-gray-700">{item.codigo}</td>
                                  <td className="border-r border-gray-300 p-1 font-semibold">{item.descripcion}</td>
                                  <td className="border-r border-gray-300 p-1 text-center font-bold text-[10px]">{item.cantidad}</td>
                                  <td className="border-r border-gray-300 p-1 text-center text-gray-500">{item.unidad_medida}</td>
                                  <td className="p-1 text-right font-bold text-blue-600">{Number(item.peso).toLocaleString('es-CO')} Kg</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* ZONA DE NOTAS MANUALES PARA NOVEDADES */}
                <div className="mt-6 border border-black p-2 min-h-[100px] break-inside-avoid">
                  <p className="text-[10px] font-bold uppercase mb-1">Notas / Novedades (Uso exclusivo de bodega):</p>
                  <div className="w-full h-[1px] border-b border-dashed border-gray-400 mt-6"></div>
                  <div className="w-full h-[1px] border-b border-dashed border-gray-400 mt-6"></div>
                  <div className="w-full h-[1px] border-b border-dashed border-gray-400 mt-6"></div>
                </div>
              </div>
            </div>
          ))}

          {bodegasConsolidadasArr.length === 0 && (
            <div style={{ pageBreakBefore: 'always' }} className="pt-4">
              <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight uppercase">Consolidado de Cargue</h1>
                  <p className="text-xs font-bold mt-1 text-gray-600">Conductor: {conductorSeleccionadoInfo?.nombre || 'Múltiples'}</p>
                </div>
                <div className="text-right text-xs">
                  <p><strong>Fecha:</strong> {fechaFiltro}</p>
                  <p><strong>Generado:</strong> {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              <p className="text-center text-gray-500 italic mt-4">No hay detalles de productos para consolidar en este viaje.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AsignacionLogistica;