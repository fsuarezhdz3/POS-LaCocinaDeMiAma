import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ConfirmarEliminarModal({
  visible,
  titulo = '¿Eliminar alimento?',
  mensaje,
  onConfirm,
  onClose,
  loading = false,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.cardContainer} onPress={(e) => e.stopPropagation()}>
          {/* Botón X para cerrar */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            disabled={loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>

          {/* Ícono de advertencia / bote de basura */}
          <View style={styles.iconCircle}>
            <Ionicons name="trash-outline" size={42} color="#DC2626" />
          </View>

          {/* Título y Mensaje */}
          <Text style={styles.title}>{titulo}</Text>
          {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}

          {/* Botones de Acción (Cancelar vs Confirmar Eliminar) */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.btnCancelarText}>No, conservar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnEliminar}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnEliminarText}>Sí, eliminar</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 24,
    width: '90%',
    maxWidth: 420,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  btnCancelar: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  btnEliminar: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEliminarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
