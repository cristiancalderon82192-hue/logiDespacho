const pool = require('../db');

const getReporteParciales = async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    
    let whereClause = "";
    const params = [];
    if (inicio && fin) {
      whereClause = "WHERE DATE(h.fecha_entrega) BETWEEN ? AND ?";
      params.push(inicio, fin);
    }

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
      ${whereClause}
      GROUP BY factura_base, cliente, punto_venta, nombre_creador
      ORDER BY ultima_entrega DESC
    `, params);
    
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener reporte de entregas parciales:", error);
    res.status(500).json({ message: "Error interno al generar el reporte" });
  }
};
const deleteGrupoParciales = async (req, res) => {
  try {
    const { facturaBase } = req.params;
    
    // Buscar todos los pendiente_id asociados a esta factura base y sus sufijos
    const [rows] = await pool.query(
      "SELECT pendiente_id FROM bodega_entregas_historial WHERE factura_num LIKE ?", 
      [`${facturaBase}%`]
    );
    
    const pendientesIds = rows.map(r => r.pendiente_id).filter(id => id !== null);

    // Borrar de bodega_entregas_historial
    await pool.query(
      "DELETE FROM bodega_entregas_historial WHERE factura_num LIKE ?", 
      [`${facturaBase}%`]
    );

    // Borrar de pendientes_detalle y pendientes
    if (pendientesIds.length > 0) {
      await pool.query("DELETE FROM bodega_pendientes_detalle WHERE pendiente_id IN (?)", [pendientesIds]);
      await pool.query("DELETE FROM bodega_pendientes WHERE id IN (?)", [pendientesIds]);
    }
    
    const io = req.app.get('socketio');
    if (io) io.emit('actualizacion_bodega');

    res.json({ message: "Grupo de facturas eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar grupo de parciales:", error);
    res.status(500).json({ message: "Error interno al eliminar registros" });
  }
};

module.exports = {
  getReporteParciales,
  deleteGrupoParciales
};
