const express = require('express');
const router = express.Router();
const { getReporteMovimientos, getFiltrosOpciones } = require('../controllers/movimientosController');

// 1. RUTA DE LOS FILTROS (Debe ir primero obligatoriamente)
router.get('/filtros', getFiltrosOpciones);

// 2. RUTA PRINCIPAL DEL REPORTE (Debe ir después)
router.get('/', getReporteMovimientos);

module.exports = router;