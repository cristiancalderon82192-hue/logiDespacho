const db = require('../db');

// OBTENER DASHBOARD DEL LÍDER
const getDashboard = async (req, res) => {
  let { inicio, fin, usuario_id } = req.query;
  
  // Seguridad: Validar que sí llegue el ID del usuario
  if (!usuario_id) return res.status(400).json({ error: "Falta ID de usuario" });
  
  if (fin) fin = `${fin} 23:59:59`;

  try {
    // 1. LISTA DE PEDIDOS (Filtrada por usuario_id Y fecha_agendada)
    const sqlLista = `
      SELECT 
        p.id, p.id_factura, p.prioridad, 
        DATE_FORMAT(p.fecha_agendada, '%Y-%m-%d') as fecha_agendada,
        c.nombre as nombre_cliente, 
        d.nombre as destino, 
        z.nombre as zona_envio,
        COALESCE(SUM(pd.peso), 0) as total_peso
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      
      -- 👇 EL FILTRO DE SEGURIDAD Y DE FECHA 👇
      WHERE p.usuario_id = ? 
      AND p.fecha_agendada BETWEEN ? AND ?
      
      GROUP BY p.id 
      ORDER BY p.fecha_agendada DESC, p.id DESC
    `;
    const [lista] = await db.query(sqlLista, [usuario_id, inicio, fin]);

    // 2. DATOS PARA GRÁFICA (Comportamiento por día según fecha agendada)
    const sqlGrafica = `
      SELECT 
        DATE_FORMAT(fecha_agendada, '%Y-%m-%d') as fecha,
        COUNT(*) as cantidad
      FROM pedidos
      
      -- 👇 EL MISMO FILTRO DOBLE PARA LA GRÁFICA 👇
      WHERE usuario_id = ? 
      AND fecha_agendada BETWEEN ? AND ?
      
      GROUP BY fecha
      ORDER BY fecha ASC
    `;
    const [grafica] = await db.query(sqlGrafica, [usuario_id, inicio, fin]);

    // 3. DATOS DE DESTINOS (Globales de la empresa para la jornada)
    const sqlDestinos = `
      SELECT 
        d.nombre as destino, 
        COUNT(DISTINCT p.id) as entregas, 
        COALESCE(SUM(pd.peso), 0) as peso
      FROM pedidos p 
      JOIN destinos d ON p.destino_id = d.id 
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      WHERE p.fecha_agendada BETWEEN ? AND ? 
      GROUP BY d.id 
      ORDER BY peso DESC
    `;
    const [destinos] = await db.query(sqlDestinos, [inicio, fin]);

    res.json({ lista, grafica, destinos });

  } catch (error) {
    console.error("Error Dashboard Líder:", error);
    res.status(500).json({ error: "Error al cargar datos del líder" });
  }
};


module.exports = { getDashboard };