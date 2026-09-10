import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

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

export default function BarraHomeScreen() {
  const { user, logout } = useContext(AuthContext);

  // Tab activo ('pendientes' o 'historial')
  const [tabActiva, setTabActiva] = useState('pendientes');

  // Estados de datos
  const [pendientes, setPendientes] = useState([]);
  const [historialHoy, setHistorialHoy] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar órdenes al montar o cambiar de pestaña
  useEffect(() => {
    cargarDatos();
  }, [tabActiva]);

  const cargarDatos = async () => {
    setLoading(true);
    if (tabActiva === 'pendientes') {
      await cargarPendientes();
    } else {
      await cargarHistorialHoy();
    }
    setLoading(false);
    setRefreshing(false);
  };

  // Cargar órdenes pendientes (estado 0)
  const cargarPendientes = async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos/barra/pendientes`);
      const data = await res.json();
      if (res.ok && data.items) {
        setPendientes(data.items);
      } else {
        setPendientes([]);
      }
    } catch (err) {
      console.log('Error al consultar pendientes de barra:', err.message);
    }
  };

  // Cargar historial del día (estado 1 del día de hoy)
  const cargarHistorialHoy = async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos/barra/historial-hoy`);
      const data = await res.json();
      if (res.ok && data.items) {
        setHistorialHoy(data.items);
      } else {
        setHistorialHoy([]);
      }
    } catch (err) {
      console.log('Error al consultar historial del día de barra:', err.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  // Confirmar que se sirvió la bebida (estado 0 -> 1)
  const handleConfirmarServido = async (itemId) => {
    try {
      const res = await fetch(`${API_URL}/pedidos/barra/servir/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        // Remover de la lista de pendientes (desaparece inmediatamente)
        setPendientes((prev) => prev.filter((p) => p.id !== itemId));
      } else {
        Alert.alert('Error', data.error || 'No se pudo marcar como servido');
      }
    } catch (err) {
      Alert.alert('Error de conexión', 'Verifica la conexión con el servidor backend.');
    }
  };

  // Revertir una orden completada por error (estado 1 -> 0)
  const handleRevertirServido = async (itemId) => {
    try {
      const res = await fetch(`${API_URL}/pedidos/barra/revertir/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        // Remover de la lista de historial
        setHistorialHoy((prev) => prev.filter((h) => h.id !== itemId));
        Alert.alert('↩️ Revertido', 'La bebida se ha regresado a la lista de pendientes.');
      } else {
        Alert.alert('Error', data.error || 'No se pudo revertir la orden');
      }
    } catch (err) {
      Alert.alert('Error de conexión', 'Verifica la conexión con el servidor backend.');
    }
  };

  // Formatear hora (ej. 14:30)
  const formatearHora = (fechaStr) => {
    if (!fechaStr) return '';
    const date = new Date(fechaStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />

      {/* HEADER BARRA */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="wine-outline" size={26} color="#0D9488" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Barra de Bebidas</Text>
            <Text style={styles.headerUserSub}>
              Usuario: <Text style={styles.headerUserBold}>{user?.nombre?.toUpperCase() || 'BARRA'}</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* TABS DE SELECCIÓN (PENDIENTES VS HISTORIAL) */}
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
          {pendientes.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{pendientes.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tabActiva === 'historial' && styles.tabBtnActive]}
          onPress={() => setTabActiva('historial')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={18}
            color={tabActiva === 'historial' ? '#0D9488' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, tabActiva === 'historial' && styles.tabBtnTextActive]}>
            Historial del Día
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO DE ÓRDENES */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0D9488" style={{ marginVertical: 40 }} />
        ) : tabActiva === 'pendientes' ? (
          /* SECCIÓN PENDIENTES (ESTADO 0) */
          pendientes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="wine-outline" size={48} color="#CBD5E1" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyCardTitle}>Sin bebidas pendientes</Text>
              <Text style={styles.emptyCardSub}>
                Todas las bebidas han sido servidas o no se han enviado nuevas comandas.
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {pendientes.map((item) => (
                <View key={item.id} style={[styles.orderCard, Number(item.num_mesa) >= 100 && styles.orderCardParaLlevar]}>
                  {/* Fila Encabezado: Mesa & Hora */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.mesaBadge, Number(item.num_mesa) >= 100 && { backgroundColor: '#FFEDD5' }]}>
                      <Ionicons name={Number(item.num_mesa) >= 100 ? "bag-handle-outline" : "restaurant-outline"} size={16} color={Number(item.num_mesa) >= 100 ? "#C2410C" : "#0D9488"} style={{ marginRight: 6 }} />
                      <Text style={[styles.mesaBadgeText, Number(item.num_mesa) >= 100 && { color: '#C2410C' }]}>{Number(item.num_mesa) >= 100 ? 'Para llevar #' + item.num_mesa : 'Mesa #' + item.num_mesa}</Text>
                    </View>

                    <Text style={styles.horaText}>🕒 {formatearHora(item.fecha_pedido)}</Text>
                  </View>

                  {/* 1. PLATILLO PRINCIPAL / DESAYUNO */}
                  {item.alimento ? <Text style={styles.alimentoNombre}>{limpiarZona(item.alimento)}</Text> : null}

                  {/* 2. COMPONENTES EN BLOQUES SEPARADOS (ENTRADA -> GUARNICIONES -> BEBIDA -> EXTRAS) */}
                  {(() => {
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

                    if (!entradaFinal && !preparacionFinal && guarnicionesFinales.length === 0 && !bebidaFinal && !extrasFinales) {
                      return null;
                    }

                    return (
                      <View style={styles.componentBlocksList}>
                        {/* Entrada (si hay) */}
                        {entradaFinal ? (
                          <View style={styles.blockRow}>
                            <Text style={styles.blockValue}>{entradaFinal.replace(/^entrada:\s*/i, '')}</Text>
                          </View>
                        ) : null}

                        {/* Preparación (si es antojito) */}
                        {preparacionFinal ? (
                          <View style={styles.blockRow}>
                            <Text style={styles.blockValue}>{preparacionFinal}</Text>
                          </View>
                        ) : null}

                        {/* Guarniciones (cada una en su propio renglón dentro del mismo bloque) */}
                        {guarnicionesFinales.length > 0 ? (
                          <View style={styles.blockRowColumn}>
                            {guarnicionesFinales.map((guar, i) => (
                              <Text key={i} style={styles.blockValue}>
                                {guar.replace(/^guarnici[oó]n\s*\d*:\s*/i, '')}
                              </Text>
                            ))}
                          </View>
                        ) : null}

                        {/* Bebida (sin prefijo) */}
                        {bebidaFinal ? (
                          <View style={styles.blockRow}>
                            <Text style={styles.blockValue}>{bebidaFinal.replace(/^bebida:\s*/i, '')}</Text>
                          </View>
                        ) : null}

                        {/* Extras (sin prefijo) */}
                        {extrasFinales ? (
                          <View style={styles.blockRow}>
                            <Text style={styles.blockValue}>
                              {(Array.isArray(extrasFinales) ? extrasFinales.join(', ') : extrasFinales).replace(/^extras:\s*/i, '')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })()}

                  {/* 3. COMENTARIOS (ÚNICAMENTE NOTAS EN CAJA AMARILLA AL FINAL) */}
                  {(() => {
                    const comentarioLimpio = item.comentarios
                      ? item.comentarios.replace(/\([^\)]*(Guarnición|Bebida|Entrada)[^\)]*\)/gi, '').trim()
                      : '';

                    if (!comentarioLimpio || comentarioLimpio.toLowerCase().startsWith('guarnición') || comentarioLimpio.toLowerCase().startsWith('bebida')) {
                      return null;
                    }

                    return (
                      <View style={styles.comentarioBox}>
                        <Text style={styles.comentarioHeader}>💬 Comentarios del Mesero:</Text>
                        <Text style={styles.comentarioText}>"{comentarioLimpio}"</Text>
                      </View>
                    );
                  })()}

                  <Text style={styles.meseroSubText}>
                    Mesero: <Text style={styles.meseroBold}>{item.mesero || 'Mesero'}</Text>
                  </Text>

                  {/* Botón Acción: Confirmar Servido */}
                  <TouchableOpacity
                    style={styles.btnServir}
                    onPress={() => handleConfirmarServido(item.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnServirText}>Confirmar Servido (Estado 1)</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )
        ) : (
          /* SECCIÓN HISTORIAL DEL DÍA (ESTADO 1 DE HOY) */
          historialHoy.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={48} color="#CBD5E1" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyCardTitle}>Historial vacío hoy</Text>
              <Text style={styles.emptyCardSub}>
                Aún no has completado bebidas en el día de hoy.
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {historialHoy.map((item) => (
                <View key={item.id} style={styles.historialCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.mesaBadgeHistorial}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={styles.mesaBadgeHistorialText}>{Number(item.num_mesa) >= 100 ? 'Para llevar #' + item.num_mesa : 'Mesa #' + item.num_mesa} (Servido)</Text>
                    </View>

                    <Text style={styles.horaText}>🕒 {formatearHora(item.fecha_pedido)}</Text>
                  </View>

                  <Text style={styles.alimentoNombre}>{item.alimento}</Text>

                  {/* Componentes en bloques separados: Entrada -> Guarniciones -> Bebida -> Extras */}
                  {(() => {
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

                    if (!entradaFinal && !preparacionFinal && guarnicionesFinales.length === 0 && !bebidaFinal && !extrasFinales) {
                      return null;
                    }

                    return (
                      <View style={styles.componentBlocksList}>
                        {/* Entrada (si hay) */}
                        {entradaFinal ? (
                          <View style={styles.blockRow}>
                            <Text style={styles.blockValue}>{entradaFinal.replace(/^entrada:\s*/i, '')}</Text>
                          </View>
                        ) : null}

                        {/* Preparación (si es antojito) */}
                        {preparacionFinal ? (
                          <View style={styles.blockRow}>
                            <Text style={styles.blockValue}>{preparacionFinal}</Text>
                          </View>
                        ) : null}

                        {/* Guarniciones (cada una en su propio renglón dentro del mismo bloque) */}
                        {guarnicionesFinales.length > 0 ? (
                          <View style={styles.blockRowColumn}>
                            {guarnicionesFinales.map((guar, i) => (
                              <Text key={i} style={styles.blockValue}>
                                {guar.replace(/^guarnici[oó]n\s*\d*:\s*/i, '')}
                              </Text>
                            ))}
                          </View>
                        ) : null}

                        {/* Bebida (sin prefijo) */}
                        {bebidaFinal ? (
                          <View style={styles.blockRow}>
                            <Text style={styles.blockValue}>{bebidaFinal.replace(/^bebida:\s*/i, '')}</Text>
                          </View>
                        ) : null}

                        {/* Extras (sin prefijo) */}
                        {extrasFinales ? (
                          <View style={styles.blockRow}>
                            <Text style={styles.blockValue}>
                              {(Array.isArray(extrasFinales) ? extrasFinales.join(', ') : extrasFinales).replace(/^extras:\s*/i, '')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })()}

                  {/* Comentarios del Mesero en caja amarilla */}
                  {(() => {
                    const comentarioLimpio = item.comentarios
                      ? item.comentarios.replace(/\([^\)]*(Guarnición|Bebida|Entrada)[^\)]*\)/gi, '').trim()
                      : '';

                    if (!comentarioLimpio || comentarioLimpio.toLowerCase().startsWith('guarnición') || comentarioLimpio.toLowerCase().startsWith('bebida')) {
                      return null;
                    }

                    return (
                      <View style={styles.comentarioBox}>
                        <Text style={styles.comentarioHeader}>💬 Comentarios del Mesero:</Text>
                        <Text style={styles.comentarioText}>"{comentarioLimpio}"</Text>
                      </View>
                    );
                  })()}

                  <View style={styles.historialBottomRow}>
                    <Text style={styles.meseroSubText}>
                      Mesero: <Text style={styles.meseroBold}>{item.mesero || 'Mesero'}</Text>
                    </Text>

                    {/* Botón para Revertir a Pendiente por error */}
                    <TouchableOpacity
                      style={styles.btnRevertir}
                      onPress={() => handleRevertirServido(item.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-undo-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.btnRevertirText}>Revertir a Estado 0</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerUserSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerUserBold: {
    color: '#0D9488',
    fontWeight: '800',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Tabs Selector */
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
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  tabBtnActive: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  tabBtnText: {
    fontSize: 13,
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
    marginLeft: 4,
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  /* Scroll Content */
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyCardSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },

  /* Pending Order Cards */
  ordersList: {
    gap: 14,
  },
  orderCardParaLlevar: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
    borderWidth: 2,
    borderLeftWidth: 6,
    borderLeftColor: '#EA580C',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mesaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mesaBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D9488',
  },
  horaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  alimentoNombre: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
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
  meseroSubText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  meseroBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  btnServir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 14,
  },
  btnServirText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* Historial Cards */
  historialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  mesaBadgeHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  mesaBadgeHistorialText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  comentarioTextHistorial: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
    marginBottom: 8,
  },
  historialBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  btnRevertir: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  btnRevertirText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
