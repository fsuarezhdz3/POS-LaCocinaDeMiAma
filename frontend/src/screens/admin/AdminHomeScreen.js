import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../../context/AuthContext';
import { API_URL } from '../../config/api';
import ModalTicketPreview from '../../components/ModalTicketPreview';

// Helper para remover sufijo de zona en la UI
const limpiarZona = (str = '') => {
  if (!str) return '';
  return String(str).replace(/-[a-zA-Z0-9_]+$/g, '').trim();
};

export default function AdminHomeScreen() {
  const { user, logout } = useContext(AuthContext);
  const { width = 1000 } = useWindowDimensions() || {};
  const isDesktop = Platform.OS === 'web' || width >= 768;
  const [activeTab, setActiveTab] = useState('comandas'); // 'comandas' | 'alimentos' | 'historial' | 'corte'

  // Modal Ticket Preview
  const [modalTicketVisible, setModalTicketVisible] = useState(false);
  const [ticketComandaSeleccionada, setTicketComandaSeleccionada] = useState(null);
  const [ticketOpcionesCobro, setTicketOpcionesCobro] = useState({});

  const abrirTicketModal = (ord, opciones = {}) => {
    setTicketComandaSeleccionada(ord);
    setTicketOpcionesCobro(opciones);
    setModalTicketVisible(true);
  };

  // Datos globales de comandas
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Estado para expansión de detalles de tarjetas de comanda
  const [ordenesExpandidas, setOrdenesExpandidas] = useState({});

  // ==========================================
  // ESTADO CORTE DE CAJA ACTIVO
  // ==========================================
  const [corteActivo, setCorteActivo] = useState(null);
  const [loadingCorte, setLoadingCorte] = useState(false);

  // Modales del Corte de Caja
  const [modalIniciarCorteVisible, setModalIniciarCorteVisible] = useState(false);
  const [inputDineroInicial, setInputDineroInicial] = useState('');

  const [modalMovimientoVisible, setModalMovimientoVisible] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState('ingreso'); // 'ingreso' | 'egreso'
  const [inputMontoMov, setInputMontoMov] = useState('');
  const [inputConceptoMov, setInputConceptoMov] = useState('');

  const [modalCerrarCorteVisible, setModalCerrarCorteVisible] = useState(false);
  const [modalCorteRequeridoVisible, setModalCorteRequeridoVisible] = useState(false);

  // Estado Modal de Cobro
  const [cobroModalVisible, setCobroModalVisible] = useState(false);
  const [ordenACobrar, setOrdenACobrar] = useState(null);
  const [tipoCobro, setTipoCobro] = useState('toda'); // 'toda' | 'separado'
  const [metodoPago, setMetodoPago] = useState('efectivo'); // 'efectivo' | 'tarjeta' | 'transferencia'
  const [montoPaga, setMontoPaga] = useState('');
  const [itemsSeleccionadosCobro, setItemsSeleccionadosCobro] = useState({});

  // ==========================================
  // ESTADOS GESTIÓN DEL MENÚ (ALIMENTOS)
  // ==========================================
  const [alimentosCat, setAlimentosCat] = useState([]);
  const [loadingAlimentos, setLoadingAlimentos] = useState(false);
  const [vistaMenuModo, setVistaMenuModo] = useState('menu_dia_ver'); // 'menu_dia_ver' (default) | 'menu_dia_editar' | 'catalogo'
  const [catFiltroMenu, setCatFiltroMenu] = useState('Todas'); // 'Todas' | 'Comida' | 'Desayuno' | 'Antojito' | 'Bebida' | 'Entrada'
  const [catFiltroMenuDia, setCatFiltroMenuDia] = useState('Todas'); // 'Todas' | 'Desayunos' | 'Comida' | 'Entradas' | 'Aguas' | 'Guarniciones' | 'Postres'

  // Helper para verificar si un tipo pertenece al menú del día configurable
  const esTipoMenuDia = (tipoStr = '') => {
    const t = (tipoStr || '').toLowerCase();
    return (
      t === 'comida' || t === 'comidas' ||
      t === 'desayuno' || t === 'desayunos' ||
      t === 'entrada' || t === 'entradas' ||
      t === 'bebida' || t === 'bebidas' || t === 'litro' || t === 'litros' ||
      t === 'guarnicion' || t === 'guarniciones' ||
      t === 'postre' || t === 'postres'
    );
  };

  // Helper para filtrar alimentos por categoría dentro del Menú del Día
  const perteneceACategoriaMenuDia = (item, cat) => {
    if (!cat || cat === 'Todas') return true;
    const catLower = cat.toLowerCase();
    const t = (item.tipo || '').toLowerCase();
    if (catLower === 'desayunos' || catLower === 'desayuno') return t === 'desayuno' || t === 'desayunos';
    if (catLower === 'comida' || catLower === 'comidas') return t === 'comida' || t === 'comidas';
    if (catLower === 'entradas' || catLower === 'entrada') return t === 'entrada' || t === 'entradas';
    if (catLower === 'aguas' || catLower === 'bebidas' || catLower === 'bebida') return t === 'bebida' || t === 'bebidas' || t === 'litro' || t === 'litros';
    if (catLower === 'guarniciones' || catLower === 'guarnicion') return t === 'guarnicion' || t === 'guarniciones';
    if (catLower === 'postres' || catLower === 'postre') return t === 'postre' || t === 'postres';
    return true;
  };

  // Estado para búsqueda e inclusión interactiva en el Menú del Día
  const [busquedaMenuDia, setBusquedaMenuDia] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [comidasSeleccionadasMenuDia, setComidasSeleccionadasMenuDia] = useState({});

  // Modal Crear / Editar Alimento
  const [alimentoModalVisible, setAlimentoModalVisible] = useState(false);
  const [alimentoEditando, setAlimentoEditando] = useState(null); // null => creando, objeto => editando
  const [formNombre, setFormNombre] = useState('');
  const [formTipo, setFormTipo] = useState('Comida');
  const [formPrecio, setFormPrecio] = useState('');
  const [formPrecioPaquete, setFormPrecioPaquete] = useState('');
  const [formPrecioAntojito, setFormPrecioAntojito] = useState('');
  const [formZona, setFormZona] = useState('cocina');
  const [formEstado, setFormEstado] = useState(true);
  const [formAplicaPaquete, setFormAplicaPaquete] = useState(true);
  const [formAplicaPaqueteAntojito, setFormAplicaPaqueteAntojito] = useState(true);
  const [formError, setFormError] = useState('');

  // Modal Edición Masiva de Precios
  const [modalMasivoVisible, setModalMasivoVisible] = useState(false);
  const [catFiltroMasivo, setCatFiltroMasivo] = useState('Todas');
  const [selectedIdsMasivo, setSelectedIdsMasivo] = useState({});
  const [modificarPrecioRegular, setModificarPrecioRegular] = useState(false);
  const [nuevoPrecioRegular, setNuevoPrecioRegular] = useState('');
  const [modificarPrecioPaquete, setModificarPrecioPaquete] = useState(false);
  const [nuevoPrecioPaquete, setNuevoPrecioPaquete] = useState('');
  const [modificarPrecioAntojito, setModificarPrecioAntojito] = useState(false);
  const [nuevoPrecioAntojito, setNuevoPrecioAntojito] = useState('');
  const [modificarEstadoMasivo, setModificarEstadoMasivo] = useState(false);
  const [nuevoEstadoMasivo, setNuevoEstadoMasivo] = useState(1);

  // Cargar comanda global, catálogo y corte de caja periódicamente
  useEffect(() => {
    cargarTodasLasOrdenes(todosLosPedidos.length === 0);
    cargarCatalogoAlimentos();
    cargarCorteActivo();

    const timer = setInterval(() => {
      cargarTodasLasOrdenes(false);
      cargarCorteActivo();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Al cargar catálogo, sincronizar los alimentos disponibles para el borrador del Menú del Día
  useEffect(() => {
    if (alimentosCat.length > 0) {
      const initialMap = {};
      alimentosCat
        .filter((a) => esTipoMenuDia(a.tipo))
        .forEach((c) => {
          if (Number(c.estado) === 1) {
            initialMap[c.id] = true;
          }
        });
      setComidasSeleccionadasMenuDia(initialMap);
    }
  }, [alimentosCat]);

  const cargarTodasLasOrdenes = async (mostrarLoading = false) => {
    try {
      if (mostrarLoading) setLoading(true);
      const res = await fetch(`${API_URL}/pedidos/todas-las-mesas`);
      const data = await res.json();
      if (res.ok && data.items) {
        setTodosLosPedidos(data.items);
      } else {
        setTodosLosPedidos([]);
      }
    } catch (e) {
      console.log('Error al consultar comandas de administracion:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarCatalogoAlimentos = async () => {
    try {
      setLoadingAlimentos(true);
      const res = await fetch(`${API_URL}/alimentos/admin/todos`);
      const data = await res.json();
      if (res.ok && data.alimentos) {
        setAlimentosCat(data.alimentos);
      }
    } catch (e) {
      console.log('Error al cargar catálogo de alimentos:', e.message);
    } finally {
      setLoadingAlimentos(false);
    }
  };

  const cargarCorteActivo = async () => {
    try {
      const res = await fetch(`${API_URL}/cortes/activo/${user?.id || 1}`);
      const data = await res.json();
      if (res.ok && data.activo) {
        setCorteActivo(data.corte);
      } else {
        setCorteActivo(null);
      }
    } catch (e) {
      console.log('Error al consultar corte activo:', e.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarTodasLasOrdenes(false);
    cargarCatalogoAlimentos();
    cargarCorteActivo();
  };

  // Alternar expansión de detalles de una orden
  const toggleExpandirOrden = (numOrden) => {
    setOrdenesExpandidas((prev) => ({
      ...prev,
      [numOrden]: !prev[numOrden],
    }));
  };

  // Abrir Modal de Cobro para una Orden (VERIFICANDO QUE EXISTA UN CORTE ACTIVO)
  const abrirModalCobro = (ordenGroup) => {
    if (!corteActivo) {
      setModalCorteRequeridoVisible(true);
      return;
    }

    setOrdenACobrar(ordenGroup);
    setTipoCobro('toda');
    setMetodoPago('efectivo');
    setMontoPaga('');

    const initialMap = {};
    ordenGroup.items.forEach((item) => {
      if (Number(item.estado) !== 4) {
        initialMap[item.id] = true;
      }
    });
    setItemsSeleccionadosCobro(initialMap);
    setCobroModalVisible(true);
  };

  const toggleItemCobroSeparado = (itemId) => {
    setItemsSeleccionadosCobro((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleCambiarMetodoPago = (metodo) => {
    setMetodoPago(metodo);
    if (metodo === 'tarjeta' || metodo === 'transferencia') {
      setMontoPaga(String(calcularTotalModalActual()));
    } else {
      setMontoPaga('');
    }
  };

  const calcularTotalModalActual = () => {
    if (!ordenACobrar) return 0;

    if (tipoCobro === 'toda') {
      return ordenACobrar.items
        .filter((i) => Number(i.estado) !== 4)
        .reduce((sum, item) => sum + Number(item.costo), 0);
    } else {
      return ordenACobrar.items
        .filter((i) => itemsSeleccionadosCobro[i.id])
        .reduce((sum, item) => sum + Number(item.costo), 0);
    }
  };

  const handleConfirmarCobro = async () => {
    if (!ordenACobrar || !corteActivo) return;
    const totalACobrar = calcularTotalModalActual();

    if (totalACobrar <= 0) {
      Alert.alert('Selección vacía', 'Debes seleccionar al menos un ítem para cobrar.');
      return;
    }

    const pagaNum = metodoPago === 'efectivo' ? Number(montoPaga) || 0 : totalACobrar;

    if (metodoPago === 'efectivo' && pagaNum < totalACobrar) {
      Alert.alert('Monto insuficiente', `El monto recibido ($${pagaNum}.00) es menor al total a cobrar ($${totalACobrar}.00).`);
      return;
    }

    const cambio = metodoPago === 'efectivo' ? Math.max(0, pagaNum - totalACobrar) : 0;

    try {
      if (tipoCobro === 'toda') {
        const res = await fetch(`${API_URL}/pedidos/orden/${ordenACobrar.num_orden}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 4, corte_id: corteActivo.id, metodo_pago: metodoPago }),
        });

        if (res.ok) {
          Alert.alert(
            '¡Cobro Exitoso! ✅',
            `Orden #${ordenACobrar.num_orden} cobrada por completo ($${totalACobrar}.00).\nMétodo: ${metodoPago.toUpperCase()}\nCambio: $${cambio.toFixed(2)}`
          );
          setCobroModalVisible(false);
          setOrdenACobrar(null);
          cargarTodasLasOrdenes(false);
          cargarCorteActivo();
        } else {
          Alert.alert('Error', 'No se pudo actualizar el estado de la orden.');
        }
      } else {
        const idsAEstado4 = Object.keys(itemsSeleccionadosCobro).filter((id) => itemsSeleccionadosCobro[id]);

        await Promise.all(
          idsAEstado4.map((id) =>
            fetch(`${API_URL}/pedidos/alimento-pedido/${id}/estado`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ estado: 4, corte_id: corteActivo.id, metodo_pago: metodoPago }),
            })
          )
        );

        Alert.alert(
          '¡Cobro Parcial Exitoso! ✅',
          `Se cobraron ${idsAEstado4.length} ítems por separado ($${totalACobrar}.00).\nMétodo: ${metodoPago.toUpperCase()}\nCambio: $${cambio.toFixed(2)}\nLos demás ítems siguen pendientes por cobrar.`
        );

        setCobroModalVisible(false);
        setOrdenACobrar(null);
        cargarTodasLasOrdenes(false);
        cargarCorteActivo();
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  // Agrupar los elementos por num_orden
  const agruparPorOrden = (itemsList) => {
    const map = {};
    itemsList.forEach((item) => {
      const n = item.num_orden;
      if (!map[n]) {
        map[n] = {
          num_orden: n,
          num_mesa: item.num_mesa,
          mesero: item.mesero,
          fecha_pedido: item.fecha_pedido,
          metodo_pago: item.metodo_pago,
          corte: item.corte,
          items: [],
          total: 0,
        };
      }
      map[n].items.push(item);
      map[n].total += Number(item.costo) || 0;
    });
    return Object.values(map);
  };

  const ordenesAgrupadas = agruparPorOrden(todosLosPedidos);

  const comandasActivas = ordenesAgrupadas.filter((ord) =>
    ord.items.some((i) => Number(i.estado) !== 4)
  );

  // Filtrar historial únicamente a los ítems cobrados (estado 4) asignados al corte activo si existe
  const comandasHistorialEstado3 = ordenesAgrupadas
    .map((ord) => {
      const itemsCobradosCorte = ord.items.filter((i) => {
        const esEstadoCobrado = Number(i.estado) === 4;
        if (!esEstadoCobrado) return false;
        if (corteActivo) {
          return Number(ord.corte) === Number(corteActivo.id) || Number(i.corte) === Number(corteActivo.id);
        }
        return true;
      });

      if (itemsCobradosCorte.length === 0) return null;

      const totalCobrado = itemsCobradosCorte.reduce((sum, i) => sum + Number(i.costo || 0), 0);

      const metodosSet = new Set(
        itemsCobradosCorte.map((it) => (it.metodo_pago || 'efectivo').toLowerCase().trim())
      );
      const esPagoMixto = metodosSet.size > 1;
      const metodoPagoGroup = esPagoMixto ? 'MIXTO' : (itemsCobradosCorte[0]?.metodo_pago || ord.metodo_pago || 'efectivo');

      return {
        ...ord,
        items: itemsCobradosCorte,
        total: totalCobrado,
        esPagoMixto,
        metodo_pago: metodoPagoGroup,
      };
    })
    .filter(Boolean);

  // ==========================================
  // LÓGICA CORTE DE CAJA (INICIAR, INGRESO, EGRESO, CERRAR)
  // ==========================================
  const handleIniciarCorteSubmit = async () => {
    if (!inputDineroInicial.trim() || isNaN(Number(inputDineroInicial)) || Number(inputDineroInicial) < 0) {
      Alert.alert('Monto inválido', 'Ingresa la cantidad de dinero inicial con la que abres la caja.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cortes/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuenta_id: user?.id || 1,
          dinero_inicial: Number(inputDineroInicial),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('¡Corte Iniciado!', `Se abrió el corte de caja con $${Number(inputDineroInicial)}.00`);
        setModalIniciarCorteVisible(false);
        if (data.corte_id) {
          setCorteActivo({
            id: data.corte_id,
            dinero_inicial: Number(inputDineroInicial),
            total_ventas: 0,
            total_efectivo: 0,
            total_tarjeta: 0,
            total_transferencia: 0,
            total_ingresos: 0,
            total_egresos: 0,
            caja_esperada: Number(inputDineroInicial),
            hora_inicio: new Date().toISOString(),
            ingresos: [],
            egresos: [],
          });
        }
        setInputDineroInicial('');
        cargarCorteActivo();
      } else {
        Alert.alert('Error', data.error || 'No se pudo iniciar el corte.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  const handleRegistrarMovimientoSubmit = async () => {
    if (!inputMontoMov.trim() || isNaN(Number(inputMontoMov)) || Number(inputMontoMov) <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto válido mayor a 0.');
      return;
    }
    if (!inputConceptoMov.trim()) {
      Alert.alert('Justificación requerida', 'Ingresa la razón o concepto del movimiento de dinero.');
      return;
    }

    const endpoint = tipoMovimiento === 'ingreso' ? '/cortes/ingreso' : '/cortes/egreso';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corte_id: corteActivo.id,
          monto: Number(inputMontoMov),
          concepto: inputConceptoMov.trim(),
        }),
      });

      if (res.ok) {
        Alert.alert(
          '¡Movimiento Registrado! ✅',
          `Se registró el ${tipoMovimiento.toUpperCase()} por $${Number(inputMontoMov)}.00`
        );
        setModalMovimientoVisible(false);
        setInputMontoMov('');
        setInputConceptoMov('');
        cargarCorteActivo();
      } else {
        Alert.alert('Error', 'No se pudo registrar el movimiento.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  const handleCerrarCorteSubmit = async () => {
    if (!corteActivo) return;

    try {
      const res = await fetch(`${API_URL}/cortes/${corteActivo.id}/cerrar`, {
        method: 'PUT',
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          '¡Corte Finalizado! 🔒',
          `El corte de caja se cerró exitosamente.\n\nTotal que debía haber en caja: $${data.total_corte}.00`
        );
        setModalCerrarCorteVisible(false);
        setCorteActivo(null);
        cargarCorteActivo();
      } else {
        Alert.alert('Error', 'No se pudo cerrar el corte de caja.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  // ==========================================
  // LÓGICA GESTIÓN DEL MENÚ & CRUD
  // ==========================================
  const abrirModalCrearAlimento = () => {
    setAlimentoEditando(null);
    setFormNombre('');
    setFormTipo('Comida');
    setFormPrecio('');
    setFormPrecioPaquete('');
    setFormPrecioAntojito('');
    setFormZona('cocina');
    setFormEstado(true);
    setFormAplicaPaquete(true);
    setFormAplicaPaqueteAntojito(true);
    setFormError('');
    setAlimentoModalVisible(true);
  };

  const abrirModalEditarAlimento = (item) => {
    setAlimentoEditando(item);
    setFormNombre(item.nombre || '');
    setFormTipo(item.tipo || 'Comida');
    setFormPrecio(String(item.precio || ''));
    setFormPrecioPaquete(item.precio_paquete !== null && item.precio_paquete !== undefined ? String(item.precio_paquete) : '');
    setFormPrecioAntojito(item.precio_antojito !== null && item.precio_antojito !== undefined ? String(item.precio_antojito) : '');
    setFormZona(item.zona || 'cocina');
    setFormEstado(Number(item.estado) === 1);
    setFormAplicaPaquete(item.aplica_paquete !== undefined && item.aplica_paquete !== null ? Number(item.aplica_paquete) === 1 : true);
    setFormAplicaPaqueteAntojito(item.aplica_paquete_antojito !== undefined && item.aplica_paquete_antojito !== null ? Number(item.aplica_paquete_antojito) === 1 : true);
    setFormError('');
    setAlimentoModalVisible(true);
  };

  const handleGuardarAlimento = async () => {
    const nombreInvalido = !formNombre.trim();
    const precioInvalido = !formPrecio.trim() || isNaN(Number(formPrecio)) || Number(formPrecio) < 0;
    const tipoInvalido = !formTipo;
    const zonaInvalida = !formZona;

    if (nombreInvalido || precioInvalido || tipoInvalido || zonaInvalida) {
      setFormError(true);
      return;
    }
    setFormError(false);

    const payload = {
      nombre: formNombre.trim(),
      tipo: formTipo,
      precio: Number(formPrecio),
      precio_paquete: formPrecioPaquete.trim() !== '' ? Number(formPrecioPaquete) : null,
      precio_antojito: formPrecioAntojito.trim() !== '' ? Number(formPrecioAntojito) : null,
      zona: formZona,
      estado: formEstado ? 1 : 0,
      aplica_paquete: formAplicaPaquete ? 1 : 0,
      aplica_paquete_antojito: formAplicaPaqueteAntojito ? 1 : 0,
    };

    try {
      let res;
      if (alimentoEditando) {
        res = await fetch(`${API_URL}/alimentos/${alimentoEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/alimentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        Alert.alert(
          '¡Éxito!',
          alimentoEditando ? 'Alimento actualizado correctamente.' : 'Nuevo alimento registrado correctamente.'
        );
        setAlimentoModalVisible(false);
        cargarCatalogoAlimentos();
      } else {
        Alert.alert('Error', 'No se pudo guardar el alimento.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  // Alternar rápidamente disponibilidad / estado activo (1 <-> 0) directamente desde la tarjeta
  const handleToggleDisponible = async (item) => {
    const nuevoEstado = Number(item.estado) === 1 ? 0 : 1;
    const payload = {
      nombre: item.nombre,
      tipo: item.tipo,
      precio: item.precio,
      precio_paquete: item.precio_paquete,
      precio_antojito: item.precio_antojito,
      zona: item.zona,
      estado: nuevoEstado,
    };

    // Actualización optimista local instantánea
    setAlimentosCat((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, estado: nuevoEstado } : a))
    );

    try {
      const res = await fetch(`${API_URL}/alimentos/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setAlimentosCat((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, estado: item.estado } : a))
        );
        Alert.alert('Error', 'No se pudo cambiar el estado del alimento.');
      }
    } catch (e) {
      setAlimentosCat((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, estado: item.estado } : a))
      );
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  const abrirModalEdicionMasiva = () => {
    const catInicial = catFiltroMenu || 'Todas';
    setCatFiltroMasivo(catInicial);

    const initialSelected = {};
    const itemsCategorizados = alimentosCat.filter((a) => {
      if (catInicial === 'Todas') return true;
      const catFilterLower = catInicial.toLowerCase();
      const aTipoLower = (a.tipo || '').toLowerCase();
      if (catFilterLower === 'postres' && (aTipoLower === 'postre' || aTipoLower === 'postres')) return true;
      if (catFilterLower === 'tortas' && (aTipoLower === 'torta' || aTipoLower === 'tortas')) return true;
      if (catFilterLower === 'extras' && (aTipoLower === 'extra' || aTipoLower === 'extras')) return true;
      if (catFilterLower === 'litros' && (aTipoLower === 'litros' || aTipoLower === 'litro')) return true;
      return aTipoLower === catFilterLower;
    });
    itemsCategorizados.forEach((i) => { initialSelected[i.id] = true; });

    setSelectedIdsMasivo(initialSelected);
    setModificarPrecioRegular(false);
    setNuevoPrecioRegular('');
    setModificarPrecioPaquete(false);
    setNuevoPrecioPaquete('');
    setModificarPrecioAntojito(false);
    setNuevoPrecioAntojito('');
    setModificarEstadoMasivo(false);
    setNuevoEstadoMasivo(1);
    setModalMasivoVisible(true);
  };

  const toggleSelectMasivo = (id) => {
    setSelectedIdsMasivo((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const seleccionarTodosMasivo = (itemsList) => {
    const newSelected = { ...selectedIdsMasivo };
    itemsList.forEach((item) => { newSelected[item.id] = true; });
    setSelectedIdsMasivo(newSelected);
  };

  const deseleccionarTodosMasivo = (itemsList) => {
    const newSelected = { ...selectedIdsMasivo };
    itemsList.forEach((item) => { newSelected[item.id] = false; });
    setSelectedIdsMasivo(newSelected);
  };

  const handleGuardarPreciosMasivo = async () => {
    const idsAActualizar = Object.keys(selectedIdsMasivo).filter((id) => selectedIdsMasivo[id]).map(Number);

    if (idsAActualizar.length === 0) {
      Alert.alert('Atención', 'Debes seleccionar al menos un alimento de la lista para modificar.');
      return;
    }

    if (!modificarPrecioRegular && !modificarPrecioPaquete && !modificarPrecioAntojito && !modificarEstadoMasivo) {
      Alert.alert('Atención', 'Debes activar al menos una casilla (Precio o Estado) a modificar.');
      return;
    }

    const payload = {
      ids: idsAActualizar,
      modificar_precio: modificarPrecioRegular,
      nuevo_precio: nuevoPrecioRegular,
      modificar_precio_paquete: modificarPrecioPaquete,
      nuevo_precio_paquete: nuevoPrecioPaquete,
      modificar_precio_antojito: modificarPrecioAntojito,
      nuevo_precio_antojito: nuevoPrecioAntojito,
      modificar_estado: modificarEstadoMasivo,
      nuevo_estado: nuevoEstadoMasivo,
    };

    try {
      const res = await fetch(`${API_URL}/alimentos/bulk-update-precios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Si es un PUT en la API, intentar también con PUT
      const resOk = res.ok ? res : await fetch(`${API_URL}/alimentos/bulk-update-precios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resOk.json();

      if (resOk.ok && data.ok) {
        Alert.alert('✅ Alimentos Actualizados', data.mensaje || `Se modificaron ${idsAActualizar.length} alimentos.`);
        setModalMasivoVisible(false);
        cargarCatalogoAlimentos();
      } else {
        Alert.alert('Error', data.error || 'No se pudieron actualizar los alimentos.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  // Agregar platillo al borrador del menú del día desde la búsqueda
  const handleAgregarComidaBorrador = (item) => {
    setComidasSeleccionadasMenuDia((prev) => ({
      ...prev,
      [item.id]: true,
    }));
    setBusquedaMenuDia('');
  };

  // Remover platillo del borrador del menú del día
  const handleQuitarComidaBorrador = (id) => {
    setComidasSeleccionadasMenuDia((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  // Limpiar completamente el Menú del Día
  const handleLimpiarMenuDia = () => {
    Alert.alert(
      'Limpiar Menú del Día',
      '¿Estás seguro de vaciar la lista del Menú del Día?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Vaciar',
          style: 'destructive',
          onPress: () => {
            setComidasSeleccionadasMenuDia({});
          },
        },
      ]
    );
  };

  // Guardar cambios del Menú del Día en backend
  const handleGuardarMenuDelDia = async () => {
    const idsDisponibles = Object.keys(comidasSeleccionadasMenuDia).filter(
      (id) => comidasSeleccionadasMenuDia[id]
    ).map(Number);

    try {
      const res = await fetch(`${API_URL}/alimentos/menu-del-dia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idsDisponibles }),
      });

      if (res.ok) {
        Alert.alert(
          '¡Menú del Día Guardado! 🍽️',
          `Se configuraron ${idsDisponibles.length} comidas como disponibles (Estado 1) para el menú del día.`
        );
        setVistaMenuModo('menu_dia_ver');
        cargarCatalogoAlimentos();
      } else {
        Alert.alert('Error', 'No se pudo actualizar el menú del día.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  // RENDER PESTAÑA COMANDAS
  const renderComandasTab = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.tabContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Comandas Activas</Text>
            <Text style={styles.sectionSub}>Monitoreo de mesas, cobro total o por separado</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 30 }} />
        ) : comandasActivas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="restaurant-outline" size={54} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No hay comandas activas</Text>
            <Text style={styles.emptySub}>Las ordenes enviadas por los meseros aparecerán aquí.</Text>
          </View>
        ) : (
          <View style={[styles.comandaListContainer, isDesktop && styles.comandaListContainerGrid]}>
            {comandasActivas.map((ord) => {
              const estaExpandida = !!ordenesExpandidas[ord.num_orden];

              return (
                <View key={ord.num_orden} style={[styles.comandaCard, isDesktop && styles.comandaCardGrid]}>
                  <TouchableOpacity
                    style={styles.comandaHeaderTouchable}
                    onPress={() => toggleExpandirOrden(ord.num_orden)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.comandaTitleCol}>
                      <View style={styles.mesaBadge}>
                        <Ionicons name="restaurant-outline" size={14} color="#0D9488" style={{ marginRight: 4 }} />
                        <Text style={styles.mesaBadgeText}>{Number(ord.num_mesa) >= 100 ? 'Para llevar #' + ord.num_mesa : 'Mesa #' + ord.num_mesa}</Text>
                      </View>
                      <Text style={styles.numOrdenText}>Orden #{ord.num_orden}</Text>
                    </View>

                    <View style={styles.comandaRightCol}>
                      <Text style={styles.totalMontoText}>${ord.total}.00</Text>
                      <Ionicons
                        name={estaExpandida ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={18}
                        color="#64748B"
                        style={{ marginLeft: 6 }}
                      />
                    </View>
                  </TouchableOpacity>

                  {estaExpandida && (
                    <View style={styles.detallesOrdenBox}>
                      <Text style={styles.detallesHeaderTitle}>Detalles de la Comanda:</Text>
                      {ord.items.map((item, idx) => {
                        const guarnicionesList = [item.guarnicion1, item.guarnicion2].filter(Boolean).join(', ');
                        const esCobrado = Number(item.estado) === 4;

                        return (
                          <View
                            key={item.id || idx}
                            style={[styles.detalleItemRow, esCobrado && { opacity: 0.65 }]}
                          >
                            <View style={styles.detalleItemHeaderRow}>
                              <Text style={styles.detalleAlimentoNombre}>
                                • {limpiarZona(item.alimento)} <Text style={styles.itemCostoInline}>(${item.costo}.00)</Text>
                              </Text>

                              {esCobrado && (
                                <View style={styles.badgeCobradoPill}>
                                  <Text style={styles.badgeCobradoPillText}>✓ Cobrado</Text>
                                </View>
                              )}
                            </View>

                            {item.entrada ? (
                              <Text style={styles.detalleSubText}>
                                🥗 Entrada: {limpiarZona(item.entrada)}
                              </Text>
                            ) : null}

                            {guarnicionesList ? (
                              <Text style={styles.detalleSubText}>
                                🍟 Guarniciones: {limpiarZona(guarnicionesList)}
                              </Text>
                            ) : null}

                            {item.bebida ? (
                              <Text style={styles.detalleSubText}>
                                🥤 Bebida: {limpiarZona(item.bebida)}
                              </Text>
                            ) : null}

                            {item.extras ? (
                              <Text style={styles.detalleSubText}>
                                ✨ Extras: {limpiarZona(item.extras)}
                              </Text>
                            ) : null}

                            {item.comentarios ? (
                              <Text style={styles.detalleComentarioText}>
                                💬 Comentarios: "{item.comentarios}"
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.comandaFooterActions}>
                    <TouchableOpacity
                      style={styles.btnImprimirTicket}
                      onPress={() => abrirTicketModal(ord)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="print-outline" size={18} color="#0F766E" style={{ marginRight: 6 }} />
                      <Text style={styles.btnImprimirTicketText}>Imprimir Ticket</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnCobrar}
                      onPress={() => abrirModalCobro(ord)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="cash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.btnCobrarText}>Cobrar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // Helper para formato de fechas en historial
  const formatFechaHistorial = (fechaStr) => {
    if (!fechaStr) return '';
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return String(fechaStr);
      return d.toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return String(fechaStr);
    }
  };

  // Helper para badge de método de pago general
  const getMetodoBadgeInfo = (metodoRaw) => {
    const m = (metodoRaw || 'EFECTIVO').toUpperCase();
    if (m.includes('MIXTO')) {
      return { label: 'PAGO MIXTO', icon: 'git-compare-outline', bg: '#FFF7ED', color: '#C2410C' };
    } else if (m.includes('TARJETA')) {
      return { label: 'TARJETA', icon: 'card-outline', bg: '#EFF6FF', color: '#1D4ED8' };
    } else if (m.includes('TRANSFER')) {
      return { label: 'TRANSFERENCIA', icon: 'qr-code-outline', bg: '#F5F3FF', color: '#6D28D9' };
    }
    return { label: 'EFECTIVO', icon: 'cash-outline', bg: '#ECFDF5', color: '#047857' };
  };

  // Helper para badge de método de pago por ítem en desgloses divididos
  const getMetodoItemBadgeInfo = (metodoRaw) => {
    const m = (metodoRaw || 'EFECTIVO').toUpperCase();
    if (m.includes('TARJETA')) {
      return { label: '💳 Tarjeta', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
    } else if (m.includes('TRANSFER')) {
      return { label: '📲 Transferencia', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' };
    }
    return { label: '💵 Efectivo', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
  };

  // RENDER PESTAÑA HISTORIAL (FILTRADO EXCLUSIVAMENTE AL CORTE ACTIVO, ESTILO SUPERADMIN)
  const renderHistorialTab = () => {
    const totalVentasMonto = comandasHistorialEstado3.reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
    const totalComandasCount = comandasHistorialEstado3.length;
    const ticketPromedio = totalComandasCount > 0 ? (totalVentasMonto / totalComandasCount) : 0;

    return (
      <ScrollView
        contentContainerStyle={styles.tabContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Historial de Órdenes Cobradas</Text>
            <Text style={styles.sectionSub}>
              {corteActivo
                ? `Ventas pertenecientes al Corte Actual (#${corteActivo.id})`
                : 'Ventas finalizadas y pagadas del corte activo'}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 30 }} />
        ) : comandasHistorialEstado3.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="time-outline" size={54} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No hay ventas cobradas en este corte</Text>
            <Text style={styles.emptySub}>
              {corteActivo
                ? `Las comandas cobradas durante el Corte #${corteActivo.id} aparecerán aquí.`
                : 'Abre un corte de caja para ver el historial de ventas.'}
            </Text>
          </View>
        ) : (
          <View style={isDesktop ? styles.historialGridDesktop : styles.historialGridMobile}>
            {comandasHistorialEstado3.map((ord) => {
              const badgeInfo = getMetodoBadgeInfo(ord.metodo_pago);
              const estaExpandida = !!ordenesExpandidas[ord.num_orden];
              const totalItemsCount = ord.items ? ord.items.reduce((acc, i) => acc + Number(i.cantidad || 1), 0) : 0;
              const itemsResumenText = ord.items ? ord.items.map(i => `${i.cantidad && Number(i.cantidad) > 1 ? i.cantidad + 'x ' : ''}${limpiarZona(i.alimento)}`).join(', ') : '';

              return (
                <View key={ord.num_orden} style={[styles.historialCardItem, isDesktop && { width: '48.8%' }]}>
                  <TouchableOpacity
                    onPress={() => toggleExpandirOrden(ord.num_orden)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.historialCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.historialOrdenTitle}>Orden #{ord.num_orden}</Text>
                        <View style={styles.mesaBadgePill}>
                          <Text style={styles.mesaBadgePillText}>
                            {Number(ord.num_mesa) >= 100 ? 'Para llevar #' + ord.num_mesa : 'Mesa #' + ord.num_mesa}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.badgeCobradoPill}>
                        <Ionicons name="checkmark-circle" size={13} color="#15803D" style={{ marginRight: 3 }} />
                        <Text style={styles.badgeCobradoPillText}>COBRADO</Text>
                      </View>
                    </View>

                    <View style={styles.historialMetaRow}>
                      <View style={styles.historialMetaItem}>
                        <Ionicons name="person-outline" size={13} color="#64748B" />
                        <Text style={styles.historialOrdenSub}>Atendió: {ord.mesero || 'Mesero'}</Text>
                      </View>
                      <View style={styles.historialMetaItem}>
                        <Ionicons name="time-outline" size={13} color="#64748B" />
                        <Text style={styles.historialOrdenSub}>{formatFechaHistorial(ord.fecha_pedido)}</Text>
                      </View>
                    </View>

                    {/* VISTA SIMPLIFICADA */}
                    {!estaExpandida ? (
                      <View style={styles.historialResumenRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 }}>
                          <Ionicons name="basket-outline" size={15} color="#0D9488" style={{ marginRight: 6 }} />
                          <Text style={styles.historialResumenText} numberOfLines={1}>
                            <Text style={{ fontWeight: '800', color: '#0F766E' }}>{totalItemsCount} {totalItemsCount === 1 ? 'artículo' : 'artículos'}: </Text>
                            {itemsResumenText}
                          </Text>
                        </View>
                        <View style={styles.btnVerDesglosePill}>
                          <Text style={styles.btnVerDesglosePillText}>Ver desglose</Text>
                          <Ionicons name="chevron-down-outline" size={14} color="#0D9488" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                    ) : (
                      /* VISTA EXPANDIDA */
                      <View style={styles.historialDesgloseExpandidoBox}>
                        <View style={styles.historialDesgloseHeaderRow}>
                          <Text style={styles.historialDesgloseTitle}>📋 Desglose completo de lo vendido:</Text>
                          <View style={styles.btnOcultarDesglosePill}>
                            <Text style={styles.btnOcultarDesglosePillText}>Ocultar</Text>
                            <Ionicons name="chevron-up-outline" size={14} color="#64748B" style={{ marginLeft: 2 }} />
                          </View>
                        </View>

                        <View style={styles.historialItemsList}>
                          {ord.items.map((i, idx) => (
                            <View key={i.id || idx} style={styles.historialItemCardBox}>
                              {/* Solicitante y Método de Pago (si es pago mixto) Arriba del Alimento */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <View style={styles.historialItemSolicitanteRow}>
                                  <Ionicons name="person-circle-outline" size={13} color="#0D9488" style={{ marginRight: 4 }} />
                                  <Text style={styles.historialItemSolicitanteText}>
                                    Solicitó: <Text style={{ fontWeight: '800' }}>{i.mesero || ord.mesero || 'Mesero'}</Text>
                                  </Text>
                                </View>

                                {ord.esPagoMixto && (
                                  <View style={[styles.metodoItemBadgePill, { backgroundColor: getMetodoItemBadgeInfo(i.metodo_pago).bg, borderColor: getMetodoItemBadgeInfo(i.metodo_pago).border }]}>
                                    <Text style={[styles.metodoItemBadgePillText, { color: getMetodoItemBadgeInfo(i.metodo_pago).color }]}>
                                      {getMetodoItemBadgeInfo(i.metodo_pago).label}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Alimento Principal y Precio */}
                              <View style={styles.historialItemMainRow}>
                                <Text style={styles.historialItemNombre}>
                                  • {i.cantidad && Number(i.cantidad) > 1 ? `${i.cantidad}x ` : ''}{limpiarZona(i.alimento)}
                                </Text>
                                <Text style={styles.historialItemCosto}>${Number(i.costo || 0).toFixed(2)}</Text>
                              </View>

                              {/* Detalle completo del paquete */}
                              {i.guarnicion1 ? (
                                <Text style={styles.historialSubDetalleText}>   ▫ Guarnición 1: {limpiarZona(i.guarnicion1)}</Text>
                              ) : null}
                              {i.guarnicion2 ? (
                                <Text style={styles.historialSubDetalleText}>   ▫ Guarnición 2: {limpiarZona(i.guarnicion2)}</Text>
                              ) : null}
                              {i.entrada ? (
                                <Text style={styles.historialSubDetalleText}>   🥗 Entrada: {limpiarZona(i.entrada)}</Text>
                              ) : null}
                              {i.guiso ? (
                                <Text style={styles.historialSubDetalleText}>   🍲 Guiso: {limpiarZona(i.guiso)}</Text>
                              ) : null}
                              {i.bebida ? (
                                <Text style={styles.historialSubDetalleText}>   🥤 Bebida: {limpiarZona(i.bebida)}</Text>
                              ) : null}
                              {i.extras ? (
                                <Text style={styles.historialSubDetalleText}>   ✨ Extras: {limpiarZona(i.extras)}</Text>
                              ) : null}
                              {i.comentarios ? (
                                <Text style={styles.historialComentarioText}>   💬 Nota: "{i.comentarios}"</Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.historialFooterRow}>
                    <View style={[styles.metodoPagoBadge, { backgroundColor: badgeInfo.bg }]}>
                      <Ionicons name={badgeInfo.icon} size={14} color={badgeInfo.color} style={{ marginRight: 4 }} />
                      <Text style={[styles.historialMetodoText, { color: badgeInfo.color }]}>{badgeInfo.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={styles.totalLabel}>Total:</Text>
                      <Text style={styles.historialTotalMonto}>${Number(ord.total || 0).toFixed(2)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.btnImprimirTicket}
                    onPress={() => abrirTicketModal(ord)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="print-outline" size={18} color="#0D9488" style={{ marginRight: 6 }} />
                    <Text style={styles.btnImprimirTicketText}>Reimprimir Ticket</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // RENDER PESTAÑA GESTIÓN DEL MENÚ
  const renderMenuTab = () => {
    const todosAlimentosMenuDia = alimentosCat.filter((a) => esTipoMenuDia(a.tipo));
    const comidasActivasDelDia = todosAlimentosMenuDia
      .filter((c) => Number(c.estado) === 1)
      .filter((c) => perteneceACategoriaMenuDia(c, catFiltroMenuDia));

    const comidasBorrador = todosAlimentosMenuDia
      .filter((c) => comidasSeleccionadasMenuDia[c.id])
      .filter((c) => perteneceACategoriaMenuDia(c, catFiltroMenuDia));

    const totalBorradorCount = todosAlimentosMenuDia.filter((c) => comidasSeleccionadasMenuDia[c.id]).length;

    const coicidenciasBusqueda = todosAlimentosMenuDia.filter((c) => {
      if (comidasSeleccionadasMenuDia[c.id]) return false;
      if (!perteneceACategoriaMenuDia(c, catFiltroMenuDia)) return false;
      const coincideNombre = busquedaMenuDia.trim().length === 0 || 
        c.nombre.toLowerCase().includes(busquedaMenuDia.trim().toLowerCase());
      return coincideNombre;
    });

    const alimentosFiltradosCat = alimentosCat.filter((a) => {
      if (catFiltroMenu === 'Todas') return true;
      const catFilterLower = catFiltroMenu.toLowerCase();
      const aTipoLower = (a.tipo || '').toLowerCase();
      if (catFilterLower === 'postres' && (aTipoLower === 'postre' || aTipoLower === 'postres')) return true;
      if (catFilterLower === 'tortas' && (aTipoLower === 'torta' || aTipoLower === 'tortas')) return true;
      if (catFilterLower === 'extras' && (aTipoLower === 'extra' || aTipoLower === 'extras')) return true;
      if (catFilterLower === 'litros' && (aTipoLower === 'litros' || aTipoLower === 'litro')) return true;
      return aTipoLower === catFilterLower;
    });

    return (
      <ScrollView
        contentContainerStyle={styles.tabContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {vistaMenuModo === 'menu_dia_ver'
                ? 'Menú del Día (Vigente)'
                : vistaMenuModo === 'menu_dia_editar'
                ? 'Editar Menú del Día'
                : 'Editar Alimentos (Catálogo Global)'}
            </Text>
            <Text style={styles.sectionSub}>
              {vistaMenuModo === 'menu_dia_ver'
                ? 'Platillos disponibles para los meseros el día de hoy'
                : vistaMenuModo === 'menu_dia_editar'
                ? 'Busca y activa platillos (Desayunos, Comida, Entradas, Aguas, Guarniciones, Postres) en el Menú del Día'
                : 'Catálogo completo y creación de nuevos platillos'}
            </Text>
          </View>
        </View>

        {/* ACCIONES SUPERIORES */}
        <View style={styles.menuActionsRow}>
          <TouchableOpacity
            style={[
              styles.btnMenuAccion,
              (vistaMenuModo === 'menu_dia_ver' || vistaMenuModo === 'menu_dia_editar')
                ? styles.btnMenuAccionActive
                : styles.btnMenuAccionInactive
            ]}
            onPress={() => setVistaMenuModo('menu_dia_ver')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="restaurant-outline"
              size={18}
              color={(vistaMenuModo === 'menu_dia_ver' || vistaMenuModo === 'menu_dia_editar') ? '#FFFFFF' : '#475569'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.btnMenuAccionText,
                (vistaMenuModo === 'menu_dia_ver' || vistaMenuModo === 'menu_dia_editar')
                  ? styles.btnMenuAccionTextActive
                  : styles.btnMenuAccionTextInactive
              ]}
            >
              Ver Menú del Día
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnMenuAccion,
              vistaMenuModo === 'catalogo'
                ? styles.btnMenuAccionActive
                : styles.btnMenuAccionInactive
            ]}
            onPress={() => setVistaMenuModo('catalogo')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={vistaMenuModo === 'catalogo' ? '#FFFFFF' : '#475569'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.btnMenuAccionText,
                vistaMenuModo === 'catalogo'
                  ? styles.btnMenuAccionTextActive
                  : styles.btnMenuAccionTextInactive
              ]}
            >
              Editar Alimentos
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUB-VISTA 1: VER MENÚ DEL DÍA */}
        {vistaMenuModo === 'menu_dia_ver' && (
          <View>
            <View style={styles.menuDiaVerHeaderRow}>
              <Text style={styles.menuDiaVerTitle}>Platillos del Menú de Hoy:</Text>
              <TouchableOpacity
                style={styles.btnBotonEntrarEditarMenu}
                onPress={() => setVistaMenuModo('menu_dia_editar')}
                activeOpacity={0.85}
              >
                <Ionicons name="pencil-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnBotonEntrarEditarMenuText}>Editar Menú del Día</Text>
              </TouchableOpacity>
            </View>

            {/* SELECTOR DE CATEGORÍAS DEL MENÚ DEL DÍA */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {[
                { id: 'Todas', label: 'Todos' },
                { id: 'Desayunos', label: 'Desayunos' },
                { id: 'Comida', label: 'Comida' },
                { id: 'Entradas', label: 'Entradas' },
                { id: 'Aguas', label: 'Aguas / Bebidas' },
                { id: 'Guarniciones', label: 'Guarniciones' },
                { id: 'Postres', label: 'Postres' },
              ].map((catObj) => (
                <TouchableOpacity
                  key={catObj.id}
                  style={[
                    styles.catFiltroChip,
                    catFiltroMenuDia === catObj.id && styles.catFiltroChipActive,
                    { marginRight: 6 }
                  ]}
                  onPress={() => setCatFiltroMenuDia(catObj.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catFiltroText, catFiltroMenuDia === catObj.id && styles.catFiltroTextActive]}>
                    {catObj.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loadingAlimentos && !refreshing ? (
              <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 30 }} />
            ) : comidasActivasDelDia.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="fast-food-outline" size={54} color="#CBD5E1" style={{ marginBottom: 10 }} />
                <Text style={styles.emptyTitle}>
                  {catFiltroMenuDia === 'Todas' ? 'No hay platillos en el Menú del Día' : `No hay platillos de ${catFiltroMenuDia} en el Menú del Día`}
                </Text>
                <Text style={styles.emptySub}>Presiona 'Editar Menú del Día' para buscar y agregar platillos.</Text>
              </View>
            ) : (
              <View style={styles.menuDiaVerListContainer}>
                {comidasActivasDelDia.map((item) => (
                  <View key={item.id} style={styles.menuDiaVerCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuDiaVerNombre}>{item.nombre}</Text>
                      <Text style={styles.menuDiaVerSub}>Tipo: {item.tipo} • Zona: {item.zona}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={styles.badgeCobradoPill}>
                        <Text style={styles.badgeCobradoPillText}>✓ En Menú del Día</Text>
                      </View>
                      <Text style={styles.alimentoItemPrecio}>${item.precio}.00</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* SUB-VISTA 2: EDITAR MENÚ DEL DÍA */}
        {vistaMenuModo === 'menu_dia_editar' && (
          <View>
            {/* SELECTOR DE CATEGORÍAS EN EDICIÓN DEL MENÚ DEL DÍA */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[
                { id: 'Todas', label: 'Todos' },
                { id: 'Desayunos', label: 'Desayunos' },
                { id: 'Comida', label: 'Comida' },
                { id: 'Entradas', label: 'Entradas' },
                { id: 'Aguas', label: 'Aguas / Bebidas' },
                { id: 'Guarniciones', label: 'Guarniciones' },
                { id: 'Postres', label: 'Postres' },
              ].map((catObj) => (
                <TouchableOpacity
                  key={catObj.id}
                  style={[
                    styles.catFiltroChip,
                    catFiltroMenuDia === catObj.id && styles.catFiltroChipActive,
                    { marginRight: 6 }
                  ]}
                  onPress={() => setCatFiltroMenuDia(catObj.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catFiltroText, catFiltroMenuDia === catObj.id && styles.catFiltroTextActive]}>
                    {catObj.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.searchAndCleanBarRow}>
              <View style={styles.searchBoxInputContainer}>
                <Ionicons name="search-outline" size={18} color="#0D9488" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchBoxInput}
                  placeholder={catFiltroMenuDia === 'Todas' ? 'Buscar platillo para agregar...' : `Buscar en ${catFiltroMenuDia}...`}
                  value={busquedaMenuDia}
                  onChangeText={setBusquedaMenuDia}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => {
                    setTimeout(() => setSearchFocused(false), 250);
                  }}
                />
                {busquedaMenuDia.length > 0 && (
                  <TouchableOpacity onPress={() => setBusquedaMenuDia('')}>
                    <Ionicons name="close-circle" size={18} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.btnLimpiarMenu}
                onPress={handleLimpiarMenuDia}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.btnLimpiarMenuText}>Limpiar Todo</Text>
              </TouchableOpacity>
            </View>

            {(searchFocused || busquedaMenuDia.trim().length > 0) && (
              coicidenciasBusqueda.length > 0 ? (
                <View style={styles.sugerenciasBusquedaBox}>
                  <Text style={styles.sugerenciasHeaderTitle}>
                    {busquedaMenuDia.trim().length === 0
                      ? `Platillos de ${catFiltroMenuDia} disponibles para agregar:`
                      : `Resultados para "${busquedaMenuDia}":`}
                  </Text>
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {coicidenciasBusqueda.map((c) => (
                      <View key={c.id} style={styles.sugerenciaRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sugerenciaNombre}>{c.nombre}</Text>
                          <Text style={styles.sugerenciaSub}>Tipo: {c.tipo} • Zona: {c.zona} • ${c.precio}.00</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.btnAgregarComidaSugerencia}
                          onPress={() => handleAgregarComidaBorrador(c)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.btnAgregarComidaSugerenciaText}>+ Agregar</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : busquedaMenuDia.trim().length > 0 ? (
                <View style={styles.sugerenciasBusquedaBox}>
                  <Text style={styles.sugerenciasVacioText}>No se encontraron platillos con "{busquedaMenuDia}"</Text>
                </View>
              ) : null
            )}

            <View style={styles.borradorSectionContainer}>
              <Text style={styles.borradorTitle}>
                {catFiltroMenuDia === 'Todas' ? 'Platillos en el Menú de Hoy' : `Platillos de ${catFiltroMenuDia} en el Menú de Hoy`} ({comidasBorrador.length}):
              </Text>

              {comidasBorrador.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="search-outline" size={42} color="#0D9488" style={{ marginBottom: 6 }} />
                  <Text style={styles.emptyTitle}>
                    {catFiltroMenuDia === 'Todas' ? 'El Menú del Día está vacío' : `No hay ${catFiltroMenuDia} configurados`}
                  </Text>
                  <Text style={styles.emptySub}>Usa el buscador superior o cambia de categoría para agregar platillos.</Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {comidasBorrador.map((item) => (
                    <View key={item.id} style={styles.itemBorradorCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemBorradorNombre}>{item.nombre}</Text>
                        <Text style={styles.itemBorradorSub}>Tipo: {item.tipo} • Zona: {item.zona} • ${item.precio}.00</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.btnQuitarAlimentoBorrador}
                        onPress={() => handleQuitarComidaBorrador(item.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                        <Text style={styles.btnQuitarAlimentoBorradorText}>Quitar</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.guardarCancelarMenuRow}>
                <TouchableOpacity
                  style={styles.btnCancelarEdicionMenu}
                  onPress={() => setVistaMenuModo('menu_dia_ver')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnCancelarEdicionMenuText}>Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnGuardarMenuDiaMain}
                  onPress={handleGuardarMenuDelDia}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnGuardarMenuDiaMainText}>Guardar Menú del Día ({totalBorradorCount})</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* SUB-VISTA 3: CATÁLOGO COMPLETO */}
        {vistaMenuModo === 'catalogo' && (
          <View>
            <View style={styles.catalogoHeaderRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFiltrosScroll}>
                {['Todas', 'Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada', 'Litros', 'Postres', 'Tortas', 'Extras'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catFiltroChip, catFiltroMenu === cat && styles.catFiltroChipActive]}
                    onPress={() => setCatFiltroMenu(cat)}
                  >
                    <Text style={[styles.catFiltroText, catFiltroMenu === cat && styles.catFiltroTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
                <TouchableOpacity
                  style={[styles.btnNuevoAlimentoSmall, { backgroundColor: '#D97706' }]}
                  onPress={abrirModalEdicionMasiva}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.btnNuevoAlimentoSmallText}>Editar Varios</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnNuevoAlimentoSmall}
                  onPress={abrirModalCrearAlimento}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.btnNuevoAlimentoSmallText}>+ Nuevo Alimento</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingAlimentos && !refreshing ? (
              <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 30 }} />
            ) : alimentosFiltradosCat.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="fast-food-outline" size={54} color="#CBD5E1" style={{ marginBottom: 10 }} />
                <Text style={styles.emptyTitle}>No hay alimentos en esta categoría</Text>
              </View>
            ) : (
              <View style={styles.alimentosCatalogGrid}>
                {alimentosFiltradosCat.map((item) => {
                  const estaDisponible = Number(item.estado) === 1;

                  return (
                    <View key={item.id} style={styles.alimentoCardItem}>
                      <View style={styles.alimentoCardInfoCol}>
                        <Text style={styles.alimentoItemNombre}>{item.nombre}</Text>
                        <Text style={styles.alimentoItemSub}>
                          Categoría: <Text style={{ fontWeight: '700' }}>{item.tipo}</Text> • Zona: <Text style={{ fontWeight: '700' }}>{item.zona}</Text>
                        </Text>
                      </View>

                      <View style={styles.alimentoCardActionsCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.disponibleBadgeText, estaDisponible ? styles.disponibleBadgeTextOk : styles.disponibleBadgeTextOff]}>
                            {estaDisponible ? 'Activo' : 'Inactivo'}
                          </Text>
                          <Switch
                            value={estaDisponible}
                            onValueChange={() => handleToggleDisponible(item)}
                            trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
                            thumbColor={estaDisponible ? '#0D9488' : '#64748B'}
                            style={Platform.OS === 'web' ? { cursor: 'pointer', transform: [{ scale: 0.85 }] } : { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                          />
                        </View>

                        <View style={styles.precioYEditRow}>
                          <Text style={styles.alimentoItemPrecio}>${item.precio}.00</Text>

                          <TouchableOpacity
                            style={styles.btnIconEditAlimento}
                            onPress={() => abrirModalEditarAlimento(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil-outline" size={16} color="#0D9488" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  // RENDER PESTAÑA CORTE DE CAJA COMPLETA
  const renderCorteTab = () => {
    if (!corteActivo) {
      return (
        <ScrollView
          contentContainerStyle={styles.tabContentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Corte de Caja</Text>
              <Text style={styles.sectionSub}>Gestión de fondo inicial, ventas, gastos y balance diario</Text>
            </View>
          </View>

          <View style={styles.corteSinAbrirCard}>
            <Ionicons name="wallet-outline" size={64} color="#0D9488" style={{ marginBottom: 12 }} />
            <Text style={styles.corteSinAbrirTitle}>No hay un Corte de Caja Activo</Text>
            <Text style={styles.corteSinAbrirSub}>
              Debes iniciar un corte de caja especificando el dinero inicial para permitir cobros en el sistema.
            </Text>

            <TouchableOpacity
              style={styles.btnAbrirCorteMain}
              onPress={() => setModalIniciarCorteVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="play-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnAbrirCorteMainText}>Iniciar Corte de Caja</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.tabContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Corte de Caja Activo (#{corteActivo.id})</Text>
            <Text style={styles.sectionSub}>Abierto el {new Date(corteActivo.hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={styles.corteActivoPillBadge}>
            <Text style={styles.corteActivoPillBadgeText}>🟢 EN CURSO</Text>
          </View>
        </View>

        {/* METRICAS Y DESGLOSE DEL CORTE */}
        <View style={styles.corteMetricasGrid}>
          <View style={styles.metricaCard}>
            <Text style={styles.metricaLabel}>💵 Dinero Inicial</Text>
            <Text style={styles.metricaValue}>${corteActivo.dinero_inicial}.00</Text>
          </View>

          <View style={styles.metricaCard}>
            <Text style={styles.metricaLabel}>🛍️ Ventas Totales</Text>
            <Text style={[styles.metricaValue, { color: '#0D9488' }]}>${corteActivo.total_ventas}.00</Text>
          </View>

          <View style={styles.metricaCard}>
            <Text style={styles.metricaLabel}>💵 Ventas en Efectivo</Text>
            <Text style={[styles.metricaValue, { color: '#059669' }]}>+${corteActivo.total_efectivo}.00</Text>
            <Text style={{ fontSize: 10, color: '#059669', fontWeight: '700', marginTop: 2 }}>✓ Entra a caja física</Text>
          </View>

          <View style={styles.metricaCard}>
            <Text style={styles.metricaLabel}>💳 Ventas en Tarjeta</Text>
            <Text style={[styles.metricaValue, { color: '#2563EB' }]}>${corteActivo.total_tarjeta}.00</Text>
            <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>No entra a caja</Text>
          </View>

          <View style={styles.metricaCard}>
            <Text style={styles.metricaLabel}>📲 Ventas en Transferencia</Text>
            <Text style={[styles.metricaValue, { color: '#0D9488' }]}>${corteActivo.total_transferencia}.00</Text>
            <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>No entra a caja</Text>
          </View>

          <View style={styles.metricaCard}>
            <Text style={styles.metricaLabel}>➕ Otros Ingresos</Text>
            <Text style={[styles.metricaValue, { color: '#059669' }]}>+${corteActivo.total_ingresos}.00</Text>
          </View>

          <View style={styles.metricaCard}>
            <Text style={styles.metricaLabel}>➖ Egresos / Gastos</Text>
            <Text style={[styles.metricaValue, { color: '#DC2626' }]}>-${corteActivo.total_egresos}.00</Text>
          </View>
        </View>

        {/* BALANCE DESTACADO CAJA ESPERADA */}
        <View style={styles.cajaEsperadaHighlightBox}>
          <Text style={styles.cajaEsperadaTitle}>CAJA FÍSICA DEBERÍA TENER (ESPERADO):</Text>
          <Text style={styles.cajaEsperadaMonto}>${corteActivo.caja_esperada}.00</Text>
          <Text style={styles.cajaEsperadaSub}>
            (Inicial ${corteActivo.dinero_inicial} + Efectivo ${corteActivo.total_efectivo} + Ingresos ${corteActivo.total_ingresos} - Gastos ${corteActivo.total_egresos})
          </Text>
        </View>

        {/* ACCIONES DE MOVIMIENTO (INGRESAR Y SACAR DINERO CON JUSTIFICACIÓN) */}
        <View style={styles.corteAccionesRow}>
          <TouchableOpacity
            style={styles.btnIngresarDinero}
            onPress={() => {
              setTipoMovimiento('ingreso');
              setInputMontoMov('');
              setInputConceptoMov('');
              setModalMovimientoVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.btnIngresarDineroText}>Ingresar Dinero</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSacarDinero}
            onPress={() => {
              setTipoMovimiento('egreso');
              setInputMontoMov('');
              setInputConceptoMov('');
              setModalMovimientoVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="remove-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.btnSacarDineroText}>Sacar Dinero</Text>
          </TouchableOpacity>
        </View>

        {/* LISTAS DE INGRESOS Y EGRESOS REGISTRADOS */}
        {((corteActivo.ingresos && corteActivo.ingresos.length > 0) || (corteActivo.egresos && corteActivo.egresos.length > 0)) && (
          <View style={styles.movimientosDetalleBox}>
            <Text style={styles.movimientosDetalleTitle}>Movimientos Registrados en este Corte:</Text>

            {corteActivo.ingresos?.map((ing, idx) => {
              const mIng = Number(ing.total_ingreso || ing.monto || 0);
              return (
                <View key={ing.id ? `ing-${ing.id}` : `ing-${idx}`} style={styles.movimientoRowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.movimientoIngresoText}>➕ INGRESO: {ing.concepto}</Text>
                  </View>
                  <Text style={styles.movimientoIngresoMonto}>+${mIng.toFixed(2)}</Text>
                </View>
              );
            })}

            {corteActivo.egresos?.map((eg, idx) => {
              const mEg = Number(eg.total_egreso || eg.total_ingreso || eg.monto || 0);
              return (
                <View key={eg.id ? `eg-${eg.id}` : `eg-${idx}`} style={styles.movimientoRowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.movimientoEgresoText}>➖ EGRESOS / GASTO: {eg.concepto}</Text>
                  </View>
                  <Text style={styles.movimientoEgresoMonto}>-${mEg.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* BOTÓN FINALIZAR CORTE DE CAJA */}
        <TouchableOpacity
          style={styles.btnFinalizarCorteMain}
          onPress={() => setModalCerrarCorteVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-closed-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.btnFinalizarCorteMainText}>Finalizar Corte de Caja</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const totalModalCalculado = calcularTotalModalActual();
  const pagaNumModal = metodoPago === 'efectivo' ? Number(montoPaga) || 0 : totalModalCalculado;
  const cambioModal = metodoPago === 'efectivo' ? Math.max(0, pagaNumModal - totalModalCalculado) : 0;

  const navItems = [
    { key: 'comandas', label: 'Comandas', iconActive: 'restaurant', iconInactive: 'restaurant-outline' },
    { key: 'alimentos', label: 'Menú', iconActive: 'fast-food', iconInactive: 'fast-food-outline' },
    { key: 'historial', label: 'Historial', iconActive: 'time', iconInactive: 'time-outline' },
    { key: 'corte', label: 'Corte Caja', iconActive: 'wallet', iconInactive: 'wallet-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {isDesktop ? (
        <View style={styles.desktopMainLayout}>
          {/* SIDEBAR LATERAL IZQUIERDA (SOLO WEB / PC) */}
          <View style={styles.sidebarContainer}>
            <View style={styles.sidebarHeader}>
              <View style={styles.logoBadge}>
                <Image source={require('../../../assets/logo.svg')} style={styles.logoImage} contentFit="contain" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userNameText}>{user?.nombre || 'Administrador'}</Text>
                <Text style={styles.userRoleText}>🛡️ Administrador</Text>
              </View>
            </View>

            <View style={styles.sidebarNavList}>
              {navItems.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.sidebarNavItem, isActive && styles.sidebarNavItemActive]}
                    onPress={() => setActiveTab(item.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isActive ? item.iconActive : item.iconInactive}
                      size={20}
                      color={isActive ? '#0D9488' : '#64748B'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.sidebarNavLabel, isActive && styles.sidebarNavLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.sidebarLogoutButton} onPress={logout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 10 }} />
              <Text style={styles.sidebarLogoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>

          {/* ÁREA DE CONTENIDO A LA DERECHA */}
          <View style={styles.desktopContentArea}>
            {activeTab === 'comandas'
              ? renderComandasTab()
              : activeTab === 'alimentos'
              ? renderMenuTab()
              : activeTab === 'historial'
              ? renderHistorialTab()
              : renderCorteTab()}
          </View>
        </View>
      ) : (
        <>
          {/* HEADER SUPERIOR ADMINISTRADOR (SOLO MÓVIL) */}
          <View style={styles.headerContainer}>
            <View style={styles.leftSection}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../../assets/logo.svg')}
                  style={styles.logoImage}
                  contentFit="contain"
                />
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userNameText}>{user?.nombre || 'Administrador'}</Text>
                <Text style={styles.userRoleText}>🛡️ Panel de Administración</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color="#0D9488" />
            </TouchableOpacity>
          </View>

          {/* ÁREA DE CONTENIDO */}
          <View style={styles.mainBody}>
            {activeTab === 'comandas'
              ? renderComandasTab()
              : activeTab === 'alimentos'
              ? renderMenuTab()
              : activeTab === 'historial'
              ? renderHistorialTab()
              : renderCorteTab()}
          </View>

          {/* FOOTER / BOTTOM NAVIGATION BAR (SOLO MÓVIL) */}
          <View style={styles.footerNavBar}>
            <TouchableOpacity
              style={[styles.navItem, activeTab === 'comandas' && styles.navItemActive]}
              onPress={() => setActiveTab('comandas')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeTab === 'comandas' ? 'restaurant' : 'restaurant-outline'}
                size={20}
                color={activeTab === 'comandas' ? '#0D9488' : '#64748B'}
              />
              <Text style={[styles.navLabel, activeTab === 'comandas' && styles.navLabelActive]}>
                Comandas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, activeTab === 'alimentos' && styles.navItemActive]}
              onPress={() => setActiveTab('alimentos')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeTab === 'alimentos' ? 'fast-food' : 'fast-food-outline'}
                size={20}
                color={activeTab === 'alimentos' ? '#0D9488' : '#64748B'}
              />
              <Text style={[styles.navLabel, activeTab === 'alimentos' && styles.navLabelActive]}>
                Menú
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, activeTab === 'historial' && styles.navItemActive]}
              onPress={() => setActiveTab('historial')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeTab === 'historial' ? 'time' : 'time-outline'}
                size={20}
                color={activeTab === 'historial' ? '#0D9488' : '#64748B'}
              />
              <Text style={[styles.navLabel, activeTab === 'historial' && styles.navLabelActive]}>
                Historial
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, activeTab === 'corte' && styles.navItemActive]}
              onPress={() => setActiveTab('corte')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeTab === 'corte' ? 'wallet' : 'wallet-outline'}
                size={20}
                color={activeTab === 'corte' ? '#0D9488' : '#64748B'}
              />
              <Text style={[styles.navLabel, activeTab === 'corte' && styles.navLabelActive]}>
                Corte Caja
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* MODAL CORTE DE CAJA REQUERIDO (COMPATIBLE CON PC Y MÓVIL) */}
      <Modal visible={modalCorteRequeridoVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.cobroModalCard, { maxWidth: 450, width: '90%', alignSelf: 'center' }]}>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <View style={{ backgroundColor: '#FEF3C7', padding: 14, borderRadius: 50, marginBottom: 12 }}>
                <Ionicons name="warning-outline" size={38} color="#D97706" />
              </View>
              <Text style={[styles.modalHeaderTitle, { textAlign: 'center', color: '#1E293B', fontSize: 18 }]}>
                Corte de Caja Requerido
              </Text>
              <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
                No puedes realizar cobros porque no hay un corte de caja activo. Debes iniciar un corte de caja primero.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 46,
                  backgroundColor: '#F1F5F9',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
                onPress={() => setModalCorteRequeridoVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 46,
                  backgroundColor: '#0D9488',
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => {
                  setModalCorteRequeridoVisible(false);
                  setActiveTab('corte');
                  setModalIniciarCorteVisible(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Iniciar Corte</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE INICIAR CORTE DE CAJA */}
      <Modal visible={modalIniciarCorteVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.cobroModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>Iniciar Corte de Caja</Text>
                <Text style={styles.modalHeaderSub}>Apertura de turno de administración</Text>
              </View>

              <TouchableOpacity onPress={() => setModalIniciarCorteVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputPagaLabel}>¿Con cuánto dinero inicias en caja? ($):</Text>
            <TextInput
              style={styles.inputPagaField}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              value={inputDineroInicial}
              onChangeText={setInputDineroInicial}
            />

            <TouchableOpacity
              style={styles.btnConfirmarCobroModal}
              onPress={handleIniciarCorteSubmit}
              activeOpacity={0.85}
            >
              <Ionicons name="play-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnConfirmarCobroText}>Iniciar Corte de Caja</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL REGISTRAR MOVIMIENTO (INGRESAR O SACAR DINERO CON JUSTIFICACIÓN) */}
      <Modal visible={modalMovimientoVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.cobroModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {tipoMovimiento === 'ingreso' ? '➕ Ingresar Dinero a Caja' : '➖ Sacar Dinero de Caja'}
                </Text>
                <Text style={styles.modalHeaderSub}>
                  {tipoMovimiento === 'ingreso' ? 'Registra una entrada extra de dinero' : 'Registra un gasto o salida de caja'}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setModalMovimientoVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputPagaLabel}>Monto ($):</Text>
            <TextInput
              style={styles.inputPagaField}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              value={inputMontoMov}
              onChangeText={setInputMontoMov}
            />

            <Text style={styles.inputPagaLabel}>Justificación / Razón de {tipoMovimiento}:</Text>
            <TextInput
              style={styles.inputPagaField}
              placeholder={tipoMovimiento === 'ingreso' ? 'Ej. Cambio morralla' : 'Ej. Compra refrescos'}
              placeholderTextColor="#94A3B8"
              value={inputConceptoMov}
              onChangeText={setInputConceptoMov}
            />

            <TouchableOpacity
              style={[
                styles.btnConfirmarCobroModal,
                tipoMovimiento === 'egreso' && { backgroundColor: '#DC2626' },
              ]}
              onPress={handleRegistrarMovimientoSubmit}
              activeOpacity={0.85}
            >
              <Ionicons
                name={tipoMovimiento === 'ingreso' ? 'add-circle' : 'remove-circle'}
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.btnConfirmarCobroText}>
                {tipoMovimiento === 'ingreso' ? 'Confirmar Ingreso' : 'Confirmar Egreso'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CERRAR CORTE DE CAJA (RESUMEN FINAL) */}
      <Modal visible={modalCerrarCorteVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.cobroModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>Finalizar Corte de Caja</Text>
                <Text style={styles.modalHeaderSub}>Cierre y balance de dinero en caja</Text>
              </View>

              <TouchableOpacity onPress={() => setModalCerrarCorteVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.cierreResumenBox}>
              <View style={styles.cierreResumenRow}>
                <Text style={styles.cierreResumenLabel}>💵 Dinero Inicial:</Text>
                <Text style={styles.cierreResumenValue}>${corteActivo?.dinero_inicial}.00</Text>
              </View>
              <View style={styles.cierreResumenRow}>
                <Text style={styles.cierreResumenLabel}>🛍️ Ventas Totales:</Text>
                <Text style={[styles.cierreResumenValue, { color: '#0D9488' }]}>${corteActivo?.total_ventas}.00</Text>
              </View>
              <View style={styles.cierreResumenRow}>
                <Text style={[styles.cierreResumenLabel, { marginLeft: 10 }]}>• 💵 Efectivo (Entra a caja):</Text>
                <Text style={[styles.cierreResumenValue, { color: '#059669' }]}>+${corteActivo?.total_efectivo}.00</Text>
              </View>
              <View style={styles.cierreResumenRow}>
                <Text style={[styles.cierreResumenLabel, { marginLeft: 10 }]}>• 💳 Tarjeta (No entra a caja):</Text>
                <Text style={[styles.cierreResumenValue, { color: '#2563EB' }]}>${corteActivo?.total_tarjeta}.00</Text>
              </View>
              <View style={styles.cierreResumenRow}>
                <Text style={[styles.cierreResumenLabel, { marginLeft: 10 }]}>• 📲 Transferencia (No entra):</Text>
                <Text style={[styles.cierreResumenValue, { color: '#0D9488' }]}>${corteActivo?.total_transferencia}.00</Text>
              </View>
              <View style={styles.cierreResumenRow}>
                <Text style={styles.cierreResumenLabel}>➕ Otros Ingresos:</Text>
                <Text style={[styles.cierreResumenValue, { color: '#059669' }]}>+${corteActivo?.total_ingresos}.00</Text>
              </View>
              <View style={styles.cierreResumenRow}>
                <Text style={styles.cierreResumenLabel}>➖ Egresos / Gastos:</Text>
                <Text style={[styles.cierreResumenValue, { color: '#DC2626' }]}>-${corteActivo?.total_egresos}.00</Text>
              </View>

              <View style={styles.cierreResumenDivider} />

              <View style={styles.cierreResumenTotalRow}>
                <Text style={styles.cierreResumenTotalLabel}>CAJA FÍSICA DEBERÍA TENER:</Text>
                <Text style={styles.cierreResumenTotalValue}>${corteActivo?.caja_esperada}.00</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btnConfirmarCierreFinalModal}
              onPress={handleCerrarCorteSubmit}
              activeOpacity={0.85}
            >
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnConfirmarCobroText}>Confirmar Cierre de Corte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE COBRO DE ORDEN */}
      <Modal visible={cobroModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.cobroModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>Cobrar Comanda</Text>
                <Text style={styles.modalHeaderSub}>
                  Mesa #{ordenACobrar?.num_mesa} • Orden #{ordenACobrar?.num_orden}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setCobroModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                style={[styles.modeToggleBtn, tipoCobro === 'toda' && styles.modeToggleBtnActive]}
                onPress={() => setTipoCobro('toda')}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeToggleText, tipoCobro === 'toda' && styles.modeToggleTextActive]}>
                  Pagar Toda la Orden
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeToggleBtn, tipoCobro === 'separado' && styles.modeToggleBtnActive]}
                onPress={() => setTipoCobro('separado')}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeToggleText, tipoCobro === 'separado' && styles.modeToggleTextActive]}>
                  Pagar por Separado
                </Text>
              </TouchableOpacity>
            </View>

            {tipoCobro === 'separado' && (
              <View style={styles.listaSeparadosBox}>
                <Text style={styles.listaSeparadosTitle}>Selecciona los platillos a cobrar ahora:</Text>
                <ScrollView style={{ maxHeight: 140 }}>
                  {ordenACobrar?.items
                    .filter((item) => Number(item.estado) !== 4)
                    .map((item) => {
                      const isSelected = !!itemsSeleccionadosCobro[item.id];
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.itemSeparadoRow, isSelected && styles.itemSeparadoRowSelected]}
                          onPress={() => toggleItemCobroSeparado(item.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isSelected ? '#0D9488' : '#64748B'}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.itemSeparadoNombre} numberOfLines={1}>
                            {limpiarZona(item.alimento)}
                          </Text>
                          <Text style={styles.itemSeparadoCosto}>${item.costo}.00</Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            )}

            <View style={styles.totalCobrarBox}>
              <Text style={styles.totalCobrarLabel}>
                {tipoCobro === 'toda' ? 'TOTAL A COBRAR:' : 'TOTAL ÍTEMS SELECCIONADOS:'}
              </Text>
              <Text style={styles.totalCobrarValue}>${totalModalCalculado}.00</Text>
            </View>

            <Text style={styles.sectionSubLabel}>Método de Pago:</Text>
            <View style={styles.metodosPagoRow}>
              <TouchableOpacity
                style={[styles.btnMetodoPago, metodoPago === 'efectivo' && styles.btnMetodoPagoActive]}
                onPress={() => handleCambiarMetodoPago('efectivo')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color={metodoPago === 'efectivo' ? '#FFFFFF' : '#475569'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.btnMetodoPagoText, metodoPago === 'efectivo' && styles.btnMetodoPagoTextActive]}>
                  Efectivo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnMetodoPago, metodoPago === 'tarjeta' && styles.btnMetodoPagoActive]}
                onPress={() => handleCambiarMetodoPago('tarjeta')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={metodoPago === 'tarjeta' ? '#FFFFFF' : '#475569'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.btnMetodoPagoText, metodoPago === 'tarjeta' && styles.btnMetodoPagoTextActive]}>
                  Tarjeta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnMetodoPago, metodoPago === 'transferencia' && styles.btnMetodoPagoActive]}
                onPress={() => handleCambiarMetodoPago('transferencia')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color={metodoPago === 'transferencia' ? '#FFFFFF' : '#475569'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.btnMetodoPagoText, metodoPago === 'transferencia' && styles.btnMetodoPagoTextActive]}>
                  Transf.
                </Text>
              </TouchableOpacity>
            </View>

            {metodoPago === 'efectivo' && (
              <>
                <Text style={styles.inputPagaLabel}>Monto recibido ($):</Text>
                <TextInput
                  style={styles.inputPagaField}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  value={montoPaga}
                  onChangeText={setMontoPaga}
                />

                <View style={styles.cambioBox}>
                  <Text style={styles.cambioLabel}>CAMBIO A ENTREGAR:</Text>
                  <Text style={[styles.cambioValue, cambioModal > 0 ? { color: '#059669' } : { color: '#64748B' }]}>
                    ${cambioModal.toFixed(2)}
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.btnConfirmarCobroModal}
              onPress={handleConfirmarCobro}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnConfirmarCobroText}>
                {tipoCobro === 'toda' ? 'Confirmar Cobro Total' : 'Cobrar Ítems Seleccionados'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR / EDITAR ALIMENTO */}
      <Modal visible={alimentoModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.crudModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>
                {alimentoEditando ? 'Editar Alimento' : 'Nuevo Alimento'}
              </Text>
              <TouchableOpacity onPress={() => setAlimentoModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputPagaLabel}>Nombre del Alimento: *</Text>
              <TextInput
                style={[
                  styles.inputPagaField,
                  formError && !formNombre.trim() && { borderColor: '#EF4444', borderWidth: 2, backgroundColor: '#FEF2F2' }
                ]}
                placeholder="Ej. Milanesa de Res"
                placeholderTextColor="#94A3B8"
                value={formNombre}
                onChangeText={(val) => { setFormNombre(val); if (formError) setFormError(false); }}
              />
              {formError && !formNombre.trim() && (
                <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -6, marginBottom: 10, fontWeight: '600' }}>
                  * El nombre del alimento es obligatorio
                </Text>
              )}

              <Text style={styles.inputPagaLabel}>Precio ($): *</Text>
              <TextInput
                style={[
                  styles.inputPagaField,
                  formError && (!formPrecio.trim() || isNaN(Number(formPrecio)) || Number(formPrecio) < 0) && { borderColor: '#EF4444', borderWidth: 2, backgroundColor: '#FEF2F2' }
                ]}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
                value={formPrecio}
                onChangeText={(val) => { setFormPrecio(val); if (formError) setFormError(false); }}
              />
              {formError && (!formPrecio.trim() || isNaN(Number(formPrecio)) || Number(formPrecio) < 0) && (
                <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -6, marginBottom: 10, fontWeight: '600' }}>
                  * El precio es obligatorio (número válido ≥ 0)
                </Text>
              )}

              <Text style={styles.inputPagaLabel}>Precio en Paquete ($) (Opcional dejar en blanco si no aplica):</Text>
              <TextInput
                style={styles.inputPagaField}
                keyboardType="numeric"
                placeholder="Dejar en blanco si no aplica"
                placeholderTextColor="#94A3B8"
                value={formPrecioPaquete}
                onChangeText={setFormPrecioPaquete}
              />

              <Text style={styles.inputPagaLabel}>Precio en Antojito ($) (Opcional dejar en blanco si no aplica):</Text>
              <TextInput
                style={styles.inputPagaField}
                keyboardType="numeric"
                placeholder="Dejar en blanco si no aplica"
                placeholderTextColor="#94A3B8"
                value={formPrecioAntojito}
                onChangeText={setFormPrecioAntojito}
              />

              <Text style={styles.inputPagaLabel}>Categoría / Tipo:</Text>
              <View style={styles.opcionesFormRow}>
                {['Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada', 'Litros', 'Postre', 'Torta', 'Extra'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.btnFormChip, formTipo === cat && styles.btnFormChipActive]}
                    onPress={() => setFormTipo(cat)}
                  >
                    <Text style={[styles.btnFormChipText, formTipo === cat && styles.btnFormChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputPagaLabel}>Zona de Preparación:</Text>
              <View style={styles.opcionesFormRow}>
                {[
                  { key: 'cocina', label: '👨‍🍳 Cocina' },
                  { key: 'comal', label: '🫓 Comal' },
                  { key: 'barra', label: '🥤 Barra' },
                ].map((z) => (
                  <TouchableOpacity
                    key={z.key}
                    style={[styles.btnFormChip, formZona === z.key && styles.btnFormChipActive]}
                    onPress={() => setFormZona(z.key)}
                  >
                    <Text style={[styles.btnFormChipText, formZona === z.key && styles.btnFormChipTextActive]}>
                      {z.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Disponible:</Text>
                <Switch
                  value={formEstado}
                  onValueChange={setFormEstado}
                  trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
                  thumbColor={formEstado ? '#0D9488' : '#64748B'}
                />
              </View>

              {((formTipo || '').toLowerCase().includes('bebida') || (formTipo || '').toLowerCase().includes('litro')) && (
                <View style={[styles.switchRow, { marginTop: 10, padding: 10, backgroundColor: '#F0FDFA', borderRadius: 8, borderWidth: 1, borderColor: '#CCFBF1' }]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.switchLabel, { color: '#0F766E', fontWeight: '700' }]}>
                      🥤 ¿Ofrecer en paquetes?
                    </Text>
                    <Text style={{ fontSize: 11, color: '#0F766E' }}>
                      Indica si esta bebida está disponible para elegirse en paquetes
                    </Text>
                  </View>
                  <Switch
                    value={formAplicaPaquete}
                    onValueChange={setFormAplicaPaquete}
                    trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
                    thumbColor={formAplicaPaquete ? '#0D9488' : '#64748B'}
                  />
                </View>
              )}

              {((formTipo || '').toLowerCase().includes('comida')) && (
                <View style={[styles.switchRow, { marginTop: 10, padding: 10, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.switchLabel, { color: '#B45309', fontWeight: '700' }]}>
                      🫓 ¿Ofrecer como guisado para antojitos?
                    </Text>
                    <Text style={{ fontSize: 11, color: '#B45309' }}>
                      Indica si esta comida está disponible como guisado en antojitos
                    </Text>
                  </View>
                  <Switch
                    value={formAplicaPaqueteAntojito}
                    onValueChange={setFormAplicaPaqueteAntojito}
                    trackColor={{ false: '#CBD5E1', true: '#FDE68A' }}
                    thumbColor={formAplicaPaqueteAntojito ? '#D97706' : '#64748B'}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.btnGuardarAlimentoModal}
                onPress={handleGuardarAlimento}
                activeOpacity={0.85}
              >
                <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnGuardarAlimentoText}>Guardar Alimento</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL EDICIÓN MASIVA DE PRECIOS */}
      <Modal visible={modalMasivoVisible} animationType="slide" transparent>
        <View style={styles.crudModalOverlay}>
          <View style={[styles.crudModalCard, { maxWidth: 650, maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="create-outline" size={22} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={styles.modalHeaderTitle}>Editar Varios Precios</Text>
              </View>
              <TouchableOpacity onPress={() => setModalMasivoVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputPagaLabel}>1. Selecciona la Categoría:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {['Todas', 'Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada', 'Litros', 'Postres', 'Tortas', 'Extras'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catFiltroChip, catFiltroMasivo === cat && styles.catFiltroChipActive]}
                    onPress={() => {
                      setCatFiltroMasivo(cat);
                      const filtered = alimentosCat.filter((a) => {
                        if (cat === 'Todas') return true;
                        const catFilterLower = cat.toLowerCase();
                        const aTipoLower = (a.tipo || '').toLowerCase();
                        if (catFilterLower === 'postres' && (aTipoLower === 'postre' || aTipoLower === 'postres')) return true;
                        if (catFilterLower === 'tortas' && (aTipoLower === 'torta' || aTipoLower === 'tortas')) return true;
                        if (catFilterLower === 'extras' && (aTipoLower === 'extra' || aTipoLower === 'extras')) return true;
                        if (catFilterLower === 'litros' && (aTipoLower === 'litros' || aTipoLower === 'litro')) return true;
                        return aTipoLower === catFilterLower;
                      });
                      const map = {};
                      filtered.forEach((i) => { map[i.id] = true; });
                      setSelectedIdsMasivo(map);
                    }}
                  >
                    <Text style={[styles.catFiltroText, catFiltroMasivo === cat && styles.catFiltroTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lista de Alimentos de la categoría con Checkboxes */}
              {(() => {
                const itemsMostrar = alimentosCat.filter((a) => {
                  if (catFiltroMasivo === 'Todas') return true;
                  const catFilterLower = catFiltroMasivo.toLowerCase();
                  const aTipoLower = (a.tipo || '').toLowerCase();
                  if (catFilterLower === 'postres' && (aTipoLower === 'postre' || aTipoLower === 'postres')) return true;
                  if (catFilterLower === 'tortas' && (aTipoLower === 'torta' || aTipoLower === 'tortas')) return true;
                  if (catFilterLower === 'extras' && (aTipoLower === 'extra' || aTipoLower === 'extras')) return true;
                  if (catFilterLower === 'litros' && (aTipoLower === 'litros' || aTipoLower === 'litro')) return true;
                  return aTipoLower === catFilterLower;
                });

                const countSelected = itemsMostrar.filter((i) => selectedIdsMasivo[i.id]).length;

                return (
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.inputPagaLabel}>
                        2. Selecciona Alimentos ({countSelected} de {itemsMostrar.length} marcados):
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FEF3C7', borderRadius: 6 }}
                          onPress={() => seleccionarTodosMasivo(itemsMostrar)}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>Marcar Todos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F1F5F9', borderRadius: 6 }}
                          onPress={() => deseleccionarTodosMasivo(itemsMostrar)}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Desmarcar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ maxHeight: 220, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 8, backgroundColor: '#FAFAFA' }}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                        {itemsMostrar.map((item) => {
                          const isSelected = !!selectedIdsMasivo[item.id];
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 8,
                                paddingHorizontal: 10,
                                borderBottomWidth: 1,
                                borderBottomColor: '#F1F5F9',
                                backgroundColor: isSelected ? '#FFFBEB' : 'transparent',
                                borderRadius: 6,
                              }}
                              onPress={() => toggleSelectMasivo(item.id)}
                            >
                              <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={isSelected ? '#D97706' : '#94A3B8'}
                                style={{ marginRight: 10 }}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{item.nombre}</Text>
                                <Text style={{ fontSize: 12, color: '#64748B' }}>
                                  Categoría: {item.tipo} • Regular: ${item.precio}.00
                                  {item.precio_paquete !== null && item.precio_paquete !== undefined ? ` • Paquete: $${item.precio_paquete}` : ''}
                                  {item.precio_antojito !== null && item.precio_antojito !== undefined ? ` • Antojito: $${item.precio_antojito}` : ''}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                );
              })()}

              {/* 3. CONFIGURAR NUEVOS PRECIOS O ESTADO */}
              <Text style={styles.inputPagaLabel}>3. Elige los precios o estado a cambiar:</Text>

              {/* OPCIÓN PRECIO REGULAR */}
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: modificarPrecioRegular ? 8 : 0 }}
                  onPress={() => setModificarPrecioRegular(!modificarPrecioRegular)}
                >
                  <Ionicons
                    name={modificarPrecioRegular ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={modificarPrecioRegular ? '#D97706' : '#94A3B8'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Cambiar Precio Regular ($)</Text>
                </TouchableOpacity>

                {modificarPrecioRegular && (
                  <TextInput
                    style={styles.inputPagaField}
                    keyboardType="numeric"
                    placeholder="Escribe el nuevo precio regular (ej. 50)"
                    placeholderTextColor="#94A3B8"
                    value={nuevoPrecioRegular}
                    onChangeText={setNuevoPrecioRegular}
                  />
                )}
              </View>

              {/* OPCIÓN PRECIO PAQUETE */}
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: modificarPrecioPaquete ? 8 : 0 }}
                  onPress={() => setModificarPrecioPaquete(!modificarPrecioPaquete)}
                >
                  <Ionicons
                    name={modificarPrecioPaquete ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={modificarPrecioPaquete ? '#D97706' : '#94A3B8'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Cambiar Precio en Paquete ($)</Text>
                </TouchableOpacity>

                {modificarPrecioPaquete && (
                  <TextInput
                    style={styles.inputPagaField}
                    keyboardType="numeric"
                    placeholder="Escribe el nuevo precio en paquete (ej. 40 o blanco para eliminar)"
                    placeholderTextColor="#94A3B8"
                    value={nuevoPrecioPaquete}
                    onChangeText={setNuevoPrecioPaquete}
                  />
                )}
              </View>

              {/* OPCIÓN PRECIO ANTOJITO */}
              <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: modificarPrecioAntojito ? 8 : 0 }}
                  onPress={() => setModificarPrecioAntojito(!modificarPrecioAntojito)}
                >
                  <Ionicons
                    name={modificarPrecioAntojito ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={modificarPrecioAntojito ? '#D97706' : '#94A3B8'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Cambiar Precio en Antojito ($)</Text>
                </TouchableOpacity>

                {modificarPrecioAntojito && (
                  <TextInput
                    style={styles.inputPagaField}
                    keyboardType="numeric"
                    placeholder="Escribe el nuevo precio en antojito (ej. 10 o blanco para eliminar)"
                    placeholderTextColor="#94A3B8"
                    value={nuevoPrecioAntojito}
                    onChangeText={setNuevoPrecioAntojito}
                  />
                )}
              </View>

              {/* OPCIÓN CAMBIAR ESTADO / DISPONIBILIDAD */}
              <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: modificarEstadoMasivo ? 10 : 0 }}
                  onPress={() => setModificarEstadoMasivo(!modificarEstadoMasivo)}
                >
                  <Ionicons
                    name={modificarEstadoMasivo ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={modificarEstadoMasivo ? '#D97706' : '#94A3B8'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Cambiar Estado / Disponibilidad</Text>
                </TouchableOpacity>

                {modificarEstadoMasivo && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        borderWidth: 1,
                        borderColor: nuevoEstadoMasivo === 1 ? '#10B981' : '#CBD5E1',
                        backgroundColor: nuevoEstadoMasivo === 1 ? '#ECFDF5' : '#FFFFFF',
                      }}
                      onPress={() => setNuevoEstadoMasivo(1)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={nuevoEstadoMasivo === 1 ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={nuevoEstadoMasivo === 1 ? '#10B981' : '#64748B'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: nuevoEstadoMasivo === 1 ? '#065F46' : '#64748B',
                        }}
                      >
                        Disponible (Activo)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        borderWidth: 1,
                        borderColor: nuevoEstadoMasivo === 0 ? '#EF4444' : '#CBD5E1',
                        backgroundColor: nuevoEstadoMasivo === 0 ? '#FEF2F2' : '#FFFFFF',
                      }}
                      onPress={() => setNuevoEstadoMasivo(0)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={nuevoEstadoMasivo === 0 ? 'close-circle' : 'ellipse-outline'}
                        size={18}
                        color={nuevoEstadoMasivo === 0 ? '#EF4444' : '#64748B'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: nuevoEstadoMasivo === 0 ? '#991B1B' : '#64748B',
                        }}
                      >
                        No disponible (Inactivo)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.btnGuardarAlimentoModal, { backgroundColor: '#D97706' }]}
                onPress={handleGuardarPreciosMasivo}
                activeOpacity={0.85}
              >
                <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnGuardarAlimentoText}>
                  Aplicar Cambios a {Object.keys(selectedIdsMasivo).filter((id) => selectedIdsMasivo[id]).length} Alimentos
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL TICKET PREVIEW */}
      <ModalTicketPreview
        visible={modalTicketVisible}
        comanda={ticketComandaSeleccionada}
        opcionesCobro={ticketOpcionesCobro}
        onClose={() => setModalTicketVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  desktopMainLayout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  sidebarContainer: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 20,
    justifyContent: 'space-between',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sidebarNavList: {
    flex: 1,
    gap: 8,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  sidebarNavItemActive: {
    backgroundColor: '#CCFBF1',
  },
  sidebarNavLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  sidebarNavLabelActive: {
    color: '#0D9488',
    fontWeight: '800',
  },
  sidebarLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  sidebarLogoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  desktopContentArea: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    maxWidth: 1350,
    width: '100%',
    alignSelf: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userNameText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  userRoleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },

  /* Content Body */
  mainBody: {
    flex: 1,
  },
  tabContentContainer: {
    padding: Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 30,
    maxWidth: 1350,
    width: '100%',
    alignSelf: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* Footer Navbar */
  footerNavBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  navItemActive: {},
  navLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#0D9488',
    fontWeight: '800',
  },

  /* Empty Box */
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  /* Comanda Cards */
  comandaListContainer: {
    gap: 14,
  },
  comandaListContainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  comandaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  comandaCardGrid: {
    width: '49.2%',
  },
  historialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  historialResumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  historialResumenText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  comandaHeaderTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comandaTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mesaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  mesaBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  mesaBadgeHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  mesaBadgeTextHistorial: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  numOrdenText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  comandaRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalMontoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Details Box */
  detallesOrdenBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  detallesHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  detalleItemRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
    marginBottom: 4,
  },
  detalleItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  detalleAlimentoNombre: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  itemCostoInline: {
    fontWeight: '600',
    color: '#0D9488',
  },
  badgeCobradoPill: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeCobradoPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  /* KPIs Historial */
  kpiRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  kpiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  historialGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'flex-start',
  },
  historialGridMobile: {
    gap: 14,
  },
  historialCardItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  historialCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historialOrdenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  mesaBadgePill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mesaBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
  },
  historialMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  historialMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historialOrdenSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  btnVerDesglosePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  btnVerDesglosePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },
  historialDesgloseExpandidoBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginVertical: 8,
  },
  historialDesgloseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
  },
  historialDesgloseTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  btnOcultarDesglosePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnOcultarDesglosePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  historialItemsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    marginVertical: 6,
    gap: 6,
  },
  historialItemCardBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginVertical: 3,
  },
  historialItemSolicitanteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: '#F0FDFA',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  historialItemSolicitanteText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  historialItemMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  historialItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historialItemNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  historialItemCosto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
    marginLeft: 8,
  },
  historialSubDetalleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  historialComentarioText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 2,
  },
  historialFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  metodoPagoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historialMetodoText: {
    fontSize: 11,
    fontWeight: '800',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  historialTotalMonto: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D9488',
  },
  detalleSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 12,
    marginTop: 2,
  },
  detalleComentarioText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 12,
    marginTop: 2,
  },

  /* Footer Actions */
  comandaFooterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btnImprimirTicket: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  btnImprimirTicketText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  btnCobrar: {
    flex: 1.2,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  btnCobrarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Cobro Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cobroModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D9488',
    marginTop: 2,
  },

  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modeToggleTextActive: {
    color: '#0D9488',
    fontWeight: '800',
  },

  listaSeparadosBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  listaSeparadosTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  itemSeparadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemSeparadoRowSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  itemSeparadoNombre: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSeparadoCosto: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
  },

  totalCobrarBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  totalCobrarLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  totalCobrarValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0D9488',
    marginTop: 2,
  },

  sectionSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  metodosPagoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  btnMetodoPago: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnMetodoPagoActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  btnMetodoPagoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  btnMetodoPagoTextActive: {
    color: '#FFFFFF',
  },

  inputPagaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  inputPagaField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  cambioBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  cambioLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  cambioValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  btnConfirmarCobroModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 12,
  },
  btnConfirmarCobroText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* GESTIÓN DE MENÚ STYLES */
  menuActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  btnMenuAccion: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  btnMenuAccionActive: {
    backgroundColor: '#0D9488',
    elevation: 2,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnMenuAccionInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnMenuAccionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  btnMenuAccionTextActive: {
    color: '#FFFFFF',
  },
  btnMenuAccionTextInactive: {
    color: '#475569',
  },
  btnNuevoAlimento: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  btnNuevoAlimentoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* VER MENÚ DEL DÍA (READ-ONLY) STYLES */
  menuDiaVerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuDiaVerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  btnBotonEntrarEditarMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnBotonEntrarEditarMenuText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  menuDiaVerListContainer: {
    gap: 10,
  },
  menuDiaVerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  menuDiaVerNombre: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuDiaVerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* EDITAR MENÚ DEL DÍA (SEARCH + AGREGAR + LIMPIAR) STYLES */
  searchAndCleanBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  searchBoxInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchBoxInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  btnLimpiarMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
  },
  btnLimpiarMenuText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },

  /* Sugerencias desplegables de búsqueda */
  sugerenciasBusquedaBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 12,
    marginBottom: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sugerenciasHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sugerenciasVacioText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  sugerenciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sugerenciaNombre: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  sugerenciaSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  btnAgregarComidaSugerencia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnAgregarComidaSugerenciaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Borrador de Comidas */
  borradorSectionContainer: {
    marginTop: 4,
  },
  borradorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  itemBorradorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemBorradorNombre: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemBorradorSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  btnQuitarAlimentoBorrador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnQuitarAlimentoBorradorText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },

  guardarCancelarMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  btnCancelarEdicionMenu: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 50,
    borderRadius: 14,
  },
  btnCancelarEdicionMenuText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  btnGuardarMenuDiaMain: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    height: 50,
    borderRadius: 14,
  },
  btnGuardarMenuDiaMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  catalogoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  btnNuevoAlimentoSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  btnNuevoAlimentoSmallText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  catFiltrosScroll: {
    flex: 1,
  },
  catFiltroChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  catFiltroChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  catFiltroText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  catFiltroTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* CATÁLOGO CARDS ESPACIOSOS Y SIN OVERFLOW */
  alimentosCatalogGrid: {
    gap: 10,
  },
  alimentoCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  alimentoCardInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  alimentoCardActionsCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  precioYEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alimentoItemNombre: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  alimentoItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  alimentoItemPrecio: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
  },
  btnIconEditAlimento: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  disponibleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  disponibleBadgeOk: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  disponibleBadgeOff: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  disponibleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  disponibleBadgeTextOk: {
    color: '#047857',
  },
  disponibleBadgeTextOff: {
    color: '#64748B',
  },

  /* CORTE DE CAJA STYLES */
  corteSinAbrirCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  corteSinAbrirTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  corteSinAbrirSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  btnAbrirCorteMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnAbrirCorteMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  corteActivoPillBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  corteActivoPillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  corteMetricasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricaCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  metricaValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  cajaEsperadaHighlightBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  cajaEsperadaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  cajaEsperadaMonto: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0D9488',
    marginVertical: 4,
  },
  cajaEsperadaSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
    textAlign: 'center',
  },
  corteAccionesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  btnIngresarDinero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnIngresarDineroText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnSacarDinero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnSacarDineroText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  movimientosDetalleBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 8,
  },
  movimientosDetalleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  movimientoRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  movimientoIngresoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  movimientoIngresoMonto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  movimientoEgresoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  movimientoEgresoMonto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  btnFinalizarCorteMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    height: 52,
    borderRadius: 14,
    marginBottom: 10,
  },
  metodoItemBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  metodoItemBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  btnFinalizarCorteMainText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* RESUMEN FINAL CIERRE MODAL */
  cierreResumenBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  cierreResumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cierreResumenLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  cierreResumenValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cierreResumenDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  cierreResumenTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  cierreResumenTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  cierreResumenTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0D9488',
  },
  btnConfirmarCierreFinalModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    height: 48,
    borderRadius: 12,
  },

  /* CRUD MODALS */
  crudModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  crudModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
  },
  opcionesFormRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  btnFormChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnFormChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  btnFormChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  btnFormChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  btnGuardarAlimentoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 12,
    marginTop: 10,
  },
  btnGuardarAlimentoText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
