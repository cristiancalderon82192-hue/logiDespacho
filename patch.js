const fs = require('fs');
const filePath = 'logistica-despacho/src/pages/AsignacionLogistica.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '        valoresIniciales[p.id] = {\n          valor_despachar: p.valor_factura || 0,',
  `        const valorRetiradoTotal = productosInit.reduce((acc, p) => acc + (Number(p.cantidad_retirada_cliente || 0) * Number(p.precio_unitario || 0)), 0);\n        const valorNeto = Math.max(0, Number(p.valor_factura || 0) - valorRetiradoTotal);\n        \n        valoresIniciales[p.id] = {\n          valor_despachar: valorNeto,`
);

content = content.replace(
  `      const det = detallesLote[pId];\n      \n      if (Number(det.valor_despachar) > Number(pedidoOriginal.valor_factura)) {\n        return mostrarError(\`❌ ALERTA: La factura \${pedidoOriginal.id_factura} no puede tener un despacho mayor al valor de la factura original.\`);\n      }\n\n      if (Number(det.valor_despachar) < Number(pedidoOriginal.valor_factura)) {`,
  `      const det = detallesLote[pId];\n      \n      const valorRetiradoTotal = pedidoOriginal.productos ? pedidoOriginal.productos.reduce((acc, p) => acc + (Number(p.cantidad_retirada_cliente || 0) * Number(p.precio_unitario || 0)), 0) : 0;\n      const valorNetoMaximo = Math.max(0, Number(pedidoOriginal.valor_factura || 0) - valorRetiradoTotal);\n      \n      if (Number(det.valor_despachar) > valorNetoMaximo) {\n        return mostrarError(\`❌ ALERTA: La factura \${pedidoOriginal.id_factura} no puede tener un despacho mayor al valor neto original.\`);\n      }\n\n      if (Number(det.valor_despachar) < valorNetoMaximo) {`
);

content = content.replace(
  `    setAsignacionIndividual({ \n      conductor_id: pedido.conductor_id || '', \n      vehiculo_id: pedido.vehiculo_id || '',\n      total_despachado: pedido.total_despachado || pedido.valor_factura || '',`,
  `    const valorRetiradoTotal = productosInit.reduce((acc, p) => acc + (Number(p.cantidad_retirada_cliente || 0) * Number(p.precio_unitario || 0)), 0);\n    const valorNeto = Math.max(0, Number(pedido.valor_factura || 0) - valorRetiradoTotal);\n\n    setAsignacionIndividual({ \n      conductor_id: pedido.conductor_id || '', \n      vehiculo_id: pedido.vehiculo_id || '',\n      total_despachado: pedido.total_despachado && Number(pedido.total_despachado) > 0 ? pedido.total_despachado : valorNeto,`
);

content = content.replace(
  `    if (Number(asignacionIndividual.total_despachado) > Number(pedidoIndividual.valor_factura)) {\n      return mostrarError("❌ ALERTA: No puedes despachar un valor mayor al original de la factura.");\n    }\n\n    let payloadAlerta = null;\n    if (Number(asignacionIndividual.total_despachado) < Number(pedidoIndividual.valor_factura)) {`,
  `    const valorRetiradoTotal = asignacionIndividual.productos_despachados.reduce((acc, p) => acc + (Number(p.cantidad_retirada_cliente || 0) * Number(p.precio_unitario || 0)), 0);\n    const valorNetoMaximo = Math.max(0, Number(pedidoIndividual.valor_factura || 0) - valorRetiradoTotal);\n\n    if (Number(asignacionIndividual.total_despachado) > valorNetoMaximo) {\n      return mostrarError("❌ ALERTA: No puedes despachar un valor mayor al neto original.");\n    }\n\n    let payloadAlerta = null;\n    if (Number(asignacionIndividual.total_despachado) < valorNetoMaximo) {`
);

fs.writeFileSync(filePath, content);
console.log('Patch applied successfully.');
