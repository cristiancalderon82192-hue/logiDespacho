const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bodegaEntregadosController');

router.get('/', ctrl.getHistorial);
module.exports = router;