const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/MAXIMILIANO/Documents/proyecto_sw/logiDespacho/server/.env' });

async function main() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await db.query(`ALTER TABLE pedidos_productos_detalle ADD COLUMN precio_unitario DECIMAL(12,2) DEFAULT 0`);
    console.log("Added precio_unitario");
  } catch(e) { console.log(e.message) }

  try {
    await db.query(`ALTER TABLE pedidos_productos_detalle ADD COLUMN precio_total DECIMAL(12,2) DEFAULT 0`);
    console.log("Added precio_total");
  } catch(e) { console.log(e.message) }

  process.exit(0);
}
main();
