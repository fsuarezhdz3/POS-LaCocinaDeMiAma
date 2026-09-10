const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/login
const login = async (req, res) => {
  const { nombre, contrasena } = req.body;

  if (!nombre || !contrasena) {
    return res.status(400).json({ error: 'Por favor proporcione usuario y contraseña' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM cuentas WHERE nombre = ?', [nombre]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuario = rows[0];

    // Verificar si la cuenta está activa (estado = true)
    if (usuario.estado !== undefined && !usuario.estado) {
      return res.status(403).json({ error: 'La cuenta se encuentra inactiva. Contacte al Administrador.' });
    }

    // Verificar si la cuenta está bloqueada manualmente
    if (usuario.bloqueo) {
      return res.status(403).json({ error: 'Esta cuenta ha sido deshabilitada por un Administrador.' });
    }

    // Verificar contraseña (soporta hash bcrypt o texto plano preliminar)
    let esValida = false;
    if (usuario.contrasena.startsWith('$2a$') || usuario.contrasena.startsWith('$2b$')) {
      esValida = await bcrypt.compare(contrasena, usuario.contrasena);
    } else {
      esValida = (contrasena === usuario.contrasena);
    }

    if (!esValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Generar JWT Token
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, tipo: usuario.tipo },
      process.env.JWT_SECRET || 'lacocina_pos_secret_key_2026',
      { expiresIn: '24h' }
    );

    return res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        tipo: usuario.tipo
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor en inicio de sesión' });
  }
};

// POST /api/auth/register
const register = async (req, res) => {
  const { nombre, contrasena, tipo } = req.body;

  if (!nombre || !contrasena || !tipo) {
    return res.status(400).json({ error: 'Nombre, contraseña y tipo de cuenta son requeridos' });
  }

  const tiposValidos = ['superadmin', 'admin', 'mesero', 'barra', 'cocina', 'comal'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: `El tipo debe ser uno de: ${tiposValidos.join(', ')}` });
  }

  try {
    const [existente] = await db.query('SELECT id FROM cuentas WHERE nombre = ?', [nombre]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    const hashPassword = await bcrypt.hash(contrasena, 10);

    const [result] = await db.query(
      'INSERT INTO cuentas (nombre, contrasena, tipo) VALUES (?, ?, ?)',
      [nombre, hashPassword, tipo]
    );

    return res.status(201).json({
      mensaje: 'Cuenta registrada exitosamente',
      usuario: {
        id: result.insertId,
        nombre,
        tipo
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'Error al registrar la cuenta' });
  }
};

// GET /api/auth/me
const getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, tipo, bloqueo, estado FROM cuentas WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({ usuario: rows[0] });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

module.exports = {
  login,
  register,
  getProfile
};
