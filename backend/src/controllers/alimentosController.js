const db = require('../config/db');

// GET /api/alimentos
// Soporta filtrado por query ?tipo=Desayuno o consulta general (solo estado = 1 para meseros)
const getAlimentos = async (req, res) => {
  const { tipo } = req.query;

  try {
    let query = 'SELECT * FROM alimentos WHERE estado = TRUE';
    let params = [];

    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }

    query += ' ORDER BY tipo ASC, nombre ASC';

    const [rows] = await db.query(query, params);
    return res.json({ alimentos: rows });
  } catch (error) {
    console.error('Error al obtener alimentos:', error);
    return res.status(500).json({ error: 'Error al consultar catálogo de alimentos' });
  }
};

// GET /api/alimentos/categoria/:tipo
const getAlimentosPorCategoria = async (req, res) => {
  const { tipo } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT * FROM alimentos WHERE estado = TRUE AND LOWER(tipo) = LOWER(?) ORDER BY nombre ASC',
      [tipo]
    );
    return res.json({ alimentos: rows });
  } catch (error) {
    console.error('Error al obtener alimentos por categoría:', error);
    return res.status(500).json({ error: 'Error al consultar alimentos de la categoría' });
  }
};

// GET /api/alimentos/admin/todos
// Obtiene TODOS los alimentos (activos 1 e inactivos 0) para el panel de administracion
const getAllAlimentosAdmin = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM alimentos ORDER BY tipo ASC, nombre ASC');
    return res.json({ alimentos: rows });
  } catch (error) {
    console.error('Error al obtener todos los alimentos (Admin):', error);
    return res.status(500).json({ error: 'Error al consultar catálogo global' });
  }
};

// POST /api/alimentos
// Crear un nuevo alimento
const crearAlimento = async (req, res) => {
  const { nombre, tipo, precio, precio_paquete, precio_antojito, zona, estado, aplica_paquete, aplica_paquete_antojito } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta ingresar el nombre del alimento.' });
  }
  if (!tipo || !tipo.trim()) {
    return res.status(400).json({ error: 'Falta seleccionar el tipo/categoría del alimento.' });
  }
  if (precio === undefined || precio === null || precio === '' || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'Falta ingresar un precio válido para el alimento.' });
  }

  const zonaValida = ['barra', 'cocina', 'comal'].includes(zona?.toLowerCase())
    ? zona.toLowerCase()
    : 'cocina';
  const estadoValido = estado !== undefined ? (estado ? 1 : 0) : 1;
  const precioPaqueteVal = (precio_paquete !== undefined && precio_paquete !== null && precio_paquete !== '')
    ? Number(precio_paquete)
    : null;
  const precioAntojitoVal = (precio_antojito !== undefined && precio_antojito !== null && precio_antojito !== '')
    ? Number(precio_antojito)
    : null;
  const aplicaPaqueteVal = (aplica_paquete !== undefined && aplica_paquete !== null)
    ? (aplica_paquete ? 1 : 0)
    : 1;
  const aplicaPaqueteAntojitoVal = (aplica_paquete_antojito !== undefined && aplica_paquete_antojito !== null)
    ? (aplica_paquete_antojito ? 1 : 0)
    : 1;

  try {
    try { await db.query('ALTER TABLE alimentos ADD COLUMN precio_paquete DECIMAL(10,2) NULL DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN precio_antojito DECIMAL(10,2) NULL DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN aplica_paquete TINYINT(1) NOT NULL DEFAULT 1'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN aplica_paquete_antojito TINYINT(1) NOT NULL DEFAULT 1'); } catch (e) {}

    const [result] = await db.query(
      'INSERT INTO alimentos (nombre, tipo, precio, precio_paquete, precio_antojito, zona, estado, aplica_paquete, aplica_paquete_antojito) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre.trim(), tipo.trim(), Number(precio), precioPaqueteVal, precioAntojitoVal, zonaValida, estadoValido, aplicaPaqueteVal, aplicaPaqueteAntojitoVal]
    );

    return res.json({
      ok: true,
      alimento: {
        id: result.insertId,
        nombre: nombre.trim(),
        tipo: tipo.trim(),
        precio: Number(precio),
        precio_paquete: precioPaqueteVal,
        precio_antojito: precioAntojitoVal,
        zona: zonaValida,
        estado: estadoValido,
        aplica_paquete: aplicaPaqueteVal,
        aplica_paquete_antojito: aplicaPaqueteAntojitoVal,
      },
    });
  } catch (error) {
    console.error('Error al crear alimento:', error);
    return res.status(500).json({ error: 'Error al guardar el nuevo alimento' });
  }
};

// PUT /api/alimentos/:id
// Editar un alimento existente
const actualizarAlimento = async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, precio, precio_paquete, precio_antojito, zona, estado, aplica_paquete, aplica_paquete_antojito } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta ingresar el nombre del alimento.' });
  }
  if (!tipo || !tipo.trim()) {
    return res.status(400).json({ error: 'Falta seleccionar el tipo/categoría del alimento.' });
  }
  if (precio === undefined || precio === null || precio === '' || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ error: 'Falta ingresar un precio válido para el alimento.' });
  }

  const zonaValida = ['barra', 'cocina', 'comal'].includes(zona?.toLowerCase())
    ? zona.toLowerCase()
    : 'cocina';
  const estadoValido = estado !== undefined ? (estado ? 1 : 0) : 1;
  const precioPaqueteVal = (precio_paquete !== undefined && precio_paquete !== null && precio_paquete !== '')
    ? Number(precio_paquete)
    : null;
  const precioAntojitoVal = (precio_antojito !== undefined && precio_antojito !== null && precio_antojito !== '')
    ? Number(precio_antojito)
    : null;
  const aplicaPaqueteVal = (aplica_paquete !== undefined && aplica_paquete !== null)
    ? (aplica_paquete ? 1 : 0)
    : 1;
  const aplicaPaqueteAntojitoVal = (aplica_paquete_antojito !== undefined && aplica_paquete_antojito !== null)
    ? (aplica_paquete_antojito ? 1 : 0)
    : 1;

  try {
    try { await db.query('ALTER TABLE alimentos ADD COLUMN precio_paquete DECIMAL(10,2) NULL DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN precio_antojito DECIMAL(10,2) NULL DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN aplica_paquete TINYINT(1) NOT NULL DEFAULT 1'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN aplica_paquete_antojito TINYINT(1) NOT NULL DEFAULT 1'); } catch (e) {}

    await db.query(
      'UPDATE alimentos SET nombre = ?, tipo = ?, precio = ?, precio_paquete = ?, precio_antojito = ?, zona = ?, estado = ?, aplica_paquete = ?, aplica_paquete_antojito = ? WHERE id = ?',
      [nombre.trim(), tipo.trim(), Number(precio), precioPaqueteVal, precioAntojitoVal, zonaValida, estadoValido, aplicaPaqueteVal, aplicaPaqueteAntojitoVal, id]
    );

    return res.json({
      ok: true,
      id: Number(id),
      alimento: {
        id: Number(id),
        nombre: nombre.trim(),
        tipo: tipo.trim(),
        precio: Number(precio),
        precio_paquete: precioPaqueteVal,
        precio_antojito: precioAntojitoVal,
        zona: zonaValida,
        estado: estadoValido,
        aplica_paquete: aplicaPaqueteVal,
        aplica_paquete_antojito: aplicaPaqueteAntojitoVal,
      },
    });
  } catch (error) {
    console.error('Error al actualizar alimento:', error);
    return res.status(500).json({ error: 'Error al actualizar el alimento' });
  }
};

// POST /api/alimentos/menu-del-dia
// Generar Menú del Día para tipos de menú configurable (Comida, Desayuno, Entrada, Bebida/Litros, Guarnicion, Postre):
const guardarMenuDelDia = async (req, res) => {
  const { idsDisponibles } = req.body; // Array de IDs de platillos disponibles para el menú del día

  try {
    const tiposMenuDia = [
      'comida', 'comidas',
      'desayuno', 'desayunos',
      'entrada', 'entradas',
      'bebida', 'bebidas', 'litro', 'litros',
      'guarnicion', 'guarniciones',
      'postre', 'postres'
    ];

    // 1. Poner en estado 0 todos los alimentos de las categorías administradas en el menú del día
    await db.query("UPDATE alimentos SET estado = 0 WHERE LOWER(tipo) IN (?)", [tiposMenuDia]);

    // 2. Si se recibieron IDs disponibles, poner en estado 1
    if (Array.isArray(idsDisponibles) && idsDisponibles.length > 0) {
      await db.query(
        "UPDATE alimentos SET estado = 1 WHERE id IN (?)",
        [idsDisponibles]
      );
    }

    return res.json({ ok: true, mensaje: 'Menú del día actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar Menú del Día:', error);
    return res.status(500).json({ error: 'Error interno al actualizar el menú del día' });
  }
};

// PUT /api/alimentos/bulk-update-precios
// Actualizar masivamente precios de múltiples alimentos por ID
const actualizarPreciosMasivo = async (req, res) => {
  const {
    ids,
    modificar_precio,
    nuevo_precio,
    modificar_precio_paquete,
    nuevo_precio_paquete,
    modificar_precio_antojito,
    nuevo_precio_antojito,
    modificar_estado,
    nuevo_estado,
  } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un alimento para modificar.' });
  }

  try {
    try { await db.query('ALTER TABLE alimentos ADD COLUMN precio_paquete DECIMAL(10,2) NULL DEFAULT NULL'); } catch (e) {}
    try { await db.query('ALTER TABLE alimentos ADD COLUMN precio_antojito DECIMAL(10,2) NULL DEFAULT NULL'); } catch (e) {}

    const updates = [];
    const params = [];

    if (modificar_precio) {
      updates.push('precio = ?');
      params.push(nuevo_precio !== null && nuevo_precio !== '' ? Number(nuevo_precio) : 0);
    }

    if (modificar_precio_paquete) {
      updates.push('precio_paquete = ?');
      params.push(nuevo_precio_paquete !== null && nuevo_precio_paquete !== '' ? Number(nuevo_precio_paquete) : null);
    }

    if (modificar_precio_antojito) {
      updates.push('precio_antojito = ?');
      params.push(nuevo_precio_antojito !== null && nuevo_precio_antojito !== '' ? Number(nuevo_precio_antojito) : null);
    }

    if (modificar_estado) {
      updates.push('estado = ?');
      params.push(nuevo_estado ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un campo a modificar.' });
    }

    params.push(ids);

    const query = `UPDATE alimentos SET ${updates.join(', ')} WHERE id IN (?)`;
    const [result] = await db.query(query, params);

    return res.json({
      ok: true,
      mensaje: `Se actualizaron los precios de ${result.affectedRows} alimentos exitosamente.`,
      modificados: result.affectedRows,
    });
  } catch (error) {
    console.error('Error al actualizar precios masivos:', error);
    return res.status(500).json({ error: 'Error al actualizar precios en lote' });
  }
};

module.exports = {
  getAlimentos,
  getAlimentosPorCategoria,
  getAllAlimentosAdmin,
  crearAlimento,
  actualizarAlimento,
  guardarMenuDelDia,
  actualizarPreciosMasivo,
};
