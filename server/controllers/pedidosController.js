// UBICACIÓN: server/controllers/pedidosController.js
const db = require('../db');

// --- 1. CREAR UN NUEVO PEDIDO ---
const crearPedido = async (req, res) => {
  const data = req.body;
  
  try {
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

    // C. OBTENER ID DEL TIPO DE DOCUMENTO (NUEVO PASO DE NORMALIZACIÓN)
    let tipoDocId = 1; // Por defecto 1 (Factura) por si algo falla
    if (data.tipo_documento) {
      const [tipos] = await db.query("SELECT id FROM tipos_documento WHERE nombre = ?", [data.tipo_documento]);
      if (tipos.length > 0) tipoDocId = tipos[0].id;
    }

    // D. INSERTAR PEDIDO (Se elimina direccion_entrega y se cambia tipo_documento por tipo_documento_id)
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
      tipoDocId, // Usamos el ID buscado arriba
      data.prioridad,
      data.valor_factura || 0, 
      data.fecha_facturacion,
      data.fecha_promesa,
      data.fecha_agendada || null,
      data.hora_registro,
      data.nota_manual
      // Borramos direccion_entrega de aquí
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
    // ACTUALIZADO: Traer nombre del documento con JOIN y remover direccion_entrega
    const sql = `
      SELECT 
        p.id, p.id_factura, p.prioridad, p.estado_entrega,
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
      ORDER BY p.fecha_agendada DESC 
    `;

    const [rows] = await db.query(sql, [inicio, fin]);
    res.json(rows);

  } catch (error) {
    console.error("Error al listar pedidos:", error);
    res.status(500).json({ error: "Error al obtener la lista de pedidos." });
  }
};

// --- 3. OBTENER DATOS DASHBOARD (FILTRADO POR FECHA AGENDADA) ---
const obtenerDashboard = async (req, res) => {
  let { inicio, fin } = req.query;
  if (fin) fin = fin + ' 23:59:59';
  const fechas = [inicio, fin];

  try {
    // A. KPIs DE CABECERA
    const [kpisHeader] = await db.query(`
      SELECT 
        COUNT(*) as total_pedidos, 
        COALESCE(SUM(valor_factura), 0) as total_valor
      FROM pedidos 
      WHERE fecha_agendada BETWEEN ? AND ?
    `, fechas);

    // B. KPIs DE DETALLE (Solo para sumar pesos)
    const [kpisDetalle] = await db.query(`
      SELECT COALESCE(SUM(pd.peso), 0) as total_peso
      FROM pedidos_detalle pd
      JOIN pedidos p ON pd.pedido_id = p.id
      WHERE p.fecha_agendada BETWEEN ? AND ?
    `, fechas);

    // C. Bodegas
    const [bodegas] = await db.query(`
      SELECT b.nombre, COALESCE(SUM(pd.peso), 0) as peso
      FROM pedidos_detalle pd
      JOIN pedidos p ON pd.pedido_id = p.id
      JOIN bodegas b ON pd.bodega_id = b.id
      WHERE p.fecha_agendada BETWEEN ? AND ?
      GROUP BY b.id
    `, fechas);

    const bodegasObj = {};
    bodegas.forEach(b => {
      const key = 'b' + b.nombre.replace(/\D/g, ''); 
      bodegasObj[key] = b.peso;
    });

    // D. Top Destinos
    const [destinos] = await db.query(`
      SELECT 
        d.nombre as destino, 
        COUNT(DISTINCT p.id) as entregas, 
        COALESCE(SUM(pd.peso), 0) as peso
      FROM pedidos p
      JOIN destinos d ON p.destino_id = d.id 
      LEFT JOIN pedidos_detalle pd ON p.id = pd.pedido_id
      WHERE p.fecha_agendada BETWEEN ? AND ?
      GROUP BY d.id 
      ORDER BY peso DESC 
      LIMIT 5
    `, fechas);

    // E. Prioridades
    const [prioridad] = await db.query(`
      SELECT prioridad, COUNT(*) as cantidad 
      FROM pedidos 
      WHERE fecha_agendada BETWEEN ? AND ? 
      GROUP BY prioridad
    `, fechas);

    // Unir resultados
    res.json({
      kpis: {
        total_pedidos: kpisHeader[0].total_pedidos,
        total_valor: kpisHeader[0].total_valor, 
        total_peso: kpisDetalle[0].total_peso
      },
      bodegas: bodegasObj,
      destinos,
      prioridad
    });

  } catch (error) {
    console.error("Error en Dashboard:", error);
    res.status(500).json({ error: "Error calculando estadísticas" });
  }
};

// --- 4. OBTENER UN PEDIDO POR ID (Para editar) ---
const obtenerPedidoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    // ACTUALIZADO: Traer el texto del tipo_documento para que React lo entienda
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

    // 2. Datos de los pesos
    const [detalles] = await db.query("SELECT bodega_id, peso FROM pedidos_detalle WHERE pedido_id = ?", [id]);

    const pedido = header[0];
    pedido.destino = pedido.destino_nombre; 
    pedido.zona_envio = pedido.zona_nombre;

    // Mapear pesos (peso_b1... peso_b8)
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
    // 1. GESTIÓN DEL DESTINO
    let destinoId = data.destino_id;
    if (!destinoId && data.destino) {
      const [destinos] = await db.query("SELECT id FROM destinos WHERE nombre = ?", [data.destino]);
      if (destinos.length > 0) destinoId = destinos[0].id;
    }

    // 2. GESTIÓN DEL CLIENTE
    let cliente_id = data.cliente_id; 
    
    if (data.nombre_cliente) {
      let [clientes] = await db.query("SELECT id FROM clientes WHERE nombre = ?", [data.nombre_cliente]);
      
      if (clientes.length > 0) {
        cliente_id = clientes[0].id;
      } else {
        const [resC] = await db.query(
          "INSERT INTO clientes (nombre, telefono) VALUES (?, ?)",
          [data.nombre_cliente, data.telefono || 'Sin telefono']
        );
        cliente_id = resC.insertId;
      }
    }

    // 3. OBTENER ID DEL TIPO DE DOCUMENTO (NUEVO)
    let tipoDocId = 1; 
    if (data.tipo_documento) {
      const [tipos] = await db.query("SELECT id FROM tipos_documento WHERE nombre = ?", [data.tipo_documento]);
      if (tipos.length > 0) tipoDocId = tipos[0].id;
    }

    // 4. ACTUALIZAR EL PEDIDO (Cambios en columnas)
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

    // 5. Actualizar Pesos: Borrar viejos e insertar nuevos
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
  crearPedido, 
  listarPedidosRango, 
  obtenerDashboard, 
  obtenerPedidoPorId, 
  actualizarPedido, 
  eliminarPedido 
};