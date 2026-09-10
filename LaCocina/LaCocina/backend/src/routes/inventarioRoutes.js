const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, inventarioController.getInventario);
router.post('/movimiento', verifyToken, inventarioController.registrarMovimiento);

module.exports = router;
