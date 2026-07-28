require('dotenv').config();
const db = require('./db');

async function wipeData() {
  console.log("⚠️ INICIANDO LIMPIEZA DE BASE DE DATOS PARA PILOTO ⚠️");
  console.log(`Conectado a la base de datos: ${process.env.DB_NAME} en ${process.env.DB_HOST}`);
  
  // Desactivar temporalmente la verificación de claves foráneas para poder borrar en cascada sin errores
  await db.query('SET FOREIGN_KEY_CHECKS = 0;');

  try {
    // 1. Limpiar todas las tablas transaccionales (historial, pedidos, detalles)
    const tablasTransaccionales = [
      'novedades_pedidos',
      'pedidos_productos_detalle',
      'pedidos_detalle',
      'pedidos',
      'bodega_entregas_historial',
      'bodega_pendientes_detalle',
      'bodega_pendientes',
      'clientes'
    ];

    for (const tabla of tablasTransaccionales) {
      try {
        console.log(`Vaciando tabla: ${tabla}...`);
        await db.query(`TRUNCATE TABLE ${tabla};`);
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          console.log(`La tabla ${tabla} no existe en esta BD. Se omitirá.`);
        } else {
          throw err;
        }
      }
    }

    // 2. Eliminar todos los usuarios EXCEPTO el administrador (id = 1 o rol_id = 1)
    console.log("Eliminando usuarios (excepto super administradores)...");
    try {
      const [resultUsuarios] = await db.query('DELETE FROM usuarios WHERE rol_id != 1 AND id != 1;');
      console.log(`✅ Usuarios eliminados: ${resultUsuarios.affectedRows}`);
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
         console.error("❌ Error de esquema: Parece que estás conectado a una base de datos incorrecta. Asegúrate de poner las credenciales de PRODUCCIÓN en tu archivo .env local.");
      } else {
         throw err;
      }
    }

    console.log("🎉 LIMPIEZA COMPLETADA CON ÉXITO. El sistema está listo para el plan piloto.");

  } catch (error) {
    console.error("❌ Ocurrió un error durante la limpieza:", error);
  } finally {
    // Volver a activar las claves foráneas
    await db.query('SET FOREIGN_KEY_CHECKS = 1;');
    process.exit(0);
  }
}

// Ejecutar
wipeData();
