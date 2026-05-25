const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bodegaDashboardController');

router.get('/', ctrl.getDashboardStats);
module.exports = router;