const express = require('express');
const router = express.Router();
const liderController = require('../controllers/liderController');

// La ruta final será: /api/lider/dashboard
router.get('/dashboard', liderController.getDashboard);

module.exports = router;