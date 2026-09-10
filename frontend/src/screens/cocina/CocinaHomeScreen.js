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

export default function CocinaHomeScreen() {
  const { user, logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const [itemsCocina, setItemsCocina] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tabActiva, setTabActiva] = useState('pendientes'); // 'pendientes' | 'historial'

  // Cargar comandas de cocina en tiempo real (auto-refresh silencioso cada 3s)
  useEffect(() => {
    cargarOrdenesCocina(itemsCocina.length === 0);

    const timer = setInterval(() => {
      cargarOrdenesCocina(false);
    }, 3000);

    return () => clearInterval(timer);
  }, [tabActiva]);

  const cargarOrdenesCocina = async (mostrarLoading = false) => {
    try {
      if (mostrarLoading) setLoading(true);

      const endpoint =
        tabActiva === 'pendientes'
          ? `${API_URL}/pedidos/cocina/pendientes`
          : `${API_URL}/pedidos/cocina/historial-hoy`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (res.ok && data.items) {
        setItemsCocina(data.items);
      } else {
        setItemsCocina([]);
      }
    } catch (err) {
      console.log('Error al consultar comanda de cocina:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarOrdenesCocina(false);
  };

  // Marcar ítem como Servido (estado 4) o Pendiente (estado 0)
  const handleCambiarEstado = async (itemId, nuevoEstado) => {
    try {
      const res = await fetch(`${API_URL}/pedidos/alimento-pedido/${itemId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (res.ok) {
        if (tabActiva === 'pendientes') {
          setItemsCocina((prev) => prev.filter((item) => item.id !== itemId));
        } else {
          setItemsCocina((prev) =>
            prev.map((item) => (item.id === itemId ? { ...item, estado: nuevoEstado } : item))
          );
        }
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

  const extraerZona = (str = '') => {
    if (!str) return '';
    const match = String(str).match(/-([a-zA-Z0-9_]+)$/);
    return match ? match[1].toLowerCase() : '';
  };

  // Helper para determinar si una string corresponde a bebida/barra/comal (fallback)
  const esBebidaOBarra = (txt = '') => {
    if (!txt) return false;
    const str = txt.toLowerCase();
    return (
      str.includes('-barra') ||
      str.includes('-comal') ||
      str.includes('jugo') ||
      str.includes('café') ||
      str.includes('refresco') ||
      str.includes('cerveza') ||
      str.includes('agua') ||
      str.includes('licuado') ||
      str.includes('té') ||
      str.includes('coca') ||
      str.includes('fanta') ||
      str.includes('sprite') ||
      str.includes('jarra') ||
      str.includes('bebida') ||
      str.includes('postre') ||
      str.includes('flan') ||
      str.includes('carlota') ||
      str.includes('jericalla') ||
      str.includes('gelatina') ||
      str.includes('arroz') ||
      str.includes('pastel') ||
      str.includes('helado') ||
      str.includes('nieve') ||
      str.includes('pay') ||
      str.includes('pie') ||
      str.includes('chocoflan') ||
      str.includes('crepa')
    );
  };

  // Helper para determinar si el platillo principal es de cocina
  const esComidaCocina = (alimento = '') => {
    if (!alimento) return false;
    const zona = extraerZona(alimento);
    if (zona) return zona === 'cocina';
    return !esBebidaOBarra(alimento);
  };

  // Helper para determinar si la entrada es de cocina
  const esEntradaCocina = (entrada = '') => {
    if (!entrada) return false;
    const zona = extraerZona(entrada);
    if (zona) return zona === 'cocina';
    return !esBebidaOBarra(entrada);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* HEADER SUPERIOR (LOGO + NOMBRE + ROL DE COCINA + LOGOUT) */}
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
            <Text style={styles.userNameText}>{user?.nombre || 'Cocina'}</Text>
            <Text style={styles.userRoleText}>👨‍🍳 Área de Cocina</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#0D9488" />
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
            color={tabActiva === 'pendientes' ? '#0D9488' : '#64748B'}
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
            color={tabActiva === 'historial' ? '#0D9488' : '#64748B'}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#DC2626" style={{ marginVertical: 30 }} />
        ) : itemsCocina.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="restaurant-outline" size={54} color="#CBD5E1" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>
              {tabActiva === 'pendientes' ? 'No hay platillos pendientes' : 'No hay historial de cocina hoy'}
            </Text>
            <Text style={styles.emptySub}>
              {tabActiva === 'pendientes'
                ? 'Las comandas de cocina enviadas por los meseros aparecerán automáticamente aquí.'
                : 'Aún no se han marcado platillos de cocina como servidos hoy.'}
            </Text>
          </View>
        ) : (
          <View style={[styles.comandaList, isTablet && styles.comandaListTablet]}>
            {itemsCocina.map((item) => {
              const guarnicionesList = [item.guarnicion1, item.guarnicion2].filter(Boolean).join(', ');
              const mostrarComida = esComidaCocina(item.alimento);
              const mostrarEntrada = esEntradaCocina(item.entrada);

              return (
                <View key={item.id} style={[styles.itemCard, isTablet && styles.itemCardTablet]}>
                  {/* Encabezado con número de mesa, estado e id de orden */}
                  <View style={styles.itemHeaderRow}>
                    <View style={styles.mesaBadge}>
                      <Ionicons name="restaurant-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.mesaBadgeText}>{Number(item.num_mesa) >= 100 ? 'Para llevar #' + item.num_mesa : 'Mesa #' + item.num_mesa}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {Number(item.estado) === 0 ? (
                        <View style={styles.badgeStatePendiente}>
                          <Text style={styles.badgeStatePendienteText}>⏳ Pendiente</Text>
                        </View>
                      ) : Number(item.estado) === 4 || Number(item.estado) === 3 ? (
                        <View style={styles.badgeStateCobrado}>
                          <Text style={styles.badgeStateCobradoText}>💳 Cobrado</Text>
                        </View>
                      ) : (
                        <View style={styles.badgeStateServido}>
                          <Text style={styles.badgeStateServidoText}>✅ Servido</Text>
                        </View>
                      )}
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

                  {/* DETALLES DE LA ORDEN DE COCINA */}
                  <View style={styles.cocinaDetailsBox}>
                    {/* ENTRADA DE COCINA (Si corresponde) */}
                    {mostrarEntrada ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="leaf-outline" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabel}>Entrada: </Text>
                          {limpiarZona(item.entrada)}
                        </Text>
                      </View>
                    ) : null}

                    {/* COMIDA / PLATILLO PRINCIPAL DE COCINA (Si corresponde) */}
                    {mostrarComida && item.alimento ? (
                      <Text style={styles.alimentoTitle}>{limpiarZona(item.alimento)}</Text>
                    ) : null}

                    {guarnicionesList ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="layers-outline" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabel}>Guarniciones: </Text>
                          {limpiarZona(guarnicionesList)}
                        </Text>
                      </View>
                    ) : null}

                    {/* EXTRAS (Siempre se muestran si existen) */}

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
                      onPress={() => handleCambiarEstado(item.id, 1)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="checkmark-done-circle-outline"
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.btnServirText}>Marcar como Servido</Text>
                    </TouchableOpacity>
                  ) : Number(item.estado) === 0 ? (
                    <TouchableOpacity
                      style={styles.btnServirDirecto}
                      onPress={() => handleCambiarEstado(item.id, 1)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="checkmark-done-circle-outline"
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.btnServirText}>Marcar como Servido</Text>
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

  /* Tabs */
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#99F6E4',
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F766E',
    fontWeight: '800',
  },

  /* Scroll Body */
  scrollContent: {
    padding: 16,
  },
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
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Comanda Cards */
  comandaList: {
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
  itemCardTablet: {
    width: '48.5%',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mesaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  mesaBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  itemIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  meseroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meseroText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  /* Cocina Details Box */
  cocinaDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    gap: 6,
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
    backgroundColor: '#0D9488',
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
    marginTop: 4,
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
  badgeStatePendiente: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeStatePendienteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
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
