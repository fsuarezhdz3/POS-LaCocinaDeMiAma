const db = require('../config/db');

// Helper para determinar la zona exacta ('cocina', 'comal', 'barra') de un alimento
const obtenerZonaAlimento = async (item) => {
  const z = (item.zona || item.categoria || '').toLowerCase();
  if (z === 'cocina' || z === 'comal' || z === 'barra') return z;

  const nombreRaw = (item.alimento || item.nombre || '').trim();
  const matchZona = nombreRaw.match(/-([a-zA-Z0-9_]+)$/);
  if (matchZona) {
    const sufijoZona = matchZona[1].toLowerCase();
    if (['cocina', 'comal', 'barra'].includes(sufijoZona)) return sufijoZona;
    if (sufijoZona === 'bar') return 'barra';
  }

  const nombreSinZona = nombreRaw.replace(/-[a-zA-Z0-9_]+$/g, '').trim();
  const nombreSinCantidad = nombreSinZona.replace(/^\d+x\s*/i, '').trim();

  if (nombreSinCantidad) {
    try {
      const [rows] = await db.query(
        `SELECT zona, tipo FROM alimentos WHERE LOWER(nombre) = LOWER(?) LIMIT 1`,
        [nombreSinCantidad]
      );
      if (rows.length > 0) {
        const catZona = (rows[0].zona || '').toLowerCase();
        const catTipo = (rows[0].tipo || '').toLowerCase();
        if (['cocina', 'comal', 'barra'].includes(catZona)) return catZona;
        if (['desayuno', 'comida', 'platos fuertes', 'entrada', 'guarnicion', 'torta'].includes(catTipo)) return 'cocina';
        if (['antojito'].includes(catTipo)) return 'comal';
        if (['bebida', 'postre', 'litros', 'litro'].includes(catTipo)) return 'barra';
      }
    } catch (e) {}

    const txt = nombreSinCantidad.toLowerCase();
    if (
      txt.includes('sope') ||
      txt.includes('gordita') ||
      txt.includes('tlacoyo') ||
      txt.includes('quesadilla') ||
      txt.includes('pambazo') ||
      txt.includes('flauta') ||
      txt.includes('taco') ||
      txt.includes('enchilada')
    ) {
      return 'comal';
    }
    if (
      txt.includes('jugo') ||
      txt.includes('café') ||
      txt.includes('refresco') ||
      txt.includes('cerveza') ||
      txt.includes('agua') ||
      txt.includes('licuado') ||
      txt.includes('té') ||
      txt.includes('postre') ||
      txt.includes('flan') ||
      txt.includes('carlota') ||
      txt.includes('jericalla') ||
      txt.includes('gelatina') ||
      txt.includes('arroz') ||
      txt.includes('pastel') ||
      txt.includes('helado') ||
      txt.includes('nieve') ||
      txt.includes('pay') ||
      txt.includes('pie') ||
      txt.includes('chocoflan') ||
      txt.includes('crepa')
    ) {
      return 'barra';
    }
  }

  return 'cocina';
};

// Helper para determinar si un item pertenece a la zona de Cocina al ser insertado
const esAlimentoDeCocina = async (item) => {
  const zona = await obtenerZonaAlimento(item);
  return zona === 'cocina';
};

// POST /api/pedidos/crear
// Crear o actualizar un pedido activo para la mesa y agregar sus alimento_pedido
const crearPedido = async (req, res) => {
  const { num_mesa, cuenta_id, items } = req.body;

  if (!num_mesa || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Datos insuficientes para registrar la comanda' });
  }

  const cuentaIdFinal = cuenta_id || 3; // Por defecto mesero1 si no se envía
  const numMesaInt = Number(num_mesa);

  try {
    // Asegurar que la tabla alimentos_pedidos tenga las columnas necesarias
    try { await db.query('ALTER TABLE alimentos_pedidos ADD COLUMN guarnicion1 VARCHAR(150) DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos_pedidos ADD COLUMN guarnicion2 VARCHAR(150) DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos_pedidos ADD COLUMN entrada VARCHAR(150) DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos_pedidos ADD COLUMN bebida VARCHAR(150) DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos_pedidos ADD COLUMN guiso VARCHAR(150) DEFAULT NULL'); } catch (e) {}

    // 1. Verificar si ya existe un pedido activo (estado 0 o 1) para esta mesa (comedor o para llevar 100, 101, etc.)
    const [pedidosActivos] = await db.query(
      'SELECT num_orden, costo FROM pedidos WHERE num_mesa = ? AND estado IN (0, 1) ORDER BY num_orden DESC LIMIT 1',
      [numMesaInt]
    );

    let numOrden;
    const costoNuevosItems = items.reduce((sum, item) => sum + (Number(item.costo) || 0), 0);

    if (pedidosActivos.length > 0) {
      numOrden = pedidosActivos[0].num_orden;
      const costoActual = Number(pedidosActivos[0].costo) || 0;
      const nuevoCostoTotal = costoActual + costoNuevosItems;
      await db.query(
        'UPDATE pedidos SET costo = ? WHERE num_orden = ?',
        [nuevoCostoTotal, numOrden]
      );
    } else {
      const [resultPedido] = await db.query(
        'INSERT INTO pedidos (num_mesa, costo, estado, cuenta) VALUES (?, ?, 0, ?)',
        [numMesaInt, costoNuevosItems, cuentaIdFinal]
      );
      numOrden = resultPedido.insertId;
    }

    // 2. Insertar cada alimento_pedido ligado a este num_orden con su correspondiente sufijo de zona (-barra, -comal, -cocina)
    for (const item of items) {
      const estadoInicial = 0;
      let alimentoTexto = item.alimento ? String(item.alimento).trim() : null;

      if (alimentoTexto && !alimentoTexto.match(/-[a-zA-Z0-9_]+$/)) {
        const zonaDetectada = await obtenerZonaAlimento(item);
        alimentoTexto = `${alimentoTexto}-${zonaDetectada}`;
      }

      await db.query(
        'INSERT INTO alimentos_pedidos (costo, estado, alimento, guarnicion1, guarnicion2, entrada, bebida, guiso, extras, comentarios, cuenta, num_orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          Number(item.costo) || 0,
          estadoInicial,
          alimentoTexto,
          item.guarnicion1 || null,
          item.guarnicion2 || null,
          item.entrada || null,
          item.bebida || null,
          item.guiso || null,
          item.extras || '',
          item.comentarios || '',
          cuentaIdFinal,
          numOrden,
        ]
      );
    }

    return res.json({
      ok: true,
      mensaje: 'Orden registrada exitosamente',
      num_orden: numOrden,
      items_agregados: items.length,
    });
  } catch (error) {
    console.error('Error al crear o actualizar pedido:', error);
    return res.status(500).json({ error: 'Error interno al guardar la comanda' });
  }
};

// GET /api/pedidos/mesa/:num_mesa
// Obtener los alimento_pedido en estado 0, 1, 2, 3 y 4 de la mesa seleccionada
const getAlimentosPedidoPorMesa = async (req, res) => {
  const { num_mesa } = req.params;

  try {
    try { await db.query('ALTER TABLE alimentos_pedidos ADD COLUMN bloques_marcados TEXT DEFAULT NULL'); } catch (e) {}

    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.guiso, ap.extras, ap.comentarios, ap.estado, ap.num_orden, ap.bloques_marcados, p.num_mesa, COALESCE(c.nombre, c2.nombre, 'Mesero') as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       LEFT JOIN cuentas c2 ON p.cuenta = c2.id
       WHERE p.num_mesa = ? AND ap.estado IN (0, 1, 2, 3, 4)
       ORDER BY ap.id DESC`,
      [num_mesa]
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar alimentos de la mesa:', error);
    return res.status(500).json({ error: 'Error al consultar la comanda de la mesa' });
  }
}// GET /api/pedidos/todas-las-mesas
// Obtener todos los alimentos_pedidos en estado 0, 1, 2, 3 y 4 recientes de TODAS las mesas activas
const getTodasLasMesas = async (req, res) => {
  try {
    try { await db.query('ALTER TABLE pedidos ADD COLUMN corte INT DEFAULT NULL'); } catch (e) {}
    try { await db.query("ALTER TABLE alimentos_pedidos ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'efectivo'"); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos_pedidos ADD COLUMN bloques_marcados TEXT DEFAULT NULL'); } catch (e) {}

    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.guiso, ap.extras, ap.comentarios, ap.estado, ap.num_orden, ap.metodo_pago, ap.bloques_marcados,
              p.num_mesa, p.fecha_pedido, p.corte, COALESCE(c.nombre, c2.nombre, 'Mesero') as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       LEFT JOIN cuentas c2 ON p.cuenta = c2.id
       WHERE ap.estado IN (0, 1, 2, 3) OR (ap.estado = 4 AND p.fecha_pedido >= NOW() - INTERVAL 30 DAY)
       ORDER BY ap.id DESC`
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar alimentos de todas las mesas:', error);
    return res.status(500).json({ error: 'Error al consultar la comanda global' });
  }
};

// PUT /api/pedidos/alimento-pedido/:id/estado
// Cambiar estado de un alimento_pedido (0: pendiente, 1: servido cocina, 2: servido mesa/barra/comal, 3: completado, 4: cobrado)
const cambiarEstadoAlimentoPedido = async (req, res) => {
  const { id } = req.params;
  const { estado, corte_id, metodo_pago } = req.body;

  if (estado === undefined || ![0, 1, 2, 3, 4].includes(Number(estado))) {
    return res.status(400).json({ error: 'Estado inválido (Debe ser 0, 1, 2, 3 o 4)' });
  }

  const metodoFinal = (metodo_pago || 'efectivo').toLowerCase();

  try {
    try { await db.query("ALTER TABLE alimentos_pedidos ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'efectivo'"); } catch (e) {}
    try { await db.query("ALTER TABLE pedidos ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'efectivo'"); } catch (e) {}

    const [apRows] = await db.query('SELECT num_orden FROM alimentos_pedidos WHERE id = ?', [id]);
    if (apRows.length > 0) {
      const numOrden = apRows[0].num_orden;

      if (Number(estado) === 2 || Number(estado) === 1) {
        await db.query('UPDATE pedidos SET estado = 1 WHERE num_orden = ? AND estado = 0', [numOrden]);
      }

      if (Number(estado) === 4 && corte_id) {
        try { await db.query('ALTER TABLE pedidos ADD COLUMN corte INT DEFAULT NULL'); } catch (e) {}
        await db.query('UPDATE pedidos SET corte = ? WHERE num_orden = ?', [corte_id, numOrden]);
      }
    }

    await db.query('UPDATE alimentos_pedidos SET estado = ?, metodo_pago = ? WHERE id = ?', [estado, metodoFinal, id]);
    return res.json({ ok: true, id: Number(id), nuevo_estado: Number(estado) });
  } catch (error) {
    console.error('Error al actualizar estado del alimento pedido:', error);
    return res.status(500).json({ error: 'Error interno al actualizar estado' });
  }
};

// PUT /api/pedidos/alimento-pedido/:id/bloques
// Sincronizar bloques marcados en verde para un alimento_pedido
const cambiarBloquesAlimentoPedido = async (req, res) => {
  const { id } = req.params;
  const { bloques_marcados } = req.body;

  try {
    try { await db.query('ALTER TABLE alimentos_pedidos ADD COLUMN bloques_marcados TEXT DEFAULT NULL'); } catch (e) {}
    const val = typeof bloques_marcados === 'string' ? bloques_marcados : JSON.stringify(bloques_marcados || []);
    await db.query('UPDATE alimentos_pedidos SET bloques_marcados = ? WHERE id = ?', [val, id]);
    return res.json({ ok: true, id: Number(id), bloques_marcados: val });
  } catch (error) {
    console.error('Error al actualizar bloques marcados:', error);
    return res.status(500).json({ error: 'Error interno al actualizar bloques marcados' });
  }
};

// =============================================
// ENDPOINTS ESPECIALIZADOS PARA LA BARRA
// =============================================

// GET /api/pedidos/barra/pendientes
// Obtener todos los alimentos_pedidos en estado 0 (pendientes por servir)
const getBarraPendientes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.extras, ap.comentarios, ap.estado, ap.num_orden,
              p.num_mesa, p.fecha_pedido, c.nombre as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       WHERE ap.estado = 0 AND p.estado IN (0, 1)
       ORDER BY ap.id ASC`
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar pendientes de barra:', error);
    return res.status(500).json({ error: 'Error al consultar comanda de barra' });
  }
};

// GET /api/pedidos/barra/historial-hoy
// Obtener los alimentos_pedidos servidos (estado 2) del día actual
const getBarraHistorialHoy = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.extras, ap.comentarios, ap.estado, ap.num_orden,
              p.num_mesa, p.fecha_pedido, c.nombre as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       WHERE ap.estado = 2 AND DATE(p.fecha_pedido) = CURDATE()
       ORDER BY ap.id DESC`
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar historial del día de barra:', error);
    return res.status(500).json({ error: 'Error al consultar historial de barra' });
  }
};

// =============================================
// ENDPOINTS ESPECIALIZADOS PARA EL COMAL
// =============================================

// GET /api/pedidos/comal/pendientes
// Obtener todos los alimentos_pedidos en estado 0 de la zona comal (todas las mesas)
const getComalPendientes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.guiso, ap.extras, ap.comentarios, ap.estado, ap.num_orden,
              p.num_mesa, p.fecha_pedido, c.nombre as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       LEFT JOIN alimentos a ON ap.alimento = a.nombre
       WHERE ap.estado = 0 
         AND (a.zona = 'comal' OR a.tipo = 'Antojito' OR ap.guiso IS NOT NULL OR ap.alimento LIKE '%sope%' OR ap.alimento LIKE '%gordita%' OR ap.alimento LIKE '%tlacoyo%' OR ap.alimento LIKE '%quesadilla%' OR ap.alimento LIKE '%pambazo%' OR ap.alimento LIKE '%flauta%' OR ap.alimento LIKE '%taco%' OR ap.alimento LIKE '%enchilada%' OR ap.alimento LIKE '%antojito%')
         AND p.estado IN (0, 1)
       ORDER BY ap.id ASC`
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar pendientes de comal:', error);
    return res.status(500).json({ error: 'Error al consultar comanda de comal' });
  }
};

// GET /api/pedidos/comal/historial-hoy
// Obtener los alimentos_pedidos de comal servidos y cobrados (estado 2, 3, 4) del día actual
const getComalHistorialHoy = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.guiso, ap.extras, ap.comentarios, ap.estado, ap.num_orden,
              p.num_mesa, p.fecha_pedido, c.nombre as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       LEFT JOIN alimentos a ON ap.alimento = a.nombre
       WHERE ap.estado IN (2, 3, 4) 
         AND (a.zona = 'comal' OR a.tipo = 'Antojito' OR ap.guiso IS NOT NULL OR ap.alimento LIKE '%sope%' OR ap.alimento LIKE '%gordita%' OR ap.alimento LIKE '%tlacoyo%' OR ap.alimento LIKE '%quesadilla%' OR ap.alimento LIKE '%pambazo%' OR ap.alimento LIKE '%flauta%' OR ap.alimento LIKE '%taco%' OR ap.alimento LIKE '%enchilada%' OR ap.alimento LIKE '%antojito%')
         AND DATE(p.fecha_pedido) = CURDATE()
       ORDER BY ap.id DESC`
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar historial del día de comal:', error);
    return res.status(500).json({ error: 'Error al consultar historial de comal' });
  }
};

// =============================================
// ENDPOINTS ESPECIALIZADOS PARA LA COCINA
// =============================================

// GET /api/pedidos/cocina/pendientes
// Obtener todos los alimentos_pedidos en estado 0 de la zona cocina (todas las mesas)
const getCocinaPendientes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.guiso, ap.extras, ap.comentarios, ap.estado, ap.num_orden,
              p.num_mesa, p.fecha_pedido, c.nombre as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       LEFT JOIN alimentos a ON ap.alimento = a.nombre
       WHERE ap.estado = 0 
         AND ap.alimento NOT LIKE '%-barra'
         AND ap.alimento NOT LIKE '%-comal'
         AND (a.zona IS NULL OR a.zona != 'barra')
         AND (a.zona IS NULL OR a.zona != 'comal')
         AND (a.tipo IS NULL OR a.tipo NOT IN ('Postre', 'Bebida', 'Litros', 'Antojito'))
         AND (
           a.zona = 'cocina' 
           OR ap.alimento LIKE '%-cocina'
           OR a.tipo IN ('Desayuno', 'Comida', 'Platos Fuertes', 'Entrada', 'Guarnicion', 'Torta') 
           OR (
             ap.guiso IS NULL 
             AND ap.alimento NOT LIKE '%sope%' 
             AND ap.alimento NOT LIKE '%gordita%' 
             AND ap.alimento NOT LIKE '%tlacoyo%' 
             AND ap.alimento NOT LIKE '%quesadilla%' 
             AND ap.alimento NOT LIKE '%pambazo%' 
             AND ap.alimento NOT LIKE '%flauta%' 
             AND ap.alimento NOT LIKE '%taco%' 
             AND ap.alimento NOT LIKE '%enchilada%'
             AND ap.alimento NOT LIKE '%jugo%'
             AND ap.alimento NOT LIKE '%café%'
             AND ap.alimento NOT LIKE '%refresco%'
             AND ap.alimento NOT LIKE '%cerveza%'
             AND ap.alimento NOT LIKE '%agua%'
             AND ap.alimento NOT LIKE '%licuado%'
             AND ap.alimento NOT LIKE '%té%'
             AND ap.alimento NOT LIKE '%postre%'
             AND ap.alimento NOT LIKE '%flan%'
             AND ap.alimento NOT LIKE '%carlota%'
             AND ap.alimento NOT LIKE '%jericalla%'
             AND ap.alimento NOT LIKE '%gelatina%'
             AND ap.alimento NOT LIKE '%arroz%'
             AND ap.alimento NOT LIKE '%pastel%'
             AND ap.alimento NOT LIKE '%helado%'
             AND ap.alimento NOT LIKE '%nieve%'
             AND ap.alimento NOT LIKE '%pay%'
             AND ap.alimento NOT LIKE '%pie%'
             AND ap.alimento NOT LIKE '%chocoflan%'
             AND ap.alimento NOT LIKE '%crepa%'
           )
         )
         AND p.estado IN (0, 1)
       ORDER BY ap.id ASC`
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar pendientes de cocina:', error);
    return res.status(500).json({ error: 'Error al consultar comanda de cocina' });
  }
};

// GET /api/pedidos/cocina/historial-hoy
// Obtener los alimentos_pedidos de cocina del día actual en estado 0, 1, 2, 3, 4 de todas las mesas
const getCocinaHistorialHoy = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ap.id, ap.alimento, ap.costo, ap.guarnicion1, ap.guarnicion2, ap.entrada, ap.bebida, ap.guiso, ap.extras, ap.comentarios, ap.estado, ap.num_orden,
              p.num_mesa, p.fecha_pedido, c.nombre as mesero
       FROM alimentos_pedidos ap
       INNER JOIN pedidos p ON ap.num_orden = p.num_orden
       LEFT JOIN cuentas c ON ap.cuenta = c.id
       LEFT JOIN alimentos a ON ap.alimento = a.nombre
       WHERE ap.estado IN (0, 1, 2, 3, 4) 
         AND ap.alimento NOT LIKE '%-barra'
         AND ap.alimento NOT LIKE '%-comal'
         AND (a.zona IS NULL OR a.zona != 'barra')
         AND (a.zona IS NULL OR a.zona != 'comal')
         AND (a.tipo IS NULL OR a.tipo NOT IN ('Postre', 'Bebida', 'Litros', 'Antojito'))
         AND (
           a.zona = 'cocina' 
           OR ap.alimento LIKE '%-cocina'
           OR a.tipo IN ('Desayuno', 'Comida', 'Platos Fuertes', 'Entrada', 'Guarnicion', 'Torta') 
           OR (
             ap.guiso IS NULL 
             AND ap.alimento NOT LIKE '%sope%' 
             AND ap.alimento NOT LIKE '%gordita%' 
             AND ap.alimento NOT LIKE '%tlacoyo%' 
             AND ap.alimento NOT LIKE '%quesadilla%' 
             AND ap.alimento NOT LIKE '%pambazo%' 
             AND ap.alimento NOT LIKE '%flauta%' 
             AND ap.alimento NOT LIKE '%taco%' 
             AND ap.alimento NOT LIKE '%enchilada%'
             AND ap.alimento NOT LIKE '%jugo%'
             AND ap.alimento NOT LIKE '%café%'
             AND ap.alimento NOT LIKE '%refresco%'
             AND ap.alimento NOT LIKE '%cerveza%'
             AND ap.alimento NOT LIKE '%agua%'
             AND ap.alimento NOT LIKE '%licuado%'
             AND ap.alimento NOT LIKE '%té%'
             AND ap.alimento NOT LIKE '%postre%'
             AND ap.alimento NOT LIKE '%flan%'
             AND ap.alimento NOT LIKE '%carlota%'
             AND ap.alimento NOT LIKE '%jericalla%'
             AND ap.alimento NOT LIKE '%gelatina%'
             AND ap.alimento NOT LIKE '%arroz%'
             AND ap.alimento NOT LIKE '%pastel%'
             AND ap.alimento NOT LIKE '%helado%'
             AND ap.alimento NOT LIKE '%nieve%'
             AND ap.alimento NOT LIKE '%pay%'
             AND ap.alimento NOT LIKE '%pie%'
             AND ap.alimento NOT LIKE '%chocoflan%'
             AND ap.alimento NOT LIKE '%crepa%'
           )
         )
         AND DATE(p.fecha_pedido) = CURDATE()
       ORDER BY ap.id DESC`
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error('Error al consultar historial del día de cocina:', error);
    return res.status(500).json({ error: 'Error al consultar historial de cocina' });
  }
};

// PUT /api/pedidos/barra/servir/:id
// Marcar alimento_pedido como servido en barra (estado 2)
const servirBarraItem = async (req, res) => {
  const { id } = req.params;

  try {
    const [apRows] = await db.query('SELECT num_orden FROM alimentos_pedidos WHERE id = ?', [id]);
    if (apRows.length === 0) {
      return res.status(404).json({ error: 'Alimento pedido no encontrado' });
    }

    const numOrden = apRows[0].num_orden;

    // Cambiar alimento_pedido.estado = 2 (Servido en Barra/Mesa)
    await db.query('UPDATE alimentos_pedidos SET estado = 2 WHERE id = ?', [id]);
    await db.query('UPDATE pedidos SET estado = 1 WHERE num_orden = ? AND estado = 0', [numOrden]);

    return res.json({ ok: true, id: Number(id), nuevo_estado: 2 });
  } catch (error) {
    console.error('Error al marcar servido en barra:', error);
    return res.status(500).json({ error: 'Error interno al actualizar pedido en barra' });
  }
};

// PUT /api/pedidos/barra/revertir/:id
// Regresar alimento_pedido a estado 0 (por error)
const revertirBarraItem = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('UPDATE alimentos_pedidos SET estado = 0 WHERE id = ?', [id]);
    return res.json({ ok: true, id: Number(id), nuevo_estado: 0 });
  } catch (error) {
    console.error('Error al revertir orden en barra:', error);
    return res.status(500).json({ error: 'Error interno al revertir comanda en barra' });
  }
};

// PUT /api/pedidos/alimento-pedido/:id/editar
// Editar campos de un alimento_pedido y recalcular costo del pedido padre
const editarAlimentoPedido = async (req, res) => {
  const { id } = req.params;
  const { alimento, comentarios, guarnicion1, guarnicion2, entrada, bebida, guiso, extras, costo } = req.body;

  try {
    const [rows] = await db.query('SELECT num_orden FROM alimentos_pedidos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ítem de comanda no encontrado' });
    }
    const numOrden = rows[0].num_orden;

    await db.query(
      `UPDATE alimentos_pedidos 
       SET alimento = COALESCE(?, alimento),
           comentarios = ?,
           guarnicion1 = ?,
           guarnicion2 = ?,
           entrada = ?,
           bebida = ?,
           guiso = ?,
           extras = ?,
           costo = COALESCE(?, costo)
       WHERE id = ?`,
      [
        alimento || null,
        comentarios !== undefined ? comentarios : null,
        guarnicion1 !== undefined ? guarnicion1 : null,
        guarnicion2 !== undefined ? guarnicion2 : null,
        entrada !== undefined ? entrada : null,
        bebida !== undefined ? bebida : null,
        guiso !== undefined ? guiso : null,
        extras !== undefined ? extras : null,
        costo !== undefined ? Number(costo) : null,
        id,
      ]
    );

    // Recalcular costo total del pedido padre
    const [sumRows] = await db.query(
      'SELECT SUM(costo) as nuevo_total FROM alimentos_pedidos WHERE num_orden = ?',
      [numOrden]
    );
    const nuevoTotal = sumRows[0].nuevo_total || 0;
    await db.query('UPDATE pedidos SET costo = ? WHERE num_orden = ?', [nuevoTotal, numOrden]);

    return res.json({ ok: true, id: Number(id), nuevo_total: nuevoTotal });
  } catch (error) {
    console.error('Error al editar alimento_pedido:', error);
    return res.status(500).json({ error: 'Error interno al editar el ítem' });
  }
};

// DELETE /api/pedidos/alimento-pedido/:id/cancelar
// Cancelar/eliminar un alimento_pedido y recalcular costo del pedido padre
const cancelarAlimentoPedido = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT num_orden FROM alimentos_pedidos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ítem de comanda no encontrado' });
    }
    const numOrden = rows[0].num_orden;

    // Eliminar la orden
    await db.query('DELETE FROM alimentos_pedidos WHERE id = ?', [id]);

    // Recalcular items y costo total restante
    const [sumRows] = await db.query(
      'SELECT SUM(costo) as nuevo_total, COUNT(*) as total_items FROM alimentos_pedidos WHERE num_orden = ?',
      [numOrden]
    );

    const totalItems = sumRows[0].total_items || 0;
    const nuevoTotal = sumRows[0].nuevo_total || 0;

    if (totalItems === 0) {
      // Si la comanda quedó vacía, eliminar el pedido padre
      await db.query('DELETE FROM pedidos WHERE num_orden = ?', [numOrden]);
    } else {
      await db.query('UPDATE pedidos SET costo = ? WHERE num_orden = ?', [nuevoTotal, numOrden]);
    }

    return res.json({ ok: true, id: Number(id), items_restantes: totalItems });
  } catch (error) {
    console.error('Error al cancelar alimento_pedido:', error);
    return res.status(500).json({ error: 'Error interno al cancelar la orden' });
  }
};

// PUT /api/pedidos/orden/:num_orden/estado
// Cambiar el estado de todos los alimentos_pedidos de una orden completa (ej. cobrar -> estado 4)
const cambiarEstadoOrden = async (req, res) => {
  const { num_orden } = req.params;
  const { estado, corte_id, metodo_pago } = req.body;

  if (estado === undefined || ![0, 1, 2, 3, 4].includes(Number(estado))) {
    return res.status(400).json({ error: 'Estado inválido (Debe ser 0, 1, 2, 3 o 4)' });
  }

  const metodoFinal = (metodo_pago || 'efectivo').toLowerCase();

  try {
    try { await db.query("ALTER TABLE alimentos_pedidos ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'efectivo'"); } catch (e) {}
    try { await db.query("ALTER TABLE pedidos ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'efectivo'"); } catch (e) {}

    await db.query('UPDATE alimentos_pedidos SET estado = ?, metodo_pago = ? WHERE num_orden = ?', [estado, metodoFinal, num_orden]);

    if (Number(estado) === 4 && corte_id) {
      try { await db.query('ALTER TABLE pedidos ADD COLUMN corte INT DEFAULT NULL'); } catch (e) {}
      await db.query('UPDATE pedidos SET estado = ?, corte = ?, metodo_pago = ? WHERE num_orden = ?', [estado, corte_id, metodoFinal, num_orden]);
    } else {
      await db.query('UPDATE pedidos SET estado = ?, metodo_pago = ? WHERE num_orden = ?', [estado, metodoFinal, num_orden]);
    }

    return res.json({ ok: true, num_orden: Number(num_orden), nuevo_estado: Number(estado) });
  } catch (error) {
    console.error('Error al actualizar estado de la orden completa:', error);
    return res.status(500).json({ error: 'Error interno al actualizar la orden' });
  }
};

// POST /api/pedidos/imprimir-directo
// Impresión silenciosa directa a la impresora USB en Windows ("La Cocina de Mi Ama Tiket")
const imprimirTicketDirecto = async (req, res) => {
  const { comanda, opciones } = req.body;

  if (!comanda) {
    return res.status(400).json({ error: 'Falta la información de la comanda para imprimir' });
  }

  try {
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const limpiarTextoTicket = (str = '') => {
      if (!str) return '';
      let s = String(str).replace(/-[a-zA-Z0-9_]+$/g, '').trim();
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/Ñ/g, 'N');
      return s;
    };

    const wrapText = (text, maxChars) => {
      if (!text || text.length <= maxChars) return [text];
      const words = text.split(' ');
      const result = [];
      let current = '';

      words.forEach((w) => {
        if ((current + ' ' + w).trim().length <= maxChars) {
          current = (current + ' ' + w).trim();
        } else {
          if (current) result.push(current);
          current = w;
        }
      });
      if (current) result.push(current);
      return result;
    };

    const printerName = 'La Cocina de Mi Ama Tiket';

    // 1. Verificación PnP de Hardware USB en Windows (YICHIP3121 POS-58 / VID_0416) + Purga de cola
    const timestampCheck = Date.now();
    const checkPsScript = `
# 1. Purgar cualquier trabajo colgado previo en la cola de Windows
Get-PrintJob -PrinterName '${printerName}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue

# 2. Verificar estado fisico de hardware USB Plug & Play
$usbDevice = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { ($_.FriendlyName -like "*POS-58*" -or $_.InstanceId -like "*VID_0416*") -and $_.Status -eq "OK" }

if ($null -eq $usbDevice) {
    # Purga secundaria de seguridad
    Get-PrintJob -PrinterName '${printerName}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue
    Write-Output "RESULT:DISCONNECTED"
    exit
}

Write-Output "RESULT:READY"
`;

    const checkPsPath = path.join(os.tmpdir(), `check_usb_${timestampCheck}.ps1`);
    fs.writeFileSync(checkPsPath, checkPsScript, 'utf8');

    // Comando totalmente oculto sin ventana emergente (-WindowStyle Hidden)
    const checkResult = await new Promise((resolve) => {
      exec(`powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "${checkPsPath}"`, (err, stdout) => {
        try { fs.unlinkSync(checkPsPath); } catch (e) {}
        if (err || !stdout) {
          return resolve('DISCONNECTED');
        }
        return resolve(stdout.trim());
      });
    });

    if (!checkResult.includes('RESULT:READY')) {
      // Purga final de la cola de impresión de Windows para evitar acumulación
      exec(`powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-PrintJob -PrinterName '${printerName}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue"`);

      return res.status(404).json({
        error: `No se detectó la impresora USB ("${printerName}"). Verifica que el cable USB esté conectado a la computadora y la impresora esté encendida.`,
      });
    }

    const nombreRestaurante = 'LA COCINA DE MAMA';
    const subtitulo = 'Sabor Casero y Tradicional';

    const fechaObj = comanda.fecha_pedido ? new Date(comanda.fecha_pedido) : new Date();
    const fechaStr = fechaObj.toLocaleDateString('es-MX');
    const hrs = String(fechaObj.getHours()).padStart(2, '0');
    const mins = String(fechaObj.getMinutes()).padStart(2, '0');
    const hora24Str = `${hrs}:${mins}`;

    const items = comanda.items || [];
    const total = Number(comanda.total || items.reduce((acc, i) => acc + (Number(i.costo) || 0), 0));

    const WIDTH = 26;
    const divider = (char = '-') => char.repeat(WIDTH);
    const padRow = (left, right) => {
      const avail = WIDTH - right.length;
      if (left.length > avail) return left.substring(0, avail - 1) + ' ' + right;
      return left + ' '.repeat(Math.max(1, avail - left.length)) + right;
    };

    let lines = [];
    lines.push('   LA COCINA DE MAMA');
    lines.push('Sabor Casero y Tradicional');
    lines.push(divider('='));
    lines.push(`Fecha:${fechaStr} Hora:${hora24Str}`);
    lines.push(`Orden: #${comanda.num_orden || 'S/N'}     Mesa: #${comanda.num_mesa || 'S/N'}`);
    if (comanda.mesero) lines.push(`Mesero: ${limpiarTextoTicket(comanda.mesero)}`);
    lines.push(divider('-'));

    items.forEach((item) => {
      let rawNombre = item.alimento || item.nombre || 'Platillo';
      rawNombre = limpiarTextoTicket(rawNombre);

      let cantidad = 1;
      const matchCant = rawNombre.match(/^(\d+)x\s+/i);
      if (matchCant) {
        cantidad = parseInt(matchCant[1], 10);
        rawNombre = rawNombre.replace(/^(\d+)x\s+/i, '').trim();
      } else if (item.cantidad && Number(item.cantidad) > 0) {
        cantidad = Number(item.cantidad);
      }

      const precioNum = Number(item.costo || item.precio || 0);
      const precioStr = `$${precioNum.toFixed(2)}`;

      const prefix = `${cantidad}x `;
      const maxNombreWidth = Math.max(8, WIDTH - prefix.length - precioStr.length - 1);

      const nombreWrapped = wrapText(rawNombre, maxNombreWidth);
      const firstLineNombre = nombreWrapped[0] || '';

      lines.push(padRow(`${prefix}${firstLineNombre}`, precioStr, WIDTH));

      for (let i = 1; i < nombreWrapped.length; i++) {
        lines.push(`   ${nombreWrapped[i]}`);
      }

      // Detalles sin etiquetas de campo (solo el nombre de la opcion)
      const detallesList = [
        item.entrada ? limpiarTextoTicket(item.entrada) : null,
        item.guarnicion1 ? limpiarTextoTicket(item.guarnicion1) : null,
        item.guarnicion2 ? limpiarTextoTicket(item.guarnicion2) : null,
        item.guiso ? limpiarTextoTicket(item.guiso) : null,
        item.bebida ? limpiarTextoTicket(item.bebida) : null,
        item.extras ? limpiarTextoTicket(item.extras) : null,
      ].filter(Boolean);

      detallesList.forEach((det) => {
        const wrappedDet = wrapText(det, WIDTH - 4);
        if (wrappedDet.length > 0) {
          lines.push(`  + ${wrappedDet[0]}`);
        }
        for (let j = 1; j < wrappedDet.length; j++) {
          lines.push(`    ${wrappedDet[j]}`);
        }
      });
    });

    lines.push(divider('-'));
    lines.push(padRow('TOTAL:', `$${total.toFixed(2)}`));
    lines.push(divider('='));
    lines.push('Gracias por su preferencia!');
    lines.push('  La Cocina de Mama\r\n\r\n\r\n');

    const textoTicket = lines.join('\r\n');

    const timestamp = Date.now();
    const tempTxtPath = path.join(os.tmpdir(), `ticket_${timestamp}.txt`);
    const tempPs1Path = path.join(os.tmpdir(), `print_${timestamp}.ps1`);

    fs.writeFileSync(tempTxtPath, textoTicket, 'utf8');

    // Script de PowerShell con márgenes nulos (0,0,0,0), fuente Courier New de 7.5pt y sangría de 2px
    const psScript = `
Add-Type -AssemblyName System.Drawing
$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = '${printerName}'
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$font = New-Object System.Drawing.Font('Courier New', 7.5, [System.Drawing.FontStyle]::Bold)
$text = Get-Content -Path '${tempTxtPath.replace(/\\/g, '\\\\')}' -Raw

$doc.add_PrintPage({
    param($sender, $e)
    $e.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, 2, 0)
})
$doc.Print()
`;

    fs.writeFileSync(tempPs1Path, psScript, 'utf8');

    // Ejecución totalmente silenciosa y oculta
    const cmd = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "${tempPs1Path}"`;

    exec(cmd, (error) => {
      try { fs.unlinkSync(tempTxtPath); } catch (e) {}
      try { fs.unlinkSync(tempPs1Path); } catch (e) {}

      if (error) {
        console.error('Error al imprimir directamente:', error);
        exec(`powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-PrintJob -PrinterName '${printerName}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue"`);
        return res.status(500).json({ error: 'No se pudo enviar la impresión a la impresora USB.' });
      }
      return res.json({ ok: true, mensaje: 'Ticket impreso perfectamente en "La Cocina de Mi Ama Tiket"' });
    });
  } catch (err) {
    console.error('Error en controller de impresión directa:', err);
    return res.status(500).json({ error: 'Error interno en servidor de impresión' });
  }
};

// DELETE /api/pedidos/orden/:num_orden/cancelar
// Cancelar y eliminar una orden completa y todos sus alimentos_pedidos
const cancelarOrdenCompleta = async (req, res) => {
  const { num_orden } = req.params;

  try {
    await db.query('DELETE FROM alimentos_pedidos WHERE num_orden = ?', [num_orden]);
    await db.query('DELETE FROM pedidos WHERE num_orden = ?', [num_orden]);

    return res.json({ ok: true, message: 'Orden cancelada y eliminada exitosamente', num_orden: Number(num_orden) });
  } catch (error) {
    console.error('Error al cancelar la orden completa:', error);
    return res.status(500).json({ error: 'Error interno al cancelar la orden' });
  }
};

// GET /api/pedidos/para-llevar/activos
// Obtener lista de pedidos para llevar activos (num_mesa >= 100)
const getParaLlevarActivos = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.num_orden, p.num_mesa, p.costo, p.fecha_pedido, p.estado,
              COUNT(ap.id) as itemsCount
       FROM pedidos p
       INNER JOIN alimentos_pedidos ap ON p.num_orden = ap.num_orden
       WHERE p.num_mesa >= 100 AND ap.estado IN (0, 1, 2, 4)
       GROUP BY p.num_orden, p.num_mesa, p.costo, p.fecha_pedido, p.estado
       ORDER BY p.num_mesa ASC, p.num_orden DESC`
    );

    const pedidosParaLlevar = rows.map((r) => ({
      id: r.num_orden,
      num_orden: r.num_orden,
      num_mesa: Number(r.num_mesa),
      cliente: `Para Llevar #${r.num_mesa}`,
      costo: Number(r.costo || 0),
      hora: r.fecha_pedido ? new Date(r.fecha_pedido).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
      itemsCount: Number(r.itemsCount || 0),
    }));

    return res.json({ pedidos: pedidosParaLlevar });
  } catch (error) {
    console.error('Error al consultar pedidos para llevar activos:', error);
    return res.status(500).json({ error: 'Error al consultar pedidos para llevar' });
  }
};

// GET /api/pedidos/para-llevar/siguiente-mesa
// Obtener el siguiente número de mesa para llevar disponible (comienza en 100, 101, 102...)
const getSiguienteMesaParaLlevar = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT p.num_mesa
       FROM pedidos p
       INNER JOIN alimentos_pedidos ap ON p.num_orden = ap.num_orden
       WHERE p.num_mesa >= 100 AND ap.estado IN (0, 1, 2, 4)`
    );

    const mesasOcupadas = new Set(rows.map((r) => Number(r.num_mesa)));

    let siguienteMesa = 100;
    while (mesasOcupadas.has(siguienteMesa)) {
      siguienteMesa++;
    }

    return res.json({ num_mesa: siguienteMesa, nombre: `Para Llevar #${siguienteMesa}` });
  } catch (error) {
    console.error('Error al obtener siguiente mesa para llevar:', error);
    return res.status(500).json({ error: 'Error al calcular número de mesa para llevar' });
  }
};

module.exports = {
  crearPedido,
  getAlimentosPedidoPorMesa,
  getTodasLasMesas,
  cambiarEstadoAlimentoPedido,
  cambiarBloquesAlimentoPedido,
  cambiarEstadoOrden,
  getBarraPendientes,
  getBarraHistorialHoy,
  getComalPendientes,
  getComalHistorialHoy,
  getCocinaPendientes,
  getCocinaHistorialHoy,
  servirBarraItem,
  revertirBarraItem,
  editarAlimentoPedido,
  cancelarAlimentoPedido,
  cancelarOrdenCompleta,
  getParaLlevarActivos,
  getSiguienteMesaParaLlevar,
  imprimirTicketDirecto,
};
