// UBICACIÓN: server/routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Importamos el controlador (el cerebro)
const authController = require('../controllers/authController');

// Definimos la ruta: Cuando alguien haga POST a /, ejecuta authController.login
router.post('/login', authController.login);

module.exports = router;