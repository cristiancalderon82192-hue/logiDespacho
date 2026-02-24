const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
// const verifyToken = require('../middleware/authMiddleware'); // Si tienes middleware de seguridad, úsalo aquí

// Rutas CRUD
router.get('/usuarios', usuariosController.getUsuarios);       // Listar
router.post('/usuarios', usuariosController.createUsuario);    // Crear
router.put('/usuarios/:id', usuariosController.updateUsuario); // Editar
router.delete('/usuarios/:id', usuariosController.deleteUsuario); // Eliminar

module.exports = router;