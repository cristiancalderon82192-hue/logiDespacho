const db = require('../db');

// Listar
const getZonas = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM zonas ORDER BY nombre ASC");
    res.json(rows);
  } catch (error) { res.status(500).json({ error: "Error al cargar zonas" }); }
};

// Crear
const createZona = async (req, res) => {
  const { nombre } = req.body;
  try {
    await db.query("INSERT INTO zonas (nombre) VALUES (?)", [nombre]);
    res.json({ message: "Zona creada" });
  } catch (error) { res.status(500).json({ error: "Error al crear" }); }
};

// Actualizar (NUEVO)
const updateZona = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    await db.query("UPDATE zonas SET nombre = ? WHERE id = ?", [nombre, id]);
    res.json({ message: "Zona actualizada" });
  } catch (error) { res.status(500).json({ error: "Error al actualizar" }); }
};

// Eliminar (NUEVO)
const deleteZona = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM zonas WHERE id = ?", [id]);
    res.json({ message: "Zona eliminada" });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "No se puede eliminar: Hay ciudades usando esta zona." });
    }
    res.status(500).json({ error: "Error al eliminar" });
  }
};

module.exports = { getZonas, createZona, updateZona, deleteZona };