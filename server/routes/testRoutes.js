const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

router.get('/desempeno', testController.ejecutarPruebaDesempeno);
router.get('/migrate-retiro', testController.migrateRetiro);

module.exports = router;
