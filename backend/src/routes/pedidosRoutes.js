const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/pedidosController');

// GET /api/pedidos/para-llevar/activos
router.get('/para-llevar/activos', getParaLlevarActivos);

// GET /api/pedidos/para-llevar/siguiente-mesa
router.get('/para-llevar/siguiente-mesa', getSiguienteMesaParaLlevar);

// DELETE /api/pedidos/orden/:num_orden/cancelar
router.delete('/orden/:num_orden/cancelar', cancelarOrdenCompleta);

// POST /api/pedidos/imprimir-directo
router.post('/imprimir-directo', imprimirTicketDirecto);

// POST /api/pedidos/crear
router.post('/crear', crearPedido);

// GET /api/pedidos/mesa/:num_mesa
router.get('/mesa/:num_mesa', getAlimentosPedidoPorMesa);

// GET /api/pedidos/todas-las-mesas
router.get('/todas-las-mesas', getTodasLasMesas);

// PUT /api/pedidos/alimento-pedido/:id/estado
router.put('/alimento-pedido/:id/estado', cambiarEstadoAlimentoPedido);

// PUT /api/pedidos/alimento-pedido/:id/bloques
router.put('/alimento-pedido/:id/bloques', cambiarBloquesAlimentoPedido);

// PUT /api/pedidos/orden/:num_orden/estado
router.put('/orden/:num_orden/estado', cambiarEstadoOrden);

// PUT /api/pedidos/alimento-pedido/:id/editar
router.put('/alimento-pedido/:id/editar', editarAlimentoPedido);

// DELETE /api/pedidos/alimento-pedido/:id/cancelar
router.delete('/alimento-pedido/:id/cancelar', cancelarAlimentoPedido);

// =============================================
// RUTAS PARA EL ROL DE BARRA
// =============================================
// GET /api/pedidos/barra/pendientes
router.get('/barra/pendientes', getBarraPendientes);

// GET /api/pedidos/barra/historial-hoy
router.get('/barra/historial-hoy', getBarraHistorialHoy);

// PUT /api/pedidos/barra/servir/:id
router.put('/barra/servir/:id', servirBarraItem);

// PUT /api/pedidos/barra/revertir/:id
router.put('/barra/revertir/:id', revertirBarraItem);

// =============================================
// RUTAS PARA EL ROL DE COMAL
// =============================================
// GET /api/pedidos/comal/pendientes
router.get('/comal/pendientes', getComalPendientes);

// GET /api/pedidos/comal/historial-hoy
router.get('/comal/historial-hoy', getComalHistorialHoy);

// =============================================
// RUTAS PARA EL ROL DE COCINA
// =============================================
// GET /api/pedidos/cocina/pendientes
router.get('/cocina/pendientes', getCocinaPendientes);

// GET /api/pedidos/cocina/historial-hoy
router.get('/cocina/historial-hoy', getCocinaHistorialHoy);

module.exports = router;
