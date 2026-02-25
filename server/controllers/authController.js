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

    // 3. Verificar contraseña (simple por ahora)
    if (password === usuario.password_hash) {
      
      // 👇 YA NO INVENTAMOS NOMBRES. ENVIAMOS EL NÚMERO EXACTO DE LA BD
      res.json({
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        role: usuario.rol_id,      // <-- Enviará un 3
        rol_nombre: usuario.rol_nombre // <-- Opcional, pero útil
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