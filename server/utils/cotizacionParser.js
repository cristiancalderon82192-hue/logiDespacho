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

  const regexFinProducto = /\n(B\d)\s*\n(mts2|Bul|Und|Caja|Cj|Par|Unds)\s+([\d\.,]+)\s+([\d\.,]+)/ig;
  const matches = [...pdfText.matchAll(regexFinProducto)];
  
  if (matches.length === 0) return [];

  const productos = [];
  let lastIndex = pdfText.indexOf('Vlr Iva Inclu.');
  if (lastIndex === -1) lastIndex = 0;

  for (const match of matches) {
    const chunkText = pdfText.substring(lastIndex, match.index);
    lastIndex = match.index + match[0].length;
    
    let prod = {
        bodega_id: parseInt(match[1].replace(/\D/g, '')) || 1,
        unidad_medida: match[2].toLowerCase(),
        peso: parseNum(match[3]),
        precio_total: 0, // Lo extraeremos (Total Bruto o Neto, no importa, es el V/Total extraído del PDF)
        cantidad: 0,
        precio_unitario: 0,
        codigo_producto: "",
        descripcion: ""
    };
    
    // El texto del chunk termina con la descripción (posiblemente pegada a la cantidad)
    // Extraer todo el texto, dividiendo por la expresión de IVA+Codigo
    
    // Buscar el IVA + Codigo: ej. "19159562" o "19\nAC0099\n8"
    // Debe estar precedido por el V/Unitario (un número) y un espacio.
    const regexIvaCodigo = /([\d\.,]+)\s+(19|5|0)(?:\n)?([A-Z0-9]{4,8})(?:\n([A-Z0-9]{1,3}))?(?=\s)/g;
    const codeMatches = [...chunkText.matchAll(regexIvaCodigo)];
    
    // Tomar el primer match válido (así evitamos falsos positivos al final de la descripción como "5CONCOLOR")
    const codeMatch = codeMatches.length > 0 ? codeMatches[0] : null;
    
    if (codeMatch) {
      // codeMatch[0] incluye el precio unitario, así que ajustamos
      prod.codigo_producto = codeMatch[3] + (codeMatch[4] ? codeMatch[4] : "");
      prod.precio_unitario = parseNum(codeMatch[1]);
      
      const textAfter = chunkText.substring(codeMatch.index + codeMatch[0].length);
      
      // En textAfter están el V/Total, Cantidad y Descripcion
      const numsAfterMatches = [...textAfter.matchAll(/([\d\.,]+)/g)];
      
      if (numsAfterMatches.length >= 2) {
        prod.precio_total = parseNum(numsAfterMatches[0][1]); // El primer número es V/Total
        prod.cantidad = parseNum(numsAfterMatches[1][1]); // El segundo es Cantidad
        
        // La descripción es todo lo que sigue al segundo número
        const cantEndIndex = numsAfterMatches[1].index + numsAfterMatches[1][0].length;
        prod.descripcion = textAfter.substring(cantEndIndex).trim().replace(/\n/g, ' ');
      }
    } else {
      // Fallback si no hay código pegado al IVA
      // Simplemente extraer todos los números
      const nums = [...chunkText.matchAll(/[\d\.,]+/g)].map(m => parseNum(m[0]));
      if (nums.length >= 4) { // Dcto?, V/Und, Iva, V/Total, Cant
        prod.cantidad = nums[nums.length - 1];
        prod.precio_total = nums[nums.length - 2];
        prod.precio_unitario = nums.length >= 5 ? nums[nums.length - 4] : nums[nums.length - 3];
      }
      
      // Extraer descripción sacando los números
      prod.descripcion = chunkText.replace(/[\d\.,]+/g, '').trim().replace(/\n/g, ' ');
    }
    
    productos.push(prod);
  }

  return productos;
};

module.exports = { parseCotizacion };
