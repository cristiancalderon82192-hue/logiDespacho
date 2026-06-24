const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const extraerFactura = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo PDF.' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Falta la GROQ_API_KEY en el servidor.' });
    }

    // 1. Extraer texto del PDF
    const dataBuffer = req.file.buffer;
    const pdfData = await pdfParse(dataBuffer);
    let pdfText = pdfData.text;

    // OCULTAR EL NIT DE LA EMPRESA EMISORA (Puntualito / Agropecuaria)
    // Esto evita que la IA asuma que es el NIT del cliente
    pdfText = pdfText.replace(/901\.?248\.?396([-\s]\d)?/g, "[NIT_EMISOR_IGNORAR]");

    if (!pdfText || pdfText.trim() === '') {
      return res.status(400).json({ error: 'El PDF parece estar vacío o es una imagen sin texto.' });
    }

    // 2. Definir el prompt pidiendo JSON estricto
    const prompt = `Analiza el siguiente texto extraído de una factura comercial y extrae los datos correspondientes en formato JSON ESTRICTO.
Solo debes devolver un objeto JSON válido, sin ningún texto adicional, sin formato de markdown (no uses \`\`\`json).

Estructura JSON requerida:
{
  "id_factura": "Número de factura o documento principal",
  "cliente": "Nombre del cliente COMPRADOR. Suele estar al lado de 'Señores:', 'Cliente:' o 'Facturar a:'. NUNCA uses el nombre del encabezado (Ej: DEPÓSITO Y CERÁMICAS EL RODEO), ya que ese es el vendedor.",
  "nit_cliente": "NIT del cliente COMPRADOR. Suele estar cerca de 'Señores' o 'Nit:'. Devuelve el número exacto, ej: 900787714-2. Si no hay NIT del comprador, devuelve null.",
  "telefono_cliente": "Teléfono del cliente (si aparece cerca del bloque de Señores/Cliente)",
  "valor_factura": 150000.0, // número, valor total
  "productos": [
    {
      "codigo_producto": "código (si lo hay)",
      "descripcion": "nombre del producto",
      "peso": 0, // número, en Kg. Si no lo dice, usa 0
      "bodega_id": 1, // número (1 al 8). Ejemplo: Bodega 2 -> 2. Si no especifica, usa 1
      "cantidad": 1.0, // número
      "unidad_medida": "und", // string
      "precio_unitario": 0.0, // número
      "precio_total": 0.0 // número
    }
  ]
}

Asegúrate de limpiar los números (sin signos de dólar, usa punto como separador decimal si es necesario, o trata la coma como miles según contexto común en Colombia). 
Si falta algún dato, usa null o 0 según el tipo.

Texto de la factura:
----------------
${pdfText}
----------------
`;

    // 3. Llamar a la IA (Groq)
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Modelo muy capaz para JSON y análisis
      messages: [
        { role: 'system', content: 'You are a helpful assistant that parses invoices and ALWAYS outputs valid JSON. Never output conversational text.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Baja temperatura para mayor precisión
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("La IA no devolvió contenido.");
    }

    const parsedData = JSON.parse(responseContent);

    // Formatear/Limpiar datos antes de enviar al cliente
    if (!parsedData.productos || !Array.isArray(parsedData.productos)) {
      parsedData.productos = [];
    }

    parsedData.productos = parsedData.productos.map(p => ({
      ...p,
      peso: Number(p.peso) || 0,
      bodega_id: Number(p.bodega_id) || 1, // Default a 1 si la IA falla
      unidad_medida: p.unidad_medida || 'und'
    }));

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('Error procesando PDF:', error);
    return res.status(500).json({ error: 'Error procesando el PDF con la IA: ' + error.message });
  }
};

module.exports = { extraerFactura };
