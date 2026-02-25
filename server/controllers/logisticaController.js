const db = require('../db');

// 1. Obtener TODOS los pedidos agendados para una fecha específica
const getPedidosPorFecha = async (req, res) => {
  const { fecha } = req.query; // Recibimos la fecha desde React

  try {
    // 🔴 CAMBIO AQUÍ: Simplificamos el JOIN de las zonas usando solo zona_id
    const sql = `
      SELECT p.*, 
             c.nombre as nombre_cliente, c.telefono, 
             d.nombre as destino, z.nombre as zona_envio,
             u.nombre_completo as conductor_nombre,
             v.placa as vehiculo_placa
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      LEFT JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN usuarios u ON p.conductor_id = u.id
      LEFT JOIN vehiculos v ON p.vehiculo_id = v.id
      WHERE p.fecha_agendada = ?
      ORDER BY p.estado_entrega DESC, p.id_factura ASC
    `;
    const [pedidos] = await db.query(sql, [fecha]);
    res.json(pedidos);
  } catch (error) {
    console.error("Error al obtener pedidos por fecha:", error);
    res.status(500).json({ error: "Error al cargar pedidos" });
  }
};

// 2. Obtener lista de conductores disponibles (¡CORREGIDO!)
const getConductores = async (req, res) => {
  try {
    // Usamos 'nombre_completo' y 'rol_id = 4' tal como está en tu base de datos
    const sql = "SELECT id, nombre_completo as nombre, email FROM usuarios WHERE rol_id = 4";
    const [conductores] = await db.query(sql);
    res.json(conductores);
  } catch (error) {
    console.error("Error al obtener conductores:", error);
    res.status(500).json({ error: "Error al cargar conductores" });
  }
};

// 3. Obtener lista de vehículos
const getVehiculos = async (req, res) => {
  try {
    const sql = "SELECT * FROM vehiculos";
    const [vehiculos] = await db.query(sql);
    res.json(vehiculos);
  } catch (error) {
    console.error("Error al obtener vehículos:", error);
    res.status(500).json({ error: "Error al cargar vehículos" });
  }
};

// 4. Asignar Vehículo y Conductor al Pedido
const asignarRuta = async (req, res) => {
  const { id } = req.params; 
  const { conductor_id, vehiculo_id } = req.body;

  if (!conductor_id || !vehiculo_id) {
    return res.status(400).json({ error: "Faltan datos de asignación" });
  }

  try {
    const sql = `
      UPDATE pedidos 
      SET conductor_id = ?, vehiculo_id = ?, estado_entrega = 'Asignado' 
      WHERE id = ?
    `;
    await db.query(sql, [conductor_id, vehiculo_id, id]);
    res.json({ message: "Ruta asignada exitosamente" });
  } catch (error) {
    console.error("Error al asignar ruta:", error);
    res.status(500).json({ error: "No se pudo asignar la ruta" });
  }
};

module.exports = { getPedidosPorFecha, getConductores, getVehiculos, asignarRuta };