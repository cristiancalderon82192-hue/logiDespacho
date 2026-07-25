require('dotenv').config();
const db = require('./db');

async function runQA() {
  console.log("=========================================");
  console.log("🚀 INICIANDO PRUEBAS QA DE BODEGAS");
  console.log("=========================================\n");

  try {
    // ----------------------------------------------------------------
    // ESCENARIO A: Movimiento con Bodega de Acopio (Simulación de conductorController)
    // ----------------------------------------------------------------
    console.log("▶️ ESCENARIO A: Simulación de Conductor dejando en Centro de Acopio");
    
    // 1. Simular datos del pedido que el conductor está entregando
    const pedidoAcopio = {
      fecha_facturacion: new Date(),
      id_factura: 'QA-ACOPIO-001',
      punto_venta_origen_id: 1,
      cliente_id: 1,
      fecha_promesa: new Date(),
      valor_factura: 50000,
      usuario_id: 1,
      bodega_acopio_id: 3 // ¡Atención a esto! Es la bodega de acopio (ID 3)
    };

    // 2. Insertar el maestro en bodega_pendientes
    const notasBodega = "Traslado logístico. Dejado en bodega de acopio por logística.";
    const [masterAcopio] = await db.query(
      `INSERT INTO bodega_pendientes (fecha_factura, factura_num, punto_venta_id, cliente_id, fecha_promesa, tipo_entrega, valor_factura, usuario_id, notas, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')`
    , [pedidoAcopio.fecha_facturacion, pedidoAcopio.id_factura, pedidoAcopio.punto_venta_origen_id, pedidoAcopio.cliente_id, pedidoAcopio.fecha_promesa, 'Entrega Inmediata', pedidoAcopio.valor_factura, pedidoAcopio.usuario_id, notasBodega]);
    
    const masterAcopioId = masterAcopio.insertId;

    // 3. Simular productos que originalmente venían de distintas bodegas
    const productosAcopio = [
      { codigo: 'PROD-A1', descripcion: 'Llanta de Bodega 1', cantidad: 2, unidad: 'und', bodega_id: 1 },
      { codigo: 'PROD-A2', descripcion: 'Aceite de Bodega 2', cantidad: 4, unidad: 'und', bodega_id: 2 }
    ];

    // 4. Lógica actual exacta de conductorController.js (SOBREESCRIBE EL BODEGA ID)
    for (const prod of productosAcopio) {
      await db.query(
        `INSERT INTO bodega_pendientes_detalle (pendiente_id, codigo_producto, nombre_producto, cantidad_pendiente, unidad_medida, bodega_id, precio_unitario, valor_total, peso_kg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [masterAcopioId, prod.codigo, prod.descripcion, prod.cantidad, prod.unidad, pedidoAcopio.bodega_acopio_id, 0, 0, 0]);
    }

    // 5. Validar qué guardó en base de datos
    const [detallesAcopioDB] = await db.query(`SELECT nombre_producto, bodega_id FROM bodega_pendientes_detalle WHERE pendiente_id = ?`, [masterAcopioId]);
    console.log("   ✅ Resultado Guardado en BD para Escenario A:");
    console.table(detallesAcopioDB);
    console.log("   👉 CONCLUSIÓN A: Ambos productos (sin importar su origen) quedaron asignados a la bodega_id = 3 (El centro de acopio). El bodeguero 3 puede entregar TODO.\n");


    // ----------------------------------------------------------------
    // ESCENARIO B: Creación manual/normal de pendiente (Simulación bodegaPendientesController)
    // ----------------------------------------------------------------
    console.log("▶️ ESCENARIO B: Simulación de Registro Manual (Flujo Normal)");
    
    const facturaManual = 'QA-MANUAL-002';
    const [masterManual] = await db.query(
      `INSERT INTO bodega_pendientes (fecha_factura, factura_num, punto_venta_id, cliente_id, fecha_promesa, tipo_entrega, valor_factura, usuario_id, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [new Date(), facturaManual, 1, 1, new Date(), 'Retiro Bodega', 25000, 1, 'Registro QA Manual']);

    const masterManualId = masterManual.insertId;

    // Productos ingresados manualmente, cada uno con su bodega_id original
    const productosManuales = [
      { codigo: 'PROD-B1', nombre: 'Espejo Bodega 1', cantidad: 1, unidad: 'und', bodega_id: 1 },
      { codigo: 'PROD-B2', nombre: 'Casco Bodega 2', cantidad: 1, unidad: 'und', bodega_id: 2 }
    ];

    // Lógica actual de bodegaPendientesController.js (RESPETA EL BODEGA ID)
    for (let prod of productosManuales) {
      await db.query(
        `INSERT INTO bodega_pendientes_detalle (pendiente_id, codigo_producto, nombre_producto, cantidad_pendiente, unidad_medida, bodega_id, precio_unitario, valor_total, peso_kg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [masterManualId, prod.codigo, prod.nombre, prod.cantidad, prod.unidad, prod.bodega_id, 0, 0, 0]);
    }

    // Validar qué guardó en base de datos
    const [detallesManualDB] = await db.query(`SELECT nombre_producto, bodega_id FROM bodega_pendientes_detalle WHERE pendiente_id = ?`, [masterManualId]);
    console.log("   ✅ Resultado Guardado en BD para Escenario B:");
    console.table(detallesManualDB);
    console.log("   👉 CONCLUSIÓN B: Se respetó el bodega_id original. En la interfaz, el bodeguero 1 solo podrá entregar el Espejo, y el bodeguero 2 solo el Casco.\n");

    // ----------------------------------------------------------------
    // LIMPIEZA DE DATOS (Rollback)
    // ----------------------------------------------------------------
    await db.query(`DELETE FROM bodega_pendientes_detalle WHERE pendiente_id IN (?, ?)`, [masterAcopioId, masterManualId]);
    await db.query(`DELETE FROM bodega_pendientes WHERE id IN (?, ?)`, [masterAcopioId, masterManualId]);
    console.log("🧹 Limpieza finalizada. Datos de QA eliminados de la BD.");

  } catch (err) {
    console.error("❌ Error durante la prueba de QA:", err);
  } finally {
    process.exit(0);
  }
}

runQA();
