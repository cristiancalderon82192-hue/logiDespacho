// UBICACIÓN: server/controllers/authController.js
const db = require('../db'); // Importamos la conexión que creamos en el Paso 1

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscamos al usuario y su rol
    const sql = "SELECT u.*, r.nombre as rol_nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE email = ?";
    const [rows] = await db.query(sql, [email]);

    // 2. Si no existe
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const usuario = rows[0];

    // 3. Verificar contraseña (simple por ahora)
    if (password === usuario.password_hash) {
      // Normalizamos el rol para que el Frontend lo entienda
      let roleName = 'lider_sala';
      if (usuario.rol_id === 1) roleName = 'admin';
      if (usuario.rol_id === 4) roleName = 'conductor';
      
      // Enviamos la respuesta exitosa
      res.json({
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        role: roleName,
        rol_id: usuario.rol_id
      });
    } else {
      res.status(401).json({ error: "Contraseña incorrecta" });
    }

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Exportamos la función para que la Ruta la pueda usar
module.exports = { login };