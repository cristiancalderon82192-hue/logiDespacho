const express = require('express');
const router = express.Router();
const { getReporteParciales, deleteGrupoParciales } = require('../controllers/bodegaReportesController');
router.get('/parciales', getReporteParciales);
router.delete('/parciales/:facturaBase', deleteGrupoParciales);

module.exports = router;
