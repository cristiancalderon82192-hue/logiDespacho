const db = require('../db');

const ejecutarPruebaDesempeno = async (req, res) => {
  try {
    // 1. Iniciar medición de latencia
    const start = process.hrtime.bigint();

    // 2. Ejecutar la consulta de conteo en la tabla más importante (pedidos)
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM pedidos');
    const totalRegistros = rows[0].total;

    // 3. Finalizar medición de latencia
    const end = process.hrtime.bigint();
    const latenciaMs = Number(end - start) / 1000000; // Convertir nanosegundos a milisegundos

    // 4. Revisar validaciones (Ejemplo: Buscar facturas duplicadas que romperían el "Candado 3")
    const [duplicados] = await db.query(`
      SELECT id_factura, COUNT(*) as cantidad 
      FROM pedidos 
      GROUP BY id_factura 
      HAVING cantidad > 1
    `);

    // Otra validación: Pedidos sin detalle de bodega asociado
    const [sinDetalle] = await db.query(`
      SELECT p.id 
      FROM pedidos p 
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id 
      WHERE pd.id IS NULL
    `);

    res.json({
      success: true,
      data: {
        totalRegistros,
        latenciaMs: parseFloat(latenciaMs.toFixed(2)),
        validaciones: {
          facturasDuplicadas: duplicados.length,
          pedidosSinDetalle: sinDetalle.length,
          stockOK: sinDetalle.length === 0 && duplicados.length === 0
        }
      }
    });

  } catch (error) {
    console.error("Error en prueba de desempeño:", error);
    res.status(500).json({ success: false, error: "Error ejecutando la prueba de desempeño." });
  }
};

module.exports = {
  ejecutarPruebaDesempeno
};
