const express = require('express');
const router = express.Router();
const { getReporteParciales } = require('../controllers/bodegaReportesController');

router.get('/parciales', getReporteParciales);

module.exports = router;
