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

    // 3. Función auxiliar para extraer campo simple
    const extractField = (regexStr, text) => {
      if (!regexStr || regexStr.trim() === '') return null;
      try {
        const regex = new RegExp(regexStr, 'im'); // 'm' for multiline just in case
        const match = text.match(regex);
        return match ? (match[1] !== undefined ? match[1] : match[0]).trim() : null;
      } catch (e) {
        console.error('Error evaluando regex simple:', regexStr, e);
        return null;
      }
    };

    // Función auxiliar para extraer lista (vertical)
    const extractList = (regexStr, text) => {
      if (!regexStr || regexStr.trim() === '') return [];
      try {
        const regex = new RegExp(regexStr, 'gim');
        const matches = [...text.matchAll(regex)];
        // Retornar el grupo de captura 1 si existe, si no, todo el match
        return matches.map(m => (m[1] !== undefined ? m[1] : m[0]).trim());
      } catch (e) {
        console.error('Error evaluando regex de lista:', regexStr, e);
        return [];
      }
    };

    // 4. Extraer campos principales
    const id_factura = extractField(plantilla.regex_id_factura, pdfText) || null;
    const cliente = extractField(plantilla.regex_cliente, pdfText) || null;
    const nit_cliente = extractField(plantilla.regex_nit_cliente, pdfText) || null;
    const telefono_cliente = extractField(plantilla.regex_telefono_cliente, pdfText) || null;
    const valor_factura_str = extractField(plantilla.regex_valor_factura, pdfText) || null;
    
    // Limpieza de formato número
    // Reemplaza posibles comas de miles y puntos decimales
    let valor_factura = 0;
    if (valor_factura_str) {
      // Si tiene punto de miles y coma de decimales (1.000,50)
      let cleanVal = valor_factura_str.replace(/\./g, '').replace(/,/g, '.');
      // Si tiene coma de miles y punto decimal (1,000.50), arriba quedaría '1000.50' (pues quitó coma). 
      // Por seguridad matemática básica en Colombia asumimos 1.000,50:
      valor_factura = parseFloat(cleanVal) || 0;
    }

    // 5. Extraer arreglos de productos
    const codigos = extractList(plantilla.regex_lista_codigos, pdfText);
    const descripciones = extractList(plantilla.regex_lista_descripciones, pdfText);
    const pesos = extractList(plantilla.regex_lista_pesos, pdfText);
    const cantidades = extractList(plantilla.regex_lista_cantidades, pdfText);
    const unidades = extractList(plantilla.regex_lista_unidades, pdfText);
    const precios_unitarios = extractList(plantilla.regex_lista_precios_unitarios, pdfText);
    const bodegas = extractList(plantilla.regex_lista_bodegas, pdfText);
    const precios_totales = extractList(plantilla.regex_lista_precios_totales, pdfText);

    // 6. Armar el objeto JSON de productos (usando descripciones como eje, o el maximo)
    const productos = [];
    const maxLen = Math.max(
      descripciones.length, codigos.length, cantidades.length
    );

    for (let i = 0; i < maxLen; i++) {
      let cantStr = cantidades[i] || '0';
      let cantidad = parseFloat(cantStr.replace(/\./g, '').replace(/,/g, '.')) || 0;

      let pesoStr = pesos[i] || '0';
      let peso = parseFloat(pesoStr.replace(/\./g, '').replace(/,/g, '.')) || 0;

      let puStr = precios_unitarios[i] || '0';
      let precio_unitario = parseFloat(puStr.replace(/\./g, '').replace(/,/g, '.')) || 0;

      let ptStr = precios_totales[i] || '0';
      let precio_total = parseFloat(ptStr.replace(/\./g, '').replace(/,/g, '.')) || 0;

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
