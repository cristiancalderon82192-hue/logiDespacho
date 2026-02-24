const express = require('express');
const router = express.Router();
const destinosController = require('../controllers/destinosController');

router.get('/destinos', destinosController.getDestinos);
router.post('/destinos', destinosController.createDestino);
router.put('/destinos/:id', destinosController.updateDestino);    // <--- NUEVO
router.delete('/destinos/:id', destinosController.deleteDestino);

module.exports = router;