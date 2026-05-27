const db = require('../db');

// 1. Obtener TODOS los pedidos agendados para una fecha específica
const getPedidosPorFecha = async (req, res) => {
  const { fecha } = req.query; 

  try {
    const sql = `
      SELECT p.*, 
             COALESCE(SUM(pd.peso), 0) AS total_peso,
             td.nombre as tipo_documento,
             c.nombre as nombre_cliente, c.telefono, 
             d.nombre as destino, z.nombre as zona_envio,
             u.nombre_completo as conductor_nombre,
             v.placa as vehiculo_placa,
             v.capacidad_kg as vehiculo_capacidad,
             b.nombre as bodega
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN usuarios u ON p.conductor_id = u.id
      LEFT JOIN vehiculos v ON p.vehiculo_id = v.id
      LEFT JOIN tipos_documento td ON p.tipo_documento_id = td.id
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      LEFT JOIN usuarios uc ON p.usuario_id = uc.id 
      LEFT JOIN bodegas b ON uc.bodega_id = b.id 
      WHERE p.fecha_agendada = ?
      GROUP BY p.id
      ORDER BY 
        CASE 
          WHEN p.estado_entrega = 'Pendiente' THEN 1
          WHEN p.estado_entrega = 'Asignado' THEN 2
          WHEN p.estado_entrega = 'En Ruta' THEN 3
          ELSE 4 
        END,
        p.id_factura ASC
    `;
    const [pedidos] = await db.query(sql, [fecha]);
    res.json(pedidos);
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ error: "Error al cargar pedidos" });
  }
};

// 2. Obtener lista de conductores disponibles
const getConductores = async (req, res) => {
  try {
    const sql = "SELECT id, nombre_completo as nombre, email FROM usuarios WHERE rol_id = 4";
    const [conductores] = await db.query(sql);
    res.json(conductores);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar conductores" });
  }
};

// 3. Obtener lista de vehículos
const getVehiculos = async (req, res) => {
  try {
    const sql = "SELECT * FROM vehiculos";
    const [vehiculos] = await db.query(sql);
    res.json(vehiculos);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar vehículos" });
  }
};

// 4. Asignar Vehículo (INDIVIDUAL - Edición)
const asignarRuta = async (req, res) => {
  const { id } = req.params; 
  const { conductor_id, vehiculo_id, total_despachado, observaciones_entrega } = req.body;

  if (!conductor_id || !vehiculo_id || total_despachado === undefined) {
    return res.status(400).json({ error: "Faltan datos de asignación o valor despachado" });
  }

  try {
    const [pedido] = await db.query('SELECT valor_factura, fecha_agendada FROM pedidos WHERE id = ?', [id]);
    if (pedido.length === 0) return res.status(404).json({ error: "Pedido no encontrado" });

    const valorFactura = parseFloat(pedido[0].valor_factura) || 0;
    const despachado = parseFloat(total_despachado) || 0;
    const valorFacturaPendiente = valorFactura - despachado;

    const [viajeRes] = await db.query(`
        SELECT MAX(numero_viaje) as max_viaje 
        FROM pedidos 
        WHERE vehiculo_id = ? AND DATE(fecha_agendada) = ?
    `, [vehiculo_id, pedido[0].fecha_agendada]);
    const nuevoNumeroViaje = (viajeRes[0].max_viaje || 0) + 1;

    const sql = `
      UPDATE pedidos 
      SET conductor_id = ?, 
          vehiculo_id = ?, 
          numero_viaje = ?,
          total_despachado = ?, 
          valor_factura_pendiente = ?,
          observaciones_entrega = ?,
          estado_entrega = 'Asignado' 
      WHERE id = ?
    `;
    await db.query(sql, [conductor_id, vehiculo_id, nuevoNumeroViaje, despachado, valorFacturaPendiente, observaciones_entrega || null, id]);
    
    res.json({ message: "Ruta y valores asignados exitosamente" });
  } catch (error) {
    console.error("Error al asignar ruta:", error);
    res.status(500).json({ error: "No se pudo asignar la ruta" });
  }
};

// 5. ASIGNACIÓN POR LOTE CON MANEJO DE PARCIALES DESDE LA BODEGA
const asignarLote = async (req, res) => {
  const { detalles_lote, conductor_id, vehiculo_id, fecha } = req.body;

  if (!detalles_lote || detalles_lote.length === 0 || !conductor_id || !vehiculo_id || !fecha) {
    return res.status(400).json({ error: "Faltan datos para crear la ruta por lote" });
  }

  try {
    const [viajeRes] = await db.query(`
        SELECT MAX(numero_viaje) as max_viaje 
        FROM pedidos 
        WHERE vehiculo_id = ? AND DATE(fecha_agendada) = ?
    `, [vehiculo_id, fecha]);

    const nuevoNumeroViaje = (viajeRes[0].max_viaje || 0) + 1;

    for (const detalle of detalles_lote) {
      const { id, total_despachado, observaciones_entrega } = detalle;

      const [pedido] = await db.query('SELECT valor_factura FROM pedidos WHERE id = ?', [id]);
      if (pedido.length > 0) {
        const valorFactura = parseFloat(pedido[0].valor_factura) || 0;
        const despachado = parseFloat(total_despachado) || 0;
        const valorFacturaPendiente = valorFactura - despachado;

        await db.query(`
          UPDATE pedidos 
          SET conductor_id = ?, 
              vehiculo_id = ?, 
              numero_viaje = ?, 
              estado_entrega = 'Asignado',
              total_despachado = ?,
              valor_factura_pendiente = ?,
              observaciones_entrega = ?
          WHERE id = ?
        `, [conductor_id, vehiculo_id, nuevoNumeroViaje, despachado, valorFacturaPendiente, observaciones_entrega || null, id]);
      }
    }

    res.json({ message: "Ruta de lote asignada exitosamente", numero_viaje: nuevoNumeroViaje });
  } catch (error) {
    console.error("Error al asignar lote:", error);
    res.status(500).json({ error: "No se pudo crear la ruta por lote" });
  }
};

// 6. Quitar la asignación
const quitarAsignacion = async (req, res) => {
  const { id } = req.params; 

  try {
    const sql = `
      UPDATE pedidos 
      SET conductor_id = NULL, 
          vehiculo_id = NULL, 
          numero_viaje = 1,
          total_despachado = 0,
          valor_factura_pendiente = 0,
          observaciones_entrega = NULL,
          estado_entrega = 'Pendiente' 
      WHERE id = ?
    `;
    await db.query(sql, [id]);
    res.json({ message: "Asignación removida exitosamente" });
  } catch (error) {
    res.status(500).json({ error: "No se pudo remover la asignación" });
  }
};

// 7. Obtener reporte de envíos parciales
const getPedidosParciales = async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    
    let dateFilter = "";
    const params = [];
    if (inicio && fin) {
      dateFilter = "AND DATE(p.fecha_agendada) BETWEEN ? AND ?";
      params.push(inicio, fin);
    }

    const sql = `
      SELECT p.*, 
             td.nombre as tipo_documento,
             c.nombre as nombre_cliente, c.telefono, 
             d.nombre as destino, z.nombre as zona_envio,
             b.nombre as bodega
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN tipos_documento td ON p.tipo_documento_id = td.id
      LEFT JOIN usuarios uc ON p.usuario_id = uc.id
      LEFT JOIN bodegas b ON uc.bodega_id = b.id
      WHERE p.valor_factura_pendiente > 0
      ${dateFilter}
      ORDER BY p.fecha_agendada DESC, p.id_factura ASC
    `;
    const [pedidos] = await db.query(sql, params);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar pedidos parciales" });
  }
};

// 8. Generar "Pedido Hijo" (Clon) para despachar un saldo pendiente (INDIVIDUAL)
const despacharSaldo = async (req, res) => {
  const { id } = req.params;
  const { conductor_id, vehiculo_id, valor_despachar, observaciones_entrega, fecha_agendada, detalles, nota_despacho } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Pedido original no encontrado" });
    const original = rows[0];

    const montoADespachar = parseFloat(valor_despachar) || 0;
    const pendienteActual = parseFloat(original.valor_factura_pendiente) || 0;
    
    if (montoADespachar <= 0) return res.status(400).json({ error: "El valor a despachar debe ser mayor a 0" });
    
    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: "Debe agregar al menos una bodega de salida y su peso" });
    }

    const nuevoPendiente = pendienteActual - montoADespachar;
    const sufijo = Math.floor(Math.random() * 90) + 10; 
    const nuevoIdFactura = `${original.id_factura}-S${sufijo}`;

    let notaFinalHijo = `(SALDO) ${original.nota_manual || ''}`.trim();
    if (nota_despacho) {
      if (original.nota_manual) {
        notaFinalHijo = `(SALDO) ENVÍA: ${nota_despacho} | Nota orig: ${original.nota_manual}`;
      } else {
        notaFinalHijo = `(SALDO) ENVÍA: ${nota_despacho}`;
      }
    }

    const [viajeRes] = await db.query(`
        SELECT MAX(numero_viaje) as max_viaje 
        FROM pedidos 
        WHERE vehiculo_id = ? AND DATE(fecha_agendada) = ?
    `, [vehiculo_id, fecha_agendada]);
    const nuevoNumeroViaje = (viajeRes[0].max_viaje || 0) + 1;

    const sqlInsert = `
      INSERT INTO pedidos (
        usuario_id, cliente_id, id_factura, tipo_documento_id, prioridad, 
        valor_factura, destino_id, conductor_id, vehiculo_id, numero_viaje, estado_entrega, 
        fecha_agendada, fecha_facturacion, fecha_promesa, hora_registro, 
        nota_manual, total_despachado, valor_factura_pendiente, observaciones_entrega
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [insertResult] = await db.query(sqlInsert, [
      original.usuario_id, original.cliente_id, nuevoIdFactura, original.tipo_documento_id, original.prioridad,
      montoADespachar, original.destino_id, conductor_id, vehiculo_id, nuevoNumeroViaje, 'Asignado',
      fecha_agendada, original.fecha_facturacion, original.fecha_promesa || null, original.hora_registro || null,
      notaFinalHijo, 
      montoADespachar, 0, null 
    ]);

    const nuevoPedidoId = insertResult.insertId;

    for (const det of detalles) {
      const pesoNum = parseFloat(det.peso) || 0;
      if (pesoNum > 0 && det.bodega_id) {
        await db.query('INSERT INTO pedidos_detalle (pedido_id, bodega_id, peso) VALUES (?, ?, ?)', [nuevoPedidoId, det.bodega_id, pesoNum]);
      }
    }

    const sqlUpdate = `
      UPDATE pedidos 
      SET valor_factura_pendiente = ?, 
          observaciones_entrega = ?
      WHERE id = ?
    `;
    
    let notaHistorica = original.observaciones_entrega || '';

    if (nuevoPendiente > 0 && observaciones_entrega) {
      notaHistorica = `${notaHistorica} | AÚN PENDIENTE: ${observaciones_entrega}`.trim();
    }

    await db.query(sqlUpdate, [nuevoPendiente, notaHistorica, id]);

    res.json({ message: "Saldo despachado y nueva ruta generada exitosamente" });
  } catch (error) {
    console.error("Error al despachar saldo:", error);
    res.status(500).json({ error: "Error al procesar el saldo" });
  }
};

// 9. ASIGNACIÓN EN LOTE PARA SALDOS (Para que queden en un solo viaje)
const despacharLoteSaldos = async (req, res) => {
  const { conductor_id, vehiculo_id, fecha_agendada, detalles_lote } = req.body;

  if (!detalles_lote || !Array.isArray(detalles_lote) || detalles_lote.length === 0) {
    return res.status(400).json({ error: "No hay facturas para procesar en el lote" });
  }

  try {
    // Calculamos el viaje UNA SOLA VEZ para todo el lote
    const [viajeRes] = await db.query(`
        SELECT MAX(numero_viaje) as max_viaje 
        FROM pedidos 
        WHERE vehiculo_id = ? AND DATE(fecha_agendada) = ?
    `, [vehiculo_id, fecha_agendada]);
    const nuevoNumeroViaje = (viajeRes[0].max_viaje || 0) + 1;

    // Iteramos sobre cada factura del lote
    for (const item of detalles_lote) {
      const { id, valor_despachar, observaciones_entrega, detalles, nota_despacho } = item;

      const [rows] = await db.query('SELECT * FROM pedidos WHERE id = ?', [id]);
      if (rows.length === 0) continue;
      const original = rows[0];

      const montoADespachar = parseFloat(valor_despachar) || 0;
      const pendienteActual = parseFloat(original.valor_factura_pendiente) || 0;

      if (montoADespachar <= 0) continue;

      const nuevoPendiente = pendienteActual - montoADespachar;
      const sufijo = Math.floor(Math.random() * 90) + 10; 
      const nuevoIdFactura = `${original.id_factura}-S${sufijo}`;

      let notaFinalHijo = `(SALDO) ${original.nota_manual || ''}`.trim();
      if (nota_despacho) {
        notaFinalHijo = original.nota_manual 
          ? `(SALDO) ENVÍA: ${nota_despacho} | Nota orig: ${original.nota_manual}`
          : `(SALDO) ENVÍA: ${nota_despacho}`;
      }

      const sqlInsert = `
        INSERT INTO pedidos (
          usuario_id, cliente_id, id_factura, tipo_documento_id, prioridad, 
          valor_factura, destino_id, conductor_id, vehiculo_id, numero_viaje, estado_entrega, 
          fecha_agendada, fecha_facturacion, fecha_promesa, hora_registro, 
          nota_manual, total_despachado, valor_factura_pendiente, observaciones_entrega
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [insertResult] = await db.query(sqlInsert, [
        original.usuario_id, original.cliente_id, nuevoIdFactura, original.tipo_documento_id, original.prioridad,
        montoADespachar, original.destino_id, conductor_id, vehiculo_id, nuevoNumeroViaje, 'Asignado',
        fecha_agendada, original.fecha_facturacion, original.fecha_promesa || null, original.hora_registro || null,
        notaFinalHijo, 
        montoADespachar, 0, null 
      ]);

      const nuevoPedidoId = insertResult.insertId;

      for (const det of detalles) {
        const pesoNum = parseFloat(det.peso) || 0;
        if (pesoNum > 0 && det.bodega_id) {
          await db.query('INSERT INTO pedidos_detalle (pedido_id, bodega_id, peso) VALUES (?, ?, ?)', [nuevoPedidoId, det.bodega_id, pesoNum]);
        }
      }

      const sqlUpdate = `
        UPDATE pedidos 
        SET valor_factura_pendiente = ?, 
            observaciones_entrega = ?
        WHERE id = ?
      `;
      
      let notaHistorica = original.observaciones_entrega || '';
      if (nuevoPendiente > 0 && observaciones_entrega) {
        notaHistorica = `${notaHistorica} | AÚN PENDIENTE: ${observaciones_entrega}`.trim();
      }

      await db.query(sqlUpdate, [nuevoPendiente, notaHistorica, id]);
    }

    res.json({ message: "Lote de saldos despachado y consolidado en un solo viaje exitosamente" });
  } catch (error) {
    console.error("Error al despachar lote de saldos:", error);
    res.status(500).json({ error: "Error al procesar el lote de saldos" });
  }
};

// 10. OBTENER BODEGAS
const getBodegas = async (req, res) => {
  try {
    const [bodegas] = await db.query("SELECT id, nombre FROM bodegas");
    res.json(bodegas);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar bodegas" });
  }
};

module.exports = { getPedidosPorFecha, getConductores, getVehiculos, asignarRuta, asignarLote, quitarAsignacion, getPedidosParciales, despacharSaldo, despacharLoteSaldos, getBodegas };