const db = require('../config/db');

// GET /api/productos (Soporta ?search=... y ?proveedor_id=...)
const getAllProductos = async (req, res) => {
  const { search, proveedor_id } = req.query;

  try {
    let sql = `
      SELECT 
        p.id,
        p.nombre,
        p.stock,
        p.unidad_medida,
        p.stock_minimo,
        p.proveedor_id,
        pr.nombre AS proveedor_nombre
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ` AND p.nombre LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    if (proveedor_id) {
      sql += ` AND p.proveedor_id = ?`;
      params.push(proveedor_id);
    }

    sql += ` ORDER BY p.nombre ASC`;

    const [productos] = await db.query(sql, params);
    return res.json({ productos });
  } catch (error) {
    console.error('Error al listar productos:', error);
    return res.status(500).json({ error: 'Error interno al consultar productos' });
  }
};

// GET /api/productos/:id
const getProductoById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT p.*, pr.nombre AS proveedor_nombre 
       FROM productos p 
       LEFT JOIN proveedores pr ON p.proveedor_id = pr.id 
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json({ producto: rows[0] });
  } catch (error) {
    console.error('Error al obtener producto por ID:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/productos
const createProducto = async (req, res) => {
  const { nombre, stock, unidad_medida, stock_minimo, proveedor_id } = req.body;

  if (!nombre || stock === undefined || !unidad_medida || stock_minimo === undefined || !proveedor_id) {
    return res.status(400).json({
      error: 'Nombre, stock, unidad_medida, stock_minimo y proveedor_id son campos obligatorios'
    });
  }

  try {
    // Verificar que el proveedor existe
    const [prov] = await db.query('SELECT id FROM proveedores WHERE id = ?', [proveedor_id]);
    if (prov.length === 0) {
      return res.status(400).json({ error: 'El proveedor especificado no existe' });
    }

    const [result] = await db.query(
      'INSERT INTO productos (nombre, stock, unidad_medida, stock_minimo, proveedor_id) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), parseFloat(stock), unidad_medida.trim(), parseFloat(stock_minimo), proveedor_id]
    );

    return res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      producto: {
        id: result.insertId,
        nombre: nombre.trim(),
        stock: parseFloat(stock),
        unidad_medida: unidad_medida.trim(),
        stock_minimo: parseFloat(stock_minimo),
        proveedor_id
      }
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return res.status(500).json({ error: 'Error al registrar el producto' });
  }
};

// PUT /api/productos/:id
const updateProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, stock, unidad_medida, stock_minimo, proveedor_id } = req.body;

  if (!nombre || stock === undefined || !unidad_medida || stock_minimo === undefined || !proveedor_id) {
    return res.status(400).json({
      error: 'Todos los campos son obligatorios para actualizar el producto'
    });
  }

  try {
    const [prov] = await db.query('SELECT id FROM proveedores WHERE id = ?', [proveedor_id]);
    if (prov.length === 0) {
      return res.status(400).json({ error: 'El proveedor especificado no existe' });
    }

    const [result] = await db.query(
      'UPDATE productos SET nombre = ?, stock = ?, unidad_medida = ?, stock_minimo = ?, proveedor_id = ? WHERE id = ?',
      [nombre.trim(), parseFloat(stock), unidad_medida.trim(), parseFloat(stock_minimo), proveedor_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json({ mensaje: 'Producto actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};

// DELETE /api/productos/:id
const deleteProducto = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM productos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json({ mensaje: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return res.status(500).json({ error: 'No se puede eliminar el producto porque tiene movimientos de historial vinculados' });
  }
};

module.exports = {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto
};
