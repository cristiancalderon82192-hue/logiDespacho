const db = require('../db');

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
             c.nombre as nombre_cliente, c.telefono, 
             d.nombre as destino, z.nombre as zona_envio,
             td.nombre as tipo_documento,
             v.placa as vehiculo_placa, /* 👇 AQUÍ PEDIMOS LA PLACA 👇 */
             COALESCE(SUM(pd.peso), 0) AS total_peso
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN tipos_documento td ON p.tipo_documento_id = td.id
      LEFT JOIN vehiculos v ON p.vehiculo_id = v.id /* 👇 CRUZAMOS CON LA TABLA VEHÍCULOS 👇 */
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      
      WHERE p.conductor_id = ? AND DATE(p.fecha_agendada) = ?
      
      GROUP BY p.id
      ORDER BY 
        CASE WHEN p.estado_entrega = 'En Ruta' THEN 1
             WHEN p.estado_entrega = 'Asignado' THEN 2
             ELSE 3 END,
        CASE WHEN p.prioridad = 'Alta' THEN 1
             WHEN p.prioridad = 'Media' THEN 2
             ELSE 3 END, 
        p.id_factura ASC
    `;
    
    const [rutas] = await db.query(sql, [conductor_id, fecha]);
    res.json(rutas);
    
  } catch (error) {
    console.error("Error al cargar rutas del conductor:", error);
    res.status(500).json({ error: "Error al cargar las rutas" });
  }
};

// 2. ACTUALIZAR ESTADO DEL PEDIDO (En Ruta, Entregado, Devolución)
const actualizarEstado = async (req, res) => {
  const { id } = req.params;
  // 👇 Recibimos la nueva variable firma_cliente 👇
  const { estado, observacion_devolucion, valor_devolucion, firma_cliente } = req.body;

  if (!estado) return res.status(400).json({ error: "El estado es requerido" });

  try {
    const [rows] = await db.query('SELECT id_factura, total_despachado, valor_factura_pendiente, observaciones_entrega FROM pedidos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Pedido no encontrado" });
    const pedido = rows[0];

    let sql = '';
    let params = [];

    if (estado === 'Entregado') {
      const deudaActual = parseFloat(pedido.valor_factura_pendiente) || 0;
      const estadoReal = deudaActual > 0 ? 'Entregado Incompleto' : 'Entregado';

      // 👇 Guardamos la firma en la base de datos 👇
      sql = 'UPDATE pedidos SET estado_entrega = ?, fecha_entrega_conductor = NOW(), firma_cliente = ? WHERE id = ?';
      params = [estadoReal, firma_cliente || null, id];
    } 
    else if (estado === 'Devolución') {
      const valorDevolver = parseFloat(valor_devolucion) || parseFloat(pedido.total_despachado) || 0;
      const deudaActual = parseFloat(pedido.valor_factura_pendiente) || 0;
      const despachadoActual = parseFloat(pedido.total_despachado) || 0;
      
      const nuevaDeudaPendiente = deudaActual + valorDevolver;
      const nuevoTotalDespachado = despachadoActual - valorDevolver;
      
      const notaPrevia = pedido.observaciones_entrega ? ` | Previo: ${pedido.observaciones_entrega}` : '';
      const nuevaNota = `[DEVUELVE $${valorDevolver.toLocaleString('es-CO')}: ${observacion_devolucion}]${notaPrevia}`;

      sql = `
        UPDATE pedidos 
        SET estado_entrega = ?, 
            fecha_entrega_conductor = NOW(),
            valor_factura_pendiente = ?,
            total_despachado = ?,
            observaciones_entrega = ?
        WHERE id = ?
      `;
      params = [estado, nuevaDeudaPendiente, nuevoTotalDespachado, nuevaNota, id];
    } 
    else {
      sql = 'UPDATE pedidos SET estado_entrega = ? WHERE id = ?';
      params = [estado, id];
    }

    await db.query(sql, params);
    res.json({ message: `Pedido marcado como ${estado}` });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ error: "Error al cambiar el estado del pedido" });
  }
};

module.exports = { getMisRutas, actualizarEstado };