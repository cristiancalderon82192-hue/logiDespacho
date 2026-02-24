const db = require('../db');

// LISTAR
const getVehiculos = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM vehiculos ORDER BY placa ASC");
    res.json(rows);
  } catch (error) { res.status(500).json({ error: "Error al cargar flota" }); }
};

// CREAR
const createVehiculo = async (req, res) => {
  const { placa, modelo, capacidad_kg, estado } = req.body;
  try {
    // Validar placa duplicada
    const [existe] = await db.query("SELECT id FROM vehiculos WHERE placa = ?", [placa]);
    if (existe.length > 0) return res.status(400).json({ error: "La placa ya existe" });

    await db.query(
      "INSERT INTO vehiculos (placa, modelo, capacidad_kg, estado) VALUES (?, ?, ?, ?)",
      [placa.toUpperCase(), modelo, capacidad_kg, estado]
    );
    res.json({ message: "Vehículo registrado" });
  } catch (error) { res.status(500).json({ error: "Error al crear vehículo" }); }
};

// ACTUALIZAR
const updateVehiculo = async (req, res) => {
  const { id } = req.params;
  const { placa, modelo, capacidad_kg, estado } = req.body;
  try {
    await db.query(
      "UPDATE vehiculos SET placa=?, modelo=?, capacidad_kg=?, estado=? WHERE id=?",
      [placa.toUpperCase(), modelo, capacidad_kg, estado, id]
    );
    res.json({ message: "Vehículo actualizado" });
  } catch (error) { res.status(500).json({ error: "Error al actualizar" }); }
};

// ELIMINAR
const deleteVehiculo = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM vehiculos WHERE id = ?", [id]);
    res.json({ message: "Vehículo eliminado" });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "No se puede eliminar: Tiene pedidos asignados." });
    }
    res.status(500).json({ error: "Error al eliminar" });
  }
};

module.exports = { getVehiculos, createVehiculo, updateVehiculo, deleteVehiculo };