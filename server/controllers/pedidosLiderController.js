const db = require('../db');

// 1. OBTENER DASHBOARD DEL LÍDER
const getDashboard = async (req, res) => {
  let { inicio, fin, usuario_id } = req.query;
  
  // Seguridad: Validar que sí llegue el ID del usuario
  if (!usuario_id) return res.status(400).json({ error: "Falta ID de usuario" });
  
  if (fin) fin = `${fin} 23:59:59`;

  try {
    // LISTA DE PEDIDOS (Filtrada por usuario_id Y fecha_agendada)
    const sqlLista = `
      SELECT 
        p.id, p.id_factura, p.prioridad, p.estado_entrega,
        DATE_FORMAT(p.fecha_agendada, '%Y-%m-%d') as fecha_agendada,
        c.nombre as nombre_cliente, 
        d.nombre as destino, 
        z.nombre as zona_envio,
        COALESCE(SUM(
          CASE 
            WHEN ppd.cantidad > 0 THEN ppd.peso - (ppd.cantidad_retirada_cliente * (ppd.peso / ppd.cantidad))
            ELSE ppd.peso 
          END
        ), 0) as total_peso
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN pedidos_productos_detalle ppd ON p.id = ppd.pedido_id
      
      WHERE p.usuario_id = ? 
      AND p.fecha_agendada BETWEEN ? AND ?
      
      GROUP BY p.id 
      ORDER BY p.fecha_agendada DESC, p.id DESC
    `;
    const [lista] = await db.query(sqlLista, [usuario_id, inicio, fin]);

    // DATOS PARA GRÁFICA (Comportamiento por día según fecha agendada)
    const sqlGrafica = `
      SELECT 
        DATE_FORMAT(fecha_agendada, '%Y-%m-%d') as fecha,
        COUNT(*) as cantidad
      FROM pedidos
      
      WHERE usuario_id = ? 
      AND fecha_agendada BETWEEN ? AND ?
      
      GROUP BY fecha
      ORDER BY fecha ASC
    `;
    const [grafica] = await db.query(sqlGrafica, [usuario_id, inicio, fin]);

    res.json({ lista, grafica });

  } catch (error) {
    console.error("Error Dashboard Líder:", error);
    res.status(500).json({ error: "Error al cargar datos del líder" });
  }
};

// 2. OBTENER MIS PEDIDOS (Actualizado para traer firma, estados, notas y deudas)
const getMisPedidos = async (req, res) => {
  const { fecha, usuario_id } = req.query; 
  
  if (!usuario_id) return res.status(400).json({ error: "Falta ID de usuario" });
  if (!fecha) return res.status(400).json({ error: "Falta la fecha de búsqueda" });

  try {
    const sql = `
      SELECT 
        p.id, p.id_factura, p.prioridad, 
        p.estado_entrega, p.observaciones_entrega, p.valor_factura_pendiente,
        p.firma_cliente, /* 👇 AQUÍ AGREGAMOS LA FIRMA 👇 */
        DATE_FORMAT(p.fecha_agendada, '%Y-%m-%d') as fecha_agendada,
        td.nombre as tipo_documento,
        c.nombre as nombre_cliente, 
        d.nombre as destino, 
        z.nombre as zona_envio,
        COALESCE(SUM(
          CASE 
            WHEN ppd.cantidad > 0 THEN ppd.peso - (ppd.cantidad_retirada_cliente * (ppd.peso / ppd.cantidad))
            ELSE ppd.peso 
          END
        ), 0) as total_peso
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN tipos_documento td ON p.tipo_documento_id = td.id
      LEFT JOIN pedidos_productos_detalle ppd ON p.id = ppd.pedido_id
      
      WHERE p.usuario_id = ? 
      AND DATE(p.fecha_agendada) = ? 
      
      GROUP BY p.id 
      ORDER BY 
        CASE 
          WHEN p.estado_entrega = 'Pendiente' THEN 1
          WHEN p.estado_entrega = 'Asignado' THEN 2
          WHEN p.estado_entrega = 'En Ruta' THEN 3
          ELSE 4 
        END,
        p.id DESC
    `;
    const [pedidos] = await db.query(sql, [usuario_id, fecha]);
    
    res.json(pedidos);

  } catch (error) {
    console.error("Error Mis Pedidos Líder:", error);
    res.status(500).json({ error: "Error al cargar mis pedidos" });
  }
};

// EXPORTAMOS AMBAS FUNCIONES
module.exports = { getDashboard, getMisPedidos };