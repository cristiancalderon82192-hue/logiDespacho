// UBICACIÓN: server/routes/pedidosLiderRoutes.js
const express = require('express');
const router = express.Router();
const liderController = require('../controllers/pedidosLiderController');

// Estas rutas ya asumen que el prefijo será /api/lider
router.get('/dashboard', liderController.getDashboard);
router.get('/mis-pedidos', liderController.getMisPedidos);

module.exports = router;