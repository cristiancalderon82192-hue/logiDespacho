const pool = require('../db');

// 1. Obtener la lista general de facturas pendientes (Para la tabla inicial)
const getPendientesLista = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, p.usuario_id as creado_por_id, u.nombre_completo as nombre_creador, c.nombre as nombre_cliente, c.telefono, b.nombre as nombre_punto_venta,
             COALESCE(SUM(pd.cantidad_pendiente - COALESCE(pd.cantidad_entregada, 0)), 0) as total_items
      FROM bodega_pendientes p
      INNER JOIN clientes c ON p.cliente_id = c.id
      INNER JOIN bodegas b ON p.punto_venta_id = b.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN bodega_pendientes_detalle pd ON p.id = pd.pendiente_id
      WHERE p.estado IN ('Pendiente', 'Parcial')
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al traer materiales pendientes:", error);
    res.status(500).json({ message: "Error al traer materiales en espera" });
  }
};

// 2. Crear un nuevo registro pendiente con sus productos
const crearPendiente = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { fecha_factura, factura_num, punto_venta_id, cliente_id, fecha_promesa, tipo_entrega, valor_factura, productos, usuario_id } = req.body;

    // 🚩 NUEVA VALIDACIÓN: Evitar que se duplique el número de factura 🚩
    const [facturaExiste] = await connection.query("SELECT id FROM bodega_pendientes WHERE factura_num = ?", [factura_num]);
    if (facturaExiste.length > 0) {
      return res.status(400).json({ error: `La factura '${factura_num}' ya se encuentra registrada en el sistema.` });
    }

    await connection.beginTransaction();

    const [master] = await connection.query(
      `INSERT INTO bodega_pendientes (fecha_factura, factura_num, punto_venta_id, cliente_id, fecha_promesa, tipo_entrega, valor_factura, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    , [fecha_factura, factura_num, punto_venta_id, cliente_id, fecha_promesa, tipo_entrega, valor_factura || 0, usuario_id]);

    for (let prod of productos) {
      await connection.query(
        `INSERT INTO bodega_pendientes_detalle (pendiente_id, codigo_producto, nombre_producto, cantidad_pendiente, unidad_medida, bodega_id, precio_unitario, valor_total, peso_kg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [master.insertId, prod.codigo, prod.nombre, prod.cantidad, prod.unidad, prod.bodega_id, prod.precio_unitario || 0, prod.valor_total || prod.precio_total || 0, prod.peso_kg || prod.peso || 0]);
    }

    await connection.commit();
    // Avisar en tiempo real
    const io = req.app.get('socketio');
    if (io) io.emit('actualizacion_bodega');

    res.status(201).json({ message: "Registro exitoso" });
  } catch (error) {
    await connection.rollback();
    console.error("Error creando pendiente:", error);
    res.status(500).json({ message: "Error al guardar el pendiente" });
  } finally {
    connection.release();
  }
};

// 3. Traer el detalle EXACTO de una factura para el Modal
const getPendientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [master] = await pool.query(`SELECT valor_factura FROM bodega_pendientes WHERE id = ?`, [id]);

    const [productos] = await pool.query(`
      SELECT 
        d.id,
        d.codigo_producto AS codigo, 
        d.nombre_producto AS nombre, 
        d.cantidad_pendiente AS cantidad, 
        d.unidad_medida AS unidad,
        d.precio_unitario,
        d.valor_total,
        d.peso_kg,
        COALESCE(d.cantidad_entregada, 0) as cantidad_entregada,
        (d.cantidad_pendiente - COALESCE(d.cantidad_entregada, 0)) AS cant_a_entregar,
        COALESCE(b1.nombre, b2.nombre) AS bodega_nombre,
        COALESCE(d.bodega_id, p.punto_venta_id) AS bodega_id
      FROM bodega_pendientes_detalle d
      JOIN bodega_pendientes p ON d.pendiente_id = p.id
      LEFT JOIN bodegas b1 ON d.bodega_id = b1.id
      LEFT JOIN bodegas b2 ON p.punto_venta_id = b2.id
      WHERE d.pendiente_id = ? AND d.cantidad_pendiente > COALESCE(d.cantidad_entregada, 0)
    `, [id]);

    // Lo devolvemos dentro de un objeto con la llave "productos" y "valor_factura"
    res.json({ productos, valor_factura: master[0]?.valor_factura || 0 });

  } catch (error) {
    console.error("Error al obtener detalle del pendiente:", error);
    res.status(500).json({ error: "Error al cargar los productos de la factura" });
  }
};

// 4. Confirmar la entrega física (Botón del modal con foto/firma)
const entregarPendiente = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { firma_cliente, firma_bodeguero = '', usuario_id, productos_entregados } = req.body;
    
    await connection.beginTransaction();

    const [facturaData] = await connection.query(`SELECT * FROM bodega_pendientes WHERE id = ?`, [id]);
    if (facturaData.length === 0) throw new Error("Factura no encontrada en base de datos");
    const masterData = facturaData[0];
    const factura_num = masterData.factura_num;

    // 1. Determinar qué productos y cantidades exactas se van a despachar
    let itemsADespachar = [];
    
    if (productos_entregados && Array.isArray(productos_entregados)) {
      itemsADespachar = productos_entregados
        .filter(p => parseFloat(p.cantidad_a_entregar_ahora) > 0)
        .map(p => ({
          id: p.id,
          codigo_producto: p.codigo || p.codigo_producto,
          nombre_producto: p.nombre || p.nombre_producto,
          cant_a_entregar: parseFloat(p.cantidad_a_entregar_ahora),
          unidad_medida: p.unidad || p.unidad_medida
        }));
    } else {
      const [productosPendientes] = await connection.query(`
        SELECT id, codigo_producto, nombre_producto, (cantidad_pendiente - COALESCE(cantidad_entregada, 0)) AS cant_a_entregar, unidad_medida 
        FROM bodega_pendientes_detalle WHERE pendiente_id = ? AND cantidad_pendiente > COALESCE(cantidad_entregada, 0)
      `, [id]);
      itemsADespachar = productosPendientes;
    }

    if (itemsADespachar.length === 0) throw new Error("No hay cantidades válidas para despachar.");

    // Guardamos el soporte digital del historial (PDF/Firmas)
    await connection.query(
      `INSERT INTO bodega_entregas_historial (pendiente_id, factura_num, productos_entregados, firma_cliente, firma_bodeguero, usuario_id) VALUES (?, ?, ?, ?, ?, ?)`
    , [id, factura_num, JSON.stringify(itemsADespachar), firma_cliente, firma_bodeguero, usuario_id]);

    // 2. Traemos TODO el detalle actual para calcular saldos y clonar
    const [todosDetalles] = await connection.query(`SELECT * FROM bodega_pendientes_detalle WHERE pendiente_id = ?`, [id]);
    
    let haySaldos = false;
    let itemsSaldo = [];
    let poolDespacho = [...itemsADespachar];

    for (let det of todosDetalles) {
      let index = poolDespacho.findIndex(i => i.id && String(i.id) === String(det.id));
      if (index === -1) {
        index = poolDespacho.findIndex(i => i.codigo_producto === det.codigo_producto);
      }

      let cantDespachada = 0;
      if (index !== -1) {
        cantDespachada = poolDespacho[index].cant_a_entregar;
        poolDespacho.splice(index, 1); // Remover para no duplicar asignaciones
      }
      
      const cantPendienteAnterior = parseFloat(det.cantidad_pendiente);
      const cantEntregadaAnterior = parseFloat(det.cantidad_entregada || 0);
      
      const saldoRestante = parseFloat((cantPendienteAnterior - cantEntregadaAnterior - cantDespachada).toFixed(2));
      const nuevoTotalEntregado = parseFloat((cantEntregadaAnterior + cantDespachada).toFixed(2));
      
      // Actualizamos el registro actual: lo cerramos igualando la cantidad pendiente con la entregada
      await connection.query(`UPDATE bodega_pendientes_detalle SET cantidad_pendiente = ?, cantidad_entregada = ? WHERE id = ?`, [nuevoTotalEntregado, nuevoTotalEntregado, det.id]);

      if (saldoRestante > 0) {
          haySaldos = true;
          itemsSaldo.push({
              codigo_producto: det.codigo_producto,
              nombre_producto: det.nombre_producto,
              cantidad_pendiente: saldoRestante,
              unidad_medida: det.unidad_medida,
              bodega_id: det.bodega_id
          });
      }
    }

    // Marcamos SIEMPRE el registro actual como Entregado, ya que lo que sobra pasará a una nueva factura
    await connection.query(`UPDATE bodega_pendientes SET estado = 'Entregado' WHERE id = ?`, [id]);

    // 3. Crear la factura hija (Clon) con el sufijo ascendente si quedaron saldos
    if (haySaldos) {
        let baseFactura = factura_num;
        if (/(.*)-S\d+$/.test(factura_num)) {
            baseFactura = factura_num.match(/(.*)-S\d+$/)[1];
        }
        
        const [clones] = await connection.query(`SELECT COUNT(*) as total FROM bodega_pendientes WHERE factura_num LIKE ?`, [`${baseFactura}-S%`]);
        const consecutivo = clones[0].total + 1;
        const nuevoFacturaNum = `${baseFactura}-S${consecutivo}`;

        const [nuevoPend] = await connection.query(
            `INSERT INTO bodega_pendientes (fecha_factura, factura_num, punto_venta_id, cliente_id, fecha_promesa, tipo_entrega, estado, created_at, usuario_id) 
             VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', NOW(), ?)`,
            [masterData.fecha_factura, nuevoFacturaNum, masterData.punto_venta_id, masterData.cliente_id, masterData.fecha_promesa, masterData.tipo_entrega, masterData.usuario_id]
        );
        
        const nuevoId = nuevoPend.insertId;

        for(let saldo of itemsSaldo) {
            await connection.query(
                `INSERT INTO bodega_pendientes_detalle (pendiente_id, codigo_producto, nombre_producto, cantidad_pendiente, unidad_medida, bodega_id, cantidad_entregada)
                 VALUES (?, ?, ?, ?, ?, ?, 0)`,
                [nuevoId, saldo.codigo_producto, saldo.nombre_producto, saldo.cantidad_pendiente, saldo.unidad_medida, saldo.bodega_id]
            );
        }
    }

    await connection.commit();
    // Avisar en tiempo real
    const io = req.app.get('socketio');
    if (io) io.emit('actualizacion_bodega');

    res.json({ message: "Entrega confirmada. Los saldos fueron transferidos a un nuevo documento." });
  } catch (error) {
    await connection.rollback();
    console.error("Error confirmando entrega:", error);
    res.status(500).json({ error: "No se pudo procesar la entrega del material" });
  } finally {
    connection.release();
  }
};

// 5. Eliminar un documento pendiente por error (Botón de la papelera)
const eliminarPendiente = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM bodega_pendientes WHERE id = ?', [id]);
    // Avisar en tiempo real
    const io = req.app.get('socketio');
    if (io) io.emit('actualizacion_bodega');

    res.json({ message: "Pendiente eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando pendiente:", error);
    res.status(500).json({ error: "Error de base de datos al eliminar" });
  }
};

// Función puente por compatibilidad con tu archivo de rutas
const despacharMaterial = async (req, res) => {
  res.status(400).json({ message: "Por favor usa la ruta PUT /:id/entregar" });
};

// 👇 NUEVO ENDPOINT PARA ACTUALIZAR TIPO DE ENTREGA 👇
const actualizarTipoEntrega = async (req, res) => {
  const { id } = req.params;
  const { tipo_entrega } = req.body;
  
  if (!tipo_entrega) {
    return res.status(400).json({ error: "Falta el tipo_entrega" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE bodega_pendientes SET tipo_entrega = ? WHERE id = ?`,
      [tipo_entrega, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pendiente no encontrado" });
    }

    res.json({ message: "Tipo de entrega actualizado a " + tipo_entrega });
  } catch (error) {
    console.error("Error actualizando tipo_entrega:", error);
    res.status(500).json({ error: "Error de base de datos" });
  }
};

module.exports = { 
  getPendientesLista, 
  crearPendiente, 
  despacharMaterial,
  getPendientePorId,
  entregarPendiente,
  eliminarPendiente,
  actualizarTipoEntrega
};