const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bodegaPendientesController');

router.get('/', ctrl.getPendientesLista);
router.post('/nuevo', ctrl.crearPendiente);
router.post('/despachar', ctrl.despacharMaterial);

// 👇 NUEVAS RUTAS CREADAS 👇
router.get('/:id', ctrl.getPendientePorId);
router.put('/:id/entregar', ctrl.entregarPendiente);
router.put('/:id/tipo-entrega', ctrl.actualizarTipoEntrega);
router.delete('/:id', ctrl.eliminarPendiente);

module.exports = router;