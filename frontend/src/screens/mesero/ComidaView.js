import React, { useState, useEffect, useContext } from 'react';
import {
  useWindowDimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeseroContext } from '../../context/MeseroContext';
import { API_URL } from '../../config/api';

export default function ComidaView({ onVolverMenu }) {
  const { width } = useWindowDimensions();
  const cardWidthResponsive = width > 900 ? '48.8%' : '100%';
  const { selectedMesa, setActiveTab, showSuccessNotification, showSinMesaModal } = useContext(MeseroContext);

  // Lista de paquetes de comida (Paquete 1, Paquete 2, ...)
  const [paquetes, setPaquetes] = useState([]);

  // Catálogos desde la BD
  const [loading, setLoading] = useState(false);
  const [catEntradas, setCatEntradas] = useState([
    { id: 41, nombre: 'Sopa de Fideo Casera', precio: 35 },
    { id: 42, nombre: 'Crema de Elote Dulce', precio: 45 },
    { id: 43, nombre: 'Consomé de Pollo con Verduras', precio: 40 },
    { id: 44, nombre: 'Ensalada Verde de la Casa', precio: 50 },
    { id: 45, nombre: 'Guacamole Tradicional con Totopos', precio: 65 },
  ]);

  const [catPlatosFuertes, setCatPlatosFuertes] = useState([
    { id: 6, nombre: 'Milanesa de Res Empanizada', precio: 110 },
    { id: 7, nombre: 'Pechuga Rellena de Queso y Jamón', precio: 115 },
    { id: 8, nombre: 'Carne Asada con Ensalada y Frijoles', precio: 120 },
    { id: 9, nombre: 'Enchiladas Verdes de Pollo', precio: 95 },
    { id: 10, nombre: 'Flautas Doradas de Pollo (4 pz)', precio: 85 },
    { id: 46, nombre: 'Mole Poblano con Pollo y Arroz', precio: 130 },
    { id: 47, nombre: 'Costillas de Puerco en Salsa Verde', precio: 125 },
    { id: 48, nombre: 'Birria de Res estilo Jalisco', precio: 135 },
  ]);

  const [catGuarniciones, setCatGuarniciones] = useState([
    { id: 51, nombre: 'Frijoles Refritos con Queso', precio: 30 },
    { id: 52, nombre: 'Arroz Rojo Tradicional', precio: 30 },
    { id: 53, nombre: 'Papas a la Mexicana', precio: 35 },
    { id: 54, nombre: 'Champiñones Salteados al Ajillo', precio: 35 },
    { id: 55, nombre: 'Nopales Asados con Orégano', precio: 30 },
  ]);

  const [catBebidas, setCatBebidas] = useState([
    { id: 11, nombre: 'Jugo de Naranja Natural (500ml)', precio: 35 },
    { id: 12, nombre: 'Café Americano de Olla', precio: 25 },
    { id: 13, nombre: 'Refresco Embotellado (600ml)', precio: 28 },
    { id: 14, nombre: 'Té Helado con Limón', precio: 30 },
    { id: 15, nombre: 'Agua Embotellada Ciel (600ml)', precio: 20 },
  ]);

  const [catExtras, setCatExtras] = useState([
    { id: 31, nombre: 'Porción de Aguacate', precio: 20 },
    { id: 32, nombre: 'Queso Gratinado Extra', precio: 15 },
    { id: 33, nombre: 'Porción de Tocino (3 tiras)', precio: 25 },
    { id: 34, nombre: 'Salsa Especial de la Casa', precio: 10 },
    { id: 35, nombre: 'Crema Fresca', precio: 10 },
  ]);

  // Estado para el Bottom Sheet desplegable desde abajo
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [activeTarget, setActiveTarget] = useState(null);
  // activeTarget: { paqueteId, fieldType ('entrada' | 'platoFuerte' | 'guarnicion1' | 'guarnicion2' | 'bebida' | 'extras') }

  // Cargar catálogo desde la BD al iniciar
  useEffect(() => {
    cargarAlimentosBD();
  }, []);

  const cargarAlimentosBD = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/alimentos`);
      const data = await res.json();

      if (res.ok && data.alimentos) {
        const bdEntradas = data.alimentos.filter((a) => a.tipo === 'Entrada');
        const bdComida = data.alimentos.filter((a) => a.tipo === 'Comida' || a.tipo === 'Platos Fuertes');
        const bdGuarniciones = data.alimentos.filter((a) => a.tipo === 'Guarnicion');
        const bdBebidas = data.alimentos.filter(
          (a) => (a.tipo === 'Bebida' || a.tipo === 'Bebidas') && Number(a.aplica_paquete !== undefined && a.aplica_paquete !== null ? a.aplica_paquete : 1) === 1
        );
        const bdExtras = data.alimentos.filter((a) => a.tipo === 'Extra');

        if (bdEntradas.length > 0) setCatEntradas(bdEntradas);
        if (bdComida.length > 0) setCatPlatosFuertes(bdComida);
        if (bdGuarniciones.length > 0) setCatGuarniciones(bdGuarniciones);
        if (bdBebidas.length > 0) setCatBebidas(bdBebidas);
        if (bdExtras.length > 0) setCatExtras(bdExtras);
      }
    } catch (err) {
      console.log('Utilizando catálogo local de respaldos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Agregar un nuevo paquete de comida en blanco
  const handleAgregarPaquete = () => {
    const nuevoPaquete = {
      id: Date.now(),
      numPaquete: paquetes.length + 1,
      entrada: null,
      platoFuerte: null,
      guarnicion1: null,
      guarnicion2: null,
      bebida: null,
      extras: [],
      comentarios: '',
    };
    setPaquetes([...paquetes, nuevoPaquete]);
  };

  // Eliminar un paquete (Botón X rojo)
  const handleEliminarPaquete = (id) => {
    const filtrados = paquetes.filter((p) => p.id !== id);
    const reordenados = filtrados.map((p, idx) => ({
      ...p,
      numPaquete: idx + 1,
    }));
    setPaquetes(reordenados);
  };

  // Abrir Bottom Sheet para un campo específico
  const abrirBottomSheet = (paqueteId, fieldType) => {
    setActiveTarget({ paqueteId, fieldType });
    setBottomSheetVisible(true);
  };

  // Seleccionar o deseleccionar una opción desde el Bottom Sheet
  const handleSeleccionarOpcionBottomSheet = (opcion) => {
    if (!activeTarget) return;

    const { paqueteId, fieldType } = activeTarget;

    setPaquetes((prev) =>
      prev.map((p) => {
        if (p.id !== paqueteId) return p;

        if (fieldType === 'entrada') {
          const esMismo = p.entrada?.id === opcion?.id;
          return { ...p, entrada: esMismo ? null : opcion };
        } else if (fieldType === 'platoFuerte') {
          const esMismo = p.platoFuerte?.id === opcion?.id;
          return { ...p, platoFuerte: esMismo ? null : opcion };
        } else if (fieldType === 'guarnicion1') {
          const esMismo = p.guarnicion1?.id === opcion?.id;
          return { ...p, guarnicion1: esMismo ? null : opcion };
        } else if (fieldType === 'guarnicion2') {
          const esMismo = p.guarnicion2?.id === opcion?.id;
          return { ...p, guarnicion2: esMismo ? null : opcion };
        } else if (fieldType === 'bebida') {
          const esMismo = p.bebida?.id === opcion?.id;
          return { ...p, bebida: esMismo ? null : opcion };
        } else if (fieldType === 'extras') {
          const yaExiste = p.extras.some((e) => e.nombre === opcion.nombre);
          const nuevosExtras = yaExiste
            ? p.extras.filter((e) => e.nombre !== opcion.nombre)
            : [...p.extras, opcion];
          return { ...p, extras: nuevosExtras };
        }
        return p;
      })
    );

    if (fieldType !== 'extras') {
      setBottomSheetVisible(false);
      setActiveTarget(null);
    }
  };

  // Dejar un campo completamente en blanco / limpiar selección
  const handleDeseleccionarCampo = () => {
    if (!activeTarget) return;

    const { paqueteId, fieldType } = activeTarget;

    setPaquetes((prev) =>
      prev.map((p) => {
        if (p.id !== paqueteId) return p;

        if (fieldType === 'entrada') return { ...p, entrada: null };
        if (fieldType === 'platoFuerte') return { ...p, platoFuerte: null };
        if (fieldType === 'guarnicion1') return { ...p, guarnicion1: null };
        if (fieldType === 'guarnicion2') return { ...p, guarnicion2: null };
        if (fieldType === 'bebida') return { ...p, bebida: null };
        if (fieldType === 'extras') return { ...p, extras: [] };

        return p;
      })
    );

    setBottomSheetVisible(false);
    setActiveTarget(null);
  };

  // Actualizar campo de comentarios en paquete
  const handleComentarioChange = (paqueteId, texto) => {
    setPaquetes((prev) =>
      prev.map((p) => (p.id === paqueteId ? { ...p, comentarios: texto } : p))
    );
  };

  // Helper para determinar si un paquete tiene todo lo requerido y calcular su precio base
  // (Si está completo, se suman los precio_paquete de cada elemento; si está incompleto, se suman los precios normales).
  const obtenerPrecioBasePaquete = (p) => {
    const tieneEntrada = p.entrada !== null;
    const tieneDosGuarniciones = p.guarnicion1 !== null && p.guarnicion2 !== null;
    const tieneBebida = p.bebida !== null;
    const paqueteCompleto = p.platoFuerte !== null && tieneEntrada && tieneDosGuarniciones && tieneBebida;

    const getPrecioElemento = (elem) => {
      if (!elem) return 0;
      const normal = Number(elem.precio || 0);
      const pkgPrice = (elem.precio_paquete !== null && elem.precio_paquete !== undefined && Number(elem.precio_paquete) > 0)
        ? Number(elem.precio_paquete)
        : normal;

      return paqueteCompleto ? pkgPrice : normal;
    };

    const pEntrada = getPrecioElemento(p.entrada);
    const pPlato = getPrecioElemento(p.platoFuerte);
    const pGuarnicion1 = getPrecioElemento(p.guarnicion1);
    const pGuarnicion2 = getPrecioElemento(p.guarnicion2);
    const pBebida = getPrecioElemento(p.bebida);

    return pEntrada + pPlato + pGuarnicion1 + pGuarnicion2 + pBebida;
  };

  const esPrecioPaqueteAplicado = (p) => {
    if (!p.platoFuerte) return false;
    const tieneEntrada = p.entrada !== null;
    const tieneDosGuarniciones = p.guarnicion1 !== null && p.guarnicion2 !== null;
    const tieneBebida = p.bebida !== null;
    return p.platoFuerte !== null && tieneEntrada && tieneDosGuarniciones && tieneBebida;
  };

  const getPrecioActivoElemento = (elem, p) => {
    if (!elem) return 0;
    const normal = Number(elem.precio || 0);
    const pkgPrice = (elem.precio_paquete !== null && elem.precio_paquete !== undefined && Number(elem.precio_paquete) > 0)
      ? Number(elem.precio_paquete)
      : normal;

    return esPrecioPaqueteAplicado(p) ? pkgPrice : normal;
  };

  // Calcular total de la comanda (Precio Base + Extras)
  const calcularTotal = () => {
    return paquetes.reduce((sum, p) => {
      const precioBase = obtenerPrecioBasePaquete(p);
      const precioExtras = p.extras.reduce((eSum, e) => eSum + Number(e.precio), 0);
      return sum + precioBase + precioExtras;
    }, 0);
  };

  const tieneContenido = (p) => {
    return (
      p.entrada !== null ||
      p.platoFuerte !== null ||
      p.guarnicion1 !== null ||
      p.guarnicion2 !== null ||
      p.bebida !== null ||
      (p.extras && p.extras.length > 0)
    );
  };

  // Verificar si la orden es válida para enviar
  const esPedidoValido = () => {
    if (paquetes.length === 0) return false;
    return paquetes.some(tieneContenido);
  };

  // Enviar pedido a cocina guardando en BD
  const handleEnviarPedido = async () => {
    if (!selectedMesa) {
      showSinMesaModal();
      return;
    }
    if (!esPedidoValido()) return;

    try {
      const itemsPayload = paquetes
        .filter(tieneContenido)
        .map((p, idx) => {
          const precioBase = obtenerPrecioBasePaquete(p);
          const precioExtras = p.extras.reduce((eSum, e) => eSum + Number(e.precio), 0);
          const costoPaquete = precioBase + precioExtras;

          const extrasAdicionales = p.extras.map((e) => e.nombre).join(', ');

          const alimentoConZona = p.platoFuerte
            ? `${p.platoFuerte.nombre}-${(p.platoFuerte.zona || 'cocina').toLowerCase()}`
            : null;

          let entradaConZona = null;
          if (p.entrada?.nombre) {
            const zonaEntrada = (p.entrada.zona || 'cocina').toLowerCase();
            entradaConZona = `${p.entrada.nombre}-${zonaEntrada}`;
          }

          let bebidaConZona = null;
          if (p.bebida?.nombre) {
            const zonaBebida = (p.bebida.zona || 'barra').toLowerCase();
            bebidaConZona = `${p.bebida.nombre}-${zonaBebida}`;
          }

          return {
            alimento: alimentoConZona,
            costo: costoPaquete,
            entrada: entradaConZona,
            guarnicion1: p.guarnicion1?.nombre || null,
            guarnicion2: p.guarnicion2?.nombre || null,
            bebida: bebidaConZona,
            extras: extrasAdicionales || '',
            comentarios: p.comentarios || '',
          };
        });

      const numMesa = selectedMesa ? selectedMesa.num_mesa : 1;

      const res = await fetch(`${API_URL}/pedidos/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_mesa: numMesa,
          cuenta_id: 3,
          items: itemsPayload,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setPaquetes([]);
        showSuccessNotification(
          '¡Pedido Enviado!',
          `Comanda de Comida registrada exitosamente para ${selectedMesa ? selectedMesa.nombre : 'Mesa ' + numMesa}. Total: $${calcularTotal()}.00`
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo registrar la comanda');
      }
    } catch (err) {
      console.error('Error al enviar comanda de comida:', err);
      Alert.alert('Error de conexión', 'Verifica la conexión con el backend.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
    >
      {/* HEADER SUPERIOR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.volverBtn} onPress={onVolverMenu} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" style={{ marginRight: 4 }} />
          <Text style={styles.volverBtnText}>Menú</Text>
        </TouchableOpacity>

        <Text style={styles.topTitle}>Comida</Text>
      </View>

      {/* CONTENIDO PRINCIPAL CON LISTA DE FORMULARIOS DE PAQUETES */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mesaSubtitle}>
          <Text style={styles.mesaBold}>{selectedMesa ? (Number(selectedMesa.num_mesa) >= 100 ? 'Para Llevar #' + selectedMesa.num_mesa : (selectedMesa.nombre || 'Mesa #' + selectedMesa.num_mesa)) : 'Sin Mesa'}</Text>
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#EA580C" style={{ marginVertical: 20 }} />
        ) : null}

        {/* LISTA DE CARDS DE PAQUETES DE COMIDA */}
        <View style={styles.packagesGrid}>
        {paquetes.map((p) => {
          const isActiveField = (field) =>
            activeTarget?.paqueteId === p.id && activeTarget?.fieldType === field;

          return (
            <View key={p.id} style={[styles.packageCard, { width: cardWidthResponsive }]}>
              {/* ENCABEZADO NEGRO CON BOTÓN DE BASURA ROJO */}
              <View style={styles.packageHeaderRow}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="restaurant-outline" size={20} color="#EA580C" style={{ marginRight: 8 }} />
                  <Text style={styles.packageHeaderTitle}>Paquete {p.numPaquete}: ${obtenerPrecioBasePaquete(p)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteXButton}
                  onPress={() => handleEliminarPaquete(p.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.packageBody}>
                {/* 1. CAMPO ENTRADA */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Entrada:</Text>
                  <TouchableOpacity
                    style={[styles.fieldSlot, isActiveField('entrada') && styles.fieldSlotActive]}
                    onPress={() => abrirBottomSheet(p.id, 'entrada')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.fieldSlotText,
                        p.entrada && styles.fieldSlotTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {p.entrada ? `${p.entrada.nombre} ($${getPrecioActivoElemento(p.entrada, p)})` : 'Seleccionar Entrada'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* 2. CAMPO PLATO FUERTE (TIPO COMIDA) */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Plato Fuerte (Comida):</Text>
                  <TouchableOpacity
                    style={[styles.fieldSlot, isActiveField('platoFuerte') && styles.fieldSlotActive]}
                    onPress={() => abrirBottomSheet(p.id, 'platoFuerte')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.fieldSlotText,
                        p.platoFuerte && styles.fieldSlotTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {p.platoFuerte ? `${p.platoFuerte.nombre} ($${getPrecioActivoElemento(p.platoFuerte, p)})` : 'Seleccionar Plato Fuerte'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* 3. CAMPO GUARNICIONES (2 RANURAS) */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Guarniciones:</Text>
                  <View style={styles.guarnicionesCol}>
                    {/* Guarnición 1 */}
                    <TouchableOpacity
                      style={[styles.fieldSlot, isActiveField('guarnicion1') && styles.fieldSlotActive]}
                      onPress={() => abrirBottomSheet(p.id, 'guarnicion1')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.fieldSlotText, p.guarnicion1 && styles.fieldSlotTextSelected]}
                        numberOfLines={1}
                      >
                        {p.guarnicion1
                          ? `1. ${p.guarnicion1.nombre} ($${getPrecioActivoElemento(p.guarnicion1, p)})`
                          : 'Seleccionar Guarnición 1'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>

                    {/* Guarnición 2 */}
                    <TouchableOpacity
                      style={[styles.fieldSlot, isActiveField('guarnicion2') && styles.fieldSlotActive]}
                      onPress={() => abrirBottomSheet(p.id, 'guarnicion2')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.fieldSlotText, p.guarnicion2 && styles.fieldSlotTextSelected]}
                        numberOfLines={1}
                      >
                        {p.guarnicion2
                          ? `2. ${p.guarnicion2.nombre} ($${getPrecioActivoElemento(p.guarnicion2, p)})`
                          : 'Seleccionar Guarnición 2'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. CAMPO BEBIDA */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Bebida:</Text>
                  <TouchableOpacity
                    style={[styles.fieldSlot, isActiveField('bebida') && styles.fieldSlotActive]}
                    onPress={() => abrirBottomSheet(p.id, 'bebida')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.fieldSlotText, p.bebida && styles.fieldSlotTextSelected]}
                      numberOfLines={1}
                    >
                      {p.bebida ? `${p.bebida.nombre} ($${getPrecioActivoElemento(p.bebida, p)})` : 'Seleccionar Bebida'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* 5. CAMPO EXTRAS */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Extras:</Text>
                  <TouchableOpacity
                    style={[styles.fieldSlot, isActiveField('extras') && styles.fieldSlotActive]}
                    onPress={() => abrirBottomSheet(p.id, 'extras')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.fieldSlotText,
                        p.extras.length > 0 && styles.fieldSlotTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {p.extras.length > 0
                        ? p.extras.map((e) => `${e.nombre} (+$${e.precio})`).join(', ')
                        : 'Seleccionar Extras (+)'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* 6. CAMPO COMENTARIOS */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Comentarios:</Text>
                  <TextInput
                    style={styles.comentariosInputInline}
                    placeholder="Aclaraciones para cocina (ej. sin picante)..."
                    placeholderTextColor="#94A3B8"
                    value={p.comentarios}
                    onChangeText={(txt) => handleComentarioChange(p.id, txt)}
                  />
                </View>
              </View>
            </View>
          );
        })}
        </View>

        {/* BOTÓN AGREGAR PAQUETE */}
        <TouchableOpacity
          style={styles.btnAgregarPaquete}
          onPress={handleAgregarPaquete}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.btnAgregarPaqueteText}>Agregar Platillo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* FOOTER FIJO INFERIOR CON BOTÓN ENVIAR PEDIDO */}
      <View style={styles.fixedBottomBar}>
        {paquetes.length > 0 && (
          <View style={styles.totalSummaryRow}>
            <Text style={styles.totalSummaryLabel}>Total Comanda:</Text>
            <Text style={styles.totalSummaryValue}>${calcularTotal()}.00</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnEnviarPedido, !esPedidoValido() && styles.btnEnviarPedidoDisabled]}
          onPress={handleEnviarPedido}
          disabled={!esPedidoValido()}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.btnEnviarPedidoText,
              !esPedidoValido() && styles.btnEnviarPedidoTextDisabled,
            ]}
          >
            Enviar Pedido
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM SHEET DESPLEGABLE DESDE ABAJO */}
      <Modal
        visible={bottomSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setBottomSheetVisible(false);
          setActiveTarget(null);
        }}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContainer}>
            {/* Header del Bottom Sheet */}
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>
                {activeTarget?.fieldType === 'entrada' && 'Seleccionar Entrada'}
                {activeTarget?.fieldType === 'platoFuerte' && 'Seleccionar Plato Fuerte'}
                {activeTarget?.fieldType === 'guarnicion1' && 'Seleccionar Guarnición 1'}
                {activeTarget?.fieldType === 'guarnicion2' && 'Seleccionar Guarnición 2'}
                {activeTarget?.fieldType === 'bebida' && 'Seleccionar Bebida'}
                {activeTarget?.fieldType === 'extras' && 'Seleccionar Extras'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setBottomSheetVisible(false);
                  setActiveTarget(null);
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Opciones desplegables */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomSheetList}>
              {/* Opción de Borrar / Limpiar */}
              <TouchableOpacity
                style={styles.sheetClearRow}
                onPress={handleDeseleccionarCampo}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.sheetClearText}>Borrar</Text>
              </TouchableOpacity>

              {/* ENTRADAS */}
              {activeTarget?.fieldType === 'entrada' &&
                catEntradas.map((item) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isSelected = pActual?.entrada?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sheetItemRow, isSelected && styles.sheetItemRowSelected]}
                      onPress={() => handleSeleccionarOpcionBottomSheet(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sheetItemTitle, isSelected && styles.sheetItemTitleSelected]}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.sheetItemPrice}>${item.precio}</Text>
                    </TouchableOpacity>
                  );
                })}

              {/* PLATOS FUERTES (COMIDA) */}
              {activeTarget?.fieldType === 'platoFuerte' &&
                catPlatosFuertes.map((item) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isSelected = pActual?.platoFuerte?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sheetItemRow, isSelected && styles.sheetItemRowSelected]}
                      onPress={() => handleSeleccionarOpcionBottomSheet(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sheetItemTitle, isSelected && styles.sheetItemTitleSelected]}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.sheetItemPrice}>${item.precio}</Text>
                    </TouchableOpacity>
                  );
                })}

              {/* GUARNICIONES */}
              {(activeTarget?.fieldType === 'guarnicion1' ||
                activeTarget?.fieldType === 'guarnicion2') &&
                catGuarniciones.map((g) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isSelected =
                    activeTarget?.fieldType === 'guarnicion1'
                      ? pActual?.guarnicion1?.id === g.id
                      : pActual?.guarnicion2?.id === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id || g.nombre}
                      style={[styles.sheetItemRow, isSelected && styles.sheetItemRowSelected]}
                      onPress={() => handleSeleccionarOpcionBottomSheet(g)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sheetItemTitle, isSelected && styles.sheetItemTitleSelected]}>
                        {g.nombre}
                      </Text>
                      <Text style={styles.sheetItemPrice}>${g.precio}</Text>
                    </TouchableOpacity>
                  );
                })}

              {/* BEBIDAS */}
              {activeTarget?.fieldType === 'bebida' &&
                catBebidas.map((b) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isSelected = pActual?.bebida?.id === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id || b.nombre}
                      style={[styles.sheetItemRow, isSelected && styles.sheetItemRowSelected]}
                      onPress={() => handleSeleccionarOpcionBottomSheet(b)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sheetItemTitle, isSelected && styles.sheetItemTitleSelected]}>
                        {b.nombre}
                      </Text>
                      <Text style={styles.sheetItemPrice}>${b.precio}</Text>
                    </TouchableOpacity>
                  );
                })}

              {/* EXTRAS */}
              {activeTarget?.fieldType === 'extras' &&
                catExtras.map((extra) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isChecked = pActual?.extras.some((e) => e.nombre === extra.nombre);
                  return (
                    <TouchableOpacity
                      key={extra.id}
                      style={[styles.sheetItemRow, isChecked && styles.sheetItemRowChecked]}
                      onPress={() => handleSeleccionarOpcionBottomSheet(extra)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <Ionicons
                          name={isChecked ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isChecked ? '#EA580C' : '#94A3B8'}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={styles.sheetItemTitle}>{extra.nombre}</Text>
                      </View>
                      <Text style={styles.sheetItemPrice}>+${extra.precio}</Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  volverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 14,
  },
  volverBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 220,
  },
  mesaSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  mesaBold: {
    fontWeight: '800',
    color: '#0F172A',
  },

  /* PAQUETE CARD ESTILIZADA CON HEADER NEGRO Y BOTÓN X ROJO */
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  packageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteXButton: {
    backgroundColor: '#DC2626',
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* PACKAGE BODY FIELDS */
  packageBody: {
    padding: 16,
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  fieldSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  fieldSlotActive: {
    borderColor: '#EA580C',
    borderWidth: 2,
    backgroundColor: '#FFEDD5',
  },
  fieldSlotText: {
    fontSize: 13,
    color: '#94A3B8',
    flex: 1,
    marginRight: 6,
  },
  fieldSlotTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  guarnicionesCol: {
    gap: 8,
  },

  comentariosInputInline: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },

  /* BOTÓN AGREGAR PAQUETE */
  btnAgregarPaquete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 16,
    marginVertical: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnAgregarPaqueteText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* FIXED BOTTOM BAR */
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalSummaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  totalSummaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  btnEnviarPedido: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    height: 52,
    borderRadius: 16,
  },
  btnEnviarPedidoDisabled: {
    backgroundColor: '#E2E8F0',
  },
  btnEnviarPedidoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnEnviarPedidoTextDisabled: {
    color: '#94A3B8',
  },

  /* BOTTOM SHEET STYLES */
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '65%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomSheetList: {
    paddingBottom: 20,
  },
  sheetClearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  sheetClearText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  sheetItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  sheetItemRowSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  sheetItemRowChecked: {
    borderColor: '#EA580C',
    backgroundColor: '#FFEDD5',
  },
  sheetItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  sheetItemTitleSelected: {
    color: '#065F46',
    fontWeight: '800',
  },
  sheetItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EA580C',
  },
});
