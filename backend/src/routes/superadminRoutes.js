const express = require('express');
const router = express.Router();
const superadminController = require('../controllers/superadminController');

// Rutas de SuperAdmin
router.get('/dashboard-stats', superadminController.getDashboardStats);
router.get('/cortes', superadminController.getCortesHistorial);
router.get('/cuentas', superadminController.getCuentas);
router.post('/cuentas', superadminController.crearCuenta);
router.put('/cuentas/:id', superadminController.editarCuenta);
router.delete('/cuentas/:id', superadminController.eliminarCuenta);
router.get('/historial-ventas', superadminController.getHistorialVentasSuperadmin);

module.exports = router;
