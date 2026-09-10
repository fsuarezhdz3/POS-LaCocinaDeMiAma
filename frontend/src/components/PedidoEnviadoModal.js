import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PedidoEnviadoModal({
  visible,
  titulo = '¡Pedido Enviado!',
  mensaje,
  onClose,
  autoCloseMs = 1800,
}) {
  useEffect(() => {
    let timer;
    if (visible) {
      timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoCloseMs);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, onClose, autoCloseMs]);

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
          {/* Botón X para cerrar manualmente */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>

          {/* Ícono de Confirmación Exitoso */}
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          </View>

          {/* Título y Mensaje */}
          <Text style={styles.title}>{titulo}</Text>
          {mensaje ? <Text style={styles.message}>{mensaje}</Text> : null}
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
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
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
  },
});
