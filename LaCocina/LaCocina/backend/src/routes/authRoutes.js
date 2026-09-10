const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, verifyAdmin, verifySuperAdmin } = require('../middlewares/authMiddleware');

// Rutas Públicas
router.post('/login', authController.login);

// Rutas Protegidas
router.get('/profile', verifyToken, authController.getProfile);

// Rutas de Administración (Admin y SuperAdmin)
router.get('/cuentas', verifyToken, verifyAdmin, authController.getAllAccounts);
router.post('/register', verifyToken, verifyAdmin, authController.register);
router.put('/unlock/:id', verifyToken, verifyAdmin, authController.unlockAccount);
router.put('/lock/:id', verifyToken, verifyAdmin, authController.lockAccount);

// Rutas de SuperAdministrador (Solo SuperAdmin)
router.put('/cuentas/:id/password', verifyToken, verifySuperAdmin, authController.changePassword);
router.delete('/cuentas/:id', verifyToken, verifySuperAdmin, authController.deleteUser);

module.exports = router;
