const db = require('../config/db');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    // 1. Total de productos
    const [[{ total_productos }]] = await db.query(
      'SELECT COUNT(*) AS total_productos FROM productos'
    );

    // 2. Total de productos con stock bajo (stock <= stock_minimo)
    const [[{ total_stock_bajo }]] = await db.query(
      'SELECT COUNT(*) AS total_stock_bajo FROM productos WHERE stock <= stock_minimo'
    );

    // 3. Lista de productos con stock bajo
    const [productos_stock_bajo] = await db.query(`
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
      WHERE p.stock <= p.stock_minimo
      ORDER BY p.stock ASC
    `);

    return res.json({
      total_productos: Number(total_productos),
      total_stock_bajo: Number(total_stock_bajo),
      productos_stock_bajo
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return res.status(500).json({ error: 'Error interno al consultar el dashboard' });
  }
};

module.exports = {
  getDashboardStats
};
