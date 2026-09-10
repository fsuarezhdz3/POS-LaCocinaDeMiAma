import React, { createContext, useState } from 'react';

export const MeseroContext = createContext();

export const MeseroProvider = ({ children }) => {
  // Tab activo: 'mesas', 'menu', 'ordenes' (por defecto 'mesas')
  const [activeTab, setActiveTab] = useState('mesas');

  // Subvista activa dentro de Menú (null = Grid de Categorías, 'desayunos' = Vista de Desayunos)
  const [activeCategoryView, setActiveCategoryView] = useState(null);

  // Guardar la mesa o pedido para llevar seleccionado actualmente
  const [selectedMesa, setSelectedMesa] = useState(null);

  // Seleccionar mesa o para llevar y redirigir opcionalmente al tab especificado (por defecto 'menu')
  const selectMesa = (mesa, targetTab = 'menu') => {
    let mesaFinal = mesa;
    if (mesa) {
      const numMesa = Number(mesa.num_mesa || mesa.id || 0);
      if (!isNaN(numMesa) && numMesa >= 100) {
        mesaFinal = {
          ...mesa,
          num_mesa: numMesa,
          tipo: 'para_llevar',
          nombre: `Para Llevar #${numMesa}`,
        };
      } else if (!isNaN(numMesa) && numMesa > 0) {
        mesaFinal = {
          ...mesa,
          num_mesa: numMesa,
          tipo: 'mesa',
          nombre: `Mesa #${numMesa}`,
        };
      }
    }
    setSelectedMesa(mesaFinal);
    setActiveCategoryView(null);
    setActiveTab(targetTab || 'menu');
  };

  // Navegar al Menú Principal (reinicia a las 11 categorías)
  const navigateToMenu = () => {
    setActiveCategoryView(null);
    setActiveTab('menu');
  };

  const clearMesa = () => {
    setSelectedMesa(null);
    setActiveCategoryView(null);
    setActiveTab('mesas');
  };

  // Estado para la ventana emergente de Sin Mesa Seleccionada
  const [sinMesaModalVisible, setSinMesaModalVisible] = useState(false);

  const showSinMesaModal = () => {
    setSinMesaModalVisible(true);
  };

  const hideSinMesaModal = () => {
    setSinMesaModalVisible(false);
  };

  const irASeleccionarMesa = () => {
    setSinMesaModalVisible(false);
    setActiveCategoryView(null);
    setActiveTab('mesas');
  };

  const checkMesaSeleccionada = () => {
    if (!selectedMesa) {
      setSinMesaModalVisible(true);
      return false;
    }
    return true;
  };

  // Estado para la ventana emergente de pedido enviado
  const [notificationState, setNotificationState] = useState({
    visible: false,
    titulo: '¡Pedido Enviado!',
    mensaje: '',
  });

  const showSuccessNotification = (titulo, mensaje) => {
    setNotificationState({
      visible: true,
      titulo: titulo || '¡Pedido Enviado!',
      mensaje: mensaje || '',
    });
  };

  const hideSuccessNotification = () => {
    setNotificationState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <MeseroContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeCategoryView,
        setActiveCategoryView,
        selectedMesa,
        setSelectedMesa,
        selectMesa,
        navigateToMenu,
        clearMesa,
        notificationState,
        showSuccessNotification,
        hideSuccessNotification,
        sinMesaModalVisible,
        showSinMesaModal,
        hideSinMesaModal,
        irASeleccionarMesa,
        checkMesaSeleccionada,
      }}
    >
      {children}
    </MeseroContext.Provider>
  );
};
