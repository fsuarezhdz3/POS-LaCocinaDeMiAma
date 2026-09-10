const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded; // { id, nombre, tipo }
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar si el usuario es Admin o SuperAdmin
const verifyAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.tipo)) {
    return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de Administrador' });
  }
  next();
};

// Middleware para verificar si el usuario es exclusivamente SuperAdmin
const verifySuperAdmin = (req, res, next) => {
  if (!req.user || req.user.tipo !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de Superadministrador' });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifySuperAdmin
};
