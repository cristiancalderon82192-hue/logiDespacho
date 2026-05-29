const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

router.get('/desempeno', testController.ejecutarPruebaDesempeno);

module.exports = router;
