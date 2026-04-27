const express = require('express');
const router = express.Router();
const { getReporteEfectividad } = require('../controllers/efectividadController');

router.get('/', getReporteEfectividad);
module.exports = router;