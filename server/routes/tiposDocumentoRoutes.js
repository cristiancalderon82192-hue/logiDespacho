// UBICACIÓN: server/routes/tiposDocumentoRoutes.js
const express = require('express');
const router = express.Router();

// Importamos el controlador que acabamos de crear
const tiposDocCtrl = require('../controllers/tiposDocumentoController');

// Definimos los endpoints
router.get('/', tiposDocCtrl.getTipos);           // GET: Obtener todos
router.post('/', tiposDocCtrl.createTipo);        // POST: Crear nuevo
router.put('/:id', tiposDocCtrl.updateTipo);      // PUT: Actualizar por ID
router.delete('/:id', tiposDocCtrl.deleteTipo);   // DELETE: Eliminar por ID

module.exports = router;