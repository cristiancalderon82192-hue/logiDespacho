const express = require('express');
const router = express.Router();
const multer = require('multer');
const plantillasController = require('../controllers/plantillasController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/plantillas/extraer-texto', upload.single('pdf'), plantillasController.extraerTextoMuestra);

router.get('/plantillas', plantillasController.getPlantillas);
router.get('/plantillas/:id', plantillasController.getPlantillaById);
router.post('/plantillas', plantillasController.createPlantilla);
router.put('/plantillas/:id', plantillasController.updatePlantilla);
router.delete('/plantillas/:id', plantillasController.deletePlantilla);

module.exports = router;
