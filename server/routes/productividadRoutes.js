const express = require('express');
const router = express.Router();
const { getReporteProductividad } = require('../controllers/productividadController');

// La ruta raíz que ahora maneja rangos de fechas (fechaInicio y fechaFin por query)
router.get('/', getReporteProductividad);

module.exports = router;