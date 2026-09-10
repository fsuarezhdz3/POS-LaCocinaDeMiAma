const express = require('express');
const router = express.Router();
const cortesController = require('../controllers/cortesController');

// GET /api/cortes/activo/:cuenta_id
router.get('/activo/:cuenta_id', cortesController.getCorteActivo);

// POST /api/cortes/iniciar
router.post('/iniciar', cortesController.iniciarCorte);

// POST /api/cortes/ingreso
router.post('/ingreso', cortesController.registrarIngreso);

// POST /api/cortes/egreso
router.post('/egreso', cortesController.registrarEgreso);

// PUT /api/cortes/:id/cerrar
router.put('/:id/cerrar', cortesController.cerrarCorte);

module.exports = router;
