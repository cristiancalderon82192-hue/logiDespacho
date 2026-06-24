require('dotenv').config();
const db = require('./db');

async function migrate() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS \`pedidos_productos_detalle\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`pedido_id\` int NOT NULL,
        \`codigo_producto\` varchar(50) DEFAULT NULL,
        \`descripcion\` varchar(255) NOT NULL,
        \`peso\` decimal(10,2) DEFAULT '0.00',
        \`bodega_id\` int DEFAULT NULL,
        \`cantidad\` decimal(10,2) NOT NULL,
        \`unidad_medida\` varchar(20) DEFAULT NULL,
        \`precio_unitario\` decimal(15,2) DEFAULT '0.00',
        \`precio_total\` decimal(15,2) DEFAULT '0.00',
        PRIMARY KEY (\`id\`),
        KEY \`fk_pedidos_productos_pedido\` (\`pedido_id\`),
        CONSTRAINT \`fk_pedidos_productos_pedido\` FOREIGN KEY (\`pedido_id\`) REFERENCES \`pedidos\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;
    console.log("Ejecutando migración...");
    await db.query(sql);
    console.log("Migración exitosa: pedidos_productos_detalle creada.");
    process.exit(0);
  } catch (error) {
    console.error("Error en migración:", error);
    process.exit(1);
  }
}

migrate();
