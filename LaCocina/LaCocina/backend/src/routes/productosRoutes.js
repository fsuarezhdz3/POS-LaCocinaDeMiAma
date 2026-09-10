const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { verifyToken, verifyAdmin, verifySuperAdmin } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, productosController.getAllProductos);
router.get('/:id', verifyToken, productosController.getProductoById);
router.post('/', verifyToken, verifyAdmin, productosController.createProducto);
router.put('/:id', verifyToken, verifyAdmin, productosController.updateProducto);

// Borrar productos (restringido únicamente al rol SuperAdmin)
router.delete('/:id', verifyToken, verifySuperAdmin, productosController.deleteProducto);

module.exports = router;
