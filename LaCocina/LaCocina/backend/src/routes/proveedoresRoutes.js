const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedoresController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, proveedoresController.getAllProveedores);
router.post('/', verifyToken, proveedoresController.createProveedor);

module.exports = router;
