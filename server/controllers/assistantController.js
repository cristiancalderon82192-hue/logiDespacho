const Groq = require('groq-sdk');
const db = require('../db');

const apiKey = process.env.GROQ_API_KEY;

let groq;
if (apiKey && apiKey.startsWith('gsk_')) {
  try {
    groq = new Groq({ apiKey: apiKey });
  } catch (error) {
    console.warn("⚠️ Error al inicializar Groq AI:", error.message);
  }
} else {
  console.warn("⚠️ La API Key de Groq no está configurada o es inválida. El asistente no funcionará.");
}

const DB_SCHEMA = `
ESQUEMA DE LA BASE DE DATOS LOGIDESPACHO:
- pedidos: id, usuario_id, cliente_id, id_factura (el numero alfanumerico de la guia), tipo_documento_id, prioridad, valor_factura, destino_id, conductor_id, vehiculo_id, estado_entrega ('Pendiente','Asignado','En Ruta','Entregado','Entregado Incompleto','Devolución'), fecha_agendada, fecha_entrega_conductor, observaciones_entrega, fecha_facturacion, nota_manual, total_despachado, valor_factura_pendiente, numero_viaje, tipo_entrega ('Bodega', 'Domicilio')
- clientes: id, documento, nombre, telefono, direccion_exacta
- usuarios (los conductores tienen rol_id=4): id, nombre_completo, email, rol_id, estado, bodega_id
- vehiculos: id, placa, modelo, capacidad_kg, estado
- bodegas: id, nombre
- destinos: id, nombre, zona_id
- zonas: id, nombre
- bodega_pendientes: id, fecha_factura, factura_num, estado ('Pendiente','Parcial','Entregado')
- bodega_pendientes_detalle: id, pendiente_id, nombre_producto, cantidad_pendiente, cantidad_entregada, bodega_id
`;

const MANUAL_USUARIO = `
MANUAL DE FUNCIONAMIENTO DE "LOGIDESPACHO" (MÓDULOS):
1. Administrador (Super Admin): Tiene acceso a configuraciones base (Clientes, Zonas, Destinos, Flota, Usuarios) y puede crear/editar Pedidos en "Gestión de Pedidos". También tiene acceso a todos los Reportes Financieros y de Productividad.
2. Logística: Se encarga de la "Asignación de Rutas". Toma pedidos 'Pendientes', selecciona un Vehículo y un Conductor, y los pasa a estado 'Asignado'.
3. Líder / Comercial: Su única función es registrar nuevos Pedidos/Facturas en el sistema para que Logística los despache.
4. Bodeguero: Gestiona los productos físicos. Despacha pedidos a los conductores y si falta mercancía, crea "Pendientes de Bodega".
5. Conductor: Accede desde su celular ("Mi Ruta"). Inicia viaje para pasar pedidos a 'En Ruta' y reporta si fue 'Entregado', 'Devolución' o 'Incompleto' (subiendo foto y observación).
- Flujo de un pedido: Pendiente -> Asignado -> En Ruta -> Entregado.
- Si te preguntan "¿Cómo hago algo?", explícalo usando este manual e indícales a qué pantalla o rol deben ir. No uses SQL para estas preguntas, solo explícalo con palabras amables.
- REGLA DE ORO: NO INVENTES FUNCIONES. El sistema NO permite personalizar reportes, NO permite agregar columnas y NO tiene funciones mágicas no descritas aquí. Los reportes son fijos y estáticos. Cíñete a la realidad del programa.
`;

const SYSTEM_INSTRUCTION = `
Eres el Asistente Analista de Datos y Soporte oficial de "LogiDespacho".

Tu SUPERPODER es que puedes responder dudas sobre cómo usar el programa, O bien, puedes leer la base de datos de MySQL si te piden información real usando la herramienta "ejecutar_consulta_sql".

${DB_SCHEMA}

${MANUAL_USUARIO}

REGLAS ESTRICTAS PARA GENERAR SQL:
1. SOLO PUEDES GENERAR CONSULTAS \`SELECT\`. JAMÁS uses UPDATE, DELETE, INSERT o DROP.
2. Si te piden relaciones, usa JOINs según el esquema (ej. pedidos.cliente_id = clientes.id, pedidos.conductor_id = usuarios.id).
3. Nunca asumas IDs de texto sin usar LIKE si el usuario busca por nombre o factura. Utiliza '%texto%'.
4. Si el usuario te pregunta algo genérico o conversacional, responde amablemente. No necesitas usar herramientas para todo.

REGLAS DE RESPUESTA:
- MUY IMPORTANTE: Tus respuestas deben ser CONCRETAS, directas y fáciles de entender para los trabajadores de la empresa (Logística, Conductores, Bodegueros).
- NUNCA menciones términos técnicos como "SQL", "tablas", "bases de datos", "JSON" o "consultas". Compórtate como un humano experto en la empresa.
- Habla en términos del negocio: usa palabras como "pedidos", "facturas", "clientes", "rutas" o "vehículos".
- Si te piden un dato, entrégalo directamente sin dar explicaciones largas ni técnicas de cómo lo obtuviste.
- Si te piden una lista de algo, preséntala en un formato de lista (Markdown) claro y limpio.
`;

// ==========================================
// 1. DEFINICIÓN DE HERRAMIENTA SQL (Formato OpenAI/Groq)
// ==========================================
const tools = [
  {
    type: "function",
    function: {
      name: "ejecutar_consulta_sql",
      description: "Ejecuta una consulta SQL SELECT en la base de datos MySQL de LogiDespacho para obtener información de pedidos, usuarios, clientes, etc.",
      parameters: {
        type: "object",
        properties: {
          query_sql: {
            type: "string",
            description: "La consulta SQL en lenguaje MySQL (ej: SELECT nombre_completo FROM usuarios WHERE rol_id = 4)"
          }
        },
        required: ["query_sql"]
      }
    }
  }
];

// ==========================================
// 2. IMPLEMENTACIÓN SEGURA DEL MOTOR SQL
// ==========================================
const ejecutar_consulta_sql = async ({ query_sql }) => {
  try {
    const upperQuery = query_sql.trim().toUpperCase();
    
    // CINTURÓN DE SEGURIDAD 🛡️
    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('SHOW') && !upperQuery.startsWith('DESCRIBE')) {
      return { error: "BLOQUEADO DE SEGURIDAD: Solo tengo permiso para leer (SELECT). Mis protocolos prohíben modificar la base de datos." };
    }

    // LÍMITE DE PROTECCIÓN DE MEMORIA
    let finalQuery = query_sql;
    if (!upperQuery.includes('LIMIT')) {
      finalQuery += " LIMIT 50";
    }

    console.log(`🤖 Groq Ejecutando SQL Seguro: \n${finalQuery}`);
    
    const [rows] = await db.query(finalQuery);
    
    if (rows.length === 0) return { mensaje: "La consulta no devolvió ningún resultado." };
    
    // Purificar resultados de MySQL (Fechas y Buffers) para que el JSON sea puro
    return JSON.parse(JSON.stringify(rows));
  } catch (err) {
    console.error("❌ Error de SQL en la herramienta:", err.message);
    return { error: `La sintaxis de MySQL falló: ${err.message}` };
  }
};

const availableFunctions = {
  ejecutar_consulta_sql
};

// ==========================================
// 3. ENDPOINT PRINCIPAL (CHAT)
// ==========================================
const processChat = async (req, res) => {
  try {
    const { message, history, userRole, userName } = req.body;

    if (!message) return res.status(400).json({ error: "El mensaje es requerido" });
    if (!groq) return res.status(500).json({ error: "El servicio de Groq no está configurado o la API Key falta en el .env." });

    const CONTEXTO_USUARIO = `
    ATENCIÓN: Estás hablando con ${userName || 'Usuario'}, que tiene el rol de [${userRole || 'Invitado'}].
    REGLA DE ACCESO: SOLO puedes responder preguntas y dar información que esté estrictamente relacionada con las funciones y módulos permitidos para el rol de [${userRole || 'Invitado'}], según el MANUAL_USUARIO. 
    Si el usuario te pide información, gráficas, reportes o accesos que corresponden a OTRO rol, DEBES DENEGAR LA SOLICITUD educadamente diciendo algo como "Lo siento, tu rol de ${userRole || 'Invitado'} no tiene permisos para realizar esta acción o ver esta información."
    `;

    // Adaptar el historial al formato estándar (system, user, assistant)
    const messages = [
      { role: "system", content: CONTEXTO_USUARIO + '\n\n' + SYSTEM_INSTRUCTION },
    ];

    (history || []).forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    messages.push({ role: "user", content: message });

    // PRIMERA LLAMADA: Groq evalúa si debe responder o usar herramientas
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Modelo hiper-rápido y muy inteligente
      messages: messages,
      temperature: 0.1,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    // Verificar si Groq decidió llamar a una herramienta
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      
      let functionArgs = {};
      try {
        functionArgs = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Error al parsear los argumentos de la función de Groq");
      }

      let result;
      if (availableFunctions[functionName]) {
        result = await availableFunctions[functionName](functionArgs);
      } else {
        result = { error: "Función desconocida." };
      }

      // Añadimos la respuesta de Groq que solicita usar la herramienta
      messages.push(responseMessage);
      
      // Añadimos el resultado real de la base de datos
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: functionName,
        content: JSON.stringify(result) // El contenido debe ser un string
      });

      // SEGUNDA LLAMADA: Groq analiza los datos leídos y explica al usuario
      const secondResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.2,
      });

      return res.json({
        success: true,
        response: secondResponse.choices[0].message.content
      });
    }

    // Si no usó herramientas, devolvemos la respuesta de texto
    res.json({
      success: true,
      response: responseMessage.content
    });

  } catch (error) {
    console.error("Error global en assistantController (Groq):", error);
    res.status(500).json({ 
      error: "Ocurrió un error al procesar tu petición.",
      details: error.message 
    });
  }
};

module.exports = {
  processChat
};
