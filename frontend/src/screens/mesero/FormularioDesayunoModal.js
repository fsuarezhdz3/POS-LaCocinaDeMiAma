import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config/api';

export default function FormularioDesayunoModal({ visible, onClose, onGuardar }) {
  const [loading, setLoading] = useState(false);

  // Catálogos obtenidos de la BD
  const [opcionesDesayuno, setOpcionesDesayuno] = useState([
    { id: 1, nombre: 'Chilaquiles Verdes con Huevo', precio: 85 },
    { id: 2, nombre: 'Huevos al Gusto con Jamón o Tocino', precio: 75 },
    { id: 3, nombre: 'Omelette de Queso y Champiñones', precio: 90 },
    { id: 4, nombre: 'Huevos Rancheros sobre Tortilla', precio: 80 },
    { id: 5, nombre: 'Hot Cakes Tradicionales con Mantequilla', precio: 70 },
  ]);

  const [opcionesGuarnicion, setOpcionesGuarnicion] = useState([
    'Frijoles Refritos con Queso',
    'Arroz Rojo Tradicional',
    'Papas a la Mexicana',
    'Champiñones Salteados al Ajillo',
    'Nopales Asados con Orégano',
  ]);

  const [opcionesBebida, setOpcionesBebida] = useState([
    'Jugo de Naranja Natural (500ml)',
    'Café Americano de Olla',
    'Refresco Embotellado (600ml)',
    'Té Helado con Limón',
    'Agua Embotellada Ciel (600ml)',
  ]);

  const [opcionesExtras, setOpcionesExtras] = useState([
    { id: 31, nombre: 'Porción de Aguacate', precio: 20 },
    { id: 32, nombre: 'Queso Gratinado Extra', precio: 15 },
    { id: 33, nombre: 'Porción de Tocino (3 tiras)', precio: 25 },
    { id: 34, nombre: 'Salsa Especial de la Casa', precio: 10 },
    { id: 35, nombre: 'Crema Fresca', precio: 10 },
  ]);

  // Selección del formulario
  const [desayunoSel, setDesayunoSel] = useState(null);
  const [guarnicion1, setGuarnicion1] = useState('');
  const [guarnicion2, setGuarnicion2] = useState('');
  const [bebidaSel, setBebidaSel] = useState('');
  const [extrasSel, setExtrasSel] = useState([]);
  const [comentarios, setComentarios] = useState('');

  // Cargar catálogo desde la base de datos al abrir el modal
  useEffect(() => {
    if (visible) {
      cargarAlimentosBD();
    }
  }, [visible]);

  const cargarAlimentosBD = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/alimentos`);
      const data = await res.json();

      if (res.ok && data.alimentos) {
        const bdDesayunos = data.alimentos.filter((a) => a.tipo === 'Desayuno');
        const bdGuarniciones = data.alimentos.filter((a) => a.tipo === 'Guarnicion');
        const bdBebidas = data.alimentos.filter(
          (a) => (a.tipo === 'Bebida' || a.tipo === 'Bebidas') && Number(a.aplica_paquete !== undefined && a.aplica_paquete !== null ? a.aplica_paquete : 1) === 1
        );
        const bdExtras = data.alimentos.filter((a) => a.tipo === 'Extra');

        if (bdDesayunos.length > 0) {
          setOpcionesDesayuno(bdDesayunos);
          setDesayunoSel(bdDesayunos[0]);
        }
        if (bdGuarniciones.length > 0) {
          const nombresG = bdGuarniciones.map((g) => g.nombre);
          setOpcionesGuarnicion(nombresG);
          setGuarnicion1(nombresG[0]);
          setGuarnicion2(nombresG[1] || nombresG[0]);
        }
        if (bdBebidas.length > 0) {
          const nombresB = bdBebidas.map((b) => b.nombre);
          setOpcionesBebida(nombresB);
          setBebidaSel(nombresB[0]);
        }
        if (bdExtras.length > 0) {
          setOpcionesExtras(bdExtras);
        }
      }
    } catch (err) {
      console.log('Utilizando catálogo local de respaldos para alimentos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Valores por defecto iniciales
  useEffect(() => {
    if (!desayunoSel && opcionesDesayuno.length > 0) setDesayunoSel(opcionesDesayuno[0]);
    if (!guarnicion1 && opcionesGuarnicion.length > 0) setGuarnicion1(opcionesGuarnicion[0]);
    if (!guarnicion2 && opcionesGuarnicion.length > 1) setGuarnicion2(opcionesGuarnicion[1]);
    if (!bebidaSel && opcionesBebida.length > 0) setBebidaSel(opcionesBebida[0]);
  }, [opcionesDesayuno, opcionesGuarnicion, opcionesBebida]);

  const toggleExtra = (extra) => {
    if (extrasSel.some((e) => e.nombre === extra.nombre)) {
      setExtrasSel(extrasSel.filter((e) => e.nombre !== extra.nombre));
    } else {
      setExtrasSel([...extrasSel, extra]);
    }
  };

  const handleGuardar = () => {
    if (!desayunoSel) return;

    const totalExtras = extrasSel.reduce((sum, e) => sum + Number(e.precio), 0);
    const precioTotal = Number(desayunoSel.precio) + totalExtras;

    const platilloConfigurado = {
      id: Date.now(),
      tipo: 'Desayuno',
      principal: desayunoSel.nombre,
      guarniciones: [guarnicion1, guarnicion2],
      bebida: bebidaSel,
      extras: extrasSel,
      comentarios: comentarios.trim(),
      precio: precioTotal,
    };

    onGuardar(platilloConfigurado);
    setComentarios('');
    setExtrasSel([]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="egg-outline" size={24} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Configurar Desayuno</Text>
            </View>

            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#D97706" />
              <Text style={styles.loadingText}>Cargando opciones desde la BD...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
              {/* 1. SELECCIÓN DE DESAYUNO PRINCIPAL */}
              <Text style={styles.sectionLabel}>1. Elige el Desayuno Principal (BD)</Text>
              <View style={styles.optionsGrid}>
                {opcionesDesayuno.map((item) => {
                  const isSelected = desayunoSel?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.radioCard, isSelected && styles.radioCardSelected]}
                      onPress={() => setDesayunoSel(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? '#D97706' : '#94A3B8'}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.radioText, isSelected && styles.radioTextSelected]}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.precioText}>${item.precio}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2. SELECCIÓN DE 2 GUARNICIONES */}
              <Text style={styles.sectionLabel}>2. Elige 2 Guarniciones (BD)</Text>

              <Text style={styles.subLabel}>Guarnición 1:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {opcionesGuarnicion.map((g) => {
                  const isSelected = guarnicion1 === g;
                  return (
                    <TouchableOpacity
                      key={`g1-${g}`}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setGuarnicion1(g)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.subLabel}>Guarnición 2:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {opcionesGuarnicion.map((g) => {
                  const isSelected = guarnicion2 === g;
                  return (
                    <TouchableOpacity
                      key={`g2-${g}`}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setGuarnicion2(g)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 3. SELECCIÓN DE BEBIDA */}
              <Text style={styles.sectionLabel}>3. Elige la Bebida (BD)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {opcionesBebida.map((b) => {
                  const isSelected = bebidaSel === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setBebidaSel(b)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{b}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 4. EXTRAS OPCIONALES */}
              <Text style={styles.sectionLabel}>4. Extras Opcionales (BD)</Text>
              <View style={styles.extrasContainer}>
                {opcionesExtras.map((extra) => {
                  const isSelected = extrasSel.some((e) => e.nombre === extra.nombre);
                  return (
                    <TouchableOpacity
                      key={extra.nombre}
                      style={[styles.checkboxCard, isSelected && styles.checkboxCardSelected]}
                      onPress={() => toggleExtra(extra)}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isSelected ? '#D97706' : '#94A3B8'}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.checkboxText}>{extra.nombre}</Text>
                      <Text style={styles.extraPrecio}>+${extra.precio}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 5. COMENTARIOS / ACLARACIONES */}
              <Text style={styles.sectionLabel}>5. Aclaraciones o Comentarios</Text>
              <TextInput
                style={styles.comentariosInput}
                placeholder="Ej. Sin cebolla, huevo bien cocido, salsa aparte..."
                placeholderTextColor="#94A3B8"
                value={comentarios}
                onChangeText={setComentarios}
                multiline
              />

              {/* BOTÓN GUARDAR DESAYUNO */}
              <TouchableOpacity style={styles.guardarBtn} onPress={handleGuardar} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.guardarBtnText}>Guardar Desayuno en Comanda</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  formScroll: {
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 10,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  optionsGrid: {
    gap: 8,
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  radioCardSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  radioTextSelected: {
    color: '#92400E',
    fontWeight: '800',
  },
  precioText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  chipsScroll: {
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  extrasContainer: {
    gap: 8,
  },
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  checkboxCardSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  checkboxText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    fontWeight: '600',
  },
  extraPrecio: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '700',
  },
  comentariosInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  guardarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    height: 52,
    borderRadius: 16,
    marginTop: 24,
  },
  guardarBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
