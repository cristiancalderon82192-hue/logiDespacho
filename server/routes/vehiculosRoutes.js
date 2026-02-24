const express = require('express');
const router = express.Router();
const vehiculosController = require('../controllers/vehiculosController');

router.get('/vehiculos', vehiculosController.getVehiculos);
router.post('/vehiculos', vehiculosController.createVehiculo);
router.put('/vehiculos/:id', vehiculosController.updateVehiculo);
router.delete('/vehiculos/:id', vehiculosController.deleteVehiculo);

module.exports = router;