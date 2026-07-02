require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log("Iniciando migración...");
    try {
      await pool.query(`ALTER TABLE pedidos_productos_detalle ADD COLUMN cantidad_retirada_cliente DECIMAL(10,2) DEFAULT 0;`);
      console.log("✅ Columna cantidad_retirada_cliente añadida exitosamente.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("✅ La columna cantidad_retirada_cliente ya existe.");
      } else {
        throw e;
      }
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS novedades_pedidos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          pedido_id INT NOT NULL,
          tipo VARCHAR(100) NOT NULL,
          descripcion TEXT,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✅ Tabla novedades_pedidos asegurada.");
    } catch (e) {
      throw e;
    }

    console.log("¡Migración completada con éxito!");
  } catch (error) {
    console.error("❌ Error en migración:", error);
  } finally {
    await pool.end();
  }
}

migrate();
