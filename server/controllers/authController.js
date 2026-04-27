// UBICACIÓN: server/controllers/authController.js
const db = require('../db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Clave secreta para firmar los tokens
const SECRET_KEY = process.env.JWT_SECRET || 'rodeo_zomac_super_secret_key_2026';

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

    // 3. VALIDACIÓN DE ESTADO (USUARIO INACTIVO)
    if (usuario.estado === 0 || usuario.estado === '0' || usuario.estado === false) {
      return res.status(403).json({ error: "Acceso denegado: Tu cuenta está inactiva. Comunícate con el administrador." });
    }

    // 👇 4. VERIFICACIÓN HÍBRIDA (EL SALVAVIDAS DE TRANSICIÓN) 👇
    let passwordValida = false;
    
    // Primero, miramos si la base de datos tiene la contraseña vieja en texto plano ("123456")
    if (usuario.password_hash === password) {
      passwordValida = true;
    } else {
      // Si no es texto plano, comparamos usando el algoritmo encriptado de Bcrypt
      passwordValida = await bcrypt.compare(password, usuario.password_hash);
    }

    if (!passwordValida) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // 5. Crear el Token JWT (Dura 8 horas)
    const tokenPayload = {
      id: usuario.id,
      role: usuario.rol_id,
      email: usuario.email
    };
    
    const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '8h' });

    // 6. Enviamos la respuesta exitosa manteniendo tu estructura frontal, pero inyectando el token
    res.json({
      id: usuario.id,
      nombre_completo: usuario.nombre_completo,
      role: usuario.rol_id,      
      rol_nombre: usuario.rol_nombre,
      estado: usuario.estado,
      token: token // <--- AÑADIMOS EL TOKEN AQUÍ
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { login };