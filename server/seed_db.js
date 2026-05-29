// UBICACIÓN: server/seed_db.js
require('dotenv').config();
const db = require('./db');

// Función para obtener IDs aleatorios de tablas maestras
async function getRandomId(table) {
  try {
    const [rows] = await db.query(`SELECT id FROM ${table} ORDER BY RAND() LIMIT 1`);
    if (rows.length > 0) return rows[0].id;
    return 1; // Fallback
  } catch(e) {
    console.warn(`Aviso: No se pudo obtener ID de la tabla ${table}. Se usará ID 1 por defecto.`);
    return 1;
  }
}

async function seed() {
  try {
    console.log("-----------------------------------------");
    console.log("🚀 Iniciando inserción de datos de prueba");
    console.log("-----------------------------------------");

    console.log("⏳ Paso 1: Generando 300 clientes...");
    
    const nombres = ["Carlos", "Maria", "Juan", "Ana", "Luis", "Laura", "Pedro", "Sofia", "Diego", "Valeria", "Andres", "Camila"];
    const apellidos = ["Gomez", "Perez", "Rodriguez", "Lopez", "Martinez", "Garcia", "Hernandez", "Diaz", "Torres", "Ramirez"];

    let clientesInsertados = [];

    // Insertar 300 clientes
    for (let i = 0; i < 300; i++) {
      const nombreAleatorio = `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]} ${Math.floor(Math.random() * 10000)}`;
      const documentoAleatorio = `10${Math.floor(Math.random() * 90000000)}`;
      const telefonoAleatorio = `3${Math.floor(Math.random() * 900000000)}`;
      const direccionAleatoria = `Calle ${Math.floor(Math.random() * 100) + 1} # ${Math.floor(Math.random() * 100) + 1} - ${Math.floor(Math.random() * 100) + 1}`;
      
      const [res] = await db.query(
        "INSERT INTO clientes (documento, nombre, telefono, direccion_exacta) VALUES (?, ?, ?, ?)",
        [documentoAleatorio, nombreAleatorio, telefonoAleatorio, direccionAleatoria]
      );
      clientesInsertados.push(res.insertId);
    }
    console.log(`✅ 300 clientes insertados correctamente.`);

    console.log("\n⏳ Paso 2: Preparando llaves foráneas para pedidos...");
    const usuarioId = await getRandomId('usuarios');
    const destinoId = await getRandomId('destinos');
    const vehiculoId = await getRandomId('vehiculos');
    const tipoDocId = await getRandomId('tipos_documento');

    console.log("⏳ Paso 3: Insertando 1000 pedidos (La mayoría con estado 'Entregado')...");

    // Estados variados para simular datos reales, con mayoría de Entregados
    const estados = ["Entregado", "Entregado", "Entregado", "Entregado", "Entregado Incompleto", "Pendiente"];
    const hoy = new Date().toISOString().split('T')[0];

    let batch = [];
    
    for (let i = 0; i < 1000; i++) {
      // Elegir un cliente aleatorio de los que acabamos de crear
      const clienteId = clientesInsertados[Math.floor(Math.random() * clientesInsertados.length)] || await getRandomId('clientes');
      const estado = estados[Math.floor(Math.random() * estados.length)];
      const idFactura = `FACT-TEST-${Date.now()}-${i}`;
      const valorFactura = Math.floor(Math.random() * 900000) + 50000; // Entre 50,000 y 950,000
      
      const sql = `
        INSERT INTO pedidos (
          usuario_id, cliente_id, destino_id, id_factura, tipo_documento_id, 
          prioridad, valor_factura, fecha_facturacion, fecha_promesa, fecha_agendada, 
          estado_entrega, vehiculo_id, conductor_id, total_despachado, valor_factura_pendiente
        ) VALUES (?, ?, ?, ?, ?, 'Media', ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `;
      
      const values = [
        usuarioId, clienteId, destinoId, idFactura, tipoDocId,
        valorFactura, hoy, hoy, hoy,
        estado, vehiculoId, usuarioId, valorFactura
      ];

      batch.push(db.query(sql, values));

      // Ejecutar en lotes de 100 para no sobrecargar la memoria / conexiones
      if (batch.length === 100) {
        await Promise.all(batch);
        batch = [];
        console.log(`   -> Lote procesado: ${i + 1} pedidos...`);
      }
    }
    
    // Insertar el restante si quedó algo en el batch
    if (batch.length > 0) {
      await Promise.all(batch);
    }

    console.log(`✅ 1000 pedidos insertados correctamente.`);
    console.log("\n🎉 PROCESO FINALIZADO CON ÉXITO.");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Error durante la inserción de datos:", error);
    process.exit(1);
  }
}

seed();
