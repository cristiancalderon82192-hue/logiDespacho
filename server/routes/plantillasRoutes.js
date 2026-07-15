const express = require('express');
const router = express.Router();
const plantillasController = require('../controllers/plantillasController');

router.get('/plantillas', plantillasController.getPlantillas);
router.get('/plantillas/:id', plantillasController.getPlantillaById);
router.post('/plantillas', plantillasController.createPlantilla);
router.put('/plantillas/:id', plantillasController.updatePlantilla);
router.delete('/plantillas/:id', plantillasController.deletePlantilla);

module.exports = router;
