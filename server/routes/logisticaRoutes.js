const express = require('express');
const router = express.Router();
const logisticaCtrl = require('../controllers/logisticaController');

// 1. Ahora buscamos por día en lugar de solo pendientes
router.get('/pedidos-dia', logisticaCtrl.getPedidosPorFecha);

// 👇 RUTA DEL LOTE (ASIGNACIÓN NORMAL) 👇
router.put('/pedidos/asignar-lote', logisticaCtrl.asignarLote);

// 2. Ruta para guardar la asignación (Individual y Saldos)
router.put('/pedidos/:id/asignar', logisticaCtrl.asignarRuta);
router.put('/pedidos/:id/desasignar', logisticaCtrl.quitarAsignacion);
router.post('/pedidos/:id/despachar-saldo', logisticaCtrl.despacharSaldo);

// 👇 RUTA DEL LOTE DE SALDOS (NUEVA) 👇
router.post('/pedidos/despachar-lote-saldos', logisticaCtrl.despacharLoteSaldos);

// 3. Catálogos
router.get('/conductores', logisticaCtrl.getConductores);
router.get('/vehiculos', logisticaCtrl.getVehiculos);
router.get('/pedidos-parciales', logisticaCtrl.getPedidosParciales);
router.get('/bodegas', logisticaCtrl.getBodegas);

module.exports = router;