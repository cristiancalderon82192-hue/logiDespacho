// UBICACIÓN: server/controllers/pedidosController.js
const db = require('../db');

// --- 1. CREAR UN NUEVO PEDIDO ---
const crearPedido = async (req, res) => {
  const data = req.body;
  
  try {
    // 👇 CANDADO 3: VALIDAR FACTURA DUPLICADA 👇
    const [facturaExiste] = await db.query("SELECT id FROM pedidos WHERE id_factura = ?", [data.id_factura]);
    if (facturaExiste.length > 0) {
      return res.status(400).json({ error: `La factura '${data.id_factura}' ya está registrada en el sistema.` });
    }

    // A. VALIDAR EL DESTINO
    let destinoId = data.destino_id;

    if (!destinoId && data.destino) {
      const [destinos] = await db.query("SELECT id FROM destinos WHERE nombre = ?", [data.destino]);
      if (destinos.length > 0) {
        destinoId = destinos[0].id;
      } else {
        return res.status(400).json({ error: `La ciudad '${data.destino}' no está registrada.` });
      }
    }

    if (!destinoId) {
      return res.status(400).json({ error: "Es obligatorio seleccionar una Ciudad de Destino." });
    }

    // B. GESTIÓN DEL CLIENTE
    let [clientes] = await db.query("SELECT id FROM clientes WHERE nombre = ?", [data.nombre_cliente]);
    let cliente_id;

    if (clientes.length > 0) {
      cliente_id = clientes[0].id;
    } else {
      const [resC] = await db.query(
        "INSERT INTO clientes (nombre, telefono) VALUES (?, ?)",
        [data.nombre_cliente, data.telefono || 'Sin telefono']
      );
      cliente_id = resC.insertId;
    }

    // C. OBTENER ID DEL TIPO DE DOCUMENTO
    let tipoDocId = 1; 
    if (data.tipo_documento) {
      const [tipos] = await db.query("SELECT id FROM tipos_documento WHERE nombre = ?", [data.tipo_documento]);
      if (tipos.length > 0) tipoDocId = tipos[0].id;
    }

    // D. INSERTAR PEDIDO
    const sql = `
      INSERT INTO pedidos (
        usuario_id, cliente_id, destino_id, id_factura, tipo_documento_id, 
        prioridad, valor_factura, fecha_facturacion, fecha_promesa, fecha_agendada, hora_registro, 
        nota_manual, estado_entrega
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
    `;

    const values = [
      data.usuario_id || 1, 
      cliente_id,
      destinoId,
      data.id_factura,
      tipoDocId, 
      data.prioridad,
      data.valor_factura || 0, 
      data.fecha_facturacion,
      data.fecha_promesa,
      data.fecha_agendada || null,
      data.hora_registro,
      data.nota_manual
    ];

    const [result] = await db.query(sql, values);
    const pedido_id = result.insertId;

    // E. INSERTAR DETALLE DE PESOS
    for (let i = 1; i <= 8; i++) {
      const pesoKey = `peso_b${i}`;
      const peso = Number(data[pesoKey]);
      
      if (peso > 0) {
        await db.query(
          "INSERT INTO pedidos_detalle (pedido_id, bodega_id, peso) VALUES (?, ?, ?)", 
          [pedido_id, i, peso]
        );
      }
    }

    res.json({ message: "Pedido guardado exitosamente", id: pedido_id });

  } catch (error) {
    console.error("Error al crear pedido:", error);
    res.status(500).json({ error: "Error interno: " + error.message });
  }
};

// --- 2. LISTAR PEDIDOS POR RANGO DE FECHA ---
const listarPedidosRango = async (req, res) => {
  let { inicio, fin } = req.query;
  if (fin) fin = `${fin} 23:59:59`;

  try {
    const sql = `
      SELECT 
        p.id, p.id_factura, p.prioridad, p.estado_entrega,
        p.observaciones_entrega, p.valor_factura_pendiente,
        td.nombre as tipo_documento,
        DATE_FORMAT(p.fecha_facturacion, '%Y-%m-%d') as fecha_facturacion,
        DATE_FORMAT(p.fecha_agendada, '%Y-%m-%d') as fecha_agendada,
        c.nombre as nombre_cliente, 
        d.nombre as destino,  
        z.nombre as zona_envio, 
        COALESCE(SUM(pd.peso), 0) as total_peso
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id  
      LEFT JOIN zonas z ON d.zona_id = z.id 
      LEFT JOIN tipos_documento td ON p.tipo_documento_id = td.id
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      WHERE p.fecha_agendada BETWEEN ? AND ? 
      GROUP BY p.id 
      ORDER BY 
        CASE 
          WHEN p.estado_entrega = 'Pendiente' THEN 1
          WHEN p.estado_entrega = 'Asignado' THEN 2
          WHEN p.estado_entrega = 'En Ruta' THEN 3
          ELSE 4 
        END,
        p.fecha_agendada DESC, p.id_factura ASC 
    `;

    const [rows] = await db.query(sql, [inicio, fin]);
    res.json(rows);

  } catch (error) {
    console.error("Error al listar pedidos:", error);
    res.status(500).json({ error: "Error al obtener la lista de pedidos." });
  }
};

// --- 3. OBTENER DATOS DASHBOARD ---
const obtenerDashboard = async (req, res) => {
  let { inicio, fin } = req.query;
  if (fin) fin = fin + ' 23:59:59';
  const fechas = [inicio, fin];

  try {
    const [kpisHeader] = await db.query(`
      SELECT COUNT(*) as total_pedidos, COALESCE(SUM(valor_factura), 0) as total_valor
      FROM pedidos WHERE fecha_agendada BETWEEN ? AND ?
    `, fechas);

    const [kpisDetalle] = await db.query(`
      SELECT COALESCE(SUM(pd.peso), 0) as total_peso
      FROM pedidos_detalle pd JOIN pedidos p ON pd.pedido_id = p.id
      WHERE p.fecha_agendada BETWEEN ? AND ?
    `, fechas);

    const [bodegas] = await db.query(`
      SELECT b.nombre, COALESCE(SUM(pd.peso), 0) as peso
      FROM pedidos_detalle pd JOIN pedidos p ON pd.pedido_id = p.id
      JOIN bodegas b ON pd.bodega_id = b.id
      WHERE p.fecha_agendada BETWEEN ? AND ? GROUP BY b.id
    `, fechas);

    const bodegasObj = {};
    bodegas.forEach(b => {
      const key = 'b' + b.nombre.replace(/\D/g, ''); 
      bodegasObj[key] = b.peso;
    });

    const [destinos] = await db.query(`
      SELECT d.nombre as destino, COUNT(DISTINCT p.id) as entregas, COALESCE(SUM(pd.peso), 0) as peso
      FROM pedidos p JOIN destinos d ON p.destino_id = d.id LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      WHERE p.fecha_agendada BETWEEN ? AND ? GROUP BY d.id ORDER BY peso DESC LIMIT 5
    `, fechas);

    const [prioridad] = await db.query(`
      SELECT prioridad, COUNT(*) as cantidad FROM pedidos WHERE fecha_agendada BETWEEN ? AND ? GROUP BY prioridad
    `, fechas);

    res.json({
      kpis: { total_pedidos: kpisHeader[0].total_pedidos, total_valor: kpisHeader[0].total_valor, total_peso: kpisDetalle[0].total_peso },
      bodegas: bodegasObj, destinos, prioridad
    });

  } catch (error) {
    res.status(500).json({ error: "Error calculando estadísticas" });
  }
};

// --- 4. OBTENER UN PEDIDO POR ID ---
const obtenerPedidoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const sqlHeader = `
      SELECT p.*, td.nombre as tipo_documento, c.nombre as nombre_cliente, c.telefono, d.nombre as destino_nombre, z.nombre as zona_nombre
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN destinos d ON p.destino_id = d.id
      JOIN zonas z ON d.zona_id = z.id
      LEFT JOIN tipos_documento td ON p.tipo_documento_id = td.id
      WHERE p.id = ?
    `;
    const [header] = await db.query(sqlHeader, [id]);
    
    if (header.length === 0) return res.status(404).json({ error: "Pedido no encontrado" });

    const [detalles] = await db.query("SELECT bodega_id, peso FROM pedidos_detalle WHERE pedido_id = ?", [id]);

    const pedido = header[0];
    pedido.destino = pedido.destino_nombre; 
    pedido.zona_envio = pedido.zona_nombre;

    for (let i = 1; i <= 8; i++) {
      const det = detalles.find(d => d.bodega_id === i);
      pedido[`peso_b${i}`] = det ? det.peso : 0;
    }

    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar el pedido" });
  }
};

// --- 5. ACTUALIZAR PEDIDO (PUT) ---
const actualizarPedido = async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // 👇 CANDADO 3: VALIDAR FACTURA DUPLICADA AL EDITAR 👇
    const [facturaExiste] = await db.query("SELECT id FROM pedidos WHERE id_factura = ? AND id != ?", [data.id_factura, id]);
    if (facturaExiste.length > 0) {
      return res.status(400).json({ error: `La factura '${data.id_factura}' ya pertenece a otro pedido.` });
    }

    let destinoId = data.destino_id;
    if (!destinoId && data.destino) {
      const [destinos] = await db.query("SELECT id FROM destinos WHERE nombre = ?", [data.destino]);
      if (destinos.length > 0) destinoId = destinos[0].id;
    }

    let cliente_id = data.cliente_id; 
    if (data.nombre_cliente) {
      let [clientes] = await db.query("SELECT id FROM clientes WHERE nombre = ?", [data.nombre_cliente]);
      if (clientes.length > 0) {
        cliente_id = clientes[0].id;
      } else {
        const [resC] = await db.query("INSERT INTO clientes (nombre, telefono) VALUES (?, ?)", [data.nombre_cliente, data.telefono || 'Sin telefono']);
        cliente_id = resC.insertId;
      }
    }

    let tipoDocId = 1; 
    if (data.tipo_documento) {
      const [tipos] = await db.query("SELECT id FROM tipos_documento WHERE nombre = ?", [data.tipo_documento]);
      if (tipos.length > 0) tipoDocId = tipos[0].id;
    }

    const sql = `
      UPDATE pedidos SET 
        id_factura=?, tipo_documento_id=?, prioridad=?, 
        valor_factura=?, fecha_facturacion=?, fecha_promesa=?, fecha_agendada=?, hora_registro=?, 
        nota_manual=?, destino_id=?, cliente_id=?
      WHERE id=?
    `;
    
    await db.query(sql, [
      data.id_factura, tipoDocId, data.prioridad,
      data.valor_factura || 0, data.fecha_facturacion, data.fecha_promesa, 
      data.fecha_agendada || null, 
      data.hora_registro, data.nota_manual, 
      destinoId, cliente_id, id
    ]);

    await db.query("DELETE FROM pedidos_detalle WHERE pedido_id = ?", [id]);

    for (let i = 1; i <= 8; i++) {
      const peso = Number(data[`peso_b${i}`]);
      if (peso > 0) {
        await db.query("INSERT INTO pedidos_detalle (pedido_id, bodega_id, peso) VALUES (?, ?, ?)", [id, i, peso]);
      }
    }

    res.json({ message: "Pedido actualizado correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar pedido" });
  }
};

// --- 6. ELIMINAR PEDIDO (DELETE) ---
const eliminarPedido = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM pedidos_detalle WHERE pedido_id = ?", [id]);
    await db.query("DELETE FROM pedidos WHERE id = ?", [id]);
    res.json({ message: "Pedido eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar pedido" });
  }
};

// --- EXPORTAR TODO ---
module.exports = { 
  crearPedido, listarPedidosRango, obtenerDashboard, obtenerPedidoPorId, actualizarPedido, eliminarPedido 
};