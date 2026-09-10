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
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

export default function ComalHomeScreen() {
  const { user, logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const [itemsComal, setItemsComal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tabActiva, setTabActiva] = useState('pendientes'); // 'pendientes' | 'historial'

  // Mapa de bloques marcados ({ `${itemId}_${blockId}`: boolean })
  const [checkedMap, setCheckedMap] = useState({});

  // Cargar comandas de comal en tiempo real (auto-refresh silencioso cada 3s)
  useEffect(() => {
    cargarOrdenesComal(itemsComal.length === 0);

    const timer = setInterval(() => {
      cargarOrdenesComal(false);
    }, 3000);

    return () => clearInterval(timer);
  }, [tabActiva]);

  const cargarOrdenesComal = async (mostrarLoading = false) => {
    try {
      if (mostrarLoading) setLoading(true);

      const endpoint =
        tabActiva === 'pendientes'
          ? `${API_URL}/pedidos/comal/pendientes`
          : `${API_URL}/pedidos/comal/historial-hoy`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (res.ok && data.items) {
        setItemsComal(data.items);
      } else {
        setItemsComal([]);
      }
    } catch (err) {
      console.log('Error al consultar comanda de comal:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarOrdenesComal(false);
  };

  // Conmutar marcado del bloque (Rojo 🔴 <-> Verde 🟢)
  const toggleBlock = (itemId, blockId) => {
    const key = `${itemId}_${blockId}`;
    setCheckedMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Marcar ítem como Servido (estado 1) o Revertir (estado 0)
  const handleCambiarEstado = async (itemId, nuevoEstado) => {
    try {
      const res = await fetch(`${API_URL}/pedidos/alimento-pedido/${itemId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (res.ok) {
        // Remover el ítem de la lista local actual
        setItemsComal((prev) => prev.filter((item) => item.id !== itemId));
      } else {
        Alert.alert('Error', 'No se pudo cambiar el estado del ítem.');
      }
    } catch (err) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    }
  };

  const limpiarZona = (str = '') => {
    if (!str) return '';
    return String(str).replace(/-[a-zA-Z0-9_]+$/g, '').trim();
  };

  // Desglosar bloques visuales de cada comanda de comal
  const getItemBlocks = (item) => {
    const blocks = [];

    // Bloque 1: Platillo principal de comal
    blocks.push({
      id: 'platillo',
      texto: item.alimento,
    });

    // Bloque 1.5: Guiso de antojitos
    if (item.guiso) {
      blocks.push({
        id: 'guiso',
        texto: `Guiso: ${item.guiso}`,
      });
    }

    // Bloque 2: Extras
    if (item.extras) {
      blocks.push({
        id: 'extras',
        texto: `Extras: ${item.extras}`,
      });
    }

    return blocks;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* HEADER SUPERIOR IDÉNTICO AL DE MESERO (LOGO + NOMBRE + ROL DE COMAL + LOGOUT) */}
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
            <Text style={styles.userNameText}>{user?.nombre || 'Comal'}</Text>
            <Text style={styles.userRoleText}>🔥 Área de Comal</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* PESTAÑAS (PENDIENTES VS HISTORIAL DEL DÍA) */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tabActiva === 'pendientes' && styles.tabBtnActive]}
          onPress={() => setTabActiva('pendientes')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={tabActiva === 'pendientes' ? '#D97706' : '#64748B'}
            style={{ marginRight: 4 }}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tabBtnText, tabActiva === 'pendientes' && styles.tabBtnTextActive]}
          >
            Pendientes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tabActiva === 'historial' && styles.tabBtnActive]}
          onPress={() => setTabActiva('historial')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={16}
            color={tabActiva === 'historial' ? '#D97706' : '#64748B'}
            style={{ marginRight: 4 }}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tabBtnText, tabActiva === 'historial' && styles.tabBtnTextActive]}
          >
            Historial Servidos
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D97706']} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#D97706" style={{ marginVertical: 30 }} />
        ) : itemsComal.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="nutrition-outline" size={54} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>
              {tabActiva === 'pendientes' ? 'No hay antojitos pendientes' : 'No hay historial de comal hoy'}
            </Text>
            <Text style={styles.emptySub}>
              {tabActiva === 'pendientes'
                ? 'Los pedidos de antojitos enviadas por los meseros aparecerán automáticamente aquí.'
                : 'Aún no se han marcado platillos como servidos en el comal.'}
            </Text>
          </View>
        ) : (
          <View style={[styles.comandaList, isTablet && styles.comandaListTablet]}>
            {itemsComal.map((item) => {
              const esParaLlevar = Number(item.num_mesa) >= 100;
              return (
                <View key={item.id} style={[styles.itemCard, isTablet && styles.itemCardTablet, esParaLlevar && styles.itemCardParaLlevar]}>
                  {/* Encabezado con número de mesa e id de orden */}
                  <View style={styles.itemHeaderRow}>
                    <View style={[styles.mesaBadge, esParaLlevar && styles.mesaBadgeParaLlevar]}>
                      <Ionicons name={esParaLlevar ? "bag-handle-outline" : "restaurant-outline"} size={14} color={esParaLlevar ? "#C2410C" : "#D97706"} style={{ marginRight: 4 }} />
                      <Text style={[styles.mesaBadgeText, esParaLlevar && styles.mesaBadgeTextParaLlevar]}>{esParaLlevar ? 'Para llevar #' + item.num_mesa : 'Mesa #' + item.num_mesa}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {Number(item.estado) === 4 || Number(item.estado) === 3 ? (
                        <View style={styles.badgeStateCobrado}>
                          <Text style={styles.badgeStateCobradoText}>💳 Cobrado</Text>
                        </View>
                      ) : tabActiva === 'historial' ? (
                        <View style={styles.badgeStateServido}>
                          <Text style={styles.badgeStateServidoText}>✅ Servido</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.itemIdText, { marginLeft: 8 }]}>Ítem #{item.id}</Text>
                    </View>
                  </View>

                  {/* Nombre del Mesero que envió la orden */}
                  {item.mesero && (
                    <View style={styles.meseroRow}>
                      <Ionicons name="person-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.meseroText}>Mesero: {item.mesero}</Text>
                    </View>
                  )}

                  {/* DETALLES DE LA ORDEN DE ANTOJITO */}
                  <View style={styles.antojitoDetailsBox}>
                    <Text style={styles.alimentoTitle}>{limpiarZona(item.alimento)}</Text>

                    {item.guiso ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="flame-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabel}>Guiso: </Text>
                          {limpiarZona(item.guiso)}
                        </Text>
                      </View>
                    ) : null}

                    {item.extras ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="add-circle-outline" size={16} color="#0D9488" style={{ marginRight: 6 }} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabel}>Extras: </Text>
                          {limpiarZona(item.extras)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* COMENTARIOS DEL MESERO EN RECUADRO AMARILLO */}
                  {item.comentarios ? (
                    <View style={styles.comentarioBox}>
                      <Text style={styles.comentarioHeader}>💬 Comentarios del Mesero:</Text>
                      <Text style={styles.comentarioText}>"{item.comentarios}"</Text>
                    </View>
                  ) : null}

                  {/* BOTÓN DE ACCIÓN DIRECTO */}
                  {tabActiva === 'pendientes' ? (
                    <TouchableOpacity
                      style={styles.btnServirDirecto}
                      onPress={() => handleCambiarEstado(item.id, 2)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="checkmark-done-circle-outline"
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.btnServirText}>Confirmar Pedido Completado</Text>
                    </TouchableOpacity>
                  ) : Number(item.estado) === 4 || Number(item.estado) === 3 ? (
                    <View style={[styles.btnRevertir, { opacity: 0.6, backgroundColor: '#F8FAFC' }]}>
                      <Ionicons name="card-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={styles.btnRevertirText}>Cobrado</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.btnRevertir}
                      onPress={() => handleCambiarEstado(item.id, 0)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
                      <Text style={styles.btnRevertirText}>Revertir a Pendiente</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FEF2F2',
  },
  logoImage: {
    width: 36,
    height: 36,
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
    color: '#D97706',
    fontWeight: '700',
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  /* Tabs */
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#D97706',
    fontWeight: '800',
  },

  /* Content */
  scrollContent: {
    padding: 16,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 280,
  },
  comandaList: {
    width: '100%',
    gap: 14,
  },
  comandaListTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  itemCardParaLlevar: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
    borderWidth: 2,
    borderLeftWidth: 6,
    borderLeftColor: '#EA580C',
  },
  mesaBadgeParaLlevar: {
    backgroundColor: '#FFEDD5',
  },
  mesaBadgeTextParaLlevar: {
    color: '#C2410C',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
  },
  itemCardTablet: {
    width: '48.5%',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mesaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mesaBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  itemIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  meseroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  meseroText: {
    fontSize: 12,
    color: '#64748B',
  },

  /* Component Blocks */
  componentBlocksList: {
    gap: 6,
    marginBottom: 14,
  },
  componentBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  componentBlockUnchecked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  componentBlockChecked: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  componentBlockText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  componentBlockTextUnchecked: {
    color: '#991B1B',
  },
  componentBlockTextChecked: {
    color: '#065F46',
  },

  /* Antojitos Details Box */
  antojitoDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    gap: 6,
    width: '100%',
  },
  alimentoTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontWeight: '800',
    color: '#334155',
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },

  /* Buttons */
  btnServirDirecto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 12,
    marginTop: 4,
  },
  btnServirText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  btnRevertir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnRevertirText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Yellow Comentario Box */
  comentarioBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
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
    fontWeight: '600',
    color: '#78350F',
  },
  badgeStateServido: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeStateServidoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  badgeStateCobrado: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  badgeStateCobradoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
});
