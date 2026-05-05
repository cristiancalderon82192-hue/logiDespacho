const pool = require('../db');

const getReporteFlota = async (req, res) => {
  try {
    const fechaInicio = req.query.fechaInicio; 
    const fechaFin = req.query.fechaFin; 
    
    let queryParams = [];
    let dateCondition = "DATE(p.fecha_agendada) = CURDATE()"; // Por defecto hoy

    if (fechaInicio && fechaFin) {
        dateCondition = "p.fecha_agendada BETWEEN ? AND ?";
        const finDelDia = `${fechaFin} 23:59:59`;
        queryParams = [fechaInicio, finDelDia];
    }

    const querySQL = `
      WITH ViajesDiarios AS (
          SELECT 
              p.vehiculo_id,
              DATE(p.fecha_agendada) as fecha,
              p.numero_viaje,
              SUM(pd.peso) as peso_del_viaje,
              COUNT(DISTINCT p.id) as total_pedidos
          FROM pedidos p
          LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
          WHERE ${dateCondition} AND p.vehiculo_id IS NOT NULL
          GROUP BY p.vehiculo_id, DATE(p.fecha_agendada), p.numero_viaje
      )
      SELECT 
          v.placa,
          v.modelo,
          v.capacidad_kg,
          COUNT(vj.numero_viaje) as viajes_realizados,
          COALESCE(SUM(vj.total_pedidos), 0) as total_pedidos_cargados,
          COALESCE(SUM(vj.peso_del_viaje), 0) as kilos_reales_cargados,
          COALESCE(ROUND(AVG((vj.peso_del_viaje / v.capacidad_kg) * 100), 2), 0) as porcentaje_ocupacion
      FROM vehiculos v
      LEFT JOIN ViajesDiarios vj ON v.id = vj.vehiculo_id
      GROUP BY v.id, v.placa, v.modelo, v.capacidad_kg
      ORDER BY porcentaje_ocupacion DESC
    `;

    const [filas] = await pool.query(querySQL, queryParams);
    res.json(filas);
  } catch (error) {
    console.error("Error en reporte de flota:", error);
    res.status(500).json({ error: "Error en reporte de flota" });
  }
};

module.exports = { getReporteFlota };