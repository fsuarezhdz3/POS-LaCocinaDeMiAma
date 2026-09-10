import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { MeseroContext, MeseroProvider } from '../../context/MeseroContext';
import MeseroHeader from '../../components/MeseroHeader';
import MeseroFooter from '../../components/MeseroFooter';
import PedidoEnviadoModal from '../../components/PedidoEnviadoModal';
import SinMesaModal from '../../components/SinMesaModal';

import MesasTab from './MesasTab';
import MenuTab from './MenuTab';
import OrdenesTab from './OrdenesTab';

function MeseroContent() {
  const {
    activeTab,
    notificationState,
    hideSuccessNotification,
    sinMesaModalVisible,
    hideSinMesaModal,
    irASeleccionarMesa,
  } = useContext(MeseroContext);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'menu':
        return <MenuTab />;
      case 'ordenes':
        return <OrdenesTab />;
      case 'mesas':
      default:
        return <MesasTab />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.responsiveContainer}>
        {/* Header Superior Estilizado */}
        <MeseroHeader />

        {/* Vista Tab Activa */}
        <View style={styles.tabViewContainer}>{renderActiveTab()}</View>

        {/* Footer Inferior de 3 Íconos (Menú, Órdenes, Mesas) */}
        <MeseroFooter />

        {/* Modal Emergente de Pedido Enviado */}
        <PedidoEnviadoModal
          visible={notificationState.visible}
          titulo={notificationState.titulo}
          mensaje={notificationState.mensaje}
          onClose={hideSuccessNotification}
        />

        {/* Modal Emergente de Sin Mesa Seleccionada */}
        <SinMesaModal
          visible={sinMesaModalVisible}
          onClose={hideSinMesaModal}
          onIrAMesas={irASeleccionarMesa}
        />
      </View>
    </SafeAreaView>
  );
}

export default function MeseroHomeScreen() {
  return (
    <MeseroProvider>
      <MeseroContent />
    </MeseroProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabViewContainer: {
    flex: 1,
  },
});
