const express = require('express');
const router = express.Router();
const { getReportePerfectos } = require('../controllers/perfectosController');

router.get('/', getReportePerfectos);
module.exports = router;