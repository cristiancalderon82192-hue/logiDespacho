const pool = require('../db');

const getReporteEfectividad = async (req, res) => {
  try {
    const [filas] = await pool.query(`
      SELECT 
        p.id_factura,
        c.nombre AS cliente,
        DATE_FORMAT(p.fecha_promesa, '%Y-%m-%d') AS fecha_promesa,
        DATE_FORMAT(p.fecha_entrega_conductor, '%Y-%m-%d %H:%i') AS fecha_real_entrega,
        p.estado_entrega,
        CASE 
          WHEN p.estado_entrega IN ('Entregado', 'Entregado Incompleto') AND DATE(p.fecha_entrega_conductor) <= p.fecha_promesa THEN 'A Tiempo'
          WHEN p.estado_entrega IN ('Entregado', 'Entregado Incompleto') AND DATE(p.fecha_entrega_conductor) > p.fecha_promesa THEN 'Atrasado'
          WHEN p.estado_entrega = 'Devolución' THEN 'Fallido (Devolución)'
          ELSE 'Pendiente en Ruta'
        END AS nivel_servicio
      FROM pedidos p
      INNER JOIN clientes c ON p.cliente_id = c.id
      ORDER BY p.fecha_promesa DESC
    `);
    res.json(filas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en reporte de efectividad" });
  }
};

module.exports = { getReporteEfectividad };