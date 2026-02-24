const db = require('../db');

// LISTAR
const getClientes = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM clientes ORDER BY nombre ASC");
    res.json(rows);
  } catch (error) { res.status(500).json({ error: "Error al listar clientes" }); }
};

// CREAR (Solo nombre, telefono, direccion_exacta)
const createCliente = async (req, res) => {
  const { nombre, telefono, direccion_exacta } = req.body;
  try {
    await db.query(
      "INSERT INTO clientes (nombre, telefono, direccion_exacta) VALUES (?, ?, ?)", 
      [nombre, telefono, direccion_exacta]
    );
    res.json({ message: "Cliente creado" });
  } catch (error) { res.status(500).json({ error: "Error al crear cliente" }); }
};

// ACTUALIZAR
const updateCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, direccion_exacta } = req.body;
  try {
    await db.query(
      "UPDATE clientes SET nombre=?, telefono=?, direccion_exacta=? WHERE id=?", 
      [nombre, telefono, direccion_exacta, id]
    );
    res.json({ message: "Cliente actualizado" });
  } catch (error) { res.status(500).json({ error: "Error al actualizar" }); }
};

// ELIMINAR
const deleteCliente = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM clientes WHERE id = ?", [id]);
    res.json({ message: "Cliente eliminado" });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "No se puede eliminar: El cliente tiene pedidos." });
    }
    res.status(500).json({ error: "Error al eliminar" });
  }
};

module.exports = { getClientes, createCliente, updateCliente, deleteCliente };