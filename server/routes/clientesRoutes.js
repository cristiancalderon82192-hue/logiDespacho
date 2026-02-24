const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

// Definir las rutas del CRUD
router.get('/clientes', clientesController.getClientes);       // Leer
router.post('/clientes', clientesController.createCliente);    // Crear
router.put('/clientes/:id', clientesController.updateCliente); // Actualizar
router.delete('/clientes/:id', clientesController.deleteCliente); // Borrar

module.exports = router;