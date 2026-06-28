require('dotenv').config();
const db = require('./db');

async function run() {
  try {
    const [bodegas] = await db.query("SELECT * FROM bodegas");
    console.log("Bodegas:", bodegas);
    
    const [prods] = await db.query("SELECT id, bodega_id, descripcion FROM pedidos_productos_detalle ORDER BY id DESC LIMIT 10");
    console.log("Productos:", prods);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
