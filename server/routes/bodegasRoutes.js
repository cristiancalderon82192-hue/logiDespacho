const express = require('express');
const router = express.Router();
const bodegasController = require('../controllers/bodegasController');

router.get('/bodegas', bodegasController.getBodegas);
router.post('/bodegas', bodegasController.createBodega);
router.put('/bodegas/:id', bodegasController.updateBodega);
router.delete('/bodegas/:id', bodegasController.deleteBodega);

module.exports = router;