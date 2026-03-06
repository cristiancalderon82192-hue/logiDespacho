// UBICACIÓN: server/controllers/usuariosController.js
const db = require('../db');

// --- 1. LISTAR USUARIOS ---
const getUsuarios = async (req, res) => {
  try {
    // Agregamos un LEFT JOIN para traer el nombre de la bodega asignada
    const sql = `
      SELECT u.id, u.nombre_completo, u.email, u.rol_id, u.estado, u.bodega_id, b.nombre as bodega_nombre 
      FROM usuarios u
      LEFT JOIN bodegas b ON u.bodega_id = b.id
      ORDER BY u.nombre_completo ASC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar usuarios" });
  }
};

// --- 2. CREAR USUARIO ---
const createUsuario = async (req, res) => {
  const { nombre_completo, email, password, rol_id, estado, bodega_id } = req.body;
  
  try {
    const [existe] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existe.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado." });
    }

    // Convertimos un string vacío en NULL para la base de datos
    const b_id = bodega_id || null;

    await db.query(
      "INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id, estado, bodega_id) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre_completo, email, password, rol_id, estado || 1, b_id]
    );

    res.json({ message: "Usuario creado exitosamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

// --- 3. ACTUALIZAR USUARIO ---
const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, email, password, rol_id, estado, bodega_id } = req.body;

  try {
    const [usuarioActual] = await db.query("SELECT * FROM usuarios WHERE id = ?", [id]);
    if (usuarioActual.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

    if (email !== usuarioActual[0].email) {
      const [existe] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
      if (existe.length > 0) return res.status(400).json({ error: "El correo ya está en uso por otro usuario." });
    }

    const b_id = bodega_id || null;
    let sql, params;
    
    if (password && password.trim() !== "") {
      sql = "UPDATE usuarios SET nombre_completo=?, email=?, password_hash=?, rol_id=?, estado=?, bodega_id=? WHERE id=?";
      params = [nombre_completo, email, password, rol_id, estado, b_id, id];
    } else {
      sql = "UPDATE usuarios SET nombre_completo=?, email=?, rol_id=?, estado=?, bodega_id=? WHERE id=?";
      params = [nombre_completo, email, rol_id, estado, b_id, id];
    }

    await db.query(sql, params);
    res.json({ message: "Usuario actualizado correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

// --- 4. ELIMINAR USUARIO ---
const deleteUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM usuarios WHERE id = ?", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "No se puede eliminar: El usuario tiene registros en el historial." });
    }
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};

module.exports = { getUsuarios, createUsuario, updateUsuario, deleteUsuario };