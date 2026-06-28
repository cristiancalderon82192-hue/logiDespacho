const pool = require('../db');

const getReporteMovimientos = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, zona, ciudad, vehiculo } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: "Las fechas son obligatorias" });
    }

    // 👇 MAGIA SQL: Unimos pedidos_detalle y bodegas para traer el peso y nombre 👇
    let querySQL = `
      SELECT 
        p.id_factura, 
        c.nombre AS nombre_cliente, 
        c.telefono, 
        d.nombre AS ciudad, 
        z.nombre AS zona_envio, 
        v.placa AS vehiculo_placa, 
        p.estado_entrega, 
        p.created_at AS fecha_creacion,
        b.nombre AS bodega, 
        pd.peso,
        p.valor_factura
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN vehiculos v ON p.vehiculo_id = v.id
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      LEFT JOIN bodegas b ON pd.bodega_id = b.id
      WHERE DATE(p.created_at) BETWEEN ? AND ?
    `;
    
    let queryParams = [fechaInicio, fechaFin];

    if (zona) {
      querySQL += ` AND z.nombre = ?`;
      queryParams.push(zona);
    }
    
    if (ciudad) {
      querySQL += ` AND d.nombre = ?`;
      queryParams.push(ciudad);
    }

    if (vehiculo) {
      querySQL += ` AND v.placa = ?`;
      queryParams.push(vehiculo);
    }

    querySQL += ` ORDER BY p.created_at DESC`;

    const [resultados] = await pool.query(querySQL, queryParams);
    res.json(resultados);

  } catch (error) {
    console.error("Error generando reporte de movimientos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
const getFiltrosOpciones = async (req, res) => {
  try {
    // 1. Vehículos: Traemos las placas de la tabla vehiculos
    const [vehiculos] = await pool.query('SELECT placa FROM vehiculos ORDER BY placa ASC');
    
    // 2. Ciudades: Traemos los nombres de la tabla destinos
    const [ciudades] = await pool.query('SELECT nombre AS ciudad FROM destinos ORDER BY nombre ASC');
    
    // 3. Zonas: Cruzamos la tabla destinos con zonas para saber qué zona pertenece a qué ciudad
    const [zonas] = await pool.query(`
      SELECT z.nombre AS zona_envio, d.nombre AS ciudad 
      FROM destinos d
      INNER JOIN zonas z ON d.zona_id = z.id
      ORDER BY z.nombre ASC
    `);

    res.json({
      ciudades: ciudades.map(c => c.ciudad),
      zonas: zonas, 
      vehiculos: vehiculos.map(v => v.placa)
    });
  } catch (error) {
    console.error("Error obteniendo opciones maestras de filtros:", error);
    res.status(500).json({ message: "Error interno del servidor al cargar filtros" });
  }
};

module.exports = {
  getReporteMovimientos,
  getFiltrosOpciones
};