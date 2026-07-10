// server/routes/pedidosRoutes.js
const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

// --- DEFINICIÓN DE RUTAS ---

// 1. Guardar Pedido (POST)
// Coincide con: fetch('http://localhost:3000/api/pedidos', ...)
router.post('/pedidos', pedidosController.crearPedido);

// 2. Listar Pedidos por Rango (GET)
// Coincide con: fetch(`http://localhost:3000/api/pedidos-rango?inicio=...`)
router.get('/pedidos-rango', pedidosController.listarPedidosRango);

// 3. Dashboard (GET) - Reutilizado para la gráfica
// Coincide con: fetch(`http://localhost:3000/api/dashboard?inicio=...`)
router.get('/dashboard', pedidosController.obtenerDashboard);

// --- RUTAS NUEVAS PARA EDICIÓN Y ELIMINACIÓN ---
router.get('/pedidos/:id', pedidosController.obtenerPedidoPorId); // Cargar datos para editar
router.put('/pedidos/:id', pedidosController.actualizarPedido);   // Guardar edición
router.delete('/pedidos/:id', pedidosController.eliminarPedido);  // Eliminar

// --- RUTA PÚBLICA PARA COMPROBANTE ---
router.get('/pedidos/public/:id_factura', pedidosController.obtenerPedidoPublicoPorFactura);

// --- RUTA PARA OBTENER CONSECUTIVO DE NOTA MANUAL ---
router.get('/siguiente-nota-manual', pedidosController.obtenerSiguienteNotaManual);

module.exports = router;