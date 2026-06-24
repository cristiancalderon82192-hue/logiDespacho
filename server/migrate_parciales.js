require('dotenv').config();
const db = require('./db');

async function run() {
  try {
    console.log("Comprobando columna cantidad_despachada en pedidos_productos_detalle...");
    const [cols] = await db.query("SHOW COLUMNS FROM pedidos_productos_detalle LIKE 'cantidad_despachada'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE pedidos_productos_detalle ADD COLUMN cantidad_despachada DECIMAL(10,2) DEFAULT NULL");
      console.log("Columna cantidad_despachada añadida exitosamente.");
    } else {
      console.log("La columna cantidad_despachada ya existe.");
    }
  } catch (error) {
    console.error("Error en la migración:", error);
  } finally {
    process.exit(0);
  }
}

run();
