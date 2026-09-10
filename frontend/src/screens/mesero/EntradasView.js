import React, { useState, useEffect, useContext } from 'react';
import {
  useWindowDimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeseroContext } from '../../context/MeseroContext';
import { API_URL } from '../../config/api';

export default function EntradasView({ onVolverMenu }) {
  const { width } = useWindowDimensions();
  const cardWidthResponsive = width > 900 ? '48.8%' : '100%';
  const { selectedMesa, setActiveTab, showSuccessNotification, showSinMesaModal } = useContext(MeseroContext);

  // Lista de entradas disponibles en catálogo (desde BD)
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [catEntradas, setCatEntradas] = useState([
    { id: 41, nombre: 'Sopa de Fideo Casera', tipo: 'Entrada', precio: 35 },
    { id: 42, nombre: 'Crema de Elote Dulce con Crutones', tipo: 'Entrada', precio: 45 },
    { id: 43, nombre: 'Consomé de Pollo con Verduras', tipo: 'Entrada', precio: 40 },
    { id: 44, nombre: 'Ensalada Verde de la Casa', tipo: 'Entrada', precio: 50 },
    { id: 45, nombre: 'Guacamole Tradicional con Totopos', tipo: 'Entrada', precio: 65 },
  ]);

  // Preorden / Comanda activa de entradas para esta mesa
  const [preorden, setPreorden] = useState([]);

  // Cargar catálogo de entradas desde la BD
  useEffect(() => {
    cargarEntradasBD();
  }, []);

  const cargarEntradasBD = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/alimentos`);
      const data = await res.json();

      if (res.ok && data.alimentos) {
        const bdEntradas = data.alimentos.filter(
          (a) => a.tipo === 'Entrada' || a.tipo === 'Entradas'
        );
        if (bdEntradas.length > 0) {
          setCatEntradas(bdEntradas);
        }
      }
    } catch (err) {
      console.log('Utilizando catálogo local de respaldos para entradas:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Agregar entrada a la preorden (o incrementar cantidad)
  const handleAgregarEntrada = (item) => {
    setPreorden((prev) => {
      const existe = prev.find((p) => p.id === item.id);
      if (existe) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, cantidad: p.cantidad + 1 } : p
        );
      }
      return [...prev, { ...item, cantidad: 1, comentarios: '' }];
    });
  };

  // Decrementar o eliminar entrada de la preorden
  const handleDecrementarEntrada = (id) => {
    setPreorden((prev) => {
      const existe = prev.find((p) => p.id === id);
      if (existe.cantidad > 1) {
        return prev.map((p) =>
          p.id === id ? { ...p, cantidad: p.cantidad - 1 } : p
        );
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  // Eliminar entrada completamente de la preorden
  const handleEliminarEntrada = (id) => {
    setPreorden((prev) => prev.filter((p) => p.id !== id));
  };

  // Actualizar comentario específico de una entrada
  const handleComentarioEntrada = (id, texto) => {
    setPreorden((prev) =>
      prev.map((p) => (p.id === id ? { ...p, comentarios: texto } : p))
    );
  };

  // Calcular total acumulado de la preorden de entradas
  const calcularTotal = () => {
    return preorden.reduce((sum, p) => sum + Number(p.precio) * p.cantidad, 0);
  };

  // Enviar pedido a cocina guardando en BD
  const handleEnviarPedido = async () => {
    if (!selectedMesa) {
      showSinMesaModal();
      return;
    }
    if (preorden.length === 0) return;

    try {
      const itemsPayload = preorden.map((p) => ({
        alimento: `${p.cantidad}x ${p.nombre}`,
        costo: Number(p.precio) * p.cantidad,
        extras: '',
        comentarios: p.comentarios || '',
      }));

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
        setPreorden([]);
        showSuccessNotification(
          '¡Pedido Enviado!',
          `Pedido de Entradas registrado exitosamente para ${selectedMesa ? selectedMesa.nombre : 'Mesa ' + numMesa}. Total: $${calcularTotal()}.00`
        );
      } else {
        Alert.alert('Error', data.error || 'No se pudo registrar la comanda');
      }
    } catch (err) {
      console.error('Error al enviar pedido de entradas:', err);
      Alert.alert('Error de conexión', 'Verifica la conexión con el backend.');
    }
  };

  // Entradas filtradas por búsqueda
  const entradasFiltradas = catEntradas.filter((e) =>
    e.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* HEADER SUPERIOR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.volverBtn} onPress={onVolverMenu} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" style={{ marginRight: 4 }} />
          <Text style={styles.volverBtnText}>Menú</Text>
        </TouchableOpacity>

        <Text style={styles.topTitle}>Entradas</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.mesaSubtitle}>
          <Text style={styles.mesaBold}>{selectedMesa ? (Number(selectedMesa.num_mesa) >= 100 ? 'Para Llevar #' + selectedMesa.num_mesa : (selectedMesa.nombre || 'Mesa #' + selectedMesa.num_mesa)) : 'Sin Mesa'}</Text>
        </Text>

        {/* SECCIÓN 1: PREORDEN DE ENTRADAS (ITEMS AGREGADOS) */}
        <View style={styles.preordenCard}>
          <View style={styles.preordenHeaderRow}>
            <Ionicons name="leaf-outline" size={22} color="#16A34A" style={{ marginRight: 8 }} />
            <Text style={styles.preordenTitle}>Pre-orden de Entradas</Text>
            {preorden.length > 0 && (
              <View style={styles.badgeItemsCount}>
                <Text style={styles.badgeItemsCountText}>{preorden.reduce((s, i) => s + i.cantidad, 0)} ítems</Text>
              </View>
            )}
          </View>

          {preorden.length === 0 ? (
            <View style={styles.emptyPreordenBox}>
              <Ionicons name="leaf-outline" size={36} color="#CBD5E1" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyPreordenText}>No has agregado entradas a la comanda.</Text>
              <Text style={styles.emptyPreordenSub}>Toca '+ Agregar' en la lista de abajo para añadir.</Text>
            </View>
          ) : (
            <View style={styles.preordenItemsList}>
              {preorden.map((item) => (
                <View key={item.id} style={styles.preordenItemCard}>
                  <View style={styles.preordenItemTop}>
                    <View style={styles.preordenItemInfo}>
                      <Text style={styles.preordenItemNombre}>{item.nombre}</Text>
                      <Text style={styles.preordenItemPrecioUnit}>${item.precio}.00 c/u</Text>
                    </View>

                    <Text style={styles.preordenItemSubtotal}>
                      ${Number(item.precio) * item.cantidad}.00
                    </Text>
                  </View>

                  {/* Controles de Cantidad (+ / -) y Eliminar */}
                  <View style={styles.preordenItemBottomRow}>
                    <View style={styles.counterRow}>
                      <TouchableOpacity
                        style={styles.btnCounter}
                        onPress={() => handleDecrementarEntrada(item.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={16} color="#0F172A" />
                      </TouchableOpacity>

                      <Text style={styles.counterValueText}>{item.cantidad}</Text>

                      <TouchableOpacity
                        style={styles.btnCounter}
                        onPress={() => handleAgregarEntrada(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={16} color="#0F172A" />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.inputComentarioItem}
                      placeholder="Aclaraciones para cocina..."
                      placeholderTextColor="#94A3B8"
                      value={item.comentarios}
                      onChangeText={(txt) => handleComentarioEntrada(item.id, txt)}
                    />

                    <TouchableOpacity
                      style={styles.btnDeletePreordenItem}
                      onPress={() => handleEliminarEntrada(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* SECCIÓN 2: CATÁLOGO DE ENTRADAS DESDE BD */}
        <View style={styles.catalogoHeaderRow}>
          <Text style={styles.catalogoSectionTitle}>Catálogo de Entradas (BD)</Text>
        </View>

        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar entrada por nombre..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#16A34A" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.drinksCatalogGrid}>
            {entradasFiltradas.map((item) => (
              <View key={item.id} style={styles.drinkCard}>
                <View style={styles.drinkCardLeft}>
                  <View style={styles.drinkIconBadge}>
                    <Ionicons name="leaf-outline" size={20} color="#16A34A" />
                  </View>
                  <View style={styles.drinkInfoCol}>
                    <Text style={styles.drinkNombreText}>{item.nombre}</Text>
                    <Text style={styles.drinkTipoBadge}>Entrada</Text>
                  </View>
                </View>

                <View style={styles.drinkCardRight}>
                  <Text style={styles.drinkPrecioText}>${item.precio}.00</Text>

                  <TouchableOpacity
                    style={styles.btnAgregarDrink}
                    onPress={() => handleAgregarEntrada(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.btnAgregarDrinkText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FOOTER FIJO INFERIOR CON BOTÓN ENVIAR PEDIDO */}
      <View style={styles.fixedBottomBar}>
        {preorden.length > 0 && (
          <View style={styles.totalSummaryRow}>
            <Text style={styles.totalSummaryLabel}>Total Entradas:</Text>
            <Text style={styles.totalSummaryValue}>${calcularTotal()}.00</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnEnviarPedido, preorden.length === 0 && styles.btnEnviarPedidoDisabled]}
          onPress={handleEnviarPedido}
          disabled={preorden.length === 0}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.btnEnviarPedidoText,
              preorden.length === 0 && styles.btnEnviarPedidoTextDisabled,
            ]}
          >
            Enviar Pedido
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingBottom: 120,
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

  /* SECCIÓN PREORDEN CARD */
  preordenCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
  },
  preordenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  preordenTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  badgeItemsCount: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeItemsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  emptyPreordenBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyPreordenText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptyPreordenSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  preordenItemsList: {
    gap: 10,
  },
  preordenItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  preordenItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  preordenItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  preordenItemNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  preordenItemPrecioUnit: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  preordenItemSubtotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  preordenItemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  btnCounter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  counterValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 10,
  },
  inputComentarioItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
    color: '#0F172A',
  },
  btnDeletePreordenItem: {
    padding: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
  },

  /* CATÁLOGO DE ENTRADAS */
  catalogoHeaderRow: {
    marginBottom: 12,
  },
  catalogoSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  drinksCatalogGrid: {
    gap: 12,
  },
  drinkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  drinkCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  drinkIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drinkInfoCol: {
    flex: 1,
  },
  drinkNombreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  drinkTipoBadge: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  drinkCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  drinkPrecioText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  btnAgregarDrink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  btnAgregarDrinkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
});
