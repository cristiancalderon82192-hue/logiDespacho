// UBICACIÓN: server/routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Importamos el controlador (el cerebro)
const authController = require('../controllers/authController');

// Definimos la ruta de Login
router.post('/login', authController.login);

// 👇 DEFINIMOS LA NUEVA RUTA DE LOGOUT 👇
router.post('/logout', authController.logout);

module.exports = router;