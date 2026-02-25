const express = require('express');
const router = express.Router();
const logisticaCtrl = require('../controllers/logisticaController');

// 1. Ahora buscamos por día en lugar de solo pendientes
router.get('/pedidos-dia', logisticaCtrl.getPedidosPorFecha);

// 2. Ruta para guardar la asignación
router.put('/pedidos/:id/asignar', logisticaCtrl.asignarRuta);

// 3. Catálogos
router.get('/conductores', logisticaCtrl.getConductores);
router.get('/vehiculos', logisticaCtrl.getVehiculos);

module.exports = router;