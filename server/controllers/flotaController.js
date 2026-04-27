const pool = require('../db');

const getReporteFlota = async (req, res) => {
  try {
    const fechaInicio = req.query.fechaInicio; 
    let fechaFin = req.query.fechaFin; 

    let querySQL = `
      SELECT 
        v.placa,
        v.modelo,
        v.capacidad_kg,
        COUNT(DISTINCT p.id) AS total_pedidos_cargados,
        COALESCE(SUM(pd.peso), 0) AS kilos_reales_cargados,
        COUNT(DISTINCT DATE(p.fecha_agendada)) AS dias_trabajados,
        -- 👇 MATEMÁTICA AVANZADA: (Kilos Reales) / (Capacidad Diaria * Días Trabajados) 👇
        CASE 
          WHEN v.capacidad_kg > 0 AND COUNT(DISTINCT DATE(p.fecha_agendada)) > 0 
          THEN ROUND((COALESCE(SUM(pd.peso), 0) / (v.capacidad_kg * COUNT(DISTINCT DATE(p.fecha_agendada)))) * 100, 2)
          ELSE 0 
        END AS porcentaje_ocupacion
      FROM vehiculos v
      LEFT JOIN pedidos p ON v.id = p.vehiculo_id AND p.fecha_agendada BETWEEN ? AND ?
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      GROUP BY v.id, v.placa, v.modelo, v.capacidad_kg
      ORDER BY porcentaje_ocupacion DESC
    `;

    if (!fechaInicio || !fechaFin) {
        querySQL = querySQL.replace('BETWEEN ? AND ?', 'BETWEEN CURDATE() AND CURDATE()');
        const [filas] = await pool.query(querySQL);
        return res.json(filas);
    }

    const finDelDia = `${fechaFin} 23:59:59`;
    const [filas] = await pool.query(querySQL, [fechaInicio, finDelDia]);
    res.json(filas);
  } catch (error) {
    console.error("Error en reporte de flota:", error);
    res.status(500).json({ error: "Error en reporte de flota" });
  }
};

module.exports = { getReporteFlota };