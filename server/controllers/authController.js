// UBICACIÓN: server/controllers/authController.js
const db = require('../db'); 

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

    // 👇 NUEVO: 3. VALIDACIÓN DE ESTADO (USUARIO INACTIVO) 👇
    // Bloqueamos el acceso desde la base de datos antes de mirar la contraseña
    if (usuario.estado === 0 || usuario.estado === '0' || usuario.estado === false) {
      return res.status(403).json({ error: "Acceso denegado: Tu cuenta está inactiva. Comunícate con el administrador." });
    }

    // 4. Verificar contraseña (simple por ahora)
    if (password === usuario.password_hash) {
      
      // Enviamos la respuesta exitosa, INCLUYENDO el estado
      res.json({
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        role: usuario.rol_id,      
        rol_nombre: usuario.rol_nombre,
        estado: usuario.estado // <--- AÑADIDO PARA QUE EL FRONTEND LO SEPA
      });
      
    } else {
      res.status(401).json({ error: "Contraseña incorrecta" });
    }

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { login };