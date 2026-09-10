const db = require('../config/db');

// GET /api/proveedores
const getAllProveedores = async (req, res) => {
  try {
    const [proveedores] = await db.query('SELECT * FROM proveedores ORDER BY nombre ASC');
    return res.json({ proveedores });
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    return res.status(500).json({ error: 'Error interno al consultar proveedores' });
  }
};

// POST /api/proveedores
const createProveedor = async (req, res) => {
  const { nombre } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
  }

  try {
    const [existente] = await db.query('SELECT id FROM proveedores WHERE nombre = ?', [nombre.trim()]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'Ya existe un proveedor registrado con este nombre' });
    }

    const [result] = await db.query('INSERT INTO proveedores (nombre) VALUES (?)', [nombre.trim()]);

    return res.status(201).json({
      mensaje: 'Proveedor creado exitosamente',
      proveedor: {
        id: result.insertId,
        nombre: nombre.trim()
      }
    });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    return res.status(500).json({ error: 'Error al registrar el proveedor' });
  }
};

module.exports = {
  getAllProveedores,
  createProveedor
};
