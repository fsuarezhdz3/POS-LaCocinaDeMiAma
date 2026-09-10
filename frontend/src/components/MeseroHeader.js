import React, { useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { MeseroContext } from '../context/MeseroContext';

export default function MeseroHeader() {
  const { user, logout } = useContext(AuthContext);
  const { selectedMesa } = useContext(MeseroContext);

  const getSelectedMesaLabel = () => {
    if (!selectedMesa) return 'Sin mesa seleccionada';
    const numMesa = Number(selectedMesa.num_mesa || selectedMesa.id || 0);
    if (!isNaN(numMesa) && numMesa >= 100) {
      return `Para llevar #${numMesa}`;
    }
    return selectedMesa.nombre || `Mesa #${numMesa}`;
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftSection}>
        <View style={styles.logoBadge}>
          <Image
            source={require('../../assets/logo.svg')}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>

        <View style={styles.userInfo}>
          {/* Nombre del mesero en lugar de LaCocina */}
          <Text style={styles.waiterNameText}>{user?.nombre || 'Mesero'}</Text>
          {/* Mesa seleccionada o Para llevar #100 debajo del nombre */}
          <Text style={styles.selectedMesaText}>
            {getSelectedMesaLabel()}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginTop: 4,
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
  waiterNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  selectedMesaText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
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
});
