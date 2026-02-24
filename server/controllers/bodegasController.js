const db = require('../db');

// 1. LISTAR
const getBodegas = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM bodegas ORDER BY nombre ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar bodegas" });
  }
};

// 2. CREAR
const createBodega = async (req, res) => {
  const { nombre } = req.body;
  try {
    await db.query("INSERT INTO bodegas (nombre) VALUES (?)", [nombre]);
    res.json({ message: "Bodega creada exitosamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al crear bodega" });
  }
};

// 3. ACTUALIZAR
const updateBodega = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    await db.query("UPDATE bodegas SET nombre = ? WHERE id = ?", [nombre, id]);
    res.json({ message: "Bodega actualizada" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar" });
  }
};

// 4. ELIMINAR
const deleteBodega = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM bodegas WHERE id = ?", [id]);
    res.json({ message: "Bodega eliminada" });
  } catch (error) {
    // Si la bodega tiene pedidos (referencia en pedidos_detalle), SQL lanzará este error
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "No se puede eliminar: Esta bodega tiene historial de pedidos." });
    }
    res.status(500).json({ error: "Error al eliminar bodega" });
  }
};

module.exports = { getBodegas, createBodega, updateBodega, deleteBodega };