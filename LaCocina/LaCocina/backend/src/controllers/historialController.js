const db = require('../config/db');

// GET /api/historial (Solo Administradores - Auditoría de movimientos con filtros por fecha y tipo)
const getHistorial = async (req, res) => {
  const { fecha, fecha_inicio, fecha_fin, tipo_movimiento, producto_id } = req.query;

  try {
    let sql = `
      SELECT 
        h.id,
        h.cantidad,
        h.tipo_movimiento,
        h.descripcion,
        h.fecha_actualizacion,
        h.producto_id,
        p.nombre AS producto_nombre,
        p.unidad_medida,
        h.cuenta_id,
        c.nombre AS usuario_nombre,
        c.tipo AS usuario_tipo
      FROM historial_inventario h
      INNER JOIN productos p ON h.producto_id = p.id
      INNER JOIN cuentas c ON h.cuenta_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filtro por fecha específica
    if (fecha) {
      sql += ` AND DATE(h.fecha_actualizacion) = ?`;
      params.push(fecha);
    }

    // Filtro por rango de fechas (fecha_inicio a fecha_fin)
    if (fecha_inicio) {
      sql += ` AND DATE(h.fecha_actualizacion) >= ?`;
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      sql += ` AND DATE(h.fecha_actualizacion) <= ?`;
      params.push(fecha_fin);
    }

    // Filtro por tipo de movimiento
    if (tipo_movimiento) {
      sql += ` AND h.tipo_movimiento = ?`;
      params.push(tipo_movimiento);
    }

    // Filtro por producto
    if (producto_id) {
      sql += ` AND h.producto_id = ?`;
      params.push(producto_id);
    }

    sql += ` ORDER BY h.fecha_actualizacion DESC`;

    const [historial] = await db.query(sql, params);
    return res.json({ historial });
  } catch (error) {
    console.error('Error al consultar historial de movimientos:', error);
    return res.status(500).json({ error: 'Error interno al consultar el historial' });
  }
};

module.exports = {
  getHistorial
};
