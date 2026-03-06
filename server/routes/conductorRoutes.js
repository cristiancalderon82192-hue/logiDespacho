const express = require('express');
const router = express.Router();
const conductorCtrl = require('../controllers/conductorController');

router.get('/mis-rutas', conductorCtrl.getMisRutas);
// 👇 NUEVA RUTA PARA CAMBIAR EL ESTADO 👇
router.put('/pedidos/:id/estado', conductorCtrl.actualizarEstado);

module.exports = router;