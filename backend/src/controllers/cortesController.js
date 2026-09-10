const db = require('../config/db');

// Asegurar que existan las columnas requeridas en la base de datos por migración automática
const asegurarColumnasMigracion = async () => {
  try { await db.query('ALTER TABLE pedidos ADD COLUMN corte INT DEFAULT NULL'); } catch (e) {}
  try { await db.query("ALTER TABLE pedidos ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'efectivo'"); } catch (e) {}
  try { await db.query("ALTER TABLE alimentos_pedidos ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'efectivo'"); } catch (e) {}

  // Asegurar tabla y columnas de ingresos
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ingresos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        total_ingreso DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        concepto VARCHAR(255) NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        corte_id INT NOT NULL
      )
    `);
  } catch (e) {}
  try { await db.query('ALTER TABLE ingresos ADD COLUMN total_ingreso DECIMAL(10,2) DEFAULT 0.00'); } catch (e) {}
  try { await db.query('ALTER TABLE ingresos ADD COLUMN corte_id INT DEFAULT NULL'); } catch (e) {}

  // Asegurar tabla y columnas de egresos
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS egresos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        total_egreso DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_ingreso DECIMAL(10,2) NULL DEFAULT 0.00,
        concepto VARCHAR(255) NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        corte_id INT NOT NULL
      )
    `);
  } catch (e) {}
  try { await db.query('ALTER TABLE egresos ADD COLUMN total_egreso DECIMAL(10,2) DEFAULT 0.00'); } catch (e) {}
  try { await db.query('ALTER TABLE egresos ADD COLUMN total_ingreso DECIMAL(10,2) DEFAULT 0.00'); } catch (e) {}
  try { await db.query('ALTER TABLE egresos ADD COLUMN corte_id INT DEFAULT NULL'); } catch (e) {}
};

// GET /api/cortes/activo/:cuenta_id
// Consultar si la cuenta de administración tiene un corte abierto (hora_fin IS NULL)
const getCorteActivo = async (req, res) => {
  const { cuenta_id } = req.params;
  const cuentaIdFinal = (!isNaN(Number(cuenta_id)) && Number(cuenta_id) > 0) ? Number(cuenta_id) : 1;

  try {
    await asegurarColumnasMigracion();

    const [cortesActivos] = await db.query(
      `SELECT * FROM cortes WHERE cuenta = ? AND (hora_fin IS NULL OR hora_fin = '0000-00-00 00:00:00') ORDER BY id DESC LIMIT 1`,
      [cuentaIdFinal]
    );

    if (cortesActivos.length === 0) {
      return res.json({ activo: false, corte: null });
    }

    const corte = cortesActivos[0];

    // Consultar desglose de ventas por método de pago asociadas a este corte
    let totalVentas = 0;
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransferencia = 0;

    try {
      const [ventasRows] = await db.query(
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

      if (ventasRows.length > 0) {
        totalVentas = Number(ventasRows[0].total_ventas) || 0;
        totalEfectivo = Number(ventasRows[0].total_efectivo) || 0;
        totalTarjeta = Number(ventasRows[0].total_tarjeta) || 0;
        totalTransferencia = Number(ventasRows[0].total_transferencia) || 0;
      }
    } catch (vErr) {
      console.log('Aviso consultando ventas del corte:', vErr.message);
    }

    // Consultar ingresos de este corte
    let ingresosRows = [];
    let totalIngresos = 0;
    try {
      const [resIngresos] = await db.query(
        `SELECT * FROM ingresos WHERE corte_id = ? ORDER BY id DESC`,
        [corte.id]
      );
      ingresosRows = resIngresos.map(r => {
        const m = Number(r.total_ingreso) > 0 ? Number(r.total_ingreso) : (Number(r.monto) > 0 ? Number(r.monto) : Number(r.total || 0));
        return {
          ...r,
          monto: m,
          total_ingreso: m
        };
      });
      totalIngresos = ingresosRows.reduce((sum, item) => sum + item.monto, 0);
    } catch (iErr) {
      console.log('Aviso consultando ingresos:', iErr.message);
    }

    // Consultar egresos de este corte
    let egresosRows = [];
    let totalEgresos = 0;
    try {
      const [resEgresos] = await db.query(
        `SELECT * FROM egresos WHERE corte_id = ? ORDER BY id DESC`,
        [corte.id]
      );
      egresosRows = resEgresos.map(r => {
        const valEg = Number(r.total_egreso || 0);
        const valIng = Number(r.total_ingreso || 0);
        const valMonto = Number(r.monto || 0);
        const valTotal = Number(r.total || 0);
        const m = valEg > 0 ? valEg : (valIng > 0 ? valIng : (valMonto > 0 ? valMonto : valTotal));
        return {
          ...r,
          monto: m,
          total_egreso: m,
          total_ingreso: m
        };
      });
      totalEgresos = egresosRows.reduce((sum, item) => sum + item.monto, 0);
    } catch (eErr) {
      console.log('Aviso consultando egresos:', eErr.message);
    }

    const dineroInicial = Number(corte.dinero_inicial) || 0;
    // IMPORTANTE: Solo las ventas en EFECTIVO suman a la caja física esperada
    const cajaEsperada = dineroInicial + totalEfectivo + totalIngresos - totalEgresos;

    return res.json({
      activo: true,
      corte: {
        ...corte,
        dinero_inicial: dineroInicial,
        total_ventas: totalVentas,
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta,
        total_transferencia: totalTransferencia,
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        caja_esperada: cajaEsperada,
        ingresos: ingresosRows,
        egresos: egresosRows,
      },
    });
  } catch (error) {
    console.error('Error al obtener corte activo:', error);
    return res.status(500).json({ error: 'Error al consultar corte de caja' });
  }
};

// POST /api/cortes/iniciar
// Iniciar un nuevo corte de caja para la cuenta admin
const iniciarCorte = async (req, res) => {
  const { cuenta_id, dinero_inicial } = req.body;

  if (dinero_inicial === undefined || Number(dinero_inicial) < 0) {
    return res.status(400).json({ error: 'Debes proporcionar una cantidad inicial válida' });
  }

  const cuentaIdFinal = (!isNaN(Number(cuenta_id)) && Number(cuenta_id) > 0) ? Number(cuenta_id) : 1;

  try {
    await asegurarColumnasMigracion();

    // Verificar que no haya un corte abierto actualmente
    const [activos] = await db.query(
      `SELECT id FROM cortes WHERE cuenta = ? AND (hora_fin IS NULL OR hora_fin = '0000-00-00 00:00:00')`,
      [cuentaIdFinal]
    );

    if (activos.length > 0) {
      return res.status(400).json({ error: 'Ya existe un corte de caja activo. Debes cerrarlo antes de iniciar otro.' });
    }

    const [result] = await db.query(
      `INSERT INTO cortes (dinero_inicial, hora_inicio, total_corte, cuenta) VALUES (?, NOW(), 0, ?)`,
      [Number(dinero_inicial), cuentaIdFinal]
    );

    const nuevoCorteId = result.insertId;

    return res.json({
      ok: true,
      corte_id: nuevoCorteId,
      dinero_inicial: Number(dinero_inicial),
      mensaje: 'Corte de caja iniciado correctamente',
    });
  } catch (error) {
    console.error('Error al iniciar corte de caja:', error);
    return res.status(500).json({ error: 'Error interno al iniciar corte de caja' });
  }
};

// POST /api/cortes/ingreso
// Registrar un ingreso de dinero al corte activo
const registrarIngreso = async (req, res) => {
  const { corte_id, monto, concepto } = req.body;

  if (!corte_id || !monto || Number(monto) <= 0 || !concepto || !concepto.trim()) {
    return res.status(400).json({ error: 'Monto y concepto son requeridos' });
  }

  try {
    await db.query(
      `INSERT INTO ingresos (total_ingreso, concepto, fecha, corte_id) VALUES (?, ?, NOW(), ?)`,
      [Number(monto), concepto.trim(), corte_id]
    );

    return res.json({ ok: true, mensaje: 'Ingreso registrado exitosamente' });
  } catch (error) {
    console.error('Error al registrar ingreso:', error);
    return res.status(500).json({ error: 'Error al registrar ingreso en caja' });
  }
};

// POST /api/cortes/egreso
// Registrar un egreso/salida de dinero del corte activo
const registrarEgreso = async (req, res) => {
  const { corte_id, monto, concepto } = req.body;

  if (!corte_id || !monto || Number(monto) <= 0 || !concepto || !concepto.trim()) {
    return res.status(400).json({ error: 'Monto y concepto son requeridos' });
  }

  try {
    try {
      await db.query(
        `INSERT INTO egresos (total_egreso, concepto, fecha, corte_id) VALUES (?, ?, NOW(), ?)`,
        [Number(monto), concepto.trim(), corte_id]
      );
    } catch (colErr) {
      await db.query(
        `INSERT INTO egresos (total_ingreso, concepto, fecha, corte_id) VALUES (?, ?, NOW(), ?)`,
        [Number(monto), concepto.trim(), corte_id]
      );
    }

    return res.json({ ok: true, mensaje: 'Egreso registrado exitosamente' });
  } catch (error) {
    console.error('Error al registrar egreso:', error);
    return res.status(500).json({ error: 'Error al registrar egreso en caja' });
  }
};

// PUT /api/cortes/:id/cerrar
// Cerrar el corte activo y calcular el total final en caja
const cerrarCorte = async (req, res) => {
  const { id } = req.params;

  try {
    const [corteRows] = await db.query(`SELECT * FROM cortes WHERE id = ?`, [id]);
    if (corteRows.length === 0) {
      return res.status(404).json({ error: 'Corte de caja no encontrado' });
    }

    const corte = corteRows[0];

    // Recalcular ventas desglosadas
    let totalVentas = 0;
    let totalEfectivo = 0;

    try {
      const [ventasRows] = await db.query(
        `SELECT 
          SUM(ap.costo) as total_ventas,
          SUM(CASE WHEN LOWER(COALESCE(ap.metodo_pago, 'efectivo')) = 'efectivo' THEN ap.costo ELSE 0 END) as total_efectivo
         FROM alimentos_pedidos ap
         INNER JOIN pedidos p ON ap.num_orden = p.num_orden
         WHERE p.corte = ? AND ap.estado = 4`,
        [id]
      );

      if (ventasRows.length > 0) {
        totalVentas = Number(ventasRows[0].total_ventas) || 0;
        totalEfectivo = Number(ventasRows[0].total_efectivo) || 0;
      }
    } catch (vErr) {}

    // Recalcular ingresos
    const [ingresosRows] = await db.query(
      `SELECT * FROM ingresos WHERE corte_id = ?`,
      [id]
    );
    const totalIngresos = ingresosRows.reduce((sum, item) => {
      const m = Number(item.total_ingreso) > 0 ? Number(item.total_ingreso) : (Number(item.monto) > 0 ? Number(item.monto) : Number(item.total || 0));
      return sum + m;
    }, 0);

    // Recalcular egresos
    let totalEgresos = 0;
    try {
      const [egresosRows] = await db.query(`SELECT * FROM egresos WHERE corte_id = ?`, [id]);
      totalEgresos = egresosRows.reduce((sum, item) => {
        const valEg = Number(item.total_egreso || 0);
        const valIng = Number(item.total_ingreso || 0);
        const valMonto = Number(item.monto || 0);
        const valTotal = Number(item.total || 0);
        const m = valEg > 0 ? valEg : (valIng > 0 ? valIng : (valMonto > 0 ? valMonto : valTotal));
        return sum + m;
      }, 0);
    } catch (e) {}

    const dineroInicial = Number(corte.dinero_inicial) || 0;
    // IMPORTANTE: Solo las ventas en EFECTIVO forman el total en caja física
    const totalCorteCalculado = dineroInicial + totalEfectivo + totalIngresos - totalEgresos;

    await db.query(
      `UPDATE cortes SET hora_fin = NOW(), total_corte = ? WHERE id = ?`,
      [totalCorteCalculado, id]
    );

    return res.json({
      ok: true,
      corte_id: Number(id),
      total_corte: totalCorteCalculado,
      mensaje: 'Corte de caja cerrado exitosamente',
    });
  } catch (error) {
    console.error('Error al cerrar corte de caja:', error);
    return res.status(500).json({ error: 'Error al cerrar corte de caja' });
  }
};

module.exports = {
  getCorteActivo,
  iniciarCorte,
  registrarIngreso,
  registrarEgreso,
  cerrarCorte,
};
