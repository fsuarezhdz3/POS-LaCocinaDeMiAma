import React, { useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../context/AuthContext';
import MeseroHomeScreen from './mesero/MeseroHomeScreen';
import ComalHomeScreen from './comal/ComalHomeScreen';
import CocinaHomeScreen from './cocina/CocinaHomeScreen';
import AdminHomeScreen from './admin/AdminHomeScreen';
import SuperAdminHomeScreen from './superadmin/SuperAdminHomeScreen';

export default function HomeScreen() {
  const { user, logout } = useContext(AuthContext);

  // Si el tipo de usuario es mesero o barra, mostrar la interfaz de Mesero/Órdenes
  if (user?.tipo?.toLowerCase() === 'mesero' || user?.tipo?.toLowerCase() === 'barra') {
    return <MeseroHomeScreen />;
  }

  // Si el tipo de usuario es comal, mostrar únicamente la pantalla de órdenes de comal
  if (user?.tipo?.toLowerCase() === 'comal') {
    return <ComalHomeScreen />;
  }

  // Si el tipo de usuario es cocina, mostrar únicamente la pantalla de órdenes de cocina
  if (user?.tipo?.toLowerCase() === 'cocina') {
    return <CocinaHomeScreen />;
  }

  // Si el tipo de usuario es superadmin, mostrar el panel completo de superadmin
  if (user?.tipo?.toLowerCase() === 'superadmin') {
    return <SuperAdminHomeScreen />;
  }

  // Si el tipo de usuario es admin, mostrar el panel de administración
  if (user?.tipo?.toLowerCase() === 'admin') {
    return <AdminHomeScreen />;
  }

  const getRoleConfig = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'superadmin':
        return {
          greetingTitle: '¡Hola SuperAdmin!',
          roleName: 'SuperAdmin',
          color: '#0D9488',
          lightBg: '#CCFBF1',
          borderColor: '#E9D5FF',
          icon: 'key-outline',
          description: 'Control total sobre el sistema, cuentas de usuario y configuraciones globales.',
        };
      case 'admin':
        return {
          greetingTitle: '¡Hola Admin!',
          roleName: 'Administrador',
          color: '#2563EB',
          lightBg: '#EFF6FF',
          borderColor: '#BFDBFE',
          icon: 'shield-checkmark-outline',
          description: 'Gestión de menú, alimentos, cortes de caja, ingresos, egresos y facturación.',
        };
      case 'mesero':
        return {
          greetingTitle: '¡Hola Mesero!',
          roleName: 'Mesero',
          color: '#EA580C',
          lightBg: '#F0FDFA',
          borderColor: '#CCFBF1',
          icon: 'restaurant-outline',
          description: 'Toma de comandas, asignación de mesas y atención en tiempo real a clientes.',
        };
      case 'barra':
        return {
          greetingTitle: '¡Hola Barra!',
          roleName: 'Barra de Bebidas',
          color: '#0D9488',
          lightBg: '#F0FDFA',
          borderColor: '#CCFBF1',
          icon: 'wine-outline',
          description: 'Monitor en tiempo real de bebidas y coctelería pendientes de servir.',
        };
      case 'cocina':
        return {
          greetingTitle: '¡Hola Cocina!',
          roleName: 'Cocina Principal',
          color: '#DC2626',
          lightBg: '#FEF2F2',
          borderColor: '#FCA5A5',
          icon: 'flame-outline',
          description: 'Monitor de platillos y guisados para preparación y entrega en cocina.',
        };
      case 'comal':
        return {
          greetingTitle: '¡Hola Comal!',
          roleName: 'Área de Comal',
          color: '#D97706',
          lightBg: '#FEF3C7',
          borderColor: '#FDE68A',
          icon: 'nutrition-outline',
          description: 'Monitor de antojitos, tortillas hechas a mano y preparaciones al comal.',
        };
      default:
        return {
          greetingTitle: `¡Hola ${user?.nombre || 'Usuario'}!`,
          roleName: user?.tipo || 'Usuario',
          color: '#0F172A',
          lightBg: '#F1F5F9',
          borderColor: '#E2E8F0',
          icon: 'person-outline',
          description: 'Bienvenido al sistema POS La cocina de mi a\'ma.',
        };
    }
  };

  const roleConfig = getRoleConfig(user?.tipo);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header Superior */}
      <View style={[styles.header, { backgroundColor: roleConfig.color }]}>
        <View style={styles.iconCircle}>
          <Ionicons name={roleConfig.icon} size={36} color={roleConfig.color} />
        </View>

        <Text style={styles.greetingTitle}>{roleConfig.greetingTitle}</Text>

        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>CUENTA: {user?.nombre?.toUpperCase() || 'USUARIO'}</Text>
        </View>
      </View>

      {/* Contenido Principal */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.appTitle}>La cocina de mi a'ma</Text>
        <Text style={styles.appSubtitle}>Sistema POS & Punto de Venta</Text>

        {/* Tarjeta Informativa del Rol */}
        <View
          style={[
            styles.card,
            { backgroundColor: roleConfig.lightBg, borderColor: roleConfig.borderColor },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Ionicons name="information-circle-outline" size={24} color={roleConfig.color} />
            <Text style={[styles.cardRoleTitle, { color: roleConfig.color }]}>
              Rol Activo: {roleConfig.roleName}
            </Text>
          </View>

          <Text style={styles.cardDescription}>{roleConfig.description}</Text>
        </View>

        {/* Detalle de Sesión */}
        <View style={styles.sessionDetailsCard}>
          <Text style={styles.detailsHeader}>Detalles de la Sesión</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nombre de usuario:</Text>
            <Text style={styles.detailValue}>{user?.nombre || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tipo de cuenta:</Text>
            <Text style={[styles.detailValue, { color: roleConfig.color, fontWeight: '700' }]}>
              {user?.tipo || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ID de cuenta:</Text>
            <Text style={styles.detailValue}>#{user?.id || '0'}</Text>
          </View>
        </View>

        {/* Botón de Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardRoleTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  sessionDetailsCard: {
    backgroundColor: '#F8FAFC',
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 28,
  },
  detailsHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    width: '100%',
    height: 52,
    borderRadius: 16,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
});
