const pool = require('../db');

const getReporteFinanciero = async (req, res) => {
  try {
    const fechaInicio = req.query.fechaInicio;
    let fechaFin = req.query.fechaFin;

    let querySQL = `
      SELECT 
        p.id_factura,
        DATE_FORMAT(COALESCE(p.fecha_agendada, p.fecha_facturacion), '%Y-%m-%d') AS fecha,
        c.nombre AS cliente,
        u.nombre_completo AS conductor,
        p.estado_entrega,
        COALESCE(
          (p.valor_factura - COALESCE(
            (SELECT SUM(ppd.cantidad_retirada_cliente * ppd.precio_unitario) 
             FROM pedidos_productos_detalle ppd 
             WHERE ppd.pedido_id = p.id), 
          0)), 
        0) AS valor_factura,
        
        -- 👇 EL GRAN CAMBIO: Ahora sí leemos la plata real guardada en la base de datos 👇
        COALESCE(p.valor_recaudado, 0) AS valor_recaudado,
        
        -- Valor de productos retirados en mostrador
        COALESCE(
          (SELECT SUM(ppd.cantidad_retirada_cliente * ppd.precio_unitario) 
           FROM pedidos_productos_detalle ppd 
           WHERE ppd.pedido_id = p.id), 
        0) AS valor_mostrador
        
        -- Nota: El "saldo_pendiente" ya no lo calculamos aquí porque React lo 
        -- calcula automáticamente sumando los viajes de la misma factura.
        
      FROM pedidos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN usuarios u ON p.conductor_id = u.id
      WHERE COALESCE(p.fecha_agendada, p.fecha_facturacion) BETWEEN ? AND ?
      ORDER BY p.fecha_agendada DESC, p.id_factura ASC
    `;

    // Medida de seguridad si no envían fechas
    if (!fechaInicio || !fechaFin) {
        querySQL = querySQL.replace('BETWEEN ? AND ?', 'BETWEEN CURDATE() AND CURDATE()');
        const [filas] = await pool.query(querySQL);
        return res.json(filas);
    }

    // Le agregamos la hora final para abarcar todo el último día
    const finDelDia = `${fechaFin} 23:59:59`;

    const [filas] = await pool.query(querySQL, [fechaInicio, finDelDia]);
    res.json(filas);
  } catch (error) {
    console.error("Error en reporte financiero:", error);
    res.status(500).json({ error: "Error al generar reporte financiero" });
  }
};

module.exports = { getReporteFinanciero };