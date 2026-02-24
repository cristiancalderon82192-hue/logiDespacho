const express = require('express');
const router = express.Router();
const zonasController = require('../controllers/zonasController');

router.get('/zonas', zonasController.getZonas);
router.post('/zonas', zonasController.createZona);
router.put('/zonas/:id', zonasController.updateZona);    // <--- NUEVO
router.delete('/zonas/:id', zonasController.deleteZona); // <--- NUEVO

module.exports = router;