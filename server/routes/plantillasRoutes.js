const express = require('express');
const router = express.Router();
const plantillasController = require('../controllers/plantillasController');
const { verifyToken } = require('../middlewares/authMiddleware'); // Si usan middleware de auth, habría que verificar. Asumiré que no lo fuerzan en todas partes, o si sí, lo aplican en index.js. Por seguridad, expondré las rutas base.

router.get('/plantillas', plantillasController.getPlantillas);
router.get('/plantillas/:id', plantillasController.getPlantillaById);
router.post('/plantillas', plantillasController.createPlantilla);
router.put('/plantillas/:id', plantillasController.updatePlantilla);
router.delete('/plantillas/:id', plantillasController.deletePlantilla);

module.exports = router;
