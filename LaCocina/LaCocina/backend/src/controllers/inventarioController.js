const db = require('../config/db');

// GET /api/inventario (Ordena dejando arriba los de stock bajo)
const getInventario = async (req, res) => {
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
        pr.nombre AS proveedor_nombre,
        (p.stock <= p.stock_minimo) AS es_stock_bajo
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

    // Priorizar productos con stock bajo en la parte superior
    sql += ` ORDER BY (p.stock <= p.stock_minimo) DESC, p.nombre ASC`;

    const [productos] = await db.query(sql, params);
    return res.json({ productos });
  } catch (error) {
    console.error('Error al consultar inventario:', error);
    return res.status(500).json({ error: 'Error interno al consultar el inventario' });
  }
};

// POST /api/inventario/movimiento (Actualización de stock y registro en historial)
const registrarMovimiento = async (req, res) => {
  const { producto_id, cantidad, tipo_movimiento, descripcion } = req.body;
  const cuenta_id = req.user.id; // Obtenido del Token JWT autenticado

  if (!producto_id || cantidad === undefined || !tipo_movimiento) {
    return res.status(400).json({
      error: 'producto_id, cantidad y tipo_movimiento son obligatorios'
    });
  }

  const tiposValidos = ['entrada', 'consumo', 'merma', 'ajuste'];
  if (!tiposValidos.includes(tipo_movimiento)) {
    return res.status(400).json({
      error: 'El tipo_movimiento debe ser uno de los siguientes: entrada, consumo, merma, ajuste'
    });
  }

  const cant = parseFloat(cantidad);
  if (isNaN(cant) || cant < 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número positivo válido' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Obtener producto actual
    const [rows] = await connection.query('SELECT * FROM productos WHERE id = ? FOR UPDATE', [producto_id]);
    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = rows[0];
    let nuevoStock = parseFloat(producto.stock);

    // 2. Calcular el nuevo stock según el tipo de movimiento
    if (tipo_movimiento === 'entrada') {
      nuevoStock += cant;
    } else if (tipo_movimiento === 'consumo' || tipo_movimiento === 'merma') {
      nuevoStock = Math.max(0, nuevoStock - cant); // Evitar stock negativo arbitrario
    } else if (tipo_movimiento === 'ajuste') {
      nuevoStock = cant; // El ajuste fija el valor exacto del stock
    }

    // 3. Actualizar stock en la tabla productos
    await connection.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, producto_id]);

    // 4. Insertar registro auditable en historial_inventario
    await connection.query(
      'INSERT INTO historial_inventario (cantidad, tipo_movimiento, descripcion, producto_id, cuenta_id) VALUES (?, ?, ?, ?, ?)',
      [cant, tipo_movimiento, descripcion ? descripcion.trim() : null, producto_id, cuenta_id]
    );

    await connection.commit();
    connection.release();

    return res.json({
      mensaje: 'Movimiento de inventario registrado exitosamente',
      producto_id,
      stock_anterior: parseFloat(producto.stock),
      stock_nuevo: nuevoStock,
      tipo_movimiento
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error al registrar movimiento de inventario:', error);
    return res.status(500).json({ error: 'Error al registrar el movimiento en el inventario' });
  }
};

module.exports = {
  getInventario,
  registrarMovimiento
};
