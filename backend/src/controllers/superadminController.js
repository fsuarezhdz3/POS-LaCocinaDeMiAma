const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/superadmin/dashboard-stats?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
const getDashboardStats = async (req, res) => {
  const { desde, hasta } = req.query;

  try {
    let whereClause = `WHERE ap.estado = 4`;
    const queryParams = [];

    if (desde) {
      whereClause += ` AND p.fecha_pedido >= ?`;
      queryParams.push(`${desde} 00:00:00`);
    }
    if (hasta) {
      whereClause += ` AND p.fecha_pedido <= ?`;
      queryParams.push(`${hasta} 23:59:59`);
    }

    // 1. Totales generales
    const [totalesRows] = await db.query(
      `SELECT 
        COUNT(DISTINCT p.num_orden) as total_comandas,
        SUM(ap.costo) as total_ventas,
        SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'efectivo' THEN ap.costo ELSE 0 END) as total_efectivo,
        SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'tarjeta' THEN ap.costo ELSE 0 END) as total_tarjeta,
        SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'transferencia' THEN ap.costo ELSE 0 END) as total_transferencia
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       ${whereClause}`,
      queryParams
    );

    const totalComandas = Number(totalesRows[0]?.total_comandas) || 0;
    const totalVentas = Number(totalesRows[0]?.total_ventas) || 0;
    const totalEfectivo = Number(totalesRows[0]?.total_efectivo) || 0;
    const totalTarjeta = Number(totalesRows[0]?.total_tarjeta) || 0;
    const totalTransferencia = Number(totalesRows[0]?.total_transferencia) || 0;

    // 2. Platillos más vendidos (Ranking completo y Top 5)
    const [platilloRows] = await db.query(
      `SELECT ap.alimento, COUNT(*) as cantidad, SUM(ap.costo) as total, COALESCE(a.tipo, 'Otro') as tipo
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN alimentos a ON (ap.alimento = a.nombre OR ap.alimento LIKE CONCAT(a.nombre, '-%'))
       ${whereClause}
       GROUP BY ap.alimento, a.tipo
       ORDER BY cantidad DESC, total DESC`,
      queryParams
    );

    const rankingMap = {};
    platilloRows.forEach((row) => {
      let rawNombre = row.alimento || '';
      let cleanNombre = rawNombre.replace(/-(barra|comal|cocina)$/i, '').trim();
      if (!rankingMap[cleanNombre]) {
        rankingMap[cleanNombre] = {
          alimento: cleanNombre,
          cantidad: 0,
          total: 0,
          tipo: row.tipo || 'Otro'
        };
      }
      rankingMap[cleanNombre].cantidad += Number(row.cantidad) || 0;
      rankingMap[cleanNombre].total += Number(row.total) || 0;
    });

    const rankingPlatillos = Object.values(rankingMap).sort((a, b) => b.cantidad - a.cantidad || b.total - a.total);
    const top5Platillos = rankingPlatillos.slice(0, 5);
    const platilloMasVendido = top5Platillos[0] || { alimento: 'N/A', cantidad: 0, total: 0, tipo: 'Otro' };

    // 3. Ventas agrupadas por día
    const [ventasPorDiaRows] = await db.query(
      `SELECT 
        DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d') as fecha,
        SUM(ap.costo) as total,
        SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'efectivo' THEN ap.costo ELSE 0 END) as efectivo,
        SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'tarjeta' THEN ap.costo ELSE 0 END) as tarjeta,
        SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'transferencia' THEN ap.costo ELSE 0 END) as transferencia
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       ${whereClause}
       GROUP BY DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d')
       ORDER BY fecha DESC`,
      queryParams
    );

    return res.json({
      total_comandas: totalComandas,
      total_ventas: totalVentas,
      total_efectivo: totalEfectivo,
      total_tarjeta: totalTarjeta,
      total_transferencia: totalTransferencia,
      platillo_mas_vendido: platilloMasVendido,
      platillos_mas_vendidos: top5Platillos,
      platillos_ranking: rankingPlatillos,
      ventas_por_dia: ventasPorDiaRows,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de superadmin:', error);
    return res.status(500).json({ error: 'Error al consultar estadísticas del dashboard' });
  }
};

// GET /api/superadmin/cortes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
const getCortesHistorial = async (req, res) => {
  const { desde, hasta } = req.query;

  try {
    let whereClause = `WHERE 1=1`;
    const queryParams = [];

    if (desde) {
      whereClause += ` AND c.hora_inicio >= ?`;
      queryParams.push(`${desde} 00:00:00`);
    }
    if (hasta) {
      whereClause += ` AND c.hora_inicio <= ?`;
      queryParams.push(`${hasta} 23:59:59`);
    }

    const [cortesRows] = await db.query(
      `SELECT c.*, u.nombre as cuenta_nombre
       FROM cortes c
       LEFT JOIN cuentas u ON c.cuenta = u.id
       ${whereClause}
       ORDER BY c.id DESC`,
      queryParams
    );

    // Calcular totales desglosados para cada corte
    const cortesProcesados = await Promise.all(
      cortesRows.map(async (corte) => {
        let totalVentas = 0;
        let totalEfectivo = 0;
        let totalTarjeta = 0;
        let totalTransferencia = 0;

        try {
          const [vRows] = await db.query(
            `SELECT 
              SUM(ap.costo) as total_ventas,
              SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'efectivo' THEN ap.costo ELSE 0 END) as total_efectivo,
              SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'tarjeta' THEN ap.costo ELSE 0 END) as total_tarjeta,
              SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'transferencia' THEN ap.costo ELSE 0 END) as total_transferencia
             FROM alimentos_pedidos ap
             INNER JOIN pedidos p ON ap.num_orden = p.num_orden
             WHERE p.corte = ? AND ap.estado = 4`,
            [corte.id]
          );
          if (vRows.length > 0) {
            totalVentas = Number(vRows[0].total_ventas) || 0;
            totalEfectivo = Number(vRows[0].total_efectivo) || 0;
            totalTarjeta = Number(vRows[0].total_tarjeta) || 0;
            totalTransferencia = Number(vRows[0].total_transferencia) || 0;
          }
        } catch (e) {}

        let totalIngresos = 0;
        let ingresosList = [];
        try {
          const [iRows] = await db.query(
            `SELECT * FROM ingresos WHERE corte_id = ? ORDER BY id DESC`,
            [corte.id]
          );
          ingresosList = iRows.map(r => {
            const m = Number(r.total_ingreso) > 0 ? Number(r.total_ingreso) : (Number(r.monto) > 0 ? Number(r.monto) : Number(r.total || 0));
            return {
              id: r.id,
              monto: m,
              total_ingreso: m,
              concepto: r.concepto || '',
              fecha: r.fecha
            };
          });
          totalIngresos = ingresosList.reduce((sum, item) => sum + item.monto, 0);
        } catch (e) {}

        let totalEgresos = 0;
        let egresosList = [];
        try {
          const [eRows] = await db.query(
            `SELECT * FROM egresos WHERE corte_id = ? ORDER BY id DESC`,
            [corte.id]
          );
          egresosList = eRows.map(r => {
            const valEg = Number(r.total_egreso || 0);
            const valIng = Number(r.total_ingreso || 0);
            const valMonto = Number(r.monto || 0);
            const valTotal = Number(r.total || 0);
            const m = valEg > 0 ? valEg : (valIng > 0 ? valIng : (valMonto > 0 ? valMonto : valTotal));
            return {
              id: r.id,
              monto: m,
              total_egreso: m,
              total_ingreso: m,
              concepto: r.concepto || '',
              fecha: r.fecha
            };
          });
          totalEgresos = egresosList.reduce((sum, item) => sum + item.monto, 0);
        } catch (e) {}

        const dineroInicial = Number(corte.dinero_inicial) || 0;
        const cajaEsperada = dineroInicial + totalEfectivo + totalIngresos - totalEgresos;

        return {
          ...corte,
          dinero_inicial: dineroInicial,
          total_ventas: totalVentas,
          total_efectivo: totalEfectivo,
          total_tarjeta: totalTarjeta,
          total_transferencia: totalTransferencia,
          total_ingresos: totalIngresos,
          total_egresos: totalEgresos,
          ingresos: ingresosList,
          egresos: egresosList,
          caja_esperada: cajaEsperada,
        };
      })
    );

    return res.json({ cortes: cortesProcesados });
  } catch (error) {
    console.error('Error al obtener cortes de superadmin:', error);
    return res.status(500).json({ error: 'Error al consultar historial de cortes' });
  }
};

// GET /api/superadmin/cuentas
const getCuentas = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, tipo, COALESCE(estado, 1) as estado, COALESCE(bloqueo, 0) as bloqueo FROM cuentas ORDER BY id ASC`
    );
    return res.json({ cuentas: rows });
  } catch (error) {
    console.error('Error al obtener cuentas:', error);
    return res.status(500).json({ error: 'Error al consultar lista de cuentas' });
  }
};

// POST /api/superadmin/cuentas
const crearCuenta = async (req, res) => {
  const { nombre, contrasena, tipo } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta ingresar el nombre de usuario para la cuenta.' });
  }
  if (!contrasena || !contrasena.trim()) {
    return res.status(400).json({ error: 'Falta ingresar la contraseña para la cuenta.' });
  }
  if (!tipo) {
    return res.status(400).json({ error: 'Falta seleccionar el tipo/rol de usuario para la cuenta.' });
  }

  try {
    const [existente] = await db.query('SELECT id FROM cuentas WHERE nombre = ?', [nombre.trim()]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    const hashPassword = await bcrypt.hash(contrasena, 10);

    const [result] = await db.query(
      'INSERT INTO cuentas (nombre, contrasena, tipo) VALUES (?, ?, ?)',
      [nombre.trim(), hashPassword, tipo]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Cuenta creada exitosamente',
      id: result.insertId,
    });
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    return res.status(500).json({ error: 'Error al registrar la nueva cuenta' });
  }
};

// PUT /api/superadmin/cuentas/:id
const editarCuenta = async (req, res) => {
  const { id } = req.params;
  const { nombre, contrasena, tipo, estado, bloqueo } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM cuentas WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    if (nombre && nombre.trim()) {
      await db.query('UPDATE cuentas SET nombre = ? WHERE id = ?', [nombre.trim(), id]);
    }
    if (tipo) {
      await db.query('UPDATE cuentas SET tipo = ? WHERE id = ?', [tipo, id]);
    }
    if (contrasena && contrasena.trim()) {
      const hashPassword = await bcrypt.hash(contrasena.trim(), 10);
      await db.query('UPDATE cuentas SET contrasena = ? WHERE id = ?', [hashPassword, id]);
    }
    if (estado !== undefined) {
      await db.query('UPDATE cuentas SET estado = ? WHERE id = ?', [estado ? 1 : 0, id]);
    }
    if (bloqueo !== undefined) {
      await db.query('UPDATE cuentas SET bloqueo = ? WHERE id = ?', [bloqueo ? 1 : 0, id]);
    }

    return res.json({ ok: true, mensaje: 'Cuenta actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar cuenta:', error);
    return res.status(500).json({ error: 'Error al actualizar la cuenta' });
  }
};

// DELETE /api/superadmin/cuentas/:id
const eliminarCuenta = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM cuentas WHERE id = ?', [id]);
    return res.json({ ok: true, mensaje: 'Cuenta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    return res.status(500).json({ error: 'Error al eliminar la cuenta' });
  }
};

// GET /api/superadmin/historial-ventas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
const getHistorialVentasSuperadmin = async (req, res) => {
  const { desde, hasta } = req.query;

  try {
    let whereClause = `WHERE ap.estado IN (2, 3, 4)`;
    const queryParams = [];

    if (desde) {
      whereClause += ` AND p.fecha_pedido >= ?`;
      queryParams.push(`${desde} 00:00:00`);
    }
    if (hasta) {
      whereClause += ` AND p.fecha_pedido <= ?`;
      queryParams.push(`${hasta} 23:59:59`);
    }

    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.guiso, ap.extras, ap.comentarios, ap.estado, ap.num_orden, ap.metodo_pago,
              p.num_mesa, p.fecha_pedido, p.corte, COALESCE(c.nombre, c2.nombre, 'Mesero') as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       LEFT JOIN cuentas c2 ON p.cuenta = c2.id
       ${whereClause}
       ORDER BY ap.id DESC`,
      queryParams
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar historial de ventas superadmin:', error);
    return res.status(500).json({ error: 'Error al consultar historial de ventas' });
  }
};

module.exports = {
  getDashboardStats,
  getCortesHistorial,
  getCuentas,
  crearCuenta,
  editarCuenta,
  eliminarCuenta,
  getHistorialVentasSuperadmin,
};
