const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Ruta restringida únicamente a administradores
router.get('/', verifyToken, verifyAdmin, historialController.getHistorial);

module.exports = router;
