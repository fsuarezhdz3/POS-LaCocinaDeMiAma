import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SinMesaModal({ visible, onClose, onIrAMesas }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={26} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="restaurant" size={38} color="#EF4444" />
          </View>

          <Text style={styles.title}>Mesa Requerida</Text>

          <Text style={styles.message}>
            Para poder levantar y enviar un pedido, primero necesitas seleccionar una mesa o un pedido para llevar.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnPrimary} onPress={onIrAMesas} activeOpacity={0.85}>
              <Ionicons name="apps-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnPrimaryText}>Seleccionar Mesa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#FEF2F2',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  btnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
