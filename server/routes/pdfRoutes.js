const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfController = require('../controllers/pdfController');

// Configurar multer para que guarde en memoria
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint para extraer la información del PDF
router.post('/extraer-factura', upload.single('facturaPdf'), pdfController.extraerFactura);

module.exports = router;
