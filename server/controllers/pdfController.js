const pdfParse = require('pdf-parse');
const db = require('../db');

const extraerFactura = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo PDF.' });
    }

    // 1. Extraer texto del PDF
    const dataBuffer = req.file.buffer;
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim() === '') {
      return res.status(400).json({ error: 'El PDF parece estar vacío o es una imagen sin texto.' });
    }

    // 2. Buscar plantilla aplicable en la BD
    const [plantillas] = await db.query('SELECT * FROM plantillas_pdf');
    const plantilla = plantillas.find(p => pdfText.includes(p.keyword_identificador));

    if (!plantilla) {
      return res.status(404).json({ error: 'Formato desconocido: No existe una plantilla de extracción configurada para este formato de PDF.' });
    }

    // 3. Funciones auxiliares para extraer
    const extractField = (regexStr, text) => {
      if (!regexStr || regexStr.trim() === '') return null;
      try {
        const regex = new RegExp(regexStr, 'im');
        const match = text.match(regex);
        return match ? (match[1] !== undefined ? match[1] : match[0]).trim() : null;
      } catch (e) {
        return null;
      }
    };

    const extractList = (regexStr, text) => {
      if (!regexStr || regexStr.trim() === '') return [];
      try {
        const regex = new RegExp(regexStr, 'gim');
        const matches = [...text.matchAll(regex)];
        return matches.map(m => (m[1] !== undefined ? m[1] : m[0]).trim());
      } catch (e) {
        return [];
      }
    };

    // Función inteligente para parsear números en formato americano (1,000.50) y colombiano (1.000,50)
    const parseNumber = (numStr) => {
      if (!numStr) return 0;
      let str = String(numStr).trim();
      const lastComma = str.lastIndexOf(',');
      const lastPeriod = str.lastIndexOf('.');
      
      if (lastComma > lastPeriod) {
        // Formato Colombiano: 1.234,50
        str = str.replace(/\./g, '').replace(',', '.');
      } else if (lastPeriod > lastComma) {
        // Formato Americano: 1,234.50
        // Ojo: si es 1.000 sin decimales, el código fallará si asume americano. 
        // Validamos si el punto separa 3 ceros al final.
        if (lastComma === -1 && str.length - lastPeriod - 1 === 3) {
          str = str.replace(/\./g, ''); // Era un separador de miles colombiano
        } else {
          str = str.replace(/,/g, ''); // Americano
        }
      } else {
        // Sin separadores de ambos tipos. Si tiene coma (ej: 1,000), asumimos que era separador de miles.
        str = str.replace(/,/g, '');
      }
      return parseFloat(str) || 0;
    };

    // 4. Extraer campos principales
    const id_factura = extractField(plantilla.regex_id_factura, pdfText) || null;
    const cliente = extractField(plantilla.regex_cliente, pdfText) || null;
    const nit_cliente = extractField(plantilla.regex_nit_cliente, pdfText) || null;
    const telefono_cliente = extractField(plantilla.regex_telefono_cliente, pdfText) || null;
    const valor_factura_str = extractField(plantilla.regex_valor_factura, pdfText) || null;
    
    let valor_factura = parseNumber(valor_factura_str);

    // 5. Extraer arreglos de productos
    const codigos = extractList(plantilla.regex_lista_codigos, pdfText);
    const descripciones = extractList(plantilla.regex_lista_descripciones, pdfText);
    const pesos = extractList(plantilla.regex_lista_pesos, pdfText);
    const cantidades = extractList(plantilla.regex_lista_cantidades, pdfText);
    const unidades = extractList(plantilla.regex_lista_unidades, pdfText);
    const precios_unitarios = extractList(plantilla.regex_lista_precios_unitarios, pdfText);
    const bodegas = extractList(plantilla.regex_lista_bodegas, pdfText);
    const precios_totales = extractList(plantilla.regex_lista_precios_totales, pdfText);

    // 6. Armar el objeto JSON de productos
    const productos = [];
    const maxLen = Math.max(
      descripciones.length, codigos.length, cantidades.length
    );

    for (let i = 0; i < maxLen; i++) {
      let cantidad = parseNumber(cantidades[i]);
      let peso = parseNumber(pesos[i]);
      let precio_unitario = parseNumber(precios_unitarios[i]);
      let precio_total = parseNumber(precios_totales[i]);

      let bdStr = bodegas[i] || '1';
      let bodega_id = parseInt(bdStr.replace(/\D/g, '')) || 1; 

      productos.push({
        codigo_producto: codigos[i] || "",
        descripcion: descripciones[i] || "",
        peso: peso,
        bodega_id: bodega_id,
        cantidad: cantidad,
        unidad_medida: unidades[i] || "und",
        precio_unitario: precio_unitario,
        precio_total: precio_total
      });
    }

    const parsedData = {
      id_factura,
      cliente,
      nit_cliente,
      telefono_cliente,
      valor_factura,
      productos
    };

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('Error procesando PDF de forma nativa:', error);
    return res.status(500).json({ error: 'Error procesando el PDF: ' + error.message });
  }
};

module.exports = { extraerFactura };
