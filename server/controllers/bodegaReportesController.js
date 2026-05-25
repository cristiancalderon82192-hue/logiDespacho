const pool = require('../db');

const getReporteParciales = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        IF(LOCATE('-S', h.factura_num) > 0, SUBSTRING_INDEX(h.factura_num, '-S', 1), h.factura_num) as factura_base,
        c.nombre as cliente,
        b.nombre as punto_venta,
        u.nombre_completo as nombre_creador,
        COUNT(h.id) as cantidad_entregas,
        GROUP_CONCAT(h.factura_num ORDER BY h.fecha_entrega ASC SEPARATOR ', ') as historial_facturas,
        MAX(h.fecha_entrega) as ultima_entrega
      FROM bodega_entregas_historial h
      LEFT JOIN bodega_pendientes p ON h.pendiente_id = p.id
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN bodegas b ON p.punto_venta_id = b.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      GROUP BY factura_base, cliente, punto_venta, nombre_creador
      ORDER BY ultima_entrega DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener reporte de entregas parciales:", error);
    res.status(500).json({ message: "Error interno al generar el reporte" });
  }
};

module.exports = {
  getReporteParciales
};
