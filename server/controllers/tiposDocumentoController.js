// UBICACIÓN: server/controllers/tiposDocumentoController.js
const db = require('../db');

// --- LISTAR TODOS ---
const getTipos = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tipos_documento ORDER BY nombre ASC");
    res.json(rows);
  } catch (error) {
    console.error("Error al listar tipos doc:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// --- CREAR ---
const createTipo = async (req, res) => {
  const { nombre } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  try {
    const [result] = await db.query("INSERT INTO tipos_documento (nombre) VALUES (?)", [nombre.trim()]);
    res.status(201).json({ message: "Tipo de documento creado", id: result.insertId });
  } catch (error) {
    // Si intentan crear uno con el mismo nombre y la BD lo rechaza por ser UNIQUE
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: `El tipo '${nombre}' ya existe.` });
    }
    console.error("Error al crear tipo:", error);
    res.status(500).json({ error: "Error al crear el tipo de documento" });
  }
};

// --- ACTUALIZAR ---
const updateTipo = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  try {
    await db.query("UPDATE tipos_documento SET nombre = ? WHERE id = ?", [nombre.trim(), id]);
    res.json({ message: "Tipo de documento actualizado" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: `Ya existe otro tipo llamado '${nombre}'.` });
    }
    console.error("Error al actualizar tipo:", error);
    res.status(500).json({ error: "Error al actualizar" });
  }
};

// --- ELIMINAR ---
const deleteTipo = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM tipos_documento WHERE id = ?", [id]);
    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    // Código de error MySQL cuando hay llave foránea (ya se usó en la tabla pedidos)
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ 
        error: "No se puede eliminar: Ya existen pedidos creados con este tipo de documento." 
      });
    }
    console.error("Error al eliminar tipo:", error);
    res.status(500).json({ error: "Error interno al intentar eliminar" });
  }
};

module.exports = { getTipos, createTipo, updateTipo, deleteTipo };