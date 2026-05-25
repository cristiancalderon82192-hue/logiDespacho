const pool = require('../db');

const getReportePerfectos = async (req, res) => {
  try {
    const fechaInicio = req.query.fechaInicio;
    const fechaFin = req.query.fechaFin;

    let querySQL = `
      SELECT 
        p.id_factura,
        c.nombre AS cliente,
        u.nombre_completo AS conductor,
        -- 👇 ASEGURAMOS QUE LA FECHA VENGA FORMATEADA CORRECTAMENTE 👇
        DATE_FORMAT(p.fecha_agendada, '%Y-%m-%d') AS fecha_agendada,
        p.hora_registro AS hora_limite,
        DATE_FORMAT(p.fecha_entrega_conductor, '%Y-%m-%d %H:%i') AS fecha_real_entrega,
        p.estado_entrega,
        p.observaciones_entrega,
        p.nota_manual,
        CASE 
          WHEN p.estado_entrega = 'Entregado' 
               AND DATE(p.fecha_entrega_conductor) = p.fecha_agendada
               AND (
                 (HOUR(p.hora_registro) < 12 AND HOUR(p.fecha_entrega_conductor) < 12) 
                 OR 
                 (HOUR(p.hora_registro) >= 12) -- Puede entregarse en la mañana o en la tarde
               )
          THEN 'Perfecto'
          ELSE 'No Perfecto'
        END AS calificacion
      FROM pedidos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN usuarios u ON p.conductor_id = u.id
      WHERE p.fecha_agendada BETWEEN ? AND ?
      ORDER BY calificacion ASC, p.fecha_entrega_conductor DESC
    `;

    if (!fechaInicio || !fechaFin) {
        querySQL = querySQL.replace('BETWEEN ? AND ?', 'BETWEEN CURDATE() AND CURDATE()');
        const [filas] = await pool.query(querySQL);
        return res.json(filas);
    }

    const [filas] = await pool.query(querySQL, [fechaInicio, fechaFin]);
    res.json(filas);
  } catch (error) {
    console.error("Error en reporte de pedidos perfectos:", error);
    res.status(500).json({ error: "Error al generar el reporte de pedidos perfectos" });
  }
};

module.exports = { getReportePerfectos };