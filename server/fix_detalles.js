require('dotenv').config();
const db = require('./db');

async function fix() {
  try {
    console.log("Buscando pedidos sin detalle...");
    
    const [sinDetalle] = await db.query(`
      SELECT p.id 
      FROM pedidos p 
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id 
      WHERE pd.id IS NULL
    `);

    console.log(`Se encontraron ${sinDetalle.length} pedidos sin detalle. Procediendo a insertar...`);

    let batch = [];
    let procesados = 0;

    for (let i = 0; i < sinDetalle.length; i++) {
      const pedidoId = sinDetalle[i].id;
      const bodegaId = Math.floor(Math.random() * 8) + 1; // Bodegas del 1 al 8
      const peso = Math.floor(Math.random() * 100) + 10; // Peso entre 10 y 110 kg
      
      batch.push(
        db.query("INSERT INTO pedidos_detalle (pedido_id, bodega_id, peso) VALUES (?, ?, ?)", [pedidoId, bodegaId, peso])
      );

      procesados++;

      if (batch.length === 100 || i === sinDetalle.length - 1) {
        await Promise.all(batch);
        batch = [];
        console.log(`Insertados detalles para ${procesados} pedidos...`);
      }
    }

    console.log("¡Listo! Todos los pedidos ahora tienen su detalle.");
    process.exit(0);
  } catch (error) {
    console.error("Error corrigiendo detalles:", error);
    process.exit(1);
  }
}

fix();
