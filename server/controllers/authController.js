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

    // 4. VERIFICACIÓN HÍBRIDA (EL SALVAVIDAS DE TRANSICIÓN)
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

    // 👇 5. CANDADO DE SESIÓN ÚNICA 👇
    if (usuario.session_token) {
      try {
        // Verificamos si el token viejo guardado en BD aún está vivo
        jwt.verify(usuario.session_token, SECRET_KEY);
        // Si no lanza error, significa que el token es válido y hay sesión activa
        return res.status(403).json({ 
          error: "Ya tienes una sesión activa en otro dispositivo o navegador. Cierra sesión allí primero." 
        });
      } catch (error) {
        // Si entra aquí (error), significa que el token guardado ya expiró (pasaron las 8h), 
        // así que lo ignoramos y le permitimos entrar.
      }
    }

    // 6. Crear el Token JWT (Dura 8 horas)
    const tokenPayload = {
      id: usuario.id,
      role: usuario.rol_id,
      email: usuario.email
    };
    
    const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '8h' });

    // 👇 7. GUARDAR EL NUEVO TOKEN EN LA BD PARA BLOQUEAR OTROS INGRESOS 👇
    await db.query("UPDATE usuarios SET session_token = ? WHERE id = ?", [token, usuario.id]);

    // 8. Enviamos la respuesta exitosa
    res.json({
      id: usuario.id,
      nombre_completo: usuario.nombre_completo,
      role: usuario.rol_id,      
      rol_nombre: usuario.rol_nombre,
      estado: usuario.estado,
      bodega_id: usuario.bodega_id,
      token: token 
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 👇 NUEVA FUNCIÓN PARA CERRAR SESIÓN Y LIBERAR EL CANDADO 👇
const logout = async (req, res) => {
  try {
    // Extraemos el token de los headers (formato: "Bearer eyJhb...")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(400).json({ error: "No se proporcionó token para cerrar sesión" });

    // Decodificamos el token (sin verificar firma) solo para saber de qué ID de usuario es
    const decoded = jwt.decode(token);
    
    if (decoded && decoded.id) {
      // Borramos el token de la base de datos para este usuario
      await db.query("UPDATE usuarios SET session_token = NULL WHERE id = ?", [decoded.id]);
    }
    
    res.json({ message: "Sesión cerrada y liberada correctamente" });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    res.status(500).json({ error: "Error interno al cerrar sesión" });
  }
};

// 👇 NUEVA FUNCIÓN PARA CAMBIAR CONTRASEÑA 👇
const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    // 1. Obtener el usuario actual para verificar la contraseña
    const [rows] = await db.query("SELECT password_hash FROM usuarios WHERE id = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const usuario = rows[0];

    // 2. Verificar la contraseña actual (manejo híbrido por si es texto plano viejo)
    let passwordValida = false;
    if (usuario.password_hash === currentPassword) {
      passwordValida = true;
    } else {
      passwordValida = await bcrypt.compare(currentPassword, usuario.password_hash);
    }

    if (!passwordValida) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    // 3. Hashear y guardar la nueva
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query("UPDATE usuarios SET password_hash = ? WHERE id = ?", [hashedPassword, userId]);

    res.json({ message: "Contraseña actualizada exitosamente" });
  } catch (error) {
    console.error("Error cambiando contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { login, logout, changePassword };