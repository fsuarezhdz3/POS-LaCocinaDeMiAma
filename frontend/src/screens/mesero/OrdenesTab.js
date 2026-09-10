import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeseroContext } from '../../context/MeseroContext';
import { API_URL } from '../../config/api';
import ConfirmarEliminarModal from '../../components/ConfirmarEliminarModal';

// Helper inteligente para parsear la metadata del paquete (guarniciones, bebida, extras)
const parseMeta = (extrasStr, comentariosStr = '') => {
  const combinedStr = [extrasStr, comentariosStr].filter(Boolean).join(' | ');
  if (!combinedStr) return null;

  // 1. Intentar parsear como JSON si extrasStr es JSON
  if (extrasStr && typeof extrasStr === 'string' && extrasStr.trim().startsWith('{')) {
    try {
      const data = JSON.parse(extrasStr);
      if (data && typeof data === 'object') return data;
    } catch (e) {}
  }

  // 2. Parser para textos con "Guarnición 1: ... | Bebida: ..."
  const meta = {
    guarniciones: [],
    bebida: null,
    entrada: null,
    extras: [],
  };

  const textoLimpio = combinedStr.replace(/[()]/g, '');
  const partes = textoLimpio.split('|').map((p) => p.trim());

  partes.forEach((parte) => {
    if (/guarnici[oó]n/i.test(parte)) {
      const valor = parte.replace(/.*guarnici[oó]n\s*\d*:\s*/i, '').trim();
      if (valor && valor !== 'Sin selección' && !meta.guarniciones.includes(valor)) {
        meta.guarniciones.push(valor);
      }
    } else if (/bebida/i.test(parte)) {
      const valor = parte.replace(/.*bebida:\s*/i, '').trim();
      if (valor && valor !== 'Sin selección') {
        meta.bebida = valor;
      }
    } else if (/entrada/i.test(parte)) {
      const valor = parte.replace(/.*entrada:\s*/i, '').trim();
      if (valor && valor !== 'Sin selección') {
        meta.entrada = valor;
      }
    } else if (/extras/i.test(parte)) {
      const valor = parte.replace(/.*extras:\s*/i, '').trim();
      if (valor && !meta.extras.includes(valor)) {
        meta.extras.push(valor);
      }
    }
  });

  return meta;
};

const limpiarZona = (str = '') => {
  if (!str) return '';
  return String(str).replace(/-[a-zA-Z0-9_]+$/g, '').trim();
};

export default function OrdenesTab() {
  const { selectedMesa, setActiveTab } = useContext(MeseroContext);
  const { width } = useWindowDimensions();
  const [itemsComanda, setItemsComanda] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filtro de alcance: 'mesa' (Mesa Seleccionada) vs 'todas' (Todas las Mesas)
  const [filtroScope, setFiltroScope] = useState(selectedMesa ? 'mesa' : 'todas');

  // Estado de pestaña ('pendientes' | 'historial') y filtro por categoría ('todos' | 'entradas' | 'platos_fuertes' | 'desayunos' | 'bebidas')
  const [tabActiva, setTabActiva] = useState('pendientes');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');

  // Estado mapa para controlar elementos marcados en verde por item y bloque ({ `${itemId}_${blockId}`: boolean })
  const [checkedMap, setCheckedMap] = useState({});

  // Catálogos cargados dinámicamente desde el backend por tipo
  const [catDesayunos, setCatDesayunos] = useState([
    'Chilaquiles Verdes con Huevo',
    'Huevos al Gusto con Jamón o Tocino',
    'Omelette de Queso y Champiñones',
    'Huevos Rancheros sobre Tortilla',
    'Hot Cakes Tradicionales con Mantequilla',
  ]);

  const [catPlatosFuertes, setCatPlatosFuertes] = useState([
    'Milanesa de Res Empanizada',
    'Pechuga Rellena de Queso y Jamón',
    'Carne Asada con Ensalada y Frijoles',
    'Enchiladas Verdes de Pollo',
    'Flautas Doradas de Pollo (4 pz)',
    'Mole Poblano con Pollo y Arroz',
    'Costillas de Puerco en Salsa Verde',
    'Birria de Res estilo Jalisco',
  ]);

  const [catAntojitos, setCatAntojitos] = useState([
    'Sopes Tradicionales (3 pz)',
    'Gorditas de Maíz (2 pz)',
    'Tlacoyos con Nopales (2 pz)',
    'Quesadillas Fritas (2 pz)',
    'Pambazo Preparado',
  ]);

  const [catTortas, setCatTortas] = useState([
    'Torta de Milanesa con Queso',
    'Torta Cubana Especial',
    'Torta de Jamón y Queso',
    'Torta de Chorizo con Huevo',
  ]);

  const [catEntradas, setCatEntradas] = useState([
    'Sopa de Fideo Casera',
    'Crema de Elote Dulce',
    'Consomé de Pollo con Verduras',
    'Ensalada Verde de la Casa',
    'Guacamole Tradicional con Totopos',
  ]);

  const [catGuarniciones, setCatGuarniciones] = useState([
    'Frijoles Refritos con Queso',
    'Arroz Rojo Tradicional',
    'Papas a la Mexicana',
    'Champiñones Salteados al Ajillo',
    'Nopales Asados con Orégano',
  ]);

  const [catBebidas, setCatBebidas] = useState([
    'Jugo de Naranja Natural (500ml)',
    'Café Americano de Olla',
    'Refresco Embotellado (600ml)',
    'Té Helado con Limón',
    'Agua Embotellada Ciel (600ml)',
    'Agua de Horchata (500ml)',
    'Agua de Jamaica (500ml)',
  ]);

  const [catGuisos, setCatGuisos] = useState([
    'Sencillo',
    'Chicharrón Prensado en Salsa Roja',
    'Deshebrada de Res en Salsa Verde',
    'Tinga de Pollo con Cebolla',
    'Papas con Chorizo',
    'Queso con Chile Poblano',
    'Asado de Puerco',
    'Chicharrón en Salsa Verde',
    'Picadillo Tradicional',
    'Carnitas de Puerco',
  ]);

  const [catExtras, setCatExtras] = useState([
    'Porción de Aguacate',
    'Queso Gratinado Extra',
    'Porción de Tocino (3 tiras)',
    'Salsa Especial de la Casa',
    'Crema Fresca',
  ]);

  const [alimentosBD, setAlimentosBD] = useState([]);

  // Cargar catálogo completo desde la BD al montar el componente
  useEffect(() => {
    cargarCatalogosBD();
  }, []);

  const cargarCatalogosBD = async () => {
    try {
      const res = await fetch(`${API_URL}/alimentos`);
      const data = await res.json();
      if (res.ok && data.alimentos) {
        setAlimentosBD(data.alimentos);
        const des = data.alimentos.filter((a) => a.tipo === 'Desayuno').map((a) => a.nombre);
        const pla = data.alimentos.filter((a) => a.tipo === 'Comida' || a.tipo === 'Platos Fuertes').map((a) => a.nombre);
        const ant = data.alimentos.filter((a) => a.tipo === 'Antojito').map((a) => a.nombre);
        const tor = data.alimentos.filter((a) => a.tipo === 'Torta').map((a) => a.nombre);
        const ent = data.alimentos.filter((a) => a.tipo === 'Entrada').map((a) => a.nombre);
        const gua = data.alimentos.filter((a) => a.tipo === 'Guarnicion').map((a) => a.nombre);
        const beb = data.alimentos.filter((a) => a.tipo === 'Bebida').map((a) => a.nombre);
        const gui = data.alimentos.filter((a) => a.tipo === 'Guiso' || a.nombre.toLowerCase().includes('guiso')).map((a) => a.nombre);
        const ext = data.alimentos.filter((a) => a.tipo === 'Extra').map((a) => a.nombre);

        if (des.length > 0) setCatDesayunos(des);
        if (pla.length > 0) setCatPlatosFuertes(pla);
        if (ant.length > 0) setCatAntojitos(ant);
        if (tor.length > 0) setCatTortas(tor);
        if (ent.length > 0) setCatEntradas(ent);
        if (gua.length > 0) setCatGuarniciones(gua);
        if (beb.length > 0) setCatBebidas(beb);
        if (gui.length > 0) setCatGuisos(['Sencillo', ...gui]);
        if (ext.length > 0) setCatExtras(ext);
      }
    } catch (e) {
      console.log('Usando catálogo local en OrdenesTab:', e.message);
    }
  };

  const obtenerZonaItemCatalog = (nombreAlimento, tipoFallback = 'cocina') => {
    if (!nombreAlimento) return tipoFallback;
    const limpio = limpiarZona(nombreAlimento);
    const itemObj = alimentosBD.find((a) => a.nombre.toLowerCase() === limpio.toLowerCase());
    if (itemObj?.zona) return itemObj.zona.toLowerCase();
    if (itemObj?.tipo === 'Bebida' || itemObj?.tipo === 'Litro') return 'barra';
    if (itemObj?.tipo === 'Antojito') return 'comal';
    if (
      limpio.toLowerCase().includes('jugo') ||
      limpio.toLowerCase().includes('café') ||
      limpio.toLowerCase().includes('refresco') ||
      limpio.toLowerCase().includes('cerveza') ||
      limpio.toLowerCase().includes('agua') ||
      limpio.toLowerCase().includes('té')
    ) {
      return 'barra';
    }
    if (
      limpio.toLowerCase().includes('sope') ||
      limpio.toLowerCase().includes('gordita') ||
      limpio.toLowerCase().includes('tlacoyo') ||
      limpio.toLowerCase().includes('quesadilla') ||
      limpio.toLowerCase().includes('pambazo') ||
      limpio.toLowerCase().includes('flauta')
    ) {
      return 'comal';
    }
    return 'cocina';
  };

  // Estado Selector Picker Modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerConfig, setPickerConfig] = useState({ title: '', field: '', options: [] });

  const abrirPicker = (field, title, options) => {
    setPickerConfig({ field, title, options });
    setPickerVisible(true);
  };

  const seleccionarOpcionPicker = (opcionNombre) => {
    const { field } = pickerConfig;
    setEditForm((prev) => ({
      ...prev,
      [field]: opcionNombre === prev[field] ? '' : (opcionNombre || ''),
    }));
    setPickerVisible(false);
  };

  // Estado Modal de Eliminación / Cancelación de Ítem
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [loadingEliminar, setLoadingEliminar] = useState(false);

  // Estado Modal de Edición de Orden
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [categoriaEditForm, setCategoriaEditForm] = useState('comida');
  const [editForm, setEditForm] = useState({
    alimento: '',
    entrada: '',
    guarnicion1: '',
    guarnicion2: '',
    bebida: '',
    guiso: '',
    extras: '',
    comentarios: '',
    costo: '',
  });

  // Detectar categoría adecuada según las características del alimento
  const detectarCategoriaItem = (item) => {
    const alimentoNombre = (item.alimento || '').toLowerCase();

    if (
      item.guiso ||
      alimentoNombre.includes('sope') ||
      alimentoNombre.includes('gordita') ||
      alimentoNombre.includes('tlacoyo') ||
      alimentoNombre.includes('quesadilla') ||
      alimentoNombre.includes('pambazo') ||
      alimentoNombre.includes('antojito') ||
      alimentoNombre.includes('flauta')
    ) {
      return 'antojitos';
    }

    if (
      alimentoNombre.includes('chilaquil') ||
      alimentoNombre.includes('huevo') ||
      alimentoNombre.includes('omelette') ||
      alimentoNombre.includes('hot cake') ||
      alimentoNombre.includes('desayuno')
    ) {
      return 'desayunos';
    }

    if (item.entrada || alimentoNombre.includes('paquete') || alimentoNombre.includes('milanesa') || alimentoNombre.includes('pechuga') || alimentoNombre.includes('carne asada') || alimentoNombre.includes('mole')) {
      return 'comida';
    }

    if (alimentoNombre.includes('torta')) {
      return 'tortas';
    }

    if (
      alimentoNombre.includes('jugo') ||
      alimentoNombre.includes('café') ||
      alimentoNombre.includes('refresco') ||
      alimentoNombre.includes('té') ||
      alimentoNombre.includes('agua')
    ) {
      return 'bebidas';
    }

    if (item.guarnicion1 || item.guarnicion2) {
      return 'comida';
    }

    return 'otros';
  };

  // Abrir Modal de Edición pre-llenado
  const abrirModalEditar = (item) => {
    const cat = detectarCategoriaItem(item);
    setCategoriaEditForm(cat);
    setItemEditando(item);
    setEditForm({
      alimento: item.alimento || '',
      entrada: item.entrada || '',
      guarnicion1: item.guarnicion1 || '',
      guarnicion2: item.guarnicion2 || '',
      bebida: item.bebida || '',
      guiso: item.guiso || (cat === 'antojitos' ? 'Sencillo' : ''),
      extras: item.extras || '',
      comentarios: item.comentarios || '',
      costo: String(item.costo || '0'),
    });
    setEditModalVisible(true);
  };

  // Guardar Edición de la Orden en el Backend
  const handleGuardarEdicion = async () => {
    if (!itemEditando) return;

    const esDesayuno = categoriaEditForm === 'desayunos';
    const esComida = categoriaEditForm === 'comida';
    const esAntojito = categoriaEditForm === 'antojitos';
    const esTorta = categoriaEditForm === 'tortas';
    const esBebida = categoriaEditForm === 'bebidas';

    const alimentoLimpio = editForm.alimento ? limpiarZona(editForm.alimento) : '';
    const zonaAlimento = editForm.alimento ? obtenerZonaItemCatalog(alimentoLimpio, esBebida ? 'barra' : (esAntojito ? 'comal' : 'cocina')) : 'cocina';
    const alimentoFinal = alimentoLimpio ? `${alimentoLimpio}-${zonaAlimento}` : '';

    let entradaFinal = null;
    if (esComida && editForm.entrada) {
      const entradaLimpia = limpiarZona(editForm.entrada);
      const zonaEntrada = obtenerZonaItemCatalog(entradaLimpia, 'cocina');
      entradaFinal = `${entradaLimpia}-${zonaEntrada}`;
    }

    let bebidaFinal = null;
    if (!esBebida && categoriaEditForm !== 'otros' && editForm.bebida) {
      const bebidaLimpia = limpiarZona(editForm.bebida);
      const zonaBebida = obtenerZonaItemCatalog(bebidaLimpia, 'barra');
      bebidaFinal = `${bebidaLimpia}-${zonaBebida}`;
    }

    const payload = {
      alimento: alimentoFinal,
      entrada: entradaFinal,
      guiso: esAntojito ? (editForm.guiso ? limpiarZona(editForm.guiso) : null) : null,
      guarnicion1: (esComida || esDesayuno) ? (editForm.guarnicion1 ? limpiarZona(editForm.guarnicion1) : null) : null,
      guarnicion2: (esComida || esDesayuno) ? (editForm.guarnicion2 ? limpiarZona(editForm.guarnicion2) : null) : null,
      bebida: bebidaFinal,
      extras: (categoriaEditForm !== 'otros') ? (editForm.extras ? limpiarZona(editForm.extras) : null) : null,
      comentarios: editForm.comentarios || null,
      costo: Number(editForm.costo) || 0,
    };

    try {
      const res = await fetch(`${API_URL}/pedidos/alimento-pedido/${itemEditando.id}/editar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setItemsComanda((prev) =>
          prev.map((i) =>
            i.id === itemEditando.id
              ? {
                  ...i,
                  ...payload,
                  entrada: payload.entrada || '',
                  guiso: payload.guiso || '',
                  guarnicion1: payload.guarnicion1 || '',
                  guarnicion2: payload.guarnicion2 || '',
                  bebida: payload.bebida || '',
                  extras: payload.extras || '',
                  comentarios: payload.comentarios || '',
                }
              : i
          )
        );
        setEditModalVisible(false);
        setItemEditando(null);
        Alert.alert('Éxito', 'Orden editada correctamente.');
      } else {
        Alert.alert('Error', 'No se pudo guardar la edición de la orden.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  // Cancelar/Eliminar Orden
  const handleCancelarItem = (item) => {
    setItemAEliminar(item);
  };

  const handleConfirmarEliminarItem = async () => {
    if (!itemAEliminar) return;
    setLoadingEliminar(true);
    try {
      const res = await fetch(`${API_URL}/pedidos/alimento-pedido/${itemAEliminar.id}/cancelar`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        setItemsComanda((prev) => prev.filter((i) => i.id !== itemAEliminar.id));
        setItemAEliminar(null);
      } else {
        Alert.alert('Error', data.error || 'No se pudo cancelar la orden.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setLoadingEliminar(false);
    }
  };

  // Sincronizar filtroScope con selectedMesa si no hay mesa seleccionada
  useEffect(() => {
    if (!selectedMesa && filtroScope === 'mesa') {
      setFiltroScope('todas');
    }
  }, [selectedMesa]);

  // Cargar comandas en tiempo real (auto-refresh silencioso cada 3s)
  useEffect(() => {
    // Carga inicial
    cargarOrdenesComanda(itemsComanda.length === 0);

    // Intervalo en tiempo real cada 3 segundos
    const timer = setInterval(() => {
      cargarOrdenesComanda(false);
    }, 3000);

    return () => clearInterval(timer);
  }, [selectedMesa, filtroScope]);

  const cargarOrdenesComanda = async (mostrarLoading = false) => {
    try {
      if (mostrarLoading) setLoading(true);

      const numMesaMesa = selectedMesa ? (selectedMesa.num_mesa || selectedMesa.id) : null;
      const endpoint =
        filtroScope === 'mesa' && numMesaMesa
          ? `${API_URL}/pedidos/mesa/${numMesaMesa}`
          : `${API_URL}/pedidos/todas-las-mesas`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (res.ok && data.items) {
        setItemsComanda(data.items);

        // Actualizar mapa de bloques marcados sincronizados desde el servidor
        const serverCheckedMap = {};
        data.items.forEach((item) => {
          if (item.bloques_marcados) {
            try {
              const arr = typeof item.bloques_marcados === 'string'
                ? JSON.parse(item.bloques_marcados)
                : item.bloques_marcados;
              if (Array.isArray(arr)) {
                arr.forEach((bId) => {
                  serverCheckedMap[`${item.id}_${bId}`] = true;
                });
              }
            } catch (e) {}
          }
        });
        setCheckedMap(serverCheckedMap);
      } else {
        setItemsComanda([]);
      }
    } catch (err) {
      console.log('Error al consultar comandas en tiempo real:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarOrdenesComanda(false);
  };

  // Conmutar estado de marcado (rojo 🔴 <-> verde 🟢) de un bloque específico con sincronización en tiempo real
  const toggleBlock = async (itemId, blockId) => {
    const key = `${itemId}_${blockId}`;
    const isCurrentlyChecked = !!checkedMap[key];
    const newCheckedState = !isCurrentlyChecked;

    // Actualización optimista inmediata en UI local
    setCheckedMap((prev) => ({
      ...prev,
      [key]: newCheckedState,
    }));

    // Calcular la lista de bloques marcados actualizada para este itemId
    const currentItemKeys = Object.keys(checkedMap).filter(
      (k) => k.startsWith(`${itemId}_`) && checkedMap[k]
    );

    let updatedBlockIds = currentItemKeys.map((k) => k.replace(`${itemId}_`, ''));
    if (newCheckedState) {
      if (!updatedBlockIds.includes(blockId)) {
        updatedBlockIds.push(blockId);
      }
    } else {
      updatedBlockIds = updatedBlockIds.filter((b) => b !== blockId);
    }

    // Persistir en servidor para que todos los meseros/dispositivos lo vean sincronizado en tiempo real
    try {
      await fetch(`${API_URL}/pedidos/alimento-pedido/${itemId}/bloques`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloques_marcados: JSON.stringify(updatedBlockIds) }),
      });
    } catch (e) {
      console.log('Error al sincronizar bloques marcados:', e.message);
    }
  };

  // Cambiar estado de un alimento_pedido (0: Pendiente -> 1: Servido -> 2: Entregado)
  const handleCambiarEstado = async (itemId, nuevoEstado) => {
    try {
      const res = await fetch(`${API_URL}/pedidos/alimento-pedido/${itemId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (res.ok) {
        setItemsComanda((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, estado: nuevoEstado } : item))
        );
      } else {
        Alert.alert('Error', 'No se pudo actualizar el estado del alimento.');
      }
    } catch (err) {
      Alert.alert('Error de conexión', 'Verifica la red con el servidor backend.');
    }
  };

  // Helper para verificar si un texto corresponde a desayuno
  const esDesayunoTxt = (txt = '') => {
    return /chilaquil|huevo|omelette|desayuno|hot\s*cake|waffle|mollete|pancake|bisquet|hotcake/i.test(txt);
  };

  const limpiarZona = (str = '') => {
    if (!str) return '';
    return String(str).replace(/-[a-zA-Z0-9_]+$/g, '').trim();
  };

  // Helper para desglosar todos los bloques individuales de un item de comanda con su categoría asignada
  const getItemBlocks = (item) => {
    const metaFallback = parseMeta(item.extras, item.comentarios);
    const guarnicionesList = [item.guarnicion1, item.guarnicion2].filter(Boolean);
    const guarnicionesFinales = guarnicionesList.length > 0
      ? guarnicionesList
      : (metaFallback?.guarniciones || []);

    const entradaFinal = item.entrada || metaFallback?.entrada;
    const bebidaFinal = item.bebida || metaFallback?.bebida;
    const preparacionFinal = metaFallback?.preparacion;

    let extrasFinales = null;
    if (item.extras && typeof item.extras === 'string' && !item.extras.includes('Guarnición') && !item.extras.includes('Bebida')) {
      extrasFinales = item.extras;
    } else if (metaFallback?.extras && metaFallback.extras.length > 0) {
      extrasFinales = metaFallback.extras;
    }

    const blocks = [];

    // 1. Bloque Entrada (Si existe, categoría 'entradas')
    if (entradaFinal) {
      blocks.push({ id: 'entrada', texto: limpiarZona(entradaFinal.replace(/^entrada:\s*/i, '')), categoria: 'entradas' });
    }

    // 2. Bloque Plato Fuerte / Desayuno / Torta / Antojito Principal
    const esDes = esDesayunoTxt(item.alimento);
    const alimentoTxt = (item.alimento || '').toLowerCase();
    const catItem = (item.categoria || item.tipo || '').toLowerCase();

    let catPrincipal = 'platos_fuertes';
    if (catItem.includes('torta') || alimentoTxt.includes('torta')) {
      catPrincipal = 'tortas';
    } else if (
      catItem.includes('antojito') ||
      alimentoTxt.includes('antojito') ||
      alimentoTxt.includes('sope') ||
      alimentoTxt.includes('gordita') ||
      alimentoTxt.includes('quesadilla') ||
      alimentoTxt.includes('empanada') ||
      alimentoTxt.includes('huarache') ||
      alimentoTxt.includes('pambazo') ||
      alimentoTxt.includes('tlacoyo') ||
      alimentoTxt.includes('tostada') ||
      alimentoTxt.includes('enchilada') ||
      alimentoTxt.includes('chilaquiles') ||
      alimentoTxt.includes('mulita') ||
      alimentoTxt.includes('taco')
    ) {
      catPrincipal = 'antojitos';
    } else if (esDes || catItem.includes('desayuno')) {
      catPrincipal = 'desayunos';
    }

    if (item.alimento && String(item.alimento).trim() !== '') {
      blocks.push({
        id: 'platillo',
        texto: limpiarZona(item.alimento),
        categoria: catPrincipal,
      });
    }

    // 3. Bloque Preparación
    if (preparacionFinal) {
      blocks.push({ id: 'preparacion', texto: limpiarZona(preparacionFinal), categoria: catPrincipal });
    }

    // 4. Bloques Guarnición(es)
    guarnicionesFinales.forEach((g, idx) => {
      blocks.push({ id: `guarnicion_${idx}`, texto: limpiarZona(g.replace(/^guarnici[oó]n\s*\d*:\s*/i, '')), categoria: 'guarnicion' });
    });

    // 5. Bloque Bebida
    if (bebidaFinal) {
      blocks.push({ id: 'bebida', texto: limpiarZona(bebidaFinal.replace(/^bebida:\s*/i, '')), categoria: 'bebidas' });
    }

    // 5b. Bloque Guiso
    if (item.guiso) {
      blocks.push({ id: 'guiso', texto: `Guiso: ${limpiarZona(item.guiso)}`, categoria: catPrincipal });
    }

    // 6. Bloque Extras
    if (extrasFinales) {
      const txt = (Array.isArray(extrasFinales) ? extrasFinales.join(', ') : extrasFinales).replace(/^extras:\s*/i, '');
      if (txt) {
        blocks.push({ id: 'extras', texto: limpiarZona(txt), categoria: 'extras' });
      }
    }

    // Si item.alimento es una simple entrada o bebida sola (no paquete completo):
    if (blocks.length === 1 && blocks[0].id === 'platillo') {
      const mainTxt = item.alimento.toLowerCase();
      if (mainTxt.includes('sopa') || mainTxt.includes('consomé') || mainTxt.includes('entrada') || mainTxt.includes('fideo')) {
        blocks[0].categoria = 'entradas';
      } else if (mainTxt.includes('café') || mainTxt.includes('jugo') || mainTxt.includes('refresco') || mainTxt.includes('agua') || mainTxt.includes('licuado') || mainTxt.includes('té') || mainTxt.includes('bebida') || mainTxt.includes('coca') || mainTxt.includes('fanta') || mainTxt.includes('sprite')) {
        blocks[0].categoria = 'bebidas';
      }
    }

    return blocks;
  };

  // Filtrar comandas por pestaña
  const pendientes = itemsComanda.filter((i) => Number(i.estado) === 0 || Number(i.estado) === 1);
  const servidos = itemsComanda.filter((i) => Number(i.estado) === 2);
  const completados = itemsComanda.filter((i) => Number(i.estado) === 3);

  // Calcular total acumulado de platillos en la comanda
  const totalActivo = itemsComanda.reduce((sum, item) => sum + Number(item.costo), 0);

  const itemsAMostrar =
    tabActiva === 'pendientes'
      ? pendientes
      : tabActiva === 'servidos'
      ? servidos
      : completados;

  return (
    <View style={styles.container}>
      {/* TABS DE NAVEGACIÓN (PENDIENTES, SERVIDOS Y COMPLETADOS) */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tabActiva === 'pendientes' && styles.tabBtnActive]}
          onPress={() => setTabActiva('pendientes')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="time-outline"
            size={14}
            color={tabActiva === 'pendientes' ? '#0D9488' : '#64748B'}
            style={{ marginRight: 3 }}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tabBtnText, tabActiva === 'pendientes' && styles.tabBtnTextActive]}
          >
            Pendientes
          </Text>
          {pendientes.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{pendientes.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tabActiva === 'servidos' && styles.tabBtnActive]}
          onPress={() => setTabActiva('servidos')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="restaurant-outline"
            size={14}
            color={tabActiva === 'servidos' ? '#0D9488' : '#64748B'}
            style={{ marginRight: 3 }}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tabBtnText, tabActiva === 'servidos' && styles.tabBtnTextActive]}
          >
            Servidos
          </Text>
          {servidos.length > 0 && (
            <View style={[styles.badgeCount, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.badgeCountText}>{servidos.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tabActiva === 'completados' && styles.tabBtnActive]}
          onPress={() => setTabActiva('completados')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={14}
            color={tabActiva === 'completados' ? '#0D9488' : '#64748B'}
            style={{ marginRight: 3 }}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tabBtnText, tabActiva === 'completados' && styles.tabBtnTextActive]}
          >
            Completados
          </Text>
        </TouchableOpacity>
      </View>

      {/* BARRA SELECTORA DE ALCANCE: MESA SELECCIONADA VS TODAS LAS MESAS (DEBAJO DE TABS) */}
      <View style={styles.scopeBarContainer}>
        <TouchableOpacity
          style={[styles.scopeBtn, filtroScope === 'mesa' && styles.scopeBtnActive]}
          onPress={() => {
            if (!selectedMesa) {
              Alert.alert('Sin Mesa', 'Selecciona primero una mesa en la pestaña Mesas.');
              return;
            }
            setFiltroScope('mesa');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={filtroScope === 'mesa' ? '#FFFFFF' : '#475569'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.scopeBtnText, filtroScope === 'mesa' && styles.scopeBtnTextActive]}>
            {(() => {
              if (!selectedMesa) return 'Mesa Seleccionada';
              const numMesa = Number(selectedMesa.num_mesa || selectedMesa.id || 0);
              if (!isNaN(numMesa) && numMesa >= 100) {
                return `Para Llevar #${numMesa}`;
              }
              if (selectedMesa.nombre && !selectedMesa.nombre.includes('undefined')) {
                return selectedMesa.nombre;
              }
              return `Mesa #${numMesa || 1}`;
            })()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scopeBtn, filtroScope === 'todas' && styles.scopeBtnActive]}
          onPress={() => setFiltroScope('todas')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="grid-outline"
            size={16}
            color={filtroScope === 'todas' ? '#FFFFFF' : '#475569'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.scopeBtnText, filtroScope === 'todas' && styles.scopeBtnTextActive]}>
            Todas las Mesas
          </Text>
        </TouchableOpacity>
      </View>

      {/* BARRA DE FILTROS POR CATEGORÍA (TODOS | ENTRADAS | PLATOS FUERTES | DESAYUNOS | BEBIDAS) */}
      <View style={styles.filterBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          <TouchableOpacity
            style={[styles.filterPill, filtroCategoria === 'todos' && styles.filterPillActive]}
            onPress={() => setFiltroCategoria('todos')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filtroCategoria === 'todos' && styles.filterPillTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filtroCategoria === 'entradas' && styles.filterPillActive]}
            onPress={() => setFiltroCategoria('entradas')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filtroCategoria === 'entradas' && styles.filterPillTextActive]}>
              Entradas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filtroCategoria === 'platos_fuertes' && styles.filterPillActive]}
            onPress={() => setFiltroCategoria('platos_fuertes')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filtroCategoria === 'platos_fuertes' && styles.filterPillTextActive]}>
              Platos Fuertes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filtroCategoria === 'bebidas' && styles.filterPillActive]}
            onPress={() => setFiltroCategoria('bebidas')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filtroCategoria === 'bebidas' && styles.filterPillTextActive]}>
              Bebidas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filtroCategoria === 'desayunos' && styles.filterPillActive]}
            onPress={() => setFiltroCategoria('desayunos')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filtroCategoria === 'desayunos' && styles.filterPillTextActive]}>
              Desayunos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filtroCategoria === 'tortas' && styles.filterPillActive]}
            onPress={() => setFiltroCategoria('tortas')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filtroCategoria === 'tortas' && styles.filterPillTextActive]}>
              Tortas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filtroCategoria === 'antojitos' && styles.filterPillActive]}
            onPress={() => setFiltroCategoria('antojitos')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filtroCategoria === 'antojitos' && styles.filterPillTextActive]}>
              Antojitos
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* CONTENIDO PRINCIPAL CON LISTA DE ALIMENTOS PEDIDOS */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 30 }} />
        ) : itemsAMostrar.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyBoxTitle}>
              {tabActiva === 'pendientes'
                ? 'No hay órdenes pendientes'
                : tabActiva === 'servidos'
                ? 'No hay órdenes servidas'
                : 'No hay órdenes completadas'}
            </Text>
            <Text style={styles.emptyBoxSub}>
              {tabActiva === 'pendientes'
                ? 'Todos los platillos de esta mesa han sido servidos o entregados.'
                : tabActiva === 'servidos'
                ? 'Aún no se han marcado platillos como servidos en esta mesa.'
                : 'Aún no hay platillos finalizados/completados.'}
            </Text>
          </View>
        ) : (
          <View style={styles.comandaList}>
            {itemsAMostrar.map((item) => {
              const allBlocks = getItemBlocks(item);
              const blocks = filtroCategoria === 'todos'
                ? allBlocks
                : allBlocks.filter((b) => b.categoria === filtroCategoria);

              // Si se activó un filtro específico y esta orden no contiene bloques de esa categoría, no se renderiza la tarjeta
              if (filtroCategoria !== 'todos' && blocks.length === 0) {
                return null;
              }

              // IMPORTANTE: La validación de si la comanda completa está lista evalúa la TOTALIDAD de bloques del paquete (allBlocks)
              const totalBlocksEnItem = allBlocks.length;
              const listosCountEnItem = allBlocks.filter((b) => checkedMap[`${item.id}_${b.id}`]).length;
              const todosListos = listosCountEnItem === totalBlocksEnItem;

              const numMesaValida = item.num_mesa !== undefined && item.num_mesa !== null ? item.num_mesa : (selectedMesa?.num_mesa || selectedMesa?.id || 1);
              const esParaLlevar = Number(numMesaValida) >= 100;
              const cardWidthResponsive = width > 900 ? '48.8%' : '100%';

              return (
                <View key={item.id} style={[styles.itemCard, { width: cardWidthResponsive }, esParaLlevar && styles.itemCardParaLlevar]}>
                  {/* Encabezado del ítem con badge de mesa, costo y botones Editar/Cancelar */}
                  <View style={styles.itemHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.mesaBadgeInline, esParaLlevar && styles.mesaBadgeInlineParaLlevar]}>
                        <Ionicons
                          name={esParaLlevar ? "bag-handle-outline" : "restaurant-outline"}
                          size={13}
                          color={esParaLlevar ? "#C2410C" : "#0D9488"}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.mesaBadgeInlineText, esParaLlevar && styles.mesaBadgeInlineTextParaLlevar]}>
                          {esParaLlevar ? `Para llevar #${numMesaValida}` : `Mesa #${numMesaValida}`}
                        </Text>
                      </View>
                      {Number(item.estado) === 1 && (
                        <View style={styles.badgeCocinaListo}>
                          <Text style={styles.badgeCocinaListoText}>🍳 Listo Cocina</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                        <Ionicons name="person-outline" size={14} color="#334155" style={{ marginRight: 4 }} />
                        <Text style={styles.itemCostoTitle}>{item.mesero || 'Mesero'}</Text>
                      </View>
                    </View>

                    {/* ACCIONES: EDITAR Y CANCELAR (Solo en Pendientes o Servidos) */}
                    {tabActiva !== 'completados' ? (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.btnEditarIcon}
                          onPress={() => abrirModalEditar(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil-outline" size={16} color="#0284C7" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnCancelarIcon}
                          onPress={() => handleCancelarItem(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  {/* BLOQUES INTERACTIVOS DE COMPONENTES DE LA CATEGORÍA SELECCIONADA */}
                  <View style={styles.componentBlocksList}>
                    {blocks.map((block) => {
                      const isChecked = tabActiva === 'servidos' || tabActiva === 'completados' || !!checkedMap[`${item.id}_${block.id}`];

                      return (
                        <TouchableOpacity
                          key={block.id}
                          style={[
                            styles.interactiveBlock,
                            isChecked ? styles.blockVerde : styles.blockRojo,
                          ]}
                          onPress={() => tabActiva === 'pendientes' && toggleBlock(item.id, block.id)}
                          activeOpacity={tabActiva === 'pendientes' ? 0.75 : 1}
                        >
                          <Ionicons
                            name={isChecked ? 'checkmark-circle' : 'close-circle-outline'}
                            size={20}
                            color={isChecked ? '#10B981' : '#EF4444'}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={[
                              styles.interactiveBlockText,
                              isChecked ? styles.textVerde : styles.textRojo,
                            ]}
                          >
                            {block.texto}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* COMENTARIOS DEL MESERO EN CAJA AMARILLA */}
                  {(() => {
                    const comentarioLimpio = item.comentarios
                      ? item.comentarios.replace(/\([^\)]*(Guarnición|Bebida|Entrada)[^\)]*\)/gi, '').trim()
                      : '';

                    if (
                      !comentarioLimpio ||
                      comentarioLimpio.toLowerCase().startsWith('guarnición') ||
                      comentarioLimpio.toLowerCase().startsWith('bebida')
                    ) {
                      return null;
                    }

                    return (
                      <View style={styles.comentarioBox}>
                        <Text style={styles.comentarioHeader}>💬 Comentarios del Mesero:</Text>
                        <Text style={styles.comentarioText}>"{comentarioLimpio}"</Text>
                      </View>
                    );
                  })()}

                  <View style={styles.itemFooterRow}>
                    {tabActiva === 'pendientes' ? (
                      <TouchableOpacity
                        style={[
                          styles.btnServir,
                          todosListos ? styles.btnServirActivo : styles.btnServirInactivo,
                        ]}
                        disabled={!todosListos}
                        onPress={() => handleCambiarEstado(item.id, 2)}
                        activeOpacity={todosListos ? 0.85 : 1}
                      >
                        <Ionicons
                          name={todosListos ? 'checkmark-circle' : 'lock-closed-outline'}
                          size={20}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.btnServirText}>
                          {todosListos
                            ? 'Confirmar Servido'
                            : `Marcar elementos (${listosCountEnItem}/${totalBlocksEnItem})`}
                        </Text>
                      </TouchableOpacity>
                    ) : tabActiva === 'servidos' ? (
                      <View style={styles.rowServidosButtons}>
                        <TouchableOpacity
                          style={styles.btnRevertir}
                          onPress={() => handleCambiarEstado(item.id, 0)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-undo-outline" size={15} color="#475569" style={{ marginRight: 4 }} />
                          <Text style={styles.btnRevertirText}>Revertir a Pendiente</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnCompletarDirecto}
                          onPress={() => handleCambiarEstado(item.id, 3)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="checkmark-done-circle" size={17} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.btnCompletarDirectoText}>Completado</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.rowServidosButtons}>
                        <View style={styles.completadoBadgeBoxLeft}>
                          <Ionicons name="checkmark-done-circle" size={16} color="#059669" style={{ marginRight: 4 }} />
                          <Text style={styles.completadoBadgeText}>Completado</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.btnRevertirAServido}
                          onPress={() => handleCambiarEstado(item.id, 2)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-undo-outline" size={15} color="#B45309" style={{ marginRight: 4 }} />
                          <Text style={styles.btnRevertirAServidoText}>Revertir a Servido</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>



      {/* MODAL DE EDICIÓN DE ORDEN (SELECCIÓN DE CATÁLOGO DINÁMICO POR CATEGORÍA) */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Comanda #{itemEditando?.id}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {/* 1. SECCIÓN PRINCIPAL SEGÚN CATEGORÍA */}
              {categoriaEditForm === 'desayunos' && (
                <>
                  <Text style={styles.inputLabel}>Desayuno Principal</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('alimento', 'Seleccionar Desayuno', catDesayunos)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="egg-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.alimento || 'Seleccionar Desayuno...'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Guarnición 1</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('guarnicion1', 'Seleccionar Guarnición 1', catGuarniciones)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="layers-outline" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.guarnicion1 ? editForm.guarnicion1 : 'Sin guarnición 1'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Guarnición 2</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('guarnicion2', 'Seleccionar Guarnición 2', catGuarniciones)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="layers-outline" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.guarnicion2 ? editForm.guarnicion2 : 'Sin guarnición 2'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Bebida</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('bebida', 'Seleccionar Bebida', catBebidas)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="wine-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.bebida ? editForm.bebida : 'Sin bebida'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              )}

              {categoriaEditForm === 'comida' && (
                <>
                  <Text style={styles.inputLabel}>Platillo / Comida Principal</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('alimento', 'Seleccionar Platillo Principal', catPlatosFuertes)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="restaurant-outline" size={18} color="#EA580C" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.alimento || 'Seleccionar Platillo...'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Entrada</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('entrada', 'Seleccionar Entrada', catEntradas)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="leaf-outline" size={18} color="#16A34A" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.entrada ? editForm.entrada : 'Sin entrada'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Guarnición 1</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('guarnicion1', 'Seleccionar Guarnición 1', catGuarniciones)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="layers-outline" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.guarnicion1 ? editForm.guarnicion1 : 'Sin guarnición 1'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Guarnición 2</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('guarnicion2', 'Seleccionar Guarnición 2', catGuarniciones)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="layers-outline" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.guarnicion2 ? editForm.guarnicion2 : 'Sin guarnición 2'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Bebida</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('bebida', 'Seleccionar Bebida', catBebidas)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="wine-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.bebida ? editForm.bebida : 'Sin bebida'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              )}

              {categoriaEditForm === 'antojitos' && (
                <>
                  <Text style={styles.inputLabel}>Antojito Principal</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('alimento', 'Seleccionar Antojito', catAntojitos)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="fast-food-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.alimento || 'Seleccionar Antojito...'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Guiso</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('guiso', 'Seleccionar Guiso', catGuisos)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="flame-outline" size={18} color="#EA580C" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.guiso ? editForm.guiso : 'Sin guiso (Sencillo)'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Bebida</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('bebida', 'Seleccionar Bebida', catBebidas)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="wine-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.bebida ? editForm.bebida : 'Sin bebida'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              )}

              {categoriaEditForm === 'tortas' && (
                <>
                  <Text style={styles.inputLabel}>Torta Principal</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('alimento', 'Seleccionar Torta', catTortas)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="nutrition-outline" size={18} color="#B45309" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.alimento || 'Seleccionar Torta...'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Bebida</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('bebida', 'Seleccionar Bebida', catBebidas)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="wine-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.bebida ? editForm.bebida : 'Sin bebida'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              )}

              {categoriaEditForm === 'bebidas' && (
                <>
                  <Text style={styles.inputLabel}>Bebida</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => abrirPicker('alimento', 'Seleccionar Bebida', catBebidas)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="wine-outline" size={18} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={styles.pickerSelectorBtnText}>
                      {editForm.alimento || 'Seleccionar Bebida...'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              )}

              {categoriaEditForm === 'otros' && (
                <>
                  <Text style={styles.inputLabel}>Nombre del Alimento / Platillo</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.alimento}
                    onChangeText={(txt) => setEditForm((p) => ({ ...p, alimento: txt }))}
                    placeholder="Nombre del alimento..."
                  />
                </>
              )}

              {/* 2. EXTRAS (Sólo para categorías con extras) */}
              {categoriaEditForm !== 'bebidas' && categoriaEditForm !== 'otros' && (
                <>
                  <Text style={styles.inputLabel}>Extras</Text>
                  <View style={styles.extrasChipsContainer}>
                    {catExtras.map((extraNombre) => {
                      const isSelected = editForm.extras.includes(extraNombre);
                      return (
                        <TouchableOpacity
                          key={extraNombre}
                          style={[styles.extraChip, isSelected && styles.extraChipSelected]}
                          onPress={() => {
                            let arrayExtras = editForm.extras ? editForm.extras.split(', ').filter(Boolean) : [];
                            if (arrayExtras.includes(extraNombre)) {
                              arrayExtras = arrayExtras.filter((e) => e !== extraNombre);
                            } else {
                              arrayExtras.push(extraNombre);
                            }
                            setEditForm((p) => ({ ...p, extras: arrayExtras.join(', ') }));
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                            size={16}
                            color={isSelected ? '#FFFFFF' : '#475569'}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.extraChipText, isSelected && styles.extraChipTextSelected]}>
                            {extraNombre}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* 3. COMENTARIOS / NOTAS */}
              <Text style={styles.inputLabel}>Comentarios / Notas del Mesero</Text>
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                multiline
                value={editForm.comentarios}
                onChangeText={(txt) => setEditForm((p) => ({ ...p, comentarios: txt }))}
                placeholder="Ej. Sin cebolla, extra salsa..."
              />

              {/* 4. COSTO TOTAL */}
              <Text style={styles.inputLabel}>Costo Total ($)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={editForm.costo}
                onChangeText={(txt) => setEditForm((p) => ({ ...p, costo: txt }))}
                placeholder="0"
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.btnCancelarModalText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnGuardarModal} onPress={handleGuardarEdicion}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnGuardarModalText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUB-MODAL PICKER LISTA DE OPCIONES TIPO MENU */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerConfig.title}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Opción Sin Selección */}
              <TouchableOpacity
                style={styles.pickerOptionCard}
                onPress={() => seleccionarOpcionPicker('')}
                activeOpacity={0.8}
              >
                <Ionicons name="ban-outline" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
                <Text style={[styles.pickerOptionText, { color: '#94A3B8' }]}>Sin Selección (Ninguno)</Text>
              </TouchableOpacity>

              {pickerConfig.options.map((opcionNombre, idx) => {
                const isSelected = editForm[pickerConfig.field] === opcionNombre;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.pickerOptionCard, isSelected && styles.pickerOptionCardSelected]}
                    onPress={() => seleccionarOpcionPicker(opcionNombre)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSelected ? '#0D9488' : '#CBD5E1'}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                      {opcionNombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR ÍTEM DE LA COMANDA */}
      <ConfirmarEliminarModal
        visible={!!itemAEliminar}
        titulo="¿Eliminar alimento?"
        mensaje={
          itemAEliminar
            ? `¿Estás seguro de cancelar "${limpiarZona(itemAEliminar.alimento)}"? Esta acción eliminará el alimento de la comanda.`
            : ''
        }
        onConfirm={handleConfirmarEliminarItem}
        onClose={() => setItemAEliminar(null)}
        loading={loadingEliminar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  btnIrMesas: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnIrMesasText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Header Mesa Bar */
  headerMesaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerMesaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerMesaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerMesaSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  btnRefrescar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Scroll & Items */
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 80,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyBoxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
  },
  emptyBoxSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  comandaList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCardParaLlevar: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
    borderWidth: 2,
    borderLeftWidth: 6,
    borderLeftColor: '#EA580C',
  },
  mesaBadgeInlineParaLlevar: {
    backgroundColor: '#FFEDD5',
  },
  mesaBadgeInlineTextParaLlevar: {
    color: '#C2410C',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemAlimentoNombre: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  itemCostoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  componentBlocksList: {
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  blockRowColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  blockLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginRight: 6,
  },
  blockValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  comentarioBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  comentarioHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  comentarioText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350F',
    fontStyle: 'italic',
  },
  itemFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  badgeEstado0: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText0: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  badgeEstado1: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText1: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  /* Scope Bar (Mesa vs Todas) */
  scopeBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scopeBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  scopeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  scopeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Mesa Badge Inline */
  mesaBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  mesaBadgeInlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },

  /* Filter Bar Row */
  filterBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  /* Tabs Row */
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tabBtnActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0D9488',
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0D9488',
    fontWeight: '800',
  },
  badgeCount: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 5,
    height: 18,
    minWidth: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 3,
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  itemCostoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  interactiveBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  blockRojo: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  blockVerde: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  interactiveBlockText: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  textRojo: {
    color: '#991B1B',
  },
  textVerde: {
    color: '#065F46',
  },
  btnServir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    marginTop: 4,
  },
  btnServirActivo: {
    backgroundColor: '#0D9488',
    opacity: 1,
  },
  btnServirInactivo: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  btnServirText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnRevertir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  btnRevertirText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  completadoBadgeBoxLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  btnRevertirAServido: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  btnRevertirAServidoText: {
    color: '#B45309',
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Fixed Summary Bar */
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Action Buttons (Editar / Cancelar) */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  btnEditarIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancelarIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btnCancelarModal: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  btnCancelarModalText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  btnGuardarModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnGuardarModalText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  /* Picker Selector Buttons */
  pickerSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  pickerSelectorBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },

  /* Extras Chips */
  extrasChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  extraChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  extraChipSelected: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  extraChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  extraChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Option List Cards */
  pickerOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pickerOptionCardSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  pickerOptionTextSelected: {
    color: '#0F766E',
    fontWeight: '800',
  },

  /* Category Form Pills */
  catFormPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catFormPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  catFormPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  catFormPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Row Servidos Buttons */
  rowServidosButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  btnCompletarDirecto: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  btnCompletarDirectoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completadoBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '100%',
  },
  completadoBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  badgeCocinaListo: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginRight: 6,
  },
  badgeCocinaListoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
});
