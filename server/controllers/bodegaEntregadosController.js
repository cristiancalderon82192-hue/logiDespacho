const pool = require('../db');

const getHistorial = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT h.*, COALESCE(u.nombre_completo, 'Usuario Sistema') as despachador, p.usuario_id as creado_por_id, uc.nombre_completo as nombre_creador
      FROM bodega_entregas_historial h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN bodega_pendientes p ON h.pendiente_id = p.id
      LEFT JOIN usuarios uc ON p.usuario_id = uc.id
      ORDER BY h.fecha_entrega DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener historial" });
  }
};

module.exports = { getHistorial };