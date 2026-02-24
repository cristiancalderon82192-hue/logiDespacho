// UBICACIÓN: server/controllers/usuariosController.js
const db = require('../db');
// Eliminamos la importación de bcryptjs

// --- 1. LISTAR USUARIOS ---
const getUsuarios = async (req, res) => {
  try {
    // No devolvemos la contraseña por seguridad
    const [rows] = await db.query("SELECT id, nombre_completo, email, rol_id, estado FROM usuarios ORDER BY nombre_completo ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar usuarios" });
  }
};

// --- 2. CREAR USUARIO ---
const createUsuario = async (req, res) => {
  const { nombre_completo, email, password, rol_id, estado } = req.body;
  
  try {
    // A. Validar si el email ya existe
    const [existe] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existe.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado." });
    }

    // B. Insertar usuario con la CONTRASEÑA EN TEXTO PLANO
    await db.query(
      "INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id, estado) VALUES (?, ?, ?, ?, ?)",
      [nombre_completo, email, password, rol_id, estado || 1]
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
  const { nombre_completo, email, password, rol_id, estado } = req.body;

  try {
    // A. Validar si existe (y si cambia el email, que no choque con otro)
    const [usuarioActual] = await db.query("SELECT * FROM usuarios WHERE id = ?", [id]);
    if (usuarioActual.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

    // Si cambió el email, verificar duplicados
    if (email !== usuarioActual[0].email) {
      const [existe] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
      if (existe.length > 0) return res.status(400).json({ error: "El correo ya está en uso por otro usuario." });
    }

    // B. Preparar Query Dinámico (Solo actualizar password si se envía uno nuevo)
    let sql, params;
    
    if (password && password.trim() !== "") {
      // ACTUALIZAMOS CON LA CONTRASEÑA EN TEXTO PLANO
      sql = "UPDATE usuarios SET nombre_completo=?, email=?, password_hash=?, rol_id=?, estado=? WHERE id=?";
      params = [nombre_completo, email, password, rol_id, estado, id];
    } else {
      sql = "UPDATE usuarios SET nombre_completo=?, email=?, rol_id=?, estado=? WHERE id=?";
      params = [nombre_completo, email, rol_id, estado, id];
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
    // Si tiene pedidos asociados, no dejar borrar
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "No se puede eliminar: El usuario tiene registros en el historial." });
    }
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};

module.exports = { getUsuarios, createUsuario, updateUsuario, deleteUsuario };