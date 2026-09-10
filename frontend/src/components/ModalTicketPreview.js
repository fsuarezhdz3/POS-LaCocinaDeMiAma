import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generarHTMLTicket, imprimirTicket, imprimirTicketDirecto, limpiarTextoTicket } from '../services/ticketService';

export default function ModalTicketPreview({ visible, comanda, opcionesCobro = {}, onClose }) {
  if (!comanda) return null;

  const [printing, setPrinting] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handlePrintDirecto = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const res = await imprimirTicketDirecto(comanda, opcionesCobro);
      if (res && res.ok) {
        showAlert('¡Impresión Exitosa! 🖨️', 'Ticket enviado directamente a "La Cocina de Mi Ama Tiket".');
        onClose();
      }
    } catch (e) {
      showAlert(
        'Impresora no detectada ⚠️',
        e.message || 'No se detectó la impresora USB ("La Cocina de Mi Ama Tiket"). Por favor verifica que esté encendida y conectada a la PC.'
      );
    } finally {
      setTimeout(() => setPrinting(false), 1500);
    }
  };

  const handlePrint = () => {
    imprimirTicket(comanda, opcionesCobro);
  };

  const items = comanda.items || [];
  const total = Number(comanda.total || items.reduce((acc, i) => acc + (Number(i.costo) || 0), 0));

  const fechaObj = comanda.fecha_pedido ? new Date(comanda.fecha_pedido) : new Date();
  const fechaStr = fechaObj.toLocaleDateString('es-MX');
  const horaStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.ticketCard}>
          {/* Header del Modal */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="receipt-outline" size={22} color="#0D9488" />
              <Text style={styles.modalHeaderTitle}>Ticket de Venta (58mm)</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close-circle-outline" size={26} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Papel Térmico de Ticket (Vista previa 58mm) */}
          <ScrollView style={styles.ticketPaper} contentContainerStyle={{ paddingBottom: 10 }}>
            <Text style={styles.ticketRestaurante}>LA COCINA DE MAMA</Text>
            <Text style={styles.ticketSub}>Sabor Casero y Tradicional</Text>

            <View style={styles.ticketDividerDash} />

            <View style={styles.ticketRow}>
              <Text style={styles.ticketMetaText}>Fecha: {fechaStr}</Text>
              <Text style={styles.ticketMetaText}>Hora: {horaStr}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketMetaText}>Orden: #{comanda.num_orden || 'S/N'}</Text>
              <Text style={styles.ticketMetaText}>Mesa: #{comanda.num_mesa || 'S/N'}</Text>
            </View>
            {comanda.mesero ? (
              <Text style={styles.ticketMetaText}>Mesero: {limpiarTextoTicket(comanda.mesero)}</Text>
            ) : null}

            <View style={styles.ticketDividerDash} />

            {items.map((item, idx) => {
              let rawNombre = item.alimento || item.nombre || 'Platillo';
              rawNombre = limpiarTextoTicket(rawNombre);

              let cantidad = 1;
              const matchCant = rawNombre.match(/^(\d+)x\s+/i);
              if (matchCant) {
                cantidad = parseInt(matchCant[1], 10);
                rawNombre = rawNombre.replace(/^(\d+)x\s+/i, '').trim();
              } else if (item.cantidad && Number(item.cantidad) > 0) {
                cantidad = Number(item.cantidad);
              }

              const precio = Number(item.costo || item.precio || 0).toFixed(2);

              const detallesList = [
                item.entrada ? `Entrada: ${limpiarTextoTicket(item.entrada)}` : null,
                item.guarnicion1 ? `Guarnicion 1: ${limpiarTextoTicket(item.guarnicion1)}` : null,
                item.guarnicion2 ? `Guarnicion 2: ${limpiarTextoTicket(item.guarnicion2)}` : null,
                item.guiso ? `Guiso: ${limpiarTextoTicket(item.guiso)}` : null,
                item.bebida ? `Bebida: ${limpiarTextoTicket(item.bebida)}` : null,
                item.extras ? `Extra: ${limpiarTextoTicket(item.extras)}` : null,
              ].filter(Boolean);

              return (
                <View key={idx} style={{ marginBottom: 6 }}>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketItemName}>{cantidad}x {rawNombre}</Text>
                    <Text style={styles.ticketItemPrice}>${precio}</Text>
                  </View>
                  {detallesList.map((d, dIdx) => (
                    <Text key={dIdx} style={styles.ticketItemExtras}>+ {d}</Text>
                  ))}
                </View>
              );
            })}

            <View style={styles.ticketDividerDash} />

            <View style={styles.ticketTotalRow}>
              <Text style={styles.ticketTotalLabel}>TOTAL:</Text>
              <Text style={styles.ticketTotalValue}>${total.toFixed(2)}</Text>
            </View>

            <View style={styles.ticketDividerSolid} />

            <Text style={styles.ticketFooterText}>¡Gracias por su compra!</Text>
            <Text style={styles.ticketFooterTextSub}>La Cocina de Mama 🍽️</Text>
          </ScrollView>

          {/* Acciones de Impresión */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.btnPrintPrimary}
              onPress={handlePrintDirecto}
              disabled={printing}
              activeOpacity={0.85}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
              ) : (
                <Ionicons name="print-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.btnPrintPrimaryText}>Imprimir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  ticketPaper: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
  },
  ticketRestaurante: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    color: '#0F172A',
  },
  ticketSub: {
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    color: '#64748B',
    marginTop: 2,
  },
  ticketDividerDash: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    marginVertical: 8,
  },
  ticketDividerSolid: {
    borderTopWidth: 2,
    borderColor: '#0F172A',
    marginVertical: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketMetaText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#334155',
  },
  ticketItemName: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  ticketItemPrice: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  ticketItemExtras: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#64748B',
    paddingLeft: 14,
  },
  ticketTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ticketTotalLabel: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  ticketTotalValue: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '900',
    color: '#0D9488',
  },
  ticketFooterText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0F172A',
    marginTop: 4,
  },
  ticketFooterTextSub: {
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    color: '#64748B',
    marginTop: 2,
  },
  actionsContainer: {
    gap: 8,
  },
  btnPrintPrimary: {
    backgroundColor: '#0D9488',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrintPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  btnSecondaryPrint: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryPrintText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '800',
  },
});
