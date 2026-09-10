import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeseroContext } from '../../context/MeseroContext';
import { API_URL } from '../../config/api';
import ConfirmarEliminarModal from '../../components/ConfirmarEliminarModal';

export default function MesasTab() {
  const { selectMesa, selectedMesa, clearMesa } = useContext(MeseroContext);
  const { width } = useWindowDimensions();
  const [modalParaLlevarVisible, setModalParaLlevarVisible] = useState(false);
  const [pedidoAEliminar, setPedidoAEliminar] = useState(null);
  const [loadingEliminar, setLoadingEliminar] = useState(false);

  // Cálculo de columnas responsivo para Tablet en Vertical y Horizontal
  const mesaCardWidth = width > 1024 ? '18.5%' : width > 768 ? '23.5%' : width > 500 ? '31.5%' : '48%';

  // Lista de mesas en comedor (num_mesa del 1 al 20)
  const [mesas, setMesas] = useState(
    Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      num_mesa: i + 1,
      estado: 'disponible',
    }))
  );

  // Lista de pedidos para llevar activos (num_mesa = 100) desde la BD
  const [pedidosParaLlevarActivos, setPedidosParaLlevarActivos] = useState([]);

  // Cargar pedidos para llevar activos desde la BD
  const cargarParaLlevarActivos = async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos/para-llevar/activos`);
      const data = await res.json();
      if (res.ok && data.pedidos) {
        setPedidosParaLlevarActivos(data.pedidos);
      }
    } catch (e) {
      console.log('Error al cargar pedidos para llevar:', e.message);
    }
  };

  // Cargar el estado real de ocupación de las mesas desde la BD
  const cargarEstadoMesas = async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos/todas-las-mesas`);
      const data = await res.json();
      if (res.ok && data.items) {
        const mesasConPedidos = new Set(
          data.items
            .filter((i) => Number(i.estado) !== 4 && Number(i.num_mesa) < 100)
            .map((i) => Number(i.num_mesa))
        );
        setMesas((prev) =>
          prev.map((m) => ({
            ...m,
            estado: mesasConPedidos.has(m.num_mesa) ? 'ocupada' : 'disponible',
          }))
        );
      }
    } catch (e) {
      console.log('Error al cargar estado de mesas:', e.message);
    }
  };

  useEffect(() => {
    cargarParaLlevarActivos();
    cargarEstadoMesas();
  }, []);

  // Crear un nuevo pedido para llevar con número de mesa dinámico (100, 101, 102...)
  const handleCrearNuevoParaLlevar = async () => {
    setModalParaLlevarVisible(false);
    let numMesaFinal = 100;
    try {
      const res = await fetch(`${API_URL}/pedidos/para-llevar/siguiente-mesa`);
      const data = await res.json();
      if (data.num_mesa) {
        numMesaFinal = data.num_mesa;
      }
    } catch (e) {
      console.log('Error calculando siguiente mesa para llevar:', e.message);
    }

    selectMesa({
      id: numMesaFinal,
      num_mesa: numMesaFinal,
      tipo: 'para_llevar',
      nombre: `Para Llevar #${numMesaFinal}`,
    });
  };

  // Seleccionar un pedido para llevar existente para editarlo (redirige a la pestaña 'ordenes')
  const handleEditarParaLlevarExistente = (pedido) => {
    setModalParaLlevarVisible(false);
    const numMesa = pedido.num_mesa || 100;
    selectMesa(
      {
        id: pedido.num_orden || pedido.id,
        num_orden: pedido.num_orden || pedido.id,
        num_mesa: numMesa,
        tipo: 'para_llevar',
        nombre: `Para Llevar #${numMesa}`,
        costo: pedido.costo,
      },
      'ordenes'
    );
  };

  // Cancelar/Eliminar un pedido para llevar completo
  const handleCancelarParaLlevar = (pedido) => {
    setPedidoAEliminar(pedido);
  };

  const handleConfirmarEliminarParaLlevar = async () => {
    if (!pedidoAEliminar) return;
    setLoadingEliminar(true);
    const ped = pedidoAEliminar;
    try {
      if (ped.num_orden) {
        const res = await fetch(`${API_URL}/pedidos/orden/${ped.num_orden}/cancelar`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const errData = await res.json();
          Alert.alert('Error', errData.error || 'No se pudo cancelar el pedido');
          return;
        }
      }
    } catch (e) {
      console.log('Aviso eliminando pedido para llevar:', e.message);
    } finally {
      setLoadingEliminar(false);
    }

    setPedidosParaLlevarActivos((prev) =>
      prev.filter((p) => p.num_orden !== ped.num_orden && p.num_mesa !== ped.num_mesa)
    );
    if (selectedMesa?.num_mesa === ped.num_mesa || selectedMesa?.num_orden === ped.num_orden) {
      clearMesa();
    }
    setPedidoAEliminar(null);
  };

  // Seleccionar mesa de comedor (1 al 10)
  const handleSelectMesa = (mesa) => {
    selectMesa({
      id: mesa.id,
      num_mesa: mesa.num_mesa,
      tipo: 'mesa',
      nombre: `Mesa #${mesa.num_mesa}`,
      estado: mesa.estado,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Título de la Sección */}
      <Text style={styles.sectionTitle}>Seleccionar Mesa</Text>

      {/* Opción Pedido Para Llevar */}
      <TouchableOpacity
        style={[
          styles.paraLlevarCard,
          selectedMesa?.tipo === 'para_llevar' && styles.paraLlevarCardActiveSelected,
        ]}
        onPress={() => setModalParaLlevarVisible(true)}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.paraLlevarIconCircle,
            selectedMesa?.tipo === 'para_llevar' && { backgroundColor: '#EA580C' },
          ]}
        >
          <Ionicons name="bag-handle-outline" size={26} color="#FFFFFF" />
        </View>

        <View style={styles.paraLlevarInfo}>
          <Text
            style={[
              styles.paraLlevarTitle,
              selectedMesa?.tipo === 'para_llevar' && { color: '#C2410C', fontWeight: '800' },
            ]}
          >
            {selectedMesa?.tipo === 'para_llevar'
              ? `Para Llevar #${selectedMesa.num_mesa}`
              : 'Pedido Para Llevar'}
          </Text>
          <Text style={styles.paraLlevarSubtitle}>
            {pedidosParaLlevarActivos.length > 0
              ? `${pedidosParaLlevarActivos.length} pedidos activos • Crear o editar`
              : 'Crear nuevo pedido para llevar'}
          </Text>
        </View>

        {selectedMesa?.tipo === 'para_llevar' ? (
          <View style={styles.badgeSelectedParaLlevar}>
            <Text style={styles.badgeSelectedParaLlevarText}>
              SELECCIONADO (#{selectedMesa.num_mesa})
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Grid de Mesas del Comedor */}
      <View style={styles.mesasGrid}>
        {mesas.map((mesa) => {
          const isSelected =
            selectedMesa?.tipo === 'mesa' && selectedMesa?.num_mesa === mesa.num_mesa;
          return (
            <TouchableOpacity
              key={mesa.id}
              style={[
                styles.mesaCard,
                { width: mesaCardWidth },
                isSelected && styles.mesaCardActiveSelected,
              ]}
              onPress={() => handleSelectMesa(mesa)}
              activeOpacity={0.8}
            >
              <View style={styles.mesaHeaderRow}>
                <View
                  style={[
                    styles.mesaHeaderDot,
                    mesa.estado === 'ocupada' ? styles.dotOcupada : styles.dotDisponible,
                  ]}
                />
                {isSelected && (
                  <View style={styles.badgeMesaSelected}>
                    <Text style={styles.badgeMesaSelectedText}>SELECCIONADA</Text>
                  </View>
                )}
              </View>

              <Ionicons
                name="restaurant-outline"
                size={32}
                color={
                  isSelected ? '#0D9488' : mesa.estado === 'ocupada' ? '#EA580C' : '#64748B'
                }
                style={{ marginVertical: 6 }}
              />

              <Text style={[styles.mesaNumText, isSelected && styles.mesaNumTextActiveSelected]}>
                Mesa #{mesa.num_mesa}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MODAL DE SELECCIÓN O CREACIÓN DE PEDIDOS PARA LLEVAR */}
      <Modal
        visible={modalParaLlevarVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalParaLlevarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Encabezado del Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="bag-handle-outline" size={24} color="#0F172A" style={{ marginRight: 8 }} />
                <Text style={styles.modalHeaderTitle}>Pedidos Para Llevar</Text>
              </View>
              <TouchableOpacity onPress={() => setModalParaLlevarVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Botón 1: Crear Nuevo Pedido Para Llevar */}
              <TouchableOpacity
                style={styles.crearNuevoBtn}
                onPress={handleCrearNuevoParaLlevar}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.crearNuevoBtnText}>Crear Nuevo Pedido Para Llevar</Text>
              </TouchableOpacity>

              {/* Título de Pedidos Activos */}
              <Text style={styles.activosHeaderTitle}>Pedidos Para Llevar Activos</Text>

              {pedidosParaLlevarActivos.length === 0 ? (
                <Text style={styles.emptyText}>No hay pedidos para llevar activos actualmente.</Text>
              ) : (
                pedidosParaLlevarActivos.map((pedido) => (
                  <View key={pedido.id || pedido.num_orden} style={styles.pedidoActivoCardContainer}>
                    <View style={styles.pedidoActivoCardHeader}>
                      <View style={styles.pedidoActivoInfo}>
                        <Text style={styles.pedidoActivoNum}>Para Llevar #{pedido.num_mesa}</Text>
                        <Text style={styles.pedidoActivoSub}>
                          {pedido.itemsCount || 1} platillo(s) • {pedido.hora || 'Reciente'}
                        </Text>
                      </View>
                      <Text style={styles.pedidoActivoCosto}>${Number(pedido.costo || 0).toFixed(2)}</Text>
                    </View>

                    <View style={styles.pedidoActivoActionsRow}>
                      <TouchableOpacity
                        style={styles.btnCancelarParaLlevar}
                        onPress={() => handleCancelarParaLlevar(pedido)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                        <Text style={styles.btnCancelarParaLlevarText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnEditarParaLlevarGrande}
                        onPress={() => handleEditarParaLlevarExistente(pedido)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.btnEditarParaLlevarGrandeText}>Editar Pedido ➔</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR PEDIDO PARA LLEVAR */}
      <ConfirmarEliminarModal
        visible={!!pedidoAEliminar}
        titulo="¿Cancelar pedido para llevar?"
        mensaje={
          pedidoAEliminar
            ? `¿Estás seguro de cancelar Para Llevar #${pedidoAEliminar.num_mesa || 100}? Esta acción eliminará el pedido.`
            : ''
        }
        onConfirm={handleConfirmarEliminarParaLlevar}
        onClose={() => setPedidoAEliminar(null)}
        loading={loadingEliminar}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },

  /* Titles */
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  /* Para Llevar */
  paraLlevarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
  },
  paraLlevarCardActiveSelected: {
    borderColor: '#EA580C',
    borderWidth: 2.5,
    backgroundColor: '#FFF7ED',
  },
  paraLlevarIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paraLlevarInfo: {
    flex: 1,
  },
  paraLlevarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  paraLlevarSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badgeSelectedParaLlevar: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeSelectedParaLlevarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Mesas Grid */
  mesasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  mesaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  mesaCardActiveSelected: {
    borderColor: '#0D9488',
    borderWidth: 2.5,
    backgroundColor: '#ECFDF5',
  },
  mesaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  mesaHeaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOcupada: {
    backgroundColor: '#EA580C',
  },
  dotDisponible: {
    backgroundColor: '#22C55E',
  },
  badgeMesaSelected: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeMesaSelectedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  mesaNumText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  mesaNumTextActiveSelected: {
    color: '#065F46',
    fontWeight: '800',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  crearNuevoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    height: 52,
    borderRadius: 16,
    marginBottom: 24,
  },
  crearNuevoBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activosHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 20,
  },
  pedidoActivoCardContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  pedidoActivoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pedidoActivoInfo: {
    flex: 1,
  },
  pedidoActivoNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pedidoActivoSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pedidoActivoCosto: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0D9488',
  },
  pedidoActivoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnCancelarParaLlevar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    height: 42,
    borderRadius: 12,
  },
  btnCancelarParaLlevarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  btnEditarParaLlevarGrande: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    height: 42,
    borderRadius: 12,
  },
  btnEditarParaLlevarGrandeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
