const pool = require('../db');

const getHistorial = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT h.*, COALESCE(u.nombre_completo, 'Usuario Sistema') as despachador, p.usuario_id as creado_por_id, uc.nombre_completo as nombre_creador, b.nombre as bodega_nombre
      FROM bodega_entregas_historial h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      LEFT JOIN bodegas b ON u.bodega_id = b.id
      LEFT JOIN bodega_pendientes p ON h.pendiente_id = p.id
      LEFT JOIN usuarios uc ON p.usuario_id = uc.id
      ORDER BY h.fecha_entrega DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener historial" });
  }
};
const eliminarEntregado = async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await pool.query("SELECT pendiente_id FROM bodega_entregas_historial WHERE id = ?", [id]);
    const pendienteId = row.length > 0 ? row[0].pendiente_id : null;

    await pool.query("DELETE FROM bodega_entregas_historial WHERE id = ?", [id]);
    
    if (pendienteId) {
      await pool.query("DELETE FROM bodega_pendientes_detalle WHERE pendiente_id = ?", [pendienteId]);
      await pool.query("DELETE FROM bodega_pendientes WHERE id = ?", [pendienteId]);
    }
    
    const io = req.app.get('socketio');
    if (io) io.emit('actualizacion_bodega');

    res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar registro de historial:", error);
    res.status(500).json({ message: "Error al eliminar registro" });
  }
};

module.exports = { getHistorial, eliminarEntregado };