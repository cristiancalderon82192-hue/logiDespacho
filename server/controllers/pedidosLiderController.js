// UBICACIÓN: server/controllers/pedidosLiderController.js
const db = require('../db');

// --- 1. DASHBOARD DEL LÍDER (Filtra por Fecha Agendada) ---
const getDashboard = async (req, res) => {
  let { inicio, fin, usuario_id } = req.query;
  
  if (!usuario_id) return res.status(400).json({ error: "Falta ID de usuario" });
  if (fin) fin = `${fin} 23:59:59`;

  try {
    const sqlLista = `
      SELECT p.id, p.id_factura, p.prioridad, DATE_FORMAT(p.fecha_agendada, '%Y-%m-%d') as fecha_agendada,
      c.nombre as nombre_cliente, d.nombre as destino, z.nombre as zona_envio, COALESCE(SUM(pd.peso), 0) as total_peso
      FROM pedidos p JOIN clientes c ON p.cliente_id = c.id JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      WHERE p.usuario_id = ? AND p.fecha_agendada BETWEEN ? AND ?
      GROUP BY p.id ORDER BY p.fecha_agendada DESC, p.id DESC
    `;
    const [lista] = await db.query(sqlLista, [usuario_id, inicio, fin]);

    const sqlGrafica = `
      SELECT DATE_FORMAT(fecha_agendada, '%Y-%m-%d') as fecha, COUNT(*) as cantidad
      FROM pedidos WHERE usuario_id = ? AND fecha_agendada BETWEEN ? AND ?
      GROUP BY fecha ORDER BY fecha ASC
    `;
    const [grafica] = await db.query(sqlGrafica, [usuario_id, inicio, fin]);

    res.json({ lista, grafica });
  } catch (error) { res.status(500).json({ error: "Error en Dashboard Líder" }); }
};

// --- 2. TABLA "MIS PEDIDOS" (Filtra por Fecha Facturación) ---
const getMisPedidos = async (req, res) => {
  let { inicio, fin, usuario_id } = req.query;
  
  if (!usuario_id) return res.status(400).json({ error: "Falta ID de usuario" });
  if (fin) fin = `${fin} 23:59:59`;

  try {
    const sql = `
      SELECT p.id, p.id_factura, p.prioridad, p.tipo_documento,
      DATE_FORMAT(p.fecha_facturacion, '%Y-%m-%d') as fecha_facturacion,
      DATE_FORMAT(p.fecha_agendada, '%Y-%m-%d') as fecha_agendada,
      c.nombre as nombre_cliente, d.nombre as destino, z.nombre as zona_envio,
      COALESCE(SUM(pd.peso), 0) as total_peso
      FROM pedidos p JOIN clientes c ON p.cliente_id = c.id JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      WHERE p.usuario_id = ? AND p.fecha_facturacion BETWEEN ? AND ?
      GROUP BY p.id ORDER BY p.fecha_facturacion DESC, p.id DESC
    `;
    const [lista] = await db.query(sql, [usuario_id, inicio, fin]);
    res.json(lista);
  } catch (error) { res.status(500).json({ error: "Error en Tabla Líder" }); }
};

module.exports = { getDashboard, getMisPedidos };