const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistantController');

// Ruta para procesar los mensajes del chat
// Podríamos agregar un middleware de autenticación aquí si queremos restringirlo
router.post('/chat', assistantController.processChat);

module.exports = router;
