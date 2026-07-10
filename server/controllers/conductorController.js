const db = require('../db');
const whatsappService = require('../services/whatsappService');
const templateService = require('../services/templateService');

// 👇 FUNCIÓN PARA FORZAR LA HORA EXACTA DE COLOMBIA (UTC-5) 👇
const obtenerFechaColombia = () => {
  const date = new Date();
  // Restamos exactamente 5 horas al tiempo universal
  const colombiaTime = new Date(date.getTime() - (5 * 60 * 60 * 1000));
  // Lo formateamos a 'YYYY-MM-DD HH:mm:ss' para MySQL
  return colombiaTime.toISOString().slice(0, 19).replace('T', ' ');
};

// 1. OBTENER RUTAS DEL CONDUCTOR
const getMisRutas = async (req, res) => {
  const { conductor_id, fecha } = req.query;

  if (!conductor_id || !fecha) {
    return res.status(400).json({ error: "Faltan parámetros de búsqueda" });
  }

  try {
    const sql = `
      SELECT p.id, p.id_factura, p.prioridad, p.estado_entrega,
             p.nota_manual, p.observaciones_entrega, p.total_despachado,
             GREATEST(0, p.valor_factura - COALESCE((SELECT SUM(ppd2.cantidad_retirada_cliente * ppd2.precio_unitario) FROM pedidos_productos_detalle ppd2 WHERE ppd2.pedido_id = p.id), 0)) AS valor_factura,
             p.valor_recaudado,
             c.nombre as nombre_cliente, c.telefono, 
             d.nombre as destino, z.nombre as zona_envio,
             td.nombre as tipo_documento,
             v.placa as vehiculo_placa,
             COALESCE(SUM(
               CASE 
                 WHEN ppd.cantidad > 0 THEN ppd.peso - (ppd.cantidad_retirada_cliente * (ppd.peso / ppd.cantidad))
                 ELSE ppd.peso 
               END
             ), 0) AS total_peso
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN tipos_documento td ON p.tipo_documento_id = td.id
      LEFT JOIN vehiculos v ON p.vehiculo_id = v.id
      LEFT JOIN pedidos_productos_detalle ppd ON p.id = ppd.pedido_id
      
      WHERE p.conductor_id = ? AND DATE(p.fecha_agendada) = ?
      
      GROUP BY p.id
      ORDER BY 
        CASE WHEN p.estado_entrega = 'En Ruta' THEN 1
             WHEN p.estado_entrega = 'Asignado' THEN 2
             ELSE 3 END,
        p.id_factura ASC
    `;
    
    const [rutas] = await db.query(sql, [conductor_id, fecha]);
    
    // FETCH PRODUCTOS
    if (rutas.length > 0) {
      const pedidosIds = rutas.map(p => p.id);
      const [productos] = await db.query('SELECT * FROM pedidos_productos_detalle WHERE pedido_id IN (?)', [pedidosIds]);
      rutas.forEach(ruta => {
        ruta.productos = productos.filter(prod => prod.pedido_id === ruta.id);
      });
    }

    res.json(rutas);
    
  } catch (error) {
    console.error("Error al cargar rutas del conductor:", error);
    res.status(500).json({ error: "Error al cargar las rutas" });
  }
};

// 2. ACTUALIZAR ESTADO CON RECAUDO INTELIGENTE Y HORA LOCAL
const actualizarEstado = async (req, res) => {
  require('fs').appendFileSync('debug_wa.log', `Entro a actualizarEstado con id ${req.params.id}\n`);
  const { id } = req.params;
  const { estado, observacion_devolucion, valor_devolucion, firma_cliente, valor_recaudado, productos_novedad } = req.body;

  if (!estado) return res.status(400).json({ error: "El estado es requerido" });

  try {
    const [rows] = await db.query('SELECT id_factura, valor_factura, total_despachado, valor_factura_pendiente, observaciones_entrega FROM pedidos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Pedido no encontrado" });
    const pedido = rows[0];

    let sql = '';
    let params = [];
    const recaudoReal = parseFloat(valor_recaudado) || 0;
    
    // Obtenemos la hora colombiana justo en este instante
    const horaColombia = obtenerFechaColombia();

    // Consultamos el teléfono y nombre del cliente para el mensaje de WhatsApp
    const [clienteRows] = await db.query('SELECT c.telefono, c.nombre FROM clientes c JOIN pedidos p ON c.id = p.cliente_id WHERE p.id = ?', [id]);
    const cliente = clienteRows.length > 0 ? clienteRows[0] : null;

    if (estado === 'Entregado') {
      sql = 'UPDATE pedidos SET estado_entrega = ?, fecha_entrega_conductor = ?, firma_cliente = ?, valor_recaudado = ? WHERE id = ?';
      params = [estado, horaColombia, firma_cliente || null, recaudoReal, id];
    } 
    else if (estado === 'Devolución' || estado === 'Entregado Incompleto') {
      let valorDevolver = parseFloat(valor_devolucion) || 0;
      
      // Si el frontend envía productos_novedad, calculamos el valor y actualizamos BD
      if (productos_novedad && Array.isArray(productos_novedad)) {
        valorDevolver = 0;
        for (const prodNov of productos_novedad) {
          const faltante = Number(prodNov.faltante);
          if (faltante > 0) {
            // Obtenemos el precio unitario actual y la cantidad despachada
            const [pDet] = await db.query("SELECT precio_unitario, cantidad_despachada FROM pedidos_productos_detalle WHERE id = ?", [prodNov.id]);
            if (pDet.length > 0) {
               const precioU = Number(pDet[0].precio_unitario) || 0;
               valorDevolver += (faltante * precioU);
               
               // Restamos la cantidad faltante a la cantidad_despachada para que el sistema de saldos la detecte
               const despachadoPre = pDet[0].cantidad_despachada !== null ? Number(pDet[0].cantidad_despachada) : 0;
               const nuevoDespachado = despachadoPre - faltante;
               await db.query("UPDATE pedidos_productos_detalle SET cantidad_despachada = ? WHERE id = ?", [nuevoDespachado >= 0 ? nuevoDespachado : 0, prodNov.id]);
            }
          }
        }
      }
      const deudaActual = parseFloat(pedido.valor_factura_pendiente) || 0;
      
      let despachadoActual = parseFloat(pedido.total_despachado);
      if (isNaN(despachadoActual) || despachadoActual <= 0) despachadoActual = parseFloat(pedido.valor_factura || 0);
      
      const nuevaDeudaPendiente = deudaActual + valorDevolver;
      const nuevoTotalDespachado = despachadoActual - valorDevolver;
      
      const notaPrevia = pedido.observaciones_entrega ? ` | Previo: ${pedido.observaciones_entrega}` : '';
      const nuevaNota = `[RECAUDÓ $${recaudoReal.toLocaleString('es-CO')} - DEVUELVE $${valorDevolver.toLocaleString('es-CO')}: ${observacion_devolucion}]${notaPrevia}`;

      // 👇 AQUÍ AGREGAMOS firma_cliente AL UPDATE 👇
      sql = `
        UPDATE pedidos 
        SET estado_entrega = ?, 
            fecha_entrega_conductor = ?,
            valor_factura_pendiente = ?,
            total_despachado = ?,
            observaciones_entrega = ?,
            valor_recaudado = ?,
            firma_cliente = COALESCE(?, firma_cliente)
        WHERE id = ?
      `;
      // 👇 Y AQUÍ AGREGAMOS firma_cliente || null A LOS PARÁMETROS 👇
      params = [estado, horaColombia, nuevaDeudaPendiente, nuevoTotalDespachado, nuevaNota, recaudoReal, firma_cliente || null, id];
    } 
    else {
      sql = 'UPDATE pedidos SET estado_entrega = ? WHERE id = ?';
      params = [estado, id];
    }

    await db.query(sql, params);

    require('fs').appendFileSync('debug_wa.log', `Evaluando: estado=${estado}, cliente=${JSON.stringify(cliente)}\n`);

    // 👇 INTEGRACIÓN WHATSAPP 👇
    if ((estado === 'Entregado' || estado === 'Entregado Incompleto') && cliente && cliente.telefono) {
      // El host del frontend. Idealmente debería venir de una variable de entorno, 
      // pero usaremos el dominio actual o localhost por defecto
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const linkComprobante = `${frontendUrl}/comprobante/${pedido.id_factura}`;
      
      const rawTemplate = templateService.getTemplate();
      const mensaje = templateService.formatMessage(rawTemplate, {
        nombre: cliente.nombre,
        id_factura: pedido.id_factura,
        estado: estado,
        link: linkComprobante
      });
      
      require('fs').appendFileSync('debug_wa.log', `Intentando enviar a ${cliente.telefono}: ${mensaje}\n`);
      
      // Enviamos el mensaje sin bloquear la respuesta al conductor
      whatsappService.sendMessage(cliente.telefono, mensaje).then(res => {
         require('fs').appendFileSync('debug_wa.log', `Resultado sendMessage: ${res}\n`);
      }).catch(err => {
         require('fs').appendFileSync('debug_wa.log', `Error sendMessage: ${err}\n`);
      });
    }

    res.json({ message: "Guardado Correctamente con Hora Local y Firma" });
  } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(500).json({ error: "Error al cambiar el estado" });
  }
};
module.exports = { getMisRutas, actualizarEstado };