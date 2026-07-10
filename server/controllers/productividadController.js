const pool = require('../db');

const getReporteProductividad = async (req, res) => {
  try {
    // Ahora atrapamos las dos fechas que envía el frontend
    const fechaInicio = req.query.fechaInicio;
    let fechaFin = req.query.fechaFin;

    let querySQL = `
      SELECT 
        u.nombre_completo AS conductor,
        COUNT(p.id) AS total_viajes_asignados,
        SUM(CASE WHEN p.estado_entrega = 'Entregado' THEN 1 ELSE 0 END) AS entregas_completas,
        SUM(CASE WHEN p.estado_entrega = 'Entregado Incompleto' THEN 1 ELSE 0 END) AS entregas_incompletas,
        SUM(CASE WHEN p.estado_entrega IN ('Entregado', 'Entregado Incompleto') THEN 
          (p.valor_factura - COALESCE((SELECT SUM(ppd.cantidad_retirada_cliente * ppd.precio_unitario) FROM pedidos_productos_detalle ppd WHERE ppd.pedido_id = p.id), 0)) 
        ELSE 0 END) AS valor_total_entregado,
        SUM(CASE WHEN p.estado_entrega = 'Devolución' THEN 1 ELSE 0 END) AS devoluciones,
        COALESCE(SUM(peso_pedido.total_peso), 0) AS total_kilos_transportados
      FROM usuarios u
      INNER JOIN pedidos p ON u.id = p.conductor_id
      LEFT JOIN (
          SELECT pedido_id, SUM(peso) as total_peso 
          FROM pedidos_detalle 
          GROUP BY pedido_id
      ) peso_pedido ON p.id = peso_pedido.pedido_id
      -- 👇 AQUÍ ES DONDE APLICAMOS EL RANGO DE FECHAS 👇
      WHERE u.rol_id = 4 AND p.fecha_agendada BETWEEN ? AND ?
      GROUP BY u.id, u.nombre_completo
      ORDER BY valor_total_entregado DESC
    `;

    // Medida de seguridad: Si alguien llama a la API sin fechas, usamos el día de hoy
    if (!fechaInicio || !fechaFin) {
        querySQL = querySQL.replace('BETWEEN ? AND ?', 'BETWEEN CURDATE() AND CURDATE()');
        const [filas] = await pool.query(querySQL);
        return res.json(filas);
    }

    // Le agregamos la hora límite al último día para que no excluya los pedidos de la tarde
    const finDelDia = `${fechaFin} 23:59:59`;

    // Ejecutamos la consulta con el rango
    const [filas] = await pool.query(querySQL, [fechaInicio, finDelDia]);
    res.json(filas);
    
  } catch (error) {
    console.error("Error en el reporte de productividad:", error);
    res.status(500).json({ error: "Error en reporte de productividad" });
  }
};

module.exports = { getReporteProductividad };