const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const templateService = require('../services/templateService');

router.get('/status', (req, res) => {
    res.json(whatsappService.getStatus());
});

router.post('/logout', async (req, res) => {
    const result = await whatsappService.logout();
    if (result.success) {
        res.json({ message: 'Sesión cerrada exitosamente.' });
    } else {
        res.status(500).json({ error: result.error });
    }
});

router.get('/template', (req, res) => {
    res.json({ mensaje: templateService.getTemplate() });
});

router.post('/template', (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje) {
        return res.status(400).json({ error: 'El mensaje es obligatorio' });
    }
    const success = templateService.saveTemplate(mensaje);
    if (success) {
        res.json({ message: 'Plantilla guardada correctamente' });
    } else {
        res.status(500).json({ error: 'Error al guardar la plantilla' });
    }
});

module.exports = router;
