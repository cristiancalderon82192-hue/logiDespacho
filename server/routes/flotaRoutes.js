const express = require('express');
const router = express.Router();
const { getReporteFlota } = require('../controllers/flotaController');

router.get('/', getReporteFlota);
module.exports = router;
