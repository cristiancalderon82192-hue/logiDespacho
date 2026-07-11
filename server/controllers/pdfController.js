const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const extraerFactura = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo PDF.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Falta la GEMINI_API_KEY en el servidor.' });
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

IMPORTANTE: Los números en el texto usan formato de moneda colombiano (punto '.' para miles y coma ',' para decimales. Ejemplo: 5.000,00 representa cinco mil. 714,00 representa setecientos catorce). Debes convertir TODOS los valores numéricos a formato decimal estándar de programación (sin separador de miles, y usando punto '.' para decimales. Ejemplo: 5000.0 y 714.0).

Estructura JSON requerida:
{
  "id_factura": "Busca estrictamente el valor del campo 'Id Doc:' (ej: 1837048). Si no encuentras un Id Doc explícito, usa entonces el 'Número' de factura principal (ej: FAE 84950).",
  "cliente": "Nombre del cliente COMPRADOR. Suele estar al lado de 'Señores:', 'Cliente:' o 'Facturar a:'. NUNCA uses el nombre del encabezado (Ej: DEPÓSITO Y CERÁMICAS EL RODEO), ya que ese es el vendedor.",
  "nit_cliente": "NIT del cliente COMPRADOR. Suele estar cerca de 'Señores' o 'Nit:'. Devuelve el número exacto, ej: 900787714-2. Si no hay NIT del comprador, devuelve null.",
  "telefono_cliente": "Teléfono del cliente (si aparece cerca del bloque de Señores/Cliente)",
  "valor_factura": 150000.0, // NÚMERO DECIMAL. Valor total a pagar. EXCEPCIÓN IMPORTANTE: El campo 'Total a Pagar' suele estar en formato americano (con comas para miles y punto para decimales, ej: $6,396,365.00). Extrae este número correctamente eliminando las comas de miles. (En el ejemplo sería 6396365.0).
  "productos": [
    {
      "codigo_producto": "código (si lo hay)",
      "descripcion": "nombre exacto del producto",
      "peso": 0.0, // NÚMERO DECIMAL, en Kg. ¡IMPORTANTE! Revisa con extremo cuidado la columna 'Peso' (suele ser la primera columna a la izquierda de cada fila de producto). Asocia correctamente el peso a cada ítem en el orden exacto en que aparecen. Si la fila dice '20,00', extrae 20.0. No asumas 0 a menos que explícitamente diga 0,00 o esté vacía.
      "bodega_id": 1, // NÚMERO (1 al 8). Extrae el número de la columna Bod. Ejemplo: Bodega B1 -> 1. Si no especifica, usa 1.
      "cantidad": 1.0, // NÚMERO DECIMAL. Extrae la cantidad exacta. A menudo las cantidades aparecen todas agrupadas en un bloque de números pequeños (ej: 34, 52, 20, 5) que debes emparejar en orden secuencial con cada producto, igual que haces con los pesos y las descripciones.
      "unidad_medida": "und", // string (ej: mts2, Bul, Und, kg).
      "precio_unitario": 0.0, // NÚMERO DECIMAL (Montos monetarios altos).
      "precio_total": 0.0 // NÚMERO DECIMAL (Montos monetarios muy altos).
    }
  ]
}

¡CRÍTICO - CÓMO LEER EL TEXTO!
El extractor de PDF a veces NO lee fila por fila, sino VERTICALMENTE por bloques (todos los pesos juntos, luego todos los códigos, luego todas las descripciones, luego todas las CANTIDADES juntas, luego todas las unidades, etc.). 
Por favor, usa la LÓGICA y el SENTIDO COMÚN para emparejar los datos secuencialmente por posición, sin importar el desorden:
1. CANTIDADES: Suele ser un bloque de números pequeños (ej: 34, 52, 20, 5, 14, 2, 2). Empareja el primer número con el primer producto, el segundo con el segundo, etc. NO asumas que la cantidad está pegada a la unidad en el texto extraído.
2. PESO: Suele ser un bloque de números sueltos (ej: 522,00 o 1.036,00) que NO tienen una unidad de medida pegada. ¡NUNCA confundas el peso con la cantidad, fíjate en el tamaño de los números y su posición!
3. VALORES UNITARIOS Y TOTALES: Son los montos de dinero más grandes (ej: 36.240,40 o 1.213.328,59). ¡No los pongas como cantidades!
4. PORCENTAJES: Los números como '19' o '5.00' suelen ser % de IVA o Descuento. Ignóralos si no te los pido.

Haz un mapeo lógico y semántico (deduciendo qué es cada número por su tamaño y contexto) para construir los productos correctamente. Mapea el Peso a 'peso' y la Cantidad a 'cantidad'.

Texto de la factura:
----------------
${pdfText}
----------------
`;

    // 3. Llamar a la IA (Gemini)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    });

    const result = await model.generateContent(prompt);
    const responseContent = result.response.text();
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
