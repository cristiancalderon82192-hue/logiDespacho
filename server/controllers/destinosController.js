const db = require('../db');

// Listar
const getDestinos = async (req, res) => {
  try {
    const sql = `SELECT d.id, d.nombre, d.zona_id, z.nombre as zona_nombre FROM destinos d JOIN zonas z ON d.zona_id = z.id ORDER BY d.nombre ASC`;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: "Error al cargar destinos" }); }
};

// Crear
const createDestino = async (req, res) => {
  const { nombre, zona_id } = req.body;
  try {
    await db.query("INSERT INTO destinos (nombre, zona_id) VALUES (?, ?)", [nombre, zona_id]);
    res.json({ message: "Creado correctamente" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// Actualizar (NUEVO)
const updateDestino = async (req, res) => {
  const { id } = req.params;
  const { nombre, zona_id } = req.body;
  try {
    await db.query("UPDATE destinos SET nombre = ?, zona_id = ? WHERE id = ?", [nombre, zona_id, id]);
    res.json({ message: "Actualizado correctamente" });
  } catch (error) { res.status(500).json({ error: "Error al actualizar" }); }
};

// Eliminar (NUEVO)
const deleteDestino = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM destinos WHERE id = ?", [id]);
    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "No se puede eliminar: Hay clientes o pedidos usando este destino." });
    }
    res.status(500).json({ error: "Error al eliminar" });
  }
};

module.exports = { getDestinos, createDestino, updateDestino, deleteDestino };