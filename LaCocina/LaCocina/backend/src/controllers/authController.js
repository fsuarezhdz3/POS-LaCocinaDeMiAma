const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const MAX_INTENTOS_FALLIDOS = 5;

// POST /api/auth/login
const login = async (req, res) => {
  const { nombre, password } = req.body;

  if (!nombre || !password) {
    return res.status(400).json({ error: 'Por favor proporcione el nombre de usuario y la contraseña' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM cuentas WHERE nombre = ?', [nombre]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];

    if (usuario.bloqueado) {
      return res.status(403).json({ 
        error: 'Su cuenta está bloqueada debido a múltiples intentos fallidos. Contacte a un Administrador.' 
      });
    }

    const esPasswordValido = await bcrypt.compare(password, usuario.password);

    if (!esPasswordValido) {
      const nuevosIntentos = usuario.intentos_fallidos + 1;
      const debeBloquear = nuevosIntentos >= MAX_INTENTOS_FALLIDOS;

      if (debeBloquear) {
        await db.query(
          'UPDATE cuentas SET intentos_fallidos = ?, bloqueado = TRUE WHERE id = ?',
          [nuevosIntentos, usuario.id]
        );
        return res.status(403).json({
          error: `Contraseña incorrecta. Se ha superado el límite de ${MAX_INTENTOS_FALLIDOS} intentos y la cuenta ha sido bloqueada.`
        });
      } else {
        await db.query(
          'UPDATE cuentas SET intentos_fallidos = ? WHERE id = ?',
          [nuevosIntentos, usuario.id]
        );
        const intentosRestantes = MAX_INTENTOS_FALLIDOS - nuevosIntentos;
        return res.status(401).json({
          error: `Credenciales inválidas. Te quedan ${intentosRestantes} intento(s) antes de bloquear la cuenta.`
        });
      }
    }

    if (usuario.intentos_fallidos > 0) {
      await db.query('UPDATE cuentas SET intentos_fallidos = 0 WHERE id = ?', [usuario.id]);
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, tipo: usuario.tipo },
      process.env.JWT_SECRET || 'secret_key',
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
  const { nombre, password, tipo } = req.body;

  if (!nombre || !password || !tipo) {
    return res.status(400).json({ error: 'Nombre, contraseña y tipo son requeridos' });
  }

  // Un Admin estándar no puede crear cuentas SuperAdmin
  if (tipo === 'superadmin' && req.user.tipo !== 'superadmin') {
    return res.status(403).json({ error: 'Un Administrador no tiene permisos para crear usuarios de tipo Superadmin' });
  }

  if (!['superadmin', 'admin', 'empleado'].includes(tipo)) {
    return res.status(400).json({ error: 'El tipo de cuenta debe ser "superadmin", "admin" o "empleado"' });
  }

  try {
    const [existente] = await db.query('SELECT id FROM cuentas WHERE nombre = ?', [nombre]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO cuentas (nombre, password, tipo) VALUES (?, ?, ?)',
      [nombre, hashedPassword, tipo]
    );

    return res.status(201).json({
      mensaje: 'Cuenta creada exitosamente',
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

// PUT /api/auth/unlock/:id
const unlockAccount = async (req, res) => {
  const { id } = req.params;

  try {
    const [targetRows] = await db.query('SELECT id, tipo FROM cuentas WHERE id = ?', [id]);
    if (targetRows.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const targetUser = targetRows[0];
    if (targetUser.tipo === 'superadmin' && req.user.tipo !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado: No tienes permisos para desbloquear cuentas de Superadmin' });
    }

    const [result] = await db.query(
      'UPDATE cuentas SET bloqueado = FALSE, intentos_fallidos = 0 WHERE id = ?',
      [id]
    );

    return res.json({ mensaje: 'La cuenta ha sido desbloqueada exitosamente' });
  } catch (error) {
    console.error('Error al desbloquear cuenta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT /api/auth/lock/:id
const lockAccount = async (req, res) => {
  const { id } = req.params;

  try {
    const [targetRows] = await db.query('SELECT id, tipo FROM cuentas WHERE id = ?', [id]);
    if (targetRows.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const targetUser = targetRows[0];
    if (targetUser.tipo === 'superadmin' && req.user.tipo !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado: No tienes permisos para bloquear cuentas de Superadmin' });
    }

    const [result] = await db.query(
      'UPDATE cuentas SET bloqueado = TRUE WHERE id = ?',
      [id]
    );

    return res.json({ mensaje: 'La cuenta ha sido bloqueada exitosamente' });
  } catch (error) {
    console.error('Error al bloquear cuenta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT /api/auth/cuentas/:id/password (Cambiar contraseña - Solo SuperAdmin)
const changePassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || !newPassword.trim()) {
    return res.status(400).json({ error: 'Proporcione la nueva contraseña' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    const [result] = await db.query(
      'UPDATE cuentas SET password = ?, intentos_fallidos = 0, bloqueado = FALSE WHERE id = ?',
      [hashedPassword, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    return res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
};

// DELETE /api/auth/cuentas/:id (Borrar usuario - Solo SuperAdmin)
const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta en sesión' });
  }

  try {
    const [result] = await db.query('DELETE FROM cuentas WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    return res.json({ mensaje: 'Cuenta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    return res.status(500).json({
      error: 'No se puede eliminar este usuario porque posee historial de movimientos registrados.'
    });
  }
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, tipo, intentos_fallidos, bloqueado FROM cuentas WHERE id = ?',
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

// GET /api/auth/cuentas (Listar cuentas - Si es Admin omite superadmin, si es SuperAdmin devuelve todas)
const getAllAccounts = async (req, res) => {
  try {
    const isSuperAdmin = req.user.tipo === 'superadmin';
    let sql = 'SELECT id, nombre, tipo, intentos_fallidos, bloqueado FROM cuentas';

    if (!isSuperAdmin) {
      sql += " WHERE tipo != 'superadmin'";
    }

    sql += ' ORDER BY id ASC';

    const [cuentas] = await db.query(sql);
    return res.json({ cuentas });
  } catch (error) {
    console.error('Error al obtener cuentas:', error);
    return res.status(500).json({ error: 'Error al listar las cuentas' });
  }
};

module.exports = {
  login,
  register,
  unlockAccount,
  lockAccount,
  changePassword,
  deleteUser,
  getProfile,
  getAllAccounts
};
