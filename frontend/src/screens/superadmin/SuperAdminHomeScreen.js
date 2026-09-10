import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../../context/AuthContext';
import { API_URL } from '../../config/api';
import ModalTicketPreview from '../../components/ModalTicketPreview';

// Helper para limpiar sufijos de zonas (-cocina, -comal, -bar)
const limpiarZona = (str = '') => {
  if (!str) return '';
  return String(str).replace(/-(cocina|comal|barra|bar)$/i, '').trim();
};

export default function SuperAdminHomeScreen() {
  const { user, logout } = useContext(AuthContext);
  const { width = 1000 } = useWindowDimensions() || {};
  const isDesktop = Platform.OS === 'web' || width >= 768;

  // Modal Ticket Preview
  const [modalTicketVisible, setModalTicketVisible] = useState(false);
  const [ticketComandaSeleccionada, setTicketComandaSeleccionada] = useState(null);
  const [ticketOpcionesCobro, setTicketOpcionesCobro] = useState({});

  const abrirTicketModal = (ord, opciones = {}) => {
    setTicketComandaSeleccionada(ord);
    setTicketOpcionesCobro(opciones);
    setModalTicketVisible(true);
  };

  // Navegación por pestañas: 'dashboard' | 'cortes' | 'cuentas' | 'menu' | 'historial'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Estado global de carga y pull-to-refresh
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ==========================================
  // FILTROS DE FECHAS INDEPENDIENTES POR PESTAÑA
  // ==========================================
  // 1. Estadísticas (Dashboard)
  const [filtroPresetStats, setFiltroPresetStats] = useState('hoy');
  const [fechaDesdeStats, setFechaDesdeStats] = useState('');
  const [fechaHastaStats, setFechaHastaStats] = useState('');

  // 2. Cortes
  const [filtroPresetCortes, setFiltroPresetCortes] = useState('hoy');
  const [fechaDesdeCortes, setFechaDesdeCortes] = useState('');
  const [fechaHastaCortes, setFechaHastaCortes] = useState('');

  // 3. Historial de Ventas / Movimientos
  const [filtroPresetHistorial, setFiltroPresetHistorial] = useState('hoy');
  const [fechaDesdeHistorial, setFechaDesdeHistorial] = useState('');
  const [fechaHastaHistorial, setFechaHastaHistorial] = useState('');

  // ==========================================
  // ESTADOS DASHBOARD
  // ==========================================
  const [stats, setStats] = useState({
    total_comandas: 0,
    total_ventas: 0,
    total_efectivo: 0,
    total_tarjeta: 0,
    total_transferencia: 0,
    platillo_mas_vendido: { alimento: 'N/A', cantidad: 0, total: 0 },
    platillos_mas_vendidos: [],
    platillos_ranking: [],
    ventas_por_dia: [],
  });

  const [modalRankingVisible, setModalRankingVisible] = useState(false);
  const [categoriaFiltroRanking, setCategoriaFiltroRanking] = useState('Todos');
  const [filtroPresetRanking, setFiltroPresetRanking] = useState('hoy');
  const [fechaDesdeRanking, setFechaDesdeRanking] = useState('');
  const [fechaHastaRanking, setFechaHastaRanking] = useState('');
  const [rankingIndependiente, setRankingIndependiente] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  // ==========================================
  // ESTADOS CORTES
  // ==========================================
  const [cortesLista, setCortesLista] = useState([]);
  const [corteDetalleSeleccionado, setCorteDetalleSeleccionado] = useState(null);
  const [modalCorteDetalleVisible, setModalCorteDetalleVisible] = useState(false);

  // ==========================================
  // ESTADOS CUENTAS (USUARIOS)
  // ==========================================
  const [cuentasLista, setCuentasLista] = useState([]);
  const [modalCuentaVisible, setModalCuentaVisible] = useState(false);
  const [cuentaEditando, setCuentaEditando] = useState(null);
  const [formCuentaNombre, setFormCuentaNombre] = useState('');
  const [formCuentaPassword, setFormCuentaPassword] = useState('');
  const [formCuentaTipo, setFormCuentaTipo] = useState('mesero');
  const [formCuentaError, setFormCuentaError] = useState('');

  // ==========================================
  // ESTADOS MENÚ / ALIMENTOS Y MENÚ DEL DÍA
  // ==========================================
  const [catalogoAlimentos, setCatalogoAlimentos] = useState([]);
  const [vistaMenuModo, setVistaMenuModo] = useState('menu_dia_ver'); // 'menu_dia_ver' | 'menu_dia_editar' | 'catalogo'
  const [comidasSeleccionadasMenuDia, setComidasSeleccionadasMenuDia] = useState({});
  const [catFiltroMenu, setCatFiltroMenu] = useState('Todas');
  const [catFiltroMenuDia, setCatFiltroMenuDia] = useState('Todas'); // 'Todas' | 'Desayunos' | 'Comida' | 'Entradas' | 'Aguas' | 'Guarniciones' | 'Postres'
  const [busquedaMenuDia, setBusquedaMenuDia] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

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

  // Modal Crear/Editar Alimento
  const [alimentoModalVisible, setAlimentoModalVisible] = useState(false);
  const [alimentoEditando, setAlimentoEditando] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formTipo, setFormTipo] = useState('Comida');
  const [formPrecio, setFormPrecio] = useState('');
  const [formZona, setFormZona] = useState('cocina');
  const [formEstado, setFormEstado] = useState(true);
  const [formAplicaPaquete, setFormAplicaPaquete] = useState(true);
  const [formAplicaPaqueteAntojito, setFormAplicaPaqueteAntojito] = useState(true);
  const [formError, setFormError] = useState('');

  // ==========================================
  // ESTADOS HISTORIAL VENTAS POR DÍA
  // ==========================================
  const [historialVentas, setHistorialVentas] = useState([]);
  const [ordenesExpandidas, setOrdenesExpandidas] = useState({});

  const toggleExpandirOrden = (numOrden) => {
    setOrdenesExpandidas((prev) => ({
      ...prev,
      [numOrden]: !prev[numOrden],
    }));
  };

  // ==========================================
  // CALCULAR FECHAS SEGÚN PRESET (GENÉRICO & INDEPENDIENTE)
  // ==========================================
  const obtenerRangoFechasGeneric = useCallback((presetVal, desdeVal, hastaVal) => {
    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (presetVal === 'hoy') {
      const hoyStr = formatDate(today);
      return { desde: hoyStr, hasta: hoyStr };
    } else if (presetVal === 'ayer') {
      const dAyer = new Date(today);
      dAyer.setDate(today.getDate() - 1);
      const ayerStr = formatDate(dAyer);
      return { desde: ayerStr, hasta: ayerStr };
    } else if (presetVal === '7dias') {
      const d7 = new Date();
      d7.setDate(today.getDate() - 7);
      return { desde: formatDate(d7), hasta: formatDate(today) };
    } else if (presetVal === 'mes') {
      const dMes = new Date(today.getFullYear(), today.getMonth(), 1);
      return { desde: formatDate(dMes), hasta: formatDate(today) };
    } else if (presetVal === 'mes_anterior') {
      const dInicioMesAnt = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const dFinMesAnt = new Date(today.getFullYear(), today.getMonth(), 0);
      return { desde: formatDate(dInicioMesAnt), hasta: formatDate(dFinMesAnt) };
    } else if (presetVal === 'custom') {
      return { desde: desdeVal, hasta: hastaVal };
    }
    return { desde: '', hasta: '' }; // todos
  }, []);

  const obtenerRangoFechasStats = useCallback(() => {
    return obtenerRangoFechasGeneric(filtroPresetStats, fechaDesdeStats, fechaHastaStats);
  }, [obtenerRangoFechasGeneric, filtroPresetStats, fechaDesdeStats, fechaHastaStats]);

  const obtenerRangoFechasCortes = useCallback(() => {
    return obtenerRangoFechasGeneric(filtroPresetCortes, fechaDesdeCortes, fechaHastaCortes);
  }, [obtenerRangoFechasGeneric, filtroPresetCortes, fechaDesdeCortes, fechaHastaCortes]);

  const obtenerRangoFechasHistorial = useCallback(() => {
    return obtenerRangoFechasGeneric(filtroPresetHistorial, fechaDesdeHistorial, fechaHastaHistorial);
  }, [obtenerRangoFechasGeneric, filtroPresetHistorial, fechaDesdeHistorial, fechaHastaHistorial]);

  const obtenerRangoFechasRanking = useCallback(() => {
    return obtenerRangoFechasGeneric(filtroPresetRanking, fechaDesdeRanking, fechaHastaRanking);
  }, [obtenerRangoFechasGeneric, filtroPresetRanking, fechaDesdeRanking, fechaHastaRanking]);

  const cargarPlatillosRankingModal = useCallback(async () => {
    try {
      setLoadingRanking(true);
      const { desde, hasta } = obtenerRangoFechasRanking();
      let url = `${API_URL}/superadmin/dashboard-stats`;
      const params = [];
      if (desde) params.push(`desde=${desde}`);
      if (hasta) params.push(`hasta=${hasta}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setRankingIndependiente(data.platillos_ranking || data.platillos_mas_vendidos || []);
      }
    } catch (e) {
      console.log('Error cargando ranking modal independiente:', e.message);
    } finally {
      setLoadingRanking(false);
    }
  }, [obtenerRangoFechasRanking]);

  useEffect(() => {
    if (modalRankingVisible) {
      cargarPlatillosRankingModal();
    }
  }, [modalRankingVisible, filtroPresetRanking, cargarPlatillosRankingModal]);

  // ==========================================
  // CARGA DE DATOS SEGÚN PESTAÑA ACTIVA
  // ==========================================
  const cargarDashboardStats = useCallback(async () => {
    try {
      const { desde, hasta } = obtenerRangoFechasStats();
      let url = `${API_URL}/superadmin/dashboard-stats`;
      const params = [];
      if (desde) params.push(`desde=${desde}`);
      if (hasta) params.push(`hasta=${hasta}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (e) {
      console.log('Error cargando stats superadmin:', e.message);
    }
  }, [obtenerRangoFechasStats]);

  const cargarCortes = useCallback(async () => {
    try {
      const { desde, hasta } = obtenerRangoFechasCortes();
      let url = `${API_URL}/superadmin/cortes`;
      const params = [];
      if (desde) params.push(`desde=${desde}`);
      if (hasta) params.push(`hasta=${hasta}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setCortesLista(data.cortes || []);
      }
    } catch (e) {
      console.log('Error cargando cortes superadmin:', e.message);
    }
  }, [obtenerRangoFechasCortes]);

  const cargarCuentas = async () => {
    try {
      const res = await fetch(`${API_URL}/superadmin/cuentas`);
      const data = await res.json();
      if (res.ok) {
        setCuentasLista(data.cuentas || []);
      }
    } catch (e) {
      console.log('Error cargando cuentas:', e.message);
    }
  };

  const cargarCatalogoAlimentos = async () => {
    try {
      const res = await fetch(`${API_URL}/alimentos`);
      const data = await res.json();
      if (res.ok) {
        const list = data.alimentos || [];
        setCatalogoAlimentos(list);

        const initialMap = {};
        list.forEach((item) => {
          if (esTipoMenuDia(item.tipo) && Number(item.estado) === 1) {
            initialMap[item.id] = true;
          }
        });
        setComidasSeleccionadasMenuDia(initialMap);
      }
    } catch (e) {
      console.log('Error cargando catálogo alimentos:', e.message);
    }
  };

  const cargarHistorialVentas = useCallback(async () => {
    try {
      const { desde, hasta } = obtenerRangoFechasHistorial();
      let url = `${API_URL}/superadmin/historial-ventas`;
      const params = [];
      if (desde) params.push(`desde=${desde}`);
      if (hasta) params.push(`hasta=${hasta}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setHistorialVentas(data.items || []);
      }
    } catch (e) {
      console.log('Error cargando historial superadmin:', e.message);
    }
  }, [obtenerRangoFechasHistorial]);

  const cargarDatosPestana = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'dashboard') {
      await cargarDashboardStats();
    } else if (activeTab === 'cortes') {
      await cargarCortes();
    } else if (activeTab === 'cuentas') {
      await cargarCuentas();
    } else if (activeTab === 'menu') {
      await cargarCatalogoAlimentos();
    } else if (activeTab === 'historial') {
      await cargarHistorialVentas();
    }
    setLoading(false);
  }, [activeTab, cargarDashboardStats, cargarCortes, cargarHistorialVentas]);

  useEffect(() => {
    cargarDatosPestana();
  }, [cargarDatosPestana]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatosPestana();
    setRefreshing(false);
  };

  // Redirigir al Historial de Ventas filtrado por un día específico
  const irAHistorialPorDia = (fechaStr) => {
    setFechaDesdeHistorial(fechaStr);
    setFechaHastaHistorial(fechaStr);
    setFiltroPresetHistorial('custom');
    setActiveTab('historial');
  };

  // ==========================================
  // OPERACIONES GESTIÓN CUENTAS
  // ==========================================
  const abrirModalCrearCuenta = () => {
    setCuentaEditando(null);
    setFormCuentaNombre('');
    setFormCuentaPassword('');
    setFormCuentaTipo('mesero');
    setFormCuentaError('');
    setModalCuentaVisible(true);
  };

  const abrirModalEditarCuenta = (cuenta) => {
    setCuentaEditando(cuenta);
    setFormCuentaNombre(cuenta.nombre || '');
    setFormCuentaPassword('');
    setFormCuentaTipo(cuenta.tipo || 'mesero');
    setFormCuentaError('');
    setModalCuentaVisible(true);
  };

  const handleGuardarCuenta = async () => {
    const nombreInvalido = !formCuentaNombre.trim();
    const passwordInvalida = !cuentaEditando && !formCuentaPassword.trim();
    const tipoInvalido = !formCuentaTipo;

    if (nombreInvalido || passwordInvalida || tipoInvalido) {
      setFormCuentaError(true);
      return;
    }
    setFormCuentaError(false);

    try {
      if (cuentaEditando) {
        const payload = {
          nombre: formCuentaNombre.trim(),
          tipo: formCuentaTipo,
        };
        if (formCuentaPassword.trim()) {
          payload.contrasena = formCuentaPassword.trim();
        }

        const res = await fetch(`${API_URL}/superadmin/cuentas/${cuentaEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          Alert.alert('¡Cuenta Actualizada! ✅', 'Se modificaron los datos correctamente.');
          setModalCuentaVisible(false);
          cargarCuentas();
        } else {
          const d = await res.json();
          Alert.alert('Error', d.error || 'No se pudo actualizar la cuenta.');
        }
      } else {
        const res = await fetch(`${API_URL}/superadmin/cuentas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formCuentaNombre.trim(),
            contrasena: formCuentaPassword.trim(),
            tipo: formCuentaTipo,
          }),
        });
        if (res.ok) {
          Alert.alert('¡Cuenta Creada! 🚀', 'Se registró la nueva cuenta con éxito.');
          setModalCuentaVisible(false);
          cargarCuentas();
        } else {
          const d = await res.json();
          Alert.alert('Error', d.error || 'No se pudo crear la cuenta.');
        }
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  const toggleBloqueoCuenta = async (cuenta) => {
    const esMiPropiaCuenta = user && (
      Number(user.id) === Number(cuenta.id) || 
      user.nombre?.toLowerCase() === cuenta.nombre?.toLowerCase()
    );

    if (esMiPropiaCuenta) {
      Alert.alert('Acción no permitida 🛑', 'No puedes bloquear tu propia cuenta de SuperAdmin mientras estás usando el sistema.');
      return;
    }

    const nuevoBloqueo = !cuenta.bloqueo;
    try {
      const res = await fetch(`${API_URL}/superadmin/cuentas/${cuenta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloqueo: nuevoBloqueo }),
      });
      if (res.ok) {
        cargarCuentas();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'No se pudo cambiar el estado de la cuenta.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo cambiar el estado de la cuenta.');
    }
  };

  const handleEliminarCuenta = (cuenta) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar la cuenta "${cuenta.nombre}"? esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/superadmin/cuentas/${cuenta.id}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                Alert.alert('Eliminada', 'La cuenta ha sido eliminada.');
                cargarCuentas();
              }
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la cuenta.');
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // OPERACIONES GESTIÓN DE ALIMENTOS
  // ==========================================
  const abrirModalCrearAlimento = () => {
    setAlimentoEditando(null);
    setFormNombre('');
    setFormTipo('Comida');
    setFormPrecio('');
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
      zona: formZona,
      estado: formEstado ? 1 : 0,
      aplica_paquete: formAplicaPaquete ? 1 : 0,
      aplica_paquete_antojito: formAplicaPaqueteAntojito ? 1 : 0,
    };

    try {
      if (alimentoEditando) {
        const res = await fetch(`${API_URL}/alimentos/${alimentoEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          Alert.alert('Actualizado', 'El alimento ha sido modificado.');
          setAlimentoModalVisible(false);
          cargarCatalogoAlimentos();
        }
      } else {
        const res = await fetch(`${API_URL}/alimentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          Alert.alert('Creado', 'El nuevo alimento se ha agregado al catálogo.');
          setAlimentoModalVisible(false);
          cargarCatalogoAlimentos();
        }
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el alimento.');
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
    const idsDisponibles = Object.keys(comidasSeleccionadasMenuDia)
      .filter((id) => comidasSeleccionadasMenuDia[id])
      .map(Number);

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



  // Agrupar ventas por fecha y orden en Historial
  const agruparHistorialPorOrden = (itemsList) => {
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

    Object.values(map).forEach((ord) => {
      const metodosSet = new Set(
        ord.items.map((it) => (it.metodo_pago || 'efectivo').toLowerCase().trim())
      );
      if (metodosSet.size > 1) {
        ord.esPagoMixto = true;
        ord.metodo_pago = 'MIXTO';
      } else {
        ord.esPagoMixto = false;
        const primerMetodo = ord.items[0]?.metodo_pago || ord.metodo_pago || 'efectivo';
        ord.metodo_pago = primerMetodo;
      }
    });

    return Object.values(map);
  };

  const ordenesHistorialSuperadmin = agruparHistorialPorOrden(historialVentas);

  // ==========================================
  // RENDER COMPONENTES Y VISTAS
  // ==========================================
  const renderFiltrosFechaBarGeneric = (presetVal, setPresetVal, desdeVal, setDesdeVal, hastaVal, setHastaVal, onAplicarCustom) => {
    const { desde, hasta } = obtenerRangoFechasGeneric(presetVal, desdeVal, hastaVal);

    return (
      <View style={styles.filtrosFechaBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="calendar-outline" size={16} color="#0D9488" />
            <Text style={styles.filtrosFechaLabel}>Filtrar por Período / Fechas:</Text>
          </View>

          {desde || hasta ? (
            <View style={styles.rangoBadgePill}>
              <Ionicons name="filter" size={11} color="#0F766E" style={{ marginRight: 4 }} />
              <Text style={styles.rangoBadgePillText}>
                Rango: {desde || 'Inicio'} ➔ {hasta || 'Hoy'}
              </Text>
            </View>
          ) : (
            <View style={styles.rangoBadgePill}>
              <Text style={styles.rangoBadgePillText}>Mostrando: Histórico Completo</Text>
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          <TouchableOpacity
            style={[styles.presetChip, presetVal === 'todos' && styles.presetChipActive]}
            onPress={() => setPresetVal('todos')}
          >
            <Text style={[styles.presetChipText, presetVal === 'todos' && styles.presetChipTextActive]}>Todos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, presetVal === 'hoy' && styles.presetChipActive]}
            onPress={() => setPresetVal('hoy')}
          >
            <Text style={[styles.presetChipText, presetVal === 'hoy' && styles.presetChipTextActive]}>Hoy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, presetVal === 'ayer' && styles.presetChipActive]}
            onPress={() => setPresetVal('ayer')}
          >
            <Text style={[styles.presetChipText, presetVal === 'ayer' && styles.presetChipTextActive]}>Ayer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, presetVal === '7dias' && styles.presetChipActive]}
            onPress={() => setPresetVal('7dias')}
          >
            <Text style={[styles.presetChipText, presetVal === '7dias' && styles.presetChipTextActive]}>Últimos 7 días</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, presetVal === 'mes' && styles.presetChipActive]}
            onPress={() => setPresetVal('mes')}
          >
            <Text style={[styles.presetChipText, presetVal === 'mes' && styles.presetChipTextActive]}>Este mes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, presetVal === 'mes_anterior' && styles.presetChipActive]}
            onPress={() => setPresetVal('mes_anterior')}
          >
            <Text style={[styles.presetChipText, presetVal === 'mes_anterior' && styles.presetChipTextActive]}>Mes anterior</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, presetVal === 'custom' && styles.presetChipActive]}
            onPress={() => {
              if (!desdeVal || !hastaVal) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;
                const dMes = new Date(today.getFullYear(), today.getMonth(), 1);
                const dMesStr = `${dMes.getFullYear()}-${String(dMes.getMonth() + 1).padStart(2, '0')}-01`;
                setDesdeVal(dMesStr);
                setHastaVal(todayStr);
              }
              setPresetVal('custom');
            }}
          >
            <Ionicons name="options-outline" size={13} color={presetVal === 'custom' ? '#FFFFFF' : '#475569'} style={{ marginRight: 4 }} />
            <Text style={[styles.presetChipText, presetVal === 'custom' && styles.presetChipTextActive]}>Rango Personalizado</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* PANEL DE SELECCIÓN DE RANGO DE FECHAS PERSONALIZADO */}
        {presetVal === 'custom' && (
          <View style={styles.customDateBox}>
            <Text style={styles.customDateTitle}>Seleccionar Rango de Fechas Específico:</Text>
            <View style={styles.customDateInputsRow}>
              <View style={styles.customDateCol}>
                <Text style={styles.customDateLabel}>Fecha Inicial (Desde):</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={desdeVal}
                    onChange={(e) => setDesdeVal(e.target.value)}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0F172A',
                      outline: 'none',
                      height: '38px',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <TextInput
                    style={styles.customDateInput}
                    placeholder="YYYY-MM-DD"
                    value={desdeVal}
                    onChangeText={setDesdeVal}
                  />
                )}
              </View>

              <View style={styles.customDateCol}>
                <Text style={styles.customDateLabel}>Fecha Final (Hasta):</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={hastaVal}
                    onChange={(e) => setHastaVal(e.target.value)}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0F172A',
                      outline: 'none',
                      height: '38px',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <TextInput
                    style={styles.customDateInput}
                    placeholder="YYYY-MM-DD"
                    value={hastaVal}
                    onChangeText={setHastaVal}
                  />
                )}
              </View>

              <TouchableOpacity
                style={styles.btnAplicarFechaCustom}
                onPress={() => onAplicarCustom && onAplicarCustom()}
                activeOpacity={0.8}
              >
                <Ionicons name="search" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.btnAplicarFechaCustomText}>Aplicar Filtro</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // VISTA 1: DASHBOARD
  const renderDashboardTab = () => (
    <ScrollView
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Estadísticas Generales</Text>
          <Text style={styles.sectionSub}>Estadísticas globales de venta y rendimiento financiero</Text>
        </View>
      </View>

      {renderFiltrosFechaBarGeneric(
        filtroPresetStats,
        setFiltroPresetStats,
        fechaDesdeStats,
        setFechaDesdeStats,
        fechaHastaStats,
        setFechaHastaStats,
        cargarDashboardStats
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 40 }} />
      ) : (
        <View>
          {/* TARJETAS DE MÉTRICAS */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCardBig}>
              <Ionicons name="cash-outline" size={28} color="#0D9488" />
              <Text style={styles.metricBigLabel}>Ventas Totales</Text>
              <Text style={styles.metricBigValue}>${stats.total_ventas}.00</Text>
              <Text style={styles.metricSubInfo}>{stats.total_comandas} comandas cobradas</Text>
            </View>

            <View style={styles.metricRowGrid}>
              <View style={styles.metricCardMini}>
                <Text style={styles.metricMiniLabel}>💵 Efectivo</Text>
                <Text style={[styles.metricMiniValue, { color: '#059669' }]}>${stats.total_efectivo}.00</Text>
              </View>

              <View style={styles.metricCardMini}>
                <Text style={styles.metricMiniLabel}>💳 Tarjeta</Text>
                <Text style={[styles.metricMiniValue, { color: '#2563EB' }]}>${stats.total_tarjeta}.00</Text>
              </View>

              <View style={styles.metricCardMini}>
                <Text style={styles.metricMiniLabel}>📲 Transferencia</Text>
                <Text style={[styles.metricMiniValue, { color: '#9333EA' }]}>${stats.total_transferencia}.00</Text>
              </View>
            </View>
          </View>

          {/* TARJETA PLATILLOS MÁS VENDIDOS (TOP 5) CLICKABLE */}
          <TouchableOpacity
            style={styles.platilloMasVendidoCard}
            onPress={() => setModalRankingVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.platilloHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trophy" size={24} color="#D97706" />
                <View>
                  <Text style={styles.platilloTitle}>Platillos Más Vendidos</Text>
                  <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }}>Top 5 de lo más pedido</Text>
                </View>
              </View>

              <View style={styles.btnVerRankingPill}>
                <Text style={styles.btnVerRankingPillText}>Ver Ranking Completo ➔</Text>
              </View>
            </View>

            <View style={styles.top5ListContainer}>
              {(!stats.platillos_mas_vendidos || stats.platillos_mas_vendidos.length === 0) ? (
                <Text style={styles.top5VacioText}>No se han registrado ventas en este período.</Text>
              ) : (
                stats.platillos_mas_vendidos.map((item, index) => {
                  const medalColors = ['#D97706', '#475569', '#B45309', '#0D9488', '#0D9488'];
                  const rankLabels = ['#1', '#2', '#3', '#4', '#5'];

                  return (
                    <View key={item.alimento || index} style={styles.top5RowItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 8 }}>
                        <View style={[styles.rankBadgePill, { backgroundColor: index === 0 ? '#FEF3C7' : '#F1F5F9' }]}>
                          <Text style={[styles.rankBadgePillText, { color: medalColors[index] || '#475569' }]}>
                            {rankLabels[index] || `#${index + 1}`}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.top5NombreText} numberOfLines={1}>
                            {limpiarZona(item.alimento)}
                          </Text>
                          {item.tipo && item.tipo !== 'Otro' && (
                            <Text style={styles.top5TipoSubText}>{item.tipo}</Text>
                          )}
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={styles.platilloBadge}>
                          <Text style={styles.platilloBadgeText}>{item.cantidad} vendidos</Text>
                        </View>
                        <Text style={styles.top5TotalText}>${Number(item.total || 0).toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </TouchableOpacity>

          {/* DESGLOSE VENTAS POR DÍA */}
          <View style={styles.ventasPorDiaSection}>
            <Text style={styles.ventasPorDiaTitle}>Ventas por Día:</Text>

            {stats.ventas_por_dia.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No hay ventas en este período</Text>
              </View>
            ) : (
              stats.ventas_por_dia.map((item) => (
                <TouchableOpacity
                  key={item.fecha}
                  style={styles.diaRowCard}
                  onPress={() => irAHistorialPorDia(item.fecha)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.diaFechaText}>📅 {item.fecha}</Text>
                      <View style={styles.btnVerHistorialDiaPill}>
                        <Text style={styles.btnVerHistorialDiaPillText}>Ver Historial ➔</Text>
                      </View>
                    </View>
                    <Text style={styles.diaSubText}>
                      Efectivo: ${item.efectivo} • Tarjeta: ${item.tarjeta} • Transf: ${item.transferencia}
                    </Text>
                  </View>
                  <Text style={styles.diaMontoTotal}>${item.total}.00</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );

  // VISTA 2: CORTES
  const renderCortesTab = () => (
    <ScrollView
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Historial de Cortes de Caja</Text>
          <Text style={styles.sectionSub}>Auditoría global de turnos y arqueos realizados</Text>
        </View>
      </View>

      {renderFiltrosFechaBarGeneric(
        filtroPresetCortes,
        setFiltroPresetCortes,
        fechaDesdeCortes,
        setFechaDesdeCortes,
        fechaHastaCortes,
        setFechaHastaCortes,
        cargarCortes
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 40 }} />
      ) : cortesLista.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="wallet-outline" size={54} color="#CBD5E1" style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No hay cortes de caja registrados en estas fechas</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {cortesLista.map((corte) => {
            const esActivo = !corte.hora_fin;
            return (
              <View key={corte.id} style={styles.corteCardItem}>
                <View style={styles.corteCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.corteCardTitle}>Corte #{corte.id} - Admin: {corte.cuenta_nombre || 'Desconocido'}</Text>
                    <Text style={styles.corteCardSub}>
                      Inicio: {new Date(corte.hora_inicio).toLocaleString()}
                    </Text>
                    {corte.hora_fin && (
                      <Text style={styles.corteCardSub}>
                        Cierre: {new Date(corte.hora_fin).toLocaleString()}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.corteStateBadge, esActivo ? styles.corteStateBadgeActive : styles.corteStateBadgeClosed]}>
                    <Text style={[styles.corteStateBadgeText, esActivo ? styles.corteStateBadgeTextActive : styles.corteStateBadgeTextClosed]}>
                      {esActivo ? '🟢 EN CURSO' : '🔒 CERRADO'}
                    </Text>
                  </View>
                </View>

                <View style={styles.corteMetricasRow}>
                  <View style={styles.corteMetricaItem}>
                    <Text style={styles.corteMetricaLabel}>Inicial</Text>
                    <Text style={styles.corteMetricaValue}>${Number(corte.dinero_inicial || 0).toFixed(2)}</Text>
                  </View>

                  <View style={styles.corteMetricaItem}>
                    <Text style={styles.corteMetricaLabel}>Ventas Totales</Text>
                    <Text style={[styles.corteMetricaValue, { color: '#0D9488' }]}>${Number(corte.total_ventas || 0).toFixed(2)}</Text>
                  </View>

                  {Number(corte.total_ingresos || 0) > 0 ? (
                    <View style={styles.corteMetricaItem}>
                      <Text style={styles.corteMetricaLabel}>Ingresos</Text>
                      <Text style={[styles.corteMetricaValue, { color: '#059669' }]}>+${Number(corte.total_ingresos).toFixed(2)}</Text>
                    </View>
                  ) : null}

                  {Number(corte.total_egresos || 0) > 0 ? (
                    <View style={styles.corteMetricaItem}>
                      <Text style={styles.corteMetricaLabel}>Egresos</Text>
                      <Text style={[styles.corteMetricaValue, { color: '#DC2626' }]}>-${Number(corte.total_egresos).toFixed(2)}</Text>
                    </View>
                  ) : null}

                  <View style={styles.corteMetricaItem}>
                    <Text style={styles.corteMetricaLabel}>En Caja Física</Text>
                    <Text style={[styles.corteMetricaValue, { color: '#0D9488', fontWeight: '800' }]}>${Number(corte.caja_esperada || 0).toFixed(2)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.btnVerDetalleCorte}
                  onPress={() => {
                    setCorteDetalleSeleccionado(corte);
                    setModalCorteDetalleVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={16} color="#0D9488" style={{ marginRight: 6 }} />
                  <Text style={styles.btnVerDetalleCorteText}>Ver Desglose Completo</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  // VISTA 3: CUENTAS (GESTIÓN DE USUARIOS)
  const renderCuentasTab = () => (
    <ScrollView
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
    >
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={styles.sectionTitle}>Gestión de Cuentas</Text>
          <Text style={styles.sectionSub}>Administrar usuarios, roles y permisos del sistema</Text>
        </View>

        <TouchableOpacity
          style={styles.btnCrearCuentaTop}
          onPress={abrirModalCrearCuenta}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.btnCrearCuentaTopText}>+ Crear Cuenta</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 40 }} />
      ) : cuentasLista.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={54} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No hay cuentas registradas</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {cuentasLista.map((item) => {
            const estaBloqueado = Boolean(item.bloqueo);
            const esMiPropiaCuenta = user && (
              Number(user.id) === Number(item.id) || 
              user.nombre?.toLowerCase() === item.nombre?.toLowerCase()
            );

            const getRolColor = (t) => {
              switch (t?.toLowerCase()) {
                case 'superadmin': return '#0D9488';
                case 'admin': return '#2563EB';
                case 'mesero': return '#EA580C';
                case 'barra': return '#0D9488';
                case 'cocina': return '#DC2626';
                case 'comal': return '#D97706';
                default: return '#64748B';
              }
            };
            const roleColor = getRolColor(item.tipo);

            return (
              <View key={item.id} style={styles.cuentaCardItem}>
                {/* FILA SUPERIOR: NOMBRE, ROL Y ESTADO (SIN ID) */}
                <View style={styles.cuentaHeaderRow}>
                  <View style={styles.cuentaUserRow}>
                    <Ionicons name="person-circle-outline" size={32} color="#0D9488" style={{ marginRight: 8 }} />
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cuentaNombreText}>{item.nombre}</Text>
                        {esMiPropiaCuenta && (
                          <View style={{ backgroundColor: '#CCFBF1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#0F766E' }}>En uso (Tú)</Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <View style={[styles.cuentaRolPill, { backgroundColor: roleColor + '20' }]}>
                          <Text style={[styles.cuentaRolPillText, { color: roleColor }]}>{item.tipo?.toUpperCase()}</Text>
                        </View>

                        <View style={[styles.cuentaEstadoPill, estaBloqueado ? styles.cuentaEstadoPillBloqueado : styles.cuentaEstadoPillActivo]}>
                          <Text style={[styles.cuentaEstadoPillText, estaBloqueado ? styles.cuentaEstadoTextBloqueado : styles.cuentaEstadoTextActivo]}>
                            {estaBloqueado ? '🔴 Bloqueado' : '🟢 Activo'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* SEPARADOR DE CORTE */}
                <View style={styles.cuentaCardDivider} />

                {/* FILA INFERIOR DE ACCIONES: BOTONES ESPACIOSOS Y SIN AMONTONAR */}
                <View style={styles.cuentaCardActionsRow}>
                  <TouchableOpacity
                    style={styles.btnEditarCuentaCard}
                    onPress={() => abrirModalEditarCuenta(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={15} color="#0F766E" style={{ marginRight: 4 }} />
                    <Text style={styles.btnEditarCuentaCardText}>Editar cuenta</Text>
                  </TouchableOpacity>

                  {!esMiPropiaCuenta && (
                    <TouchableOpacity
                      style={[styles.btnBloquearCuentaCard, estaBloqueado && styles.btnBloquearCuentaCardActive]}
                      onPress={() => toggleBloqueoCuenta(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={estaBloqueado ? 'lock-closed' : 'lock-open-outline'}
                        size={15}
                        color={estaBloqueado ? '#DC2626' : '#475569'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.btnBloquearCuentaCardText, estaBloqueado && styles.btnBloquearCuentaCardTextActive]}>
                        {estaBloqueado ? 'Desbloquear' : 'Bloquear'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  // VISTA 4: MENÚ (EDITAR ALIMENTOS Y MENÚ DEL DÍA)
  const renderMenuTab = () => {
    const todosAlimentosMenuDia = catalogoAlimentos.filter((a) => esTipoMenuDia(a.tipo));
    const comidasActivasDelDia = todosAlimentosMenuDia
      .filter((c) => Number(c.estado) === 1)
      .filter((c) => perteneceACategoriaMenuDia(c, catFiltroMenuDia));

    const comidasBorrador = todosAlimentosMenuDia
      .filter((c) => comidasSeleccionadasMenuDia[c.id])
      .filter((c) => perteneceACategoriaMenuDia(c, catFiltroMenuDia));

    const coicidenciasBusqueda = todosAlimentosMenuDia.filter((c) => {
      if (comidasSeleccionadasMenuDia[c.id]) return false;
      if (!perteneceACategoriaMenuDia(c, catFiltroMenuDia)) return false;
      const coincideNombre = busquedaMenuDia.trim().length === 0 || 
        c.nombre.toLowerCase().includes(busquedaMenuDia.trim().toLowerCase());
      return coincideNombre;
    });

    const alimentosFiltradosCat = catalogoAlimentos.filter((a) => {
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

            {loading && !refreshing ? (
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
                <Text style={styles.btnLimpiarMenuText}>Limpiar Menú</Text>
              </TouchableOpacity>
            </View>

            {(searchFocused || busquedaMenuDia.trim().length > 0) && (
              coicidenciasBusqueda.length > 0 ? (
                <View style={styles.sugerenciasBusquedaBox}>
                  <Text style={styles.sugerenciasHeaderTitle}>
                    {busquedaMenuDia.trim().length === 0
                      ? `Platillos de ${catFiltroMenuDia === 'Todas' ? 'Menú del Día' : catFiltroMenuDia} disponibles:`
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
                  <Text style={styles.btnGuardarMenuDiaMainText}>Guardar Menú del Día</Text>
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
                {['Todas', 'Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada'].map((cat) => (
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

              <TouchableOpacity
                style={styles.btnNuevoAlimentoSmall}
                onPress={abrirModalCrearAlimento}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.btnNuevoAlimentoSmallText}>+ Nuevo Alimento</Text>
              </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
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
                        <View style={[styles.disponibleBadge, estaDisponible ? styles.disponibleBadgeOk : styles.disponibleBadgeOff]}>
                          <Text style={[styles.disponibleBadgeText, estaDisponible ? styles.disponibleBadgeTextOk : styles.disponibleBadgeTextOff]}>
                            {estaDisponible ? 'Disponible' : 'No Disp.'}
                          </Text>
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

  // VISTA 5: HISTORIAL VENTAS POR DÍA
  const renderHistorialTab = () => {
    const totalVentasMonto = ordenesHistorialSuperadmin.reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
    const totalComandasCount = ordenesHistorialSuperadmin.length;
    const ticketPromedio = totalComandasCount > 0 ? (totalVentasMonto / totalComandasCount) : 0;

    return (
      <ScrollView
        contentContainerStyle={styles.tabContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Historial de Ventas Globales</Text>
            <Text style={styles.sectionSub}>Consultar historial detallado de comandas y métricas por período</Text>
          </View>
        </View>

        {/* Tarjetas KPI de Resumen */}
        <View style={styles.kpiRowContainer}>
          <View style={[styles.kpiCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <View style={styles.kpiHeaderRow}>
              <Text style={styles.kpiLabel}>Ventas Totales</Text>
              <View style={[styles.kpiIconBadge, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="cash-outline" size={16} color="#059669" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#047857' }]}>
              ${totalVentasMonto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <View style={styles.kpiHeaderRow}>
              <Text style={styles.kpiLabel}>Comandas</Text>
              <View style={[styles.kpiIconBadge, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="receipt-outline" size={16} color="#2563EB" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#1D4ED8' }]}>{totalComandasCount}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }]}>
            <View style={styles.kpiHeaderRow}>
              <Text style={styles.kpiLabel}>Ticket Prom.</Text>
              <View style={[styles.kpiIconBadge, { backgroundColor: '#CCFBF1' }]}>
                <Ionicons name="trending-up-outline" size={16} color="#0D9488" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#0F766E' }]}>
              ${ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {renderFiltrosFechaBarGeneric(
          filtroPresetHistorial,
          setFiltroPresetHistorial,
          fechaDesdeHistorial,
          setFechaDesdeHistorial,
          fechaHastaHistorial,
          setFechaHastaHistorial,
          cargarHistorialVentas
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 40 }} />
        ) : ordenesHistorialSuperadmin.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="time-outline" size={54} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No hay ventas cobradas en este período</Text>
            <Text style={styles.emptySub}>Selecciona otro filtro de fecha para consultar el historial.</Text>
          </View>
        ) : (
          <View style={isDesktop ? styles.historialGridDesktop : styles.historialGridMobile}>
            {ordenesHistorialSuperadmin.map((ord) => {
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
                          <Text style={styles.mesaBadgePillText}>Mesa #{ord.num_mesa}</Text>
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

                    {/* VISTA SIMPLIFICADA (CUANDO NO ESTÁ EXPANDIDO) */}
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
                      /* VISTA DETALLADA EXPANDIDA (CUANDO SÍ ESTÁ EXPANDIDO) */
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
                    <Text style={styles.btnImprimirTicketText}>Imprimir Ticket</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  const navItems = [
    { key: 'dashboard', label: 'Estadísticas', iconActive: 'stats-chart', iconInactive: 'stats-chart-outline' },
    { key: 'cortes', label: 'Cortes', iconActive: 'wallet', iconInactive: 'wallet-outline' },
    { key: 'cuentas', label: 'Cuentas', iconActive: 'people', iconInactive: 'people-outline' },
    { key: 'menu', label: 'Menú', iconActive: 'fast-food', iconInactive: 'fast-food-outline' },
    { key: 'historial', label: 'Historial', iconActive: 'time', iconInactive: 'time-outline' },
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
                <Text style={styles.userNameText}>{user?.nombre || 'SuperAdmin'}</Text>
                <Text style={styles.userRoleText}>🔑 SuperAdmin</Text>
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

          {/* CONTENIDO PRINCIPAL A LA DERECHA */}
          <View style={styles.desktopContentArea}>
            {activeTab === 'dashboard'
              ? renderDashboardTab()
              : activeTab === 'cortes'
              ? renderCortesTab()
              : activeTab === 'cuentas'
              ? renderCuentasTab()
              : activeTab === 'menu'
              ? renderMenuTab()
              : renderHistorialTab()}
          </View>
        </View>
      ) : (
        <>
          {/* HEADER SUPERIOR UNIFICADO CON LOGO Y USUARIO (SOLO MÓVIL) */}
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
                <Text style={styles.userNameText}>{user?.nombre || 'SuperAdmin'}</Text>
                <Text style={styles.userRoleText}>🔑 Panel de SuperAdmin</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color="#0D9488" />
            </TouchableOpacity>
          </View>

          {/* VISTA PRINCIPAL */}
          <View style={{ flex: 1 }}>
            {activeTab === 'dashboard'
              ? renderDashboardTab()
              : activeTab === 'cortes'
              ? renderCortesTab()
              : activeTab === 'cuentas'
              ? renderCuentasTab()
              : activeTab === 'menu'
              ? renderMenuTab()
              : renderHistorialTab()}
          </View>

          {/* BARRA NAVEGACIÓN INFERIOR (SOLO MÓVIL) */}
          <View style={styles.footerNavBar}>
            <TouchableOpacity
              style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
              onPress={() => setActiveTab('dashboard')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeTab === 'dashboard' ? 'stats-chart' : 'stats-chart-outline'}
                size={20}
                color={activeTab === 'dashboard' ? '#0D9488' : '#64748B'}
              />
              <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>Estadísticas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, activeTab === 'cortes' && styles.navItemActive]}
              onPress={() => setActiveTab('cortes')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeTab === 'cortes' ? 'wallet' : 'wallet-outline'}
                size={20}
                color={activeTab === 'cortes' ? '#0D9488' : '#64748B'}
              />
              <Text style={[styles.navLabel, activeTab === 'cortes' && styles.navLabelActive]}>Cortes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, activeTab === 'cuentas' && styles.navItemActive]}
              onPress={() => setActiveTab('cuentas')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeTab === 'cuentas' ? 'people' : 'people-outline'}
                size={20}
                color={activeTab === 'cuentas' ? '#0D9488' : '#64748B'}
              />
              <Text style={[styles.navLabel, activeTab === 'cuentas' && styles.navLabelActive]}>Cuentas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navItem, activeTab === 'menu' && styles.navItemActive]}
              onPress={() => setActiveTab('menu')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={activeTab === 'menu' ? 'fast-food' : 'fast-food-outline'}
                size={20}
                color={activeTab === 'menu' ? '#0D9488' : '#64748B'}
              />
              <Text style={[styles.navLabel, activeTab === 'menu' && styles.navLabelActive]}>Menú</Text>
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
              <Text style={[styles.navLabel, activeTab === 'historial' && styles.navLabelActive]}>Historial</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* MODAL CREAR / EDITAR CUENTA */}
      <Modal visible={modalCuentaVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{cuentaEditando ? '✏️ Editar Cuenta' : '👤 Crear Nueva Cuenta'}</Text>
              <TouchableOpacity onPress={() => setModalCuentaVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre de Usuario: *</Text>
            <TextInput
              style={[
                styles.inputField,
                formCuentaError && !formCuentaNombre.trim() && { borderColor: '#EF4444', borderWidth: 2, backgroundColor: '#FEF2F2' }
              ]}
              placeholder="Ej. mesero1, admin"
              placeholderTextColor="#94A3B8"
              value={formCuentaNombre}
              onChangeText={(val) => { setFormCuentaNombre(val); if (formCuentaError) setFormCuentaError(false); }}
            />
            {formCuentaError && !formCuentaNombre.trim() && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2, marginBottom: 8, fontWeight: '600' }}>
                * El nombre de usuario es obligatorio
              </Text>
            )}

            <Text style={styles.inputLabel}>Contraseña {cuentaEditando ? '(Opcional se deja intacta si está vacío)' : '*:'}</Text>
            <TextInput
              style={[
                styles.inputField,
                formCuentaError && !cuentaEditando && !formCuentaPassword.trim() && { borderColor: '#EF4444', borderWidth: 2, backgroundColor: '#FEF2F2' }
              ]}
              placeholder="Contraseña del usuario"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={formCuentaPassword}
              onChangeText={(val) => { setFormCuentaPassword(val); if (formCuentaError) setFormCuentaError(false); }}
            />
            {formCuentaError && !cuentaEditando && !formCuentaPassword.trim() && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2, marginBottom: 8, fontWeight: '600' }}>
                * La contraseña es obligatoria para nuevas cuentas
              </Text>
            )}

            <Text style={styles.inputLabel}>Tipo de Cuenta / Rol:</Text>
            <View style={styles.tipoRolesGrid}>
              {['mesero', 'admin', 'barra', 'cocina', 'comal', 'superadmin'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rolOptionChip, formCuentaTipo === r && styles.rolOptionChipActive]}
                  onPress={() => setFormCuentaTipo(r)}
                >
                  <Text style={[styles.rolOptionText, formCuentaTipo === r && styles.rolOptionTextActive]}>
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.btnSubmitModal} onPress={handleGuardarCuenta} activeOpacity={0.85}>
              <Text style={styles.btnSubmitModalText}>{cuentaEditando ? 'Guardar Cambios' : 'Crear Cuenta'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR / EDITAR ALIMENTO */}
      <Modal visible={alimentoModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{alimentoEditando ? '✏️ Editar Alimento' : '🍱 Nuevo Alimento'}</Text>
              <TouchableOpacity onPress={() => setAlimentoModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre del Alimento: *</Text>
            <TextInput
              style={[
                styles.inputField,
                formError && !formNombre.trim() && { borderColor: '#EF4444', borderWidth: 2, backgroundColor: '#FEF2F2' }
              ]}
              placeholder="Ej. Tacos de Asada"
              placeholderTextColor="#94A3B8"
              value={formNombre}
              onChangeText={(val) => { setFormNombre(val); if (formError) setFormError(false); }}
            />
            {formError && !formNombre.trim() && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2, marginBottom: 8, fontWeight: '600' }}>
                * El nombre del alimento es obligatorio
              </Text>
            )}

            <Text style={styles.inputLabel}>Categoría:</Text>
            <View style={styles.tipoRolesGrid}>
              {['Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada', 'Litros', 'Postre', 'Torta', 'Extra'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.rolOptionChip, formTipo === cat && styles.rolOptionChipActive]}
                  onPress={() => setFormTipo(cat)}
                >
                  <Text style={[styles.rolOptionText, formTipo === cat && styles.rolOptionTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Precio ($): *</Text>
            <TextInput
              style={[
                styles.inputField,
                formError && (!formPrecio.trim() || isNaN(Number(formPrecio)) || Number(formPrecio) < 0) && { borderColor: '#EF4444', borderWidth: 2, backgroundColor: '#FEF2F2' }
              ]}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={formPrecio}
              onChangeText={(val) => { setFormPrecio(val); if (formError) setFormError(false); }}
            />
            {formError && (!formPrecio.trim() || isNaN(Number(formPrecio)) || Number(formPrecio) < 0) && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2, marginBottom: 8, fontWeight: '600' }}>
                * El precio es obligatorio (número válido ≥ 0)
              </Text>
            )}

            <Text style={styles.inputLabel}>Zona de Preparación:</Text>
            <View style={styles.tipoRolesGrid}>
              {['cocina', 'comal', 'barra'].map((z) => (
                <TouchableOpacity
                  key={z}
                  style={[styles.rolOptionChip, formZona === z && styles.rolOptionChipActive]}
                  onPress={() => setFormZona(z)}
                >
                  <Text style={[styles.rolOptionText, formZona === z && styles.rolOptionTextActive]}>{z.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {((formTipo || '').toLowerCase().includes('bebida') || (formTipo || '').toLowerCase().includes('litro')) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: 10, backgroundColor: '#F0FDFA', borderRadius: 8, borderWidth: 1, borderColor: '#CCFBF1' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 13, color: '#0F766E', fontWeight: '700' }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: 10, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 13, color: '#B45309', fontWeight: '700' }}>
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

            <TouchableOpacity style={styles.btnSubmitModal} onPress={handleGuardarAlimento} activeOpacity={0.85}>
              <Text style={styles.btnSubmitModalText}>{alimentoEditando ? 'Guardar Cambios' : 'Crear Alimento'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DETALLE CORTE DE CAJA */}
      <Modal visible={modalCorteDetalleVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 650, width: '100%', maxHeight: '90%', alignSelf: 'center' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={styles.modalTitle}>📊 Desglose de Corte #{corteDetalleSeleccionado?.id}</Text>
                  <View style={[
                    styles.corteStateBadge,
                    !corteDetalleSeleccionado?.hora_fin ? styles.corteStateBadgeActive : styles.corteStateBadgeClosed
                  ]}>
                    <Text style={[
                      styles.corteStateBadgeText,
                      !corteDetalleSeleccionado?.hora_fin ? styles.corteStateBadgeTextActive : styles.corteStateBadgeTextClosed
                    ]}>
                      {!corteDetalleSeleccionado?.hora_fin ? '🟢 EN CURSO' : '🔒 CERRADO'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Responsable: {corteDetalleSeleccionado?.cuenta_nombre || 'Administrador'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalCorteDetalleVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            {corteDetalleSeleccionado && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 10 }}>
                {/* Fechas de Inicio y Cierre */}
                <View style={styles.corteFechasBox}>
                  <View style={styles.corteFechaItem}>
                    <Ionicons name="play-circle-outline" size={16} color="#0D9488" />
                    <Text style={styles.corteFechaText}>
                      Apertura: {formatFechaHistorial(corteDetalleSeleccionado.hora_inicio)}
                    </Text>
                  </View>
                  {corteDetalleSeleccionado.hora_fin ? (
                    <View style={styles.corteFechaItem}>
                      <Ionicons name="stop-circle-outline" size={16} color="#64748B" />
                      <Text style={styles.corteFechaText}>
                        Cierre: {formatFechaHistorial(corteDetalleSeleccionado.hora_fin)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Grid de Resumen Financiero */}
                <View style={styles.corteMetricasGridModal}>
                  <View style={styles.corteMetricaTile}>
                    <Text style={styles.corteTileLabel}>Dinero Inicial</Text>
                    <Text style={styles.corteTileValue}>
                      ${Number(corteDetalleSeleccionado.dinero_inicial || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.corteMetricaTile}>
                    <Text style={styles.corteTileLabel}>Ventas Totales</Text>
                    <Text style={[styles.corteTileValue, { color: '#0D9488' }]}>
                      ${Number(corteDetalleSeleccionado.total_ventas || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.corteMetricaTile}>
                    <Text style={styles.corteTileLabel}>Otros Ingresos</Text>
                    <Text style={[styles.corteTileValue, { color: '#059669' }]}>
                      +${Number(corteDetalleSeleccionado.total_ingresos || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.corteMetricaTile}>
                    <Text style={styles.corteTileLabel}>Egresos / Gastos</Text>
                    <Text style={[styles.corteTileValue, { color: '#DC2626' }]}>
                      -${Number(corteDetalleSeleccionado.total_egresos || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Desglose por Método de Pago */}
                <View style={styles.metodosPagoDesgloseBox}>
                  <Text style={styles.subseccionTitle}>Ventas por Método de Pago:</Text>
                  <View style={styles.metodosPagoRow}>
                    <View style={[styles.metodoMiniTile, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <Ionicons name="cash-outline" size={16} color="#059669" />
                      <Text style={styles.metodoMiniLabel}>Efectivo</Text>
                      <Text style={[styles.metodoMiniValue, { color: '#047857' }]}>
                        ${Number(corteDetalleSeleccionado.total_efectivo || 0).toFixed(2)}
                      </Text>
                    </View>

                    <View style={[styles.metodoMiniTile, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                      <Ionicons name="card-outline" size={16} color="#2563EB" />
                      <Text style={styles.metodoMiniLabel}>Tarjeta</Text>
                      <Text style={[styles.metodoMiniValue, { color: '#1D4ED8' }]}>
                        ${Number(corteDetalleSeleccionado.total_tarjeta || 0).toFixed(2)}
                      </Text>
                    </View>

                    <View style={[styles.metodoMiniTile, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                      <Ionicons name="qr-code-outline" size={16} color="#7C3AED" />
                      <Text style={styles.metodoMiniLabel}>Transferencia</Text>
                      <Text style={[styles.metodoMiniValue, { color: '#6D28D9' }]}>
                        ${Number(corteDetalleSeleccionado.total_transferencia || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tarjeta Destacada: Caja Física Esperada */}
                <View style={styles.cajaEsperadaCardModal}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.cajaEsperadaLabelModal}>Caja Física Esperada en Efectivo</Text>
                      <Text style={styles.cajaEsperadaFormulaModal}>
                        (Inicial + Ventas Efectivo + Ingresos - Egresos)
                      </Text>
                    </View>
                    <Text style={styles.cajaEsperadaMontoModal}>
                      ${Number(corteDetalleSeleccionado.caja_esperada || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* HISTORIAL DETALLADO DE INGRESOS Y EGRESOS */}
                <View style={styles.movimientosDetalleBoxModal}>
                  <Text style={styles.subseccionTitle}>Historial Detallado de Entradas y Salidas:</Text>

                  {/* INGRESOS */}
                  <View style={{ gap: 6, marginTop: 4 }}>
                    <Text style={[styles.movimientoGrupoLabel, { color: '#059669' }]}>
                      📥 Ingresos Extra ({corteDetalleSeleccionado.ingresos?.length || 0})
                    </Text>

                    {!corteDetalleSeleccionado.ingresos || corteDetalleSeleccionado.ingresos.length === 0 ? (
                      <Text style={styles.movimientoVacioText}>No se registraron ingresos adicionales.</Text>
                    ) : (
                      corteDetalleSeleccionado.ingresos.map((ing, idx) => (
                        <View key={ing.id || idx} style={styles.movimientoItemRowModal}>
                          <View style={styles.movimientoItemLeft}>
                            <Ionicons name="add-circle" size={18} color="#059669" />
                            <View>
                              <Text style={styles.movimientoConceptoText}>{ing.concepto}</Text>
                              {ing.fecha ? (
                                <Text style={styles.movimientoFechaText}>{formatFechaHistorial(ing.fecha)}</Text>
                              ) : null}
                            </View>
                          </View>
                          <Text style={[styles.movimientoMontoText, { color: '#059669' }]}>
                            +${Number(ing.monto || ing.total_ingreso || 0).toFixed(2)}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* EGRESOS */}
                  <View style={{ gap: 6, marginTop: 12 }}>
                    <Text style={[styles.movimientoGrupoLabel, { color: '#DC2626' }]}>
                      📤 Egresos / Gastos de Caja ({corteDetalleSeleccionado.egresos?.length || 0})
                    </Text>

                    {!corteDetalleSeleccionado.egresos || corteDetalleSeleccionado.egresos.length === 0 ? (
                      <Text style={styles.movimientoVacioText}>No se registraron egresos o retiradas de efectivo.</Text>
                    ) : (
                      corteDetalleSeleccionado.egresos.map((eg, idx) => {
                        const mEg = Number(eg.monto || eg.total_egreso || eg.total_ingreso || 0);
                        return (
                          <View key={eg.id || idx} style={styles.movimientoItemRowModal}>
                            <View style={styles.movimientoItemLeft}>
                              <Ionicons name="remove-circle" size={18} color="#DC2626" />
                              <View>
                                <Text style={styles.movimientoConceptoText}>{eg.concepto}</Text>
                                {eg.fecha ? (
                                  <Text style={styles.movimientoFechaText}>{formatFechaHistorial(eg.fecha)}</Text>
                                ) : null}
                              </View>
                            </View>
                            <Text style={[styles.movimientoMontoText, { color: '#DC2626' }]}>
                              -${mEg.toFixed(2)}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>

                {/* BOTÓN CERRAR */}
                <TouchableOpacity
                  style={styles.btnCerrarModalDetalle}
                  onPress={() => setModalCorteDetalleVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnCerrarModalDetalleText}>Cerrar Desglose</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL RANKING PLATILLOS MÁS VENDIDOS */}
      <Modal visible={modalRankingVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 750, width: '100%', maxHeight: '90%', alignSelf: 'center' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trophy" size={24} color="#D97706" />
                <View>
                  <Text style={styles.modalTitle}>Ranking de Platillos Más Vendidos</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Lista en orden de lo más pedido con filtros por fecha y tipo de alimento</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalRankingVisible(false)} padding={6}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* FILTROS POR FECHA DIRECTAMENTE DENTRO DEL MODAL (INDEPENDIENTE) */}
            {renderFiltrosFechaBarGeneric(
              filtroPresetRanking,
              setFiltroPresetRanking,
              fechaDesdeRanking,
              setFechaDesdeRanking,
              fechaHastaRanking,
              setFechaHastaRanking,
              cargarPlatillosRankingModal
            )}

            {/* FILTROS POR CATEGORÍA DE ALIMENTO */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>Filtrar por Categoría / Tipo de Alimento:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {['Todos', 'Comida', 'Desayuno', 'Antojito', 'Bebida', 'Entrada', 'Litros', 'Postres', 'Tortas', 'Extras'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.rankingCatChip,
                      categoriaFiltroRanking.toLowerCase() === cat.toLowerCase() && styles.rankingCatChipActive,
                    ]}
                    onPress={() => setCategoriaFiltroRanking(cat)}
                  >
                    <Text
                      style={[
                        styles.rankingCatChipText,
                        categoriaFiltroRanking.toLowerCase() === cat.toLowerCase() && styles.rankingCatChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* LISTA ORDENADA DE PLATILLOS */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {loadingRanking ? (
                <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 30 }} />
              ) : (() => {
                const rankingBase = rankingIndependiente && rankingIndependiente.length > 0
                  ? rankingIndependiente
                  : stats.platillos_ranking && stats.platillos_ranking.length > 0
                    ? stats.platillos_ranking
                    : stats.platillos_mas_vendidos || [];

                const rankingFiltrado = rankingBase.filter((item) => {
                  if (categoriaFiltroRanking === 'Todos') return true;
                  return (item.tipo || '').toLowerCase() === categoriaFiltroRanking.toLowerCase();
                });

                if (rankingFiltrado.length === 0) {
                  return (
                    <View style={styles.emptyBox}>
                      <Ionicons name="fast-food-outline" size={48} color="#CBD5E1" />
                      <Text style={styles.emptyTitle}>No hay platillos en esta categoría o rango</Text>
                      <Text style={styles.emptySub}>Prueba seleccionando otra categoría o modificando el rango de fecha.</Text>
                    </View>
                  );
                }

                const maxQty = rankingFiltrado[0]?.cantidad || 1;

                return rankingFiltrado.map((item, index) => {
                  const percent = Math.min(100, Math.round((item.cantidad / maxQty) * 100));

                  return (
                    <View key={item.alimento || index} style={styles.rankingRowCardModal}>
                      <View style={styles.rankingPosPillModal}>
                        <Text style={styles.rankingPosPillTextModal}>#{index + 1}</Text>
                      </View>

                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.rankingNombreModal}>{limpiarZona(item.alimento)}</Text>
                          {item.tipo && item.tipo !== 'Otro' && (
                            <View style={styles.tipoBadgePillModal}>
                              <Text style={styles.tipoBadgePillTextModal}>{item.tipo}</Text>
                            </View>
                          )}
                        </View>

                        {/* Barra visual de proporción de ventas */}
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end', minWidth: 100 }}>
                        <Text style={styles.rankingQtyModal}>{item.cantidad} vendidos</Text>
                        <Text style={styles.rankingTotalModal}>${Number(item.total || 0).toFixed(2)}</Text>
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>

            <TouchableOpacity
              style={styles.btnSubmitModal}
              onPress={() => setModalRankingVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSubmitModalText}>Cerrar Ranking</Text>
            </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  userRoleText: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '700',
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  tabContentContainer: {
    padding: Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 40,
    maxWidth: 1350,
    width: '100%',
    alignSelf: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  btnCrearCuentaTop: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnCrearCuentaTopText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cuentaCardItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cuentaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cuentaUserRow: { flexDirection: 'row', alignItems: 'center' },
  cuentaNombreText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  cuentaRolPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  cuentaRolPillText: { fontSize: 10, fontWeight: '800' },
  cuentaEstadoPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  cuentaEstadoPillActivo: { backgroundColor: '#DCFCE7' },
  cuentaEstadoPillBloqueado: { backgroundColor: '#FEE2E2' },
  cuentaEstadoPillText: { fontSize: 11, fontWeight: '700' },
  cuentaEstadoTextActivo: { color: '#15803D' },
  cuentaEstadoTextBloqueado: { color: '#B91C1C' },
  cuentaCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cuentaCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  btnEditarCuentaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnEditarCuentaCardText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  btnBloquearCuentaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnBloquearCuentaCardActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  btnBloquearCuentaCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  btnBloquearCuentaCardTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  btnEliminarCuentaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnEliminarCuentaCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 13,
    color: '#64748B',
  },
  filtrosFechaBar: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  filtrosFechaLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  rangoBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rangoBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  presetChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  customDateBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customDateTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  customDateInputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
  },
  customDateCol: {
    flex: 1,
    minWidth: 160,
  },
  customDateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  customDateInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  btnAplicarFechaCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnAplicarFechaCustomText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metricCardBig: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  metricBigLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
  },
  metricBigValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 4,
  },
  metricSubInfo: {
    fontSize: 12,
    color: '#64748B',
  },
  metricRowGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCardMini: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricMiniLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  metricMiniValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  platilloMasVendidoCard: {
    backgroundColor: '#FFFDF5',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  platilloHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  platilloTitle: {
    color: '#78350F',
  },
  platilloBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  platilloBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  platilloTotalGenerated: {
    fontSize: 13,
    color: '#92400E',
    marginTop: 4,
  },
  top5ListContainer: {
    gap: 8,
    marginTop: 4,
  },
  top5RowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  rankBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 34,
  },
  rankBadgePillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  top5NombreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  top5TipoSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  top5TotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  top5VacioText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  btnVerRankingPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  btnVerRankingPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },

  /* MODAL RANKING STYLES */
  rankingCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 4,
  },
  rankingCatChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  rankingCatChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  rankingCatChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  rankingRowCardModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rankingPosPillModal: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
  },
  rankingPosPillTextModal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0D9488',
  },
  rankingNombreModal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  tipoBadgePillModal: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tipoBadgePillTextModal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 3,
  },
  rankingQtyModal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  rankingTotalModal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  ventasPorDiaSection: {
    marginTop: 8,
  },
  ventasPorDiaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  diaRowCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  btnVerHistorialDiaPill: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  btnVerHistorialDiaPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
  },
  diaFechaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  diaSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  diaMontoTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D9488',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 10,
  },
  corteCardItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  corteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  corteCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  corteCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  corteStateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    height: 26,
  },
  corteStateBadgeActive: { backgroundColor: '#DCFCE7' },
  corteStateBadgeClosed: { backgroundColor: '#F1F5F9' },
  corteStateBadgeText: { fontSize: 11, fontWeight: '800' },
  corteStateBadgeTextActive: { color: '#166534' },
  corteStateBadgeTextClosed: { color: '#475569' },
  corteMetricasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  corteMetricaItem: { alignItems: 'center' },
  corteMetricaLabel: { fontSize: 10, color: '#64748B' },
  corteMetricaValue: { fontSize: 14, fontWeight: '700' },
  btnVerDetalleCorte: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDFA',
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnVerDetalleCorteText: {
    color: '#0D9488',
    fontWeight: '700',
    fontSize: 13,
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
  alimentoCardActionsCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  disponibleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  disponibleBadgeOk: {
    backgroundColor: '#DCFCE7',
  },
  disponibleBadgeOff: {
    backgroundColor: '#F1F5F9',
  },
  disponibleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  disponibleBadgeTextOk: {
    color: '#166534',
  },
  disponibleBadgeTextOff: {
    color: '#64748B',
  },
  precioYEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnIconEditAlimento: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alimentoItemPrecio: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D9488',
  },
  badgeCobradoPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeCobradoPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },

  /* OTRSAS VISTAS Y MODALES */
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  subTabButtonActive: { backgroundColor: '#FFFFFF' },
  subTabButtonText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  subTabButtonTextActive: { color: '#0D9488' },
  /* HISTORIAL DE VENTAS METRICAS Y CARDS */
  kpiRowContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  kpiIconBadge: {
    width: 26,
    height: 26,
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
  badgeCobradoPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeCobradoPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
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
  historialResumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 8,
  },
  historialResumenText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
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
    color: '#0F172A',
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
  btnImprimirTicket: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
  },
  btnImprimirTicketText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 500, alignSelf: 'center' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 10, marginBottom: 4 },
  inputField: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, height: 44, fontSize: 13, fontWeight: '600', color: '#0F172A' },
  tipoRolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  rolOptionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  rolOptionChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  rolOptionText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  rolOptionTextActive: { color: '#FFFFFF' },
  btnSubmitModal: { backgroundColor: '#0D9488', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnSubmitModalText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  cierreResumenLabel: { fontSize: 14, color: '#334155' },

  /* MODAL CORTE DETALLE DETALLADO */
  corteFechasBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 6,
  },
  corteFechaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  corteFechaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  corteMetricasGridModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  corteMetricaTile: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  corteTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  corteTileValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  subseccionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  metodosPagoDesgloseBox: {
    gap: 6,
  },
  metodosPagoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metodoMiniTile: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 3,
  },
  metodoMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  metodoMiniValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  cajaEsperadaCardModal: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
  },
  cajaEsperadaLabelModal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  cajaEsperadaFormulaModal: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  cajaEsperadaMontoModal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#047857',
  },
  movimientosDetalleBoxModal: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  movimientoGrupoLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  movimientoItemRowModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  movimientoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  movimientoConceptoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  movimientoFechaText: {
    fontSize: 10,
    color: '#64748B',
  },
  movimientoMontoText: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  movimientoVacioText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  btnCerrarModalDetalle: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnCerrarModalDetalleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
});
