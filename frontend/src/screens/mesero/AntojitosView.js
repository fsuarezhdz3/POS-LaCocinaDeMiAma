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

export default function AntojitosView({ onVolverMenu }) {
  const { width } = useWindowDimensions();
  const cardWidthResponsive = width > 900 ? '48.8%' : '100%';
  const { selectedMesa, setActiveTab, showSuccessNotification, showSinMesaModal } = useContext(MeseroContext);

  // Lista de paquetes de antojitos (Paquete 1, Paquete 2, ...)
  const [paquetes, setPaquetes] = useState([]);

  // Catálogos desde la BD
  const [loading, setLoading] = useState(false);
  const [catAntojitos, setCatAntojitos] = useState([
    { id: 21, nombre: 'Sopes Tradicionales (3 pz)', precio: 65 },
    { id: 22, nombre: 'Gorditas de Maíz (2 pz)', precio: 60 },
    { id: 23, nombre: 'Tlacoyos con Nopales (2 pz)', precio: 55 },
    { id: 24, nombre: 'Quesadillas Fritas (2 pz)', precio: 65 },
    { id: 25, nombre: 'Pambazo Preparado', precio: 50 },
  ]);

  const [catGuisos, setCatGuisos] = useState([
    { id: 6, nombre: 'Chicharrón Prensado en Salsa Roja', precio: 0, precio_antojito: 15 },
    { id: 7, nombre: 'Tinga de Pollo Deshebrada', precio: 0, precio_antojito: 15 },
    { id: 8, nombre: 'Picadillo a la Mexicana', precio: 0, precio_antojito: 10 },
    { id: 9, nombre: 'Papas con Chorizo', precio: 0, precio_antojito: 10 },
    { id: 10, nombre: 'Barbacoa de Res', precio: 0, precio_antojito: 20 },
    { id: 46, nombre: 'Chicharrón en Salsa Verde', precio: 0, precio_antojito: 15 },
    { id: 47, nombre: 'Queso Oaxaca Gratinado', precio: 0, precio_antojito: 10 },
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
  // activeTarget: { paqueteId, fieldType ('antojito' | 'guisado' | 'extras') }

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
        const bdAntojitos = data.alimentos.filter((a) => a.tipo === 'Antojito');
        const bdGuisos = data.alimentos.filter(
          (a) => (a.tipo === 'Comida' || a.tipo === 'Platos Fuertes') && (a.aplica_paquete_antojito === undefined || a.aplica_paquete_antojito === null || Number(a.aplica_paquete_antojito) === 1)
        );
        const bdExtras = data.alimentos.filter((a) => a.tipo === 'Extra');

        if (bdAntojitos.length > 0) setCatAntojitos(bdAntojitos);
        if (bdGuisos.length > 0) setCatGuisos(bdGuisos);
        if (bdExtras.length > 0) setCatExtras(bdExtras);
      }
    } catch (err) {
      console.log('Utilizando catálogo local de respaldos para antojitos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Agregar un nuevo paquete de antojito en blanco
  const handleAgregarPaquete = () => {
    const nuevoPaquete = {
      id: Date.now(),
      numPaquete: paquetes.length + 1,
      antojito: null,
      modalidad: 'Sencillo', // 'Sencillo' o 'Con Guisado'
      guisado: null,
      extras: [],
      comentarios: '',
    };
    setPaquetes([...paquetes, nuevoPaquete]);
  };

  // Eliminar un paquete (Botón basura rojo)
  const handleEliminarPaquete = (id) => {
    const filtrados = paquetes.filter((p) => p.id !== id);
    const reordenados = filtrados.map((p, idx) => ({
      ...p,
      numPaquete: idx + 1,
    }));
    setPaquetes(reordenados);
  };

  // Cambiar modalidad de preparación (Sencillo vs Con Guisado) con los 2 botones
  const handleCambiarModalidad = (paqueteId, nuevaModalidad) => {
    setPaquetes((prev) =>
      prev.map((p) => {
        if (p.id !== paqueteId) return p;
        return {
          ...p,
          modalidad: nuevaModalidad,
          guisado: nuevaModalidad === 'Con Guisado' ? p.guisado : null,
        };
      })
    );
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

        if (fieldType === 'antojito') {
          const esMismo = p.antojito?.id === opcion?.id;
          return { ...p, antojito: esMismo ? null : opcion };
        } else if (fieldType === 'guisado') {
          const esMismo = p.guisado?.id === opcion?.id;
          return { ...p, guisado: esMismo ? null : opcion };
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

  // Dejar un campo en blanco / limpiar selección
  const handleDeseleccionarCampo = () => {
    if (!activeTarget) return;

    const { paqueteId, fieldType } = activeTarget;

    setPaquetes((prev) =>
      prev.map((p) => {
        if (p.id !== paqueteId) return p;

        if (fieldType === 'antojito') return { ...p, antojito: null };
        if (fieldType === 'guisado') return { ...p, guisado: null };
        if (fieldType === 'extras') return { ...p, extras: [] };

        return p;
      })
    );

    setBottomSheetVisible(false);
    setActiveTarget(null);
  };

  // Actualizar campo de comentarios
  const handleComentarioChange = (paqueteId, texto) => {
    setPaquetes((prev) =>
      prev.map((p) => (p.id === paqueteId ? { ...p, comentarios: texto } : p))
    );
  };

  // Helper para obtener el costo extra por el guisado (priorizando el precio_antojito del guisado)
  const obtenerPrecioGuisadoExtra = (p) => {
    if (p.modalidad !== 'Con Guisado' || !p.guisado) return 0;

    // 1. Si el guisado seleccionado tiene precio_antojito configurado
    if (p.guisado.precio_antojito !== null && p.guisado.precio_antojito !== undefined && Number(p.guisado.precio_antojito) >= 0) {
      return Number(p.guisado.precio_antojito);
    }
    // 2. Si el antojito seleccionado tiene precio_antojito configurado como respaldo
    if (p.antojito && p.antojito.precio_antojito !== null && p.antojito.precio_antojito !== undefined && Number(p.antojito.precio_antojito) > 0) {
      return Number(p.antojito.precio_antojito);
    }
    return 0;
  };

  // Helper para calcular el precio base del antojito (sencillo o con guisado)
  const obtenerPrecioBaseAntojito = (p) => {
    if (!p.antojito) return 0;

    const normal = Number(p.antojito.precio || 0);
    const guisadoExtra = obtenerPrecioGuisadoExtra(p);

    return normal + guisadoExtra;
  };

  // Calcular total acumulado de antojitos
  const calcularTotal = () => {
    return paquetes.reduce((sum, p) => {
      const precioBase = obtenerPrecioBaseAntojito(p);
      const precioExtras = p.extras.reduce((eSum, e) => eSum + Number(e.precio), 0);
      return sum + precioBase + precioExtras;
    }, 0);
  };

  const tieneContenido = (p) => {
    return (
      p.antojito !== null ||
      p.guisado !== null ||
      (p.extras && p.extras.length > 0)
    );
  };

  // Verificar si el pedido es válido
  const esPedidoValido = () => {
    if (paquetes.length === 0) return false;
    return paquetes.some(tieneContenido);
  };

  // Enviar pedido a comal / cocina guardando en BD
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
          const precioBase = obtenerPrecioBaseAntojito(p);
          const precioExtras = p.extras.reduce((eSum, e) => eSum + Number(e.precio), 0);
          const costoPaquete = precioBase + precioExtras;

          // Si es sencillo, guardar 'Sencillo'; si es con guisado, guardar el nombre del guisado
          const guisoFinal = p.modalidad === 'Con Guisado' && p.guisado ? p.guisado.nombre : 'Sencillo';
          const extrasAdicionales = p.extras.map((e) => e.nombre).join(', ');

          const meZona = (p.antojito?.zona || 'comal').toLowerCase();
          const alimentoConZona = p.antojito
            ? `${p.antojito.nombre}-${meZona}`
            : null;

          return {
            alimento: alimentoConZona,
            costo: costoPaquete,
            guiso: guisoFinal,
            extras: extrasAdicionales,
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
          `Comanda de Antojitos registrada exitosamente para ${selectedMesa ? selectedMesa.nombre : 'Mesa ' + numMesa}. Total: $${calcularTotal()}.00`
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo registrar la comanda');
      }
    } catch (err) {
      console.error('Error al enviar comanda de antojitos:', err);
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

        <Text style={styles.topTitle}>Antojitos</Text>
      </View>

      {/* CONTENIDO PRINCIPAL CON LISTA DE CARDS DE ANTOJITOS */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mesaSubtitle}>
          <Text style={styles.mesaBold}>{selectedMesa ? (Number(selectedMesa.num_mesa) >= 100 ? 'Para Llevar #' + selectedMesa.num_mesa : (selectedMesa.nombre || 'Mesa #' + selectedMesa.num_mesa)) : 'Sin Mesa'}</Text>
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#DC2626" style={{ marginVertical: 20 }} />
        ) : null}

        {/* LISTA DE FORMULARIOS DE ANTOJITOS */}
        <View style={styles.packagesGrid}>
        {paquetes.map((p) => {
          const isActiveField = (field) =>
            activeTarget?.paqueteId === p.id && activeTarget?.fieldType === field;

          return (
            <View key={p.id} style={[styles.packageCard, { width: cardWidthResponsive }]}>
              {/* ENCABEZADO NEGRO CON BOTÓN BASURA ROJO */}
              <View style={styles.packageHeaderRow}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="fast-food-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={styles.packageHeaderTitle}>Paquete {p.numPaquete}: ${obtenerPrecioBaseAntojito(p)}</Text>
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
                {/* 1. CAMPO ANTOJITO */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Antojito:</Text>
                  <TouchableOpacity
                    style={[styles.fieldSlot, isActiveField('antojito') && styles.fieldSlotActive]}
                    onPress={() => abrirBottomSheet(p.id, 'antojito')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.fieldSlotText,
                        p.antojito && styles.fieldSlotTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {p.antojito ? `${p.antojito.nombre} ($${obtenerPrecioBaseAntojito(p)})` : 'Seleccionar Antojito'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* 2. MODALIDAD PREPARACIÓN (2 BOTONES: SENCILLO O CON GUISADO) */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Preparación:</Text>
                  <View style={styles.modalidadSegmentRow}>
                    <TouchableOpacity
                      style={[
                        styles.btnSegment,
                        p.modalidad === 'Sencillo' && styles.btnSegmentActive,
                      ]}
                      onPress={() => handleCambiarModalidad(p.id, 'Sencillo')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="ellipse"
                        size={12}
                        color={p.modalidad === 'Sencillo' ? '#DC2626' : '#94A3B8'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.btnSegmentText,
                          p.modalidad === 'Sencillo' && styles.btnSegmentTextActive,
                        ]}
                      >
                        Sencillo
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.btnSegment,
                        p.modalidad === 'Con Guisado' && styles.btnSegmentActive,
                      ]}
                      onPress={() => handleCambiarModalidad(p.id, 'Con Guisado')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="restaurant"
                        size={14}
                        color={p.modalidad === 'Con Guisado' ? '#DC2626' : '#94A3B8'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.btnSegmentText,
                          p.modalidad === 'Con Guisado' && styles.btnSegmentTextActive,
                        ]}
                      >
                        Con Guisado
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. CAMPO GUISADO (CONDICIONAL: SOLO SI MODALIDAD ES 'CON GUISADO') */}
                {p.modalidad === 'Con Guisado' && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Guisado (Comida):</Text>
                    <TouchableOpacity
                      style={[styles.fieldSlot, isActiveField('guisado') && styles.fieldSlotActive]}
                      onPress={() => abrirBottomSheet(p.id, 'guisado')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.fieldSlotText,
                          p.guisado && styles.fieldSlotTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {p.guisado
                          ? `${p.guisado.nombre}${obtenerPrecioGuisadoExtra(p) > 0 ? ` (+$${obtenerPrecioGuisadoExtra(p)})` : ''}`
                          : 'Seleccionar Guisado'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* 4. CAMPO EXTRAS */}
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

                {/* 5. CAMPO COMENTARIOS */}
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Comentarios:</Text>
                  <TextInput
                    style={styles.comentariosInputInline}
                    placeholder="Aclaraciones para cocina (ej. sin crema)..."
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
                {activeTarget?.fieldType === 'antojito' && 'Seleccionar Antojito (BD)'}
                {activeTarget?.fieldType === 'guisado' && 'Seleccionar Guisado (BD)'}
                {activeTarget?.fieldType === 'extras' && 'Seleccionar Extras (BD)'}
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

              {/* ANTOJITOS */}
              {activeTarget?.fieldType === 'antojito' &&
                catAntojitos.map((item) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isSelected = pActual?.antojito?.id === item.id;
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
                      <Text style={styles.sheetItemPrice}>
                        ${item.precio}{item.precio_antojito && Number(item.precio_antojito) > 0 ? ` (+${item.precio_antojito} c/guisado)` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              {/* GUISADOS (TIPO COMIDA) */}
              {activeTarget?.fieldType === 'guisado' &&
                catGuisos.map((item) => {
                  const pActual = paquetes.find((p) => p.id === activeTarget?.paqueteId);
                  const isSelected = pActual?.guisado?.id === item.id;
                  const precioExtraGuiso = (item.precio_antojito !== null && item.precio_antojito !== undefined && Number(item.precio_antojito) > 0)
                    ? Number(item.precio_antojito)
                    : (pActual?.antojito?.precio_antojito && Number(pActual.antojito.precio_antojito) > 0 ? Number(pActual.antojito.precio_antojito) : 0);

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
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.sheetItemPrice}>
                          {precioExtraGuiso > 0 ? `+$${precioExtraGuiso}` : '$0'}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginLeft: 8 }} />}
                      </View>
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
                          color={isChecked ? '#DC2626' : '#94A3B8'}
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

  /* PAQUETE CARD ESTILIZADA CON HEADER NEGRO Y BOTÓN BASURA ROJO */
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
    borderColor: '#DC2626',
    borderWidth: 2,
    backgroundColor: '#FEE2E2',
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

  /* MODALIDAD SEGMENT BUTTONS (2 BOTONES INLINE) */
  modalidadSegmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 8,
  },
  btnSegmentActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1.5,
  },
  btnSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  btnSegmentTextActive: {
    color: '#991B1B',
    fontWeight: '800',
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
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
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
    color: '#DC2626',
  },
});
