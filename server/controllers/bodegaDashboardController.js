const pool = require('../db');

const getDashboardStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN p.estado = 'Pendiente' AND LOCATE('-S', p.factura_num) = 0 THEN p.id END) as total_pendientes,
        COUNT(DISTINCT CASE WHEN p.estado = 'Pendiente' AND LOCATE('-S', p.factura_num) > 0 THEN p.id END) as total_parciales,
        COUNT(DISTINCT CASE WHEN p.estado = 'Entregado' THEN p.id END) as total_entregados,
        COALESCE(SUM(pd.cantidad_pendiente - pd.cantidad_entregada), 0) as items_totales_espera
      FROM bodega_pendientes p
      LEFT JOIN bodega_pendientes_detalle pd ON p.id = pd.pendiente_id
    `);
    res.json(stats[0]);
  } catch (error) {
    console.error("Error en KPI:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

module.exports = { getDashboardStats };