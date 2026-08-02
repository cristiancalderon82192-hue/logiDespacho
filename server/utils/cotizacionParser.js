const parseCotizacion = (pdfText) => {
  const parseNum = (str) => {
    if (!str) return 0;
    let s = String(str).trim();
    const lastComma = s.lastIndexOf(',');
    const lastPeriod = s.lastIndexOf('.');
    if (lastComma > lastPeriod) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (lastPeriod > lastComma) {
      if (lastComma === -1 && s.length - lastPeriod - 1 === 3) {
        s = s.replace(/\./g, '');
      } else {
        s = s.replace(/,/g, '');
      }
    } else {
      s = s.replace(/,/g, '');
    }
    return parseFloat(s) || 0;
  };

  const productos = [];
  const tableStart = pdfText.indexOf("Vlr Iva Inclu.");
  if (tableStart === -1) return [];
  
  const tableText = pdfText.substring(tableStart);
  const lines = tableText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentProduct = null;
  const regexInicioProducto = /^([\d\.,]+)\s+(?:([A-Z0-9]{5,10})\s+)?(B\d)\s+(.*)/;
  const regexUnidad = /\b(mts2|Bul|Und|Caja|Cj)\b/i;
  
  let preBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("Total") || line.startsWith("Excluido") || line.startsWith("Continúa")) continue;
    
    const match = line.match(regexInicioProducto);
    
    if (match) {
      if (currentProduct) productos.push(currentProduct);
      
      currentProduct = {
        peso: parseNum(match[1]),
        codigo_producto: match[2] || "",
        bodegaStr: match[3],
        descripcion: match[4] || "",
        cantidad: 0,
        unidad_medida: "und",
        precio_unitario: 0,
        precio_total: 0,
        _rawBuffer: [...preBuffer, line]
      };
      preBuffer = [];
    } else {
      if (currentProduct) {
        currentProduct._rawBuffer.push(line);
      } else {
        preBuffer.push(line);
      }
    }
  }
  
  if (currentProduct) productos.push(currentProduct);

  productos.forEach((prod) => {
    const textBlock = prod._rawBuffer.join(" ");
    
    if (!prod.codigo_producto) {
      const codeMatch = textBlock.match(/\b([A-Z0-9]{5,10})\b/);
      if (codeMatch && codeMatch[1] !== "UNICO" && codeMatch[1] !== "PREMIUM") {
         prod.codigo_producto = codeMatch[1];
      }
    }

    const unidadMatch = textBlock.match(regexUnidad);
    if (unidadMatch) {
      prod.unidad_medida = unidadMatch[1].toLowerCase();
    }
    
    const nums = [...textBlock.matchAll(/[\d\.,]+/g)].map(m => m[0]);
    const parsedNums = nums.map(parseNum).filter(n => n > 0 && n !== prod.peso);
    
    if (parsedNums.length >= 3) {
      let ivaIndex = parsedNums.lastIndexOf(19);
      if (ivaIndex === -1) ivaIndex = parsedNums.lastIndexOf(5);
      
      if (ivaIndex !== -1 && ivaIndex > 0) {
        prod.precio_total = parsedNums[parsedNums.length - 1];
        
        let precioIndex = ivaIndex - 1;
        while (precioIndex >= 0 && parsedNums[precioIndex] <= 100) {
           precioIndex--;
        }
        
        if (precioIndex >= 0) {
           let precioBruto = parsedNums[precioIndex];
           let iva = parsedNums[ivaIndex];
           prod.precio_unitario = parseFloat((precioBruto / (1 + iva / 100)).toFixed(2));
           prod.precio_total = parseFloat((prod.precio_total / (1 + iva / 100)).toFixed(2));
        }
        
        let cantIndex = precioIndex - 1;
        if (cantIndex >= 0) {
           prod.cantidad = parsedNums[cantIndex];
        }
      } else {
        prod.precio_total = parsedNums[parsedNums.length - 1];
        if (parsedNums.length >= 2) {
          prod.precio_unitario = parsedNums[parsedNums.length - 2];
        }
        if (parsedNums.length >= 3) {
          prod.cantidad = parsedNums[parsedNums.length - 3];
        }
      }
    }
    
    let desc = prod.descripcion;
    const descParts = desc.split(regexUnidad);
    if (descParts.length > 1) {
       let textBeforeUnit = descParts[0].trim();
       let textWords = textBeforeUnit.split(" ");
       if (textWords.length > 0) {
          let possibleCant = textWords.pop();
          if (/[\d\.,]+/.test(possibleCant)) {
             prod.cantidad = parseNum(possibleCant);
             desc = textWords.join(" ");
          } else {
             desc = textBeforeUnit;
          }
       }
    }
    prod.descripcion = desc.substring(0, 80).trim();
    prod.bodega_id = parseInt(prod.bodegaStr.replace(/\D/g, '')) || 1;
    
    delete prod._rawBuffer;
    delete prod.bodegaStr;
  });

  return productos;
};

module.exports = { parseCotizacion };
