const db = require('../db');

// LISTAR
const getClientes = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM clientes ORDER BY nombre ASC");
    res.json(rows);
  } catch (error) { res.status(500).json({ error: "Error al listar clientes" }); }
};

// CREAR (Con validación de documento obligatorio y único)
const createCliente = async (req, res) => {
  const { nombre, documento, telefono, direccion_exacta } = req.body;

  // 1. Validar que no vengan vacíos
  if (!nombre || !documento) {
    return res.status(400).json({ error: "El nombre y la Cédula/NIT son obligatorios." });
  }

  try {
    // 2. Verificar si el documento ya existe
    const [existe] = await db.query("SELECT id FROM clientes WHERE documento = ?", [documento]);
    if (existe.length > 0) {
      return res.status(400).json({ error: `La Cédula/NIT ${documento} ya está registrada en el sistema.` });
    }

    // 3. Insertar nuevo cliente
    await db.query(
      "INSERT INTO clientes (nombre, documento, telefono, direccion_exacta) VALUES (?, ?, ?, ?)", 
      [nombre, documento, telefono || '', direccion_exacta || '']
    );
    res.json({ message: "Cliente creado exitosamente" });

  } catch (error) { 
    // Captura de seguridad por si MySQL rechaza el UNIQUE
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Este número de documento ya está registrado." });
    }
    console.error("Error al crear cliente:", error);
    res.status(500).json({ error: "Error interno al crear el cliente." }); 
  }
};

// ACTUALIZAR (Con validación para no duplicar documentos)
const updateCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, documento, telefono, direccion_exacta } = req.body;

  if (!nombre || !documento) {
    return res.status(400).json({ error: "El nombre y la Cédula/NIT son obligatorios." });
  }

  try {
    // 1. Verificar que el documento no pertenezca a OTRO cliente diferente al que estamos editando
    const [existe] = await db.query("SELECT id FROM clientes WHERE documento = ? AND id != ?", [documento, id]);
    if (existe.length > 0) {
      return res.status(400).json({ error: `La Cédula/NIT ${documento} ya le pertenece a otro cliente.` });
    }

    // 2. Actualizar cliente
    await db.query(
      "UPDATE clientes SET nombre=?, documento=?, telefono=?, direccion_exacta=? WHERE id=?", 
      [nombre, documento, telefono || '', direccion_exacta || '', id]
    );
    res.json({ message: "Cliente actualizado correctamente" });

  } catch (error) { 
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Este número de documento ya está registrado." });
    }
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({ error: "Error interno al actualizar." }); 
  }
};

// ELIMINAR
const deleteCliente = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM clientes WHERE id = ?", [id]);
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    // Si el cliente ya tiene pedidos asociados, la llave foránea no dejará borrarlo
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ error: "No se puede eliminar: El cliente tiene pedidos asociados en el sistema." });
    }
    console.error("Error al eliminar cliente:", error);
    res.status(500).json({ error: "Error interno al eliminar." });
  }
};

module.exports = { getClientes, createCliente, updateCliente, deleteCliente };