const express = require('express');
const router = express.Router();
const { getReporteFinanciero } = require('../controllers/financieroController');

router.get('/', getReporteFinanciero);
module.exports = router;