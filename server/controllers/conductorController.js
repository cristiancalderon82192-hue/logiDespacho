const db = require('../db');

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
             p.valor_factura, p.valor_recaudado,
             c.nombre as nombre_cliente, c.telefono, 
             d.nombre as destino, z.nombre as zona_envio,
             td.nombre as tipo_documento,
             v.placa as vehiculo_placa,
             COALESCE(SUM(pd.peso), 0) AS total_peso
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN tipos_documento td ON p.tipo_documento_id = td.id
      LEFT JOIN vehiculos v ON p.vehiculo_id = v.id
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      
      WHERE p.conductor_id = ? AND DATE(p.fecha_agendada) = ?
      
      GROUP BY p.id
      ORDER BY 
        CASE WHEN p.estado_entrega = 'En Ruta' THEN 1
             WHEN p.estado_entrega = 'Asignado' THEN 2
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

// 2. ACTUALIZAR ESTADO CON RECAUDO INTELIGENTE Y HORA LOCAL
const actualizarEstado = async (req, res) => {
  const { id } = req.params;
  const { estado, observacion_devolucion, valor_devolucion, firma_cliente, valor_recaudado } = req.body;

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

    if (estado === 'Entregado') {
      // Reemplazamos NOW() por el parámetro '?'
      sql = 'UPDATE pedidos SET estado_entrega = ?, fecha_entrega_conductor = ?, firma_cliente = ?, valor_recaudado = ? WHERE id = ?';
      params = [estado, horaColombia, firma_cliente || null, recaudoReal, id];
    } 
    else if (estado === 'Devolución' || estado === 'Entregado Incompleto') {
      const valorDevolver = parseFloat(valor_devolucion) || 0;
      const deudaActual = parseFloat(pedido.valor_factura_pendiente) || 0;
      
      let despachadoActual = parseFloat(pedido.total_despachado);
      if (isNaN(despachadoActual) || despachadoActual <= 0) despachadoActual = parseFloat(pedido.valor_factura || 0);
      
      const nuevaDeudaPendiente = deudaActual + valorDevolver;
      const nuevoTotalDespachado = despachadoActual - valorDevolver;
      
      const notaPrevia = pedido.observaciones_entrega ? ` | Previo: ${pedido.observaciones_entrega}` : '';
      const nuevaNota = `[RECAUDÓ $${recaudoReal.toLocaleString('es-CO')} - DEVUELVE $${valorDevolver.toLocaleString('es-CO')}: ${observacion_devolucion}]${notaPrevia}`;

      // Reemplazamos NOW() por el parámetro '?'
      sql = `
        UPDATE pedidos 
        SET estado_entrega = ?, 
            fecha_entrega_conductor = ?,
            valor_factura_pendiente = ?,
            total_despachado = ?,
            observaciones_entrega = ?,
            valor_recaudado = ?
        WHERE id = ?
      `;
      params = [estado, horaColombia, nuevaDeudaPendiente, nuevoTotalDespachado, nuevaNota, recaudoReal, id];
    } 
    else {
      sql = 'UPDATE pedidos SET estado_entrega = ? WHERE id = ?';
      params = [estado, id];
    }

    await db.query(sql, params);
    res.json({ message: "Guardado Correctamente con Hora Local" });
  } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(500).json({ error: "Error al cambiar el estado" });
  }
};

module.exports = { getMisRutas, actualizarEstado };