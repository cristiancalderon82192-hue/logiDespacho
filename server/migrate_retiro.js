require('dotenv').config();
const db = require('./db.js');

async function migrate() {
  try {
    console.log("Adding cantidad_retirada_cliente to pedidos_productos_detalle...");
    await db.query("ALTER TABLE pedidos_productos_detalle ADD COLUMN cantidad_retirada_cliente DECIMAL(10,2) DEFAULT 0");
    console.log("✅ Column added successfully!");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("⚠️ Column already exists, no need to add it.");
    } else {
      console.error("❌ Migration error:", error);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
