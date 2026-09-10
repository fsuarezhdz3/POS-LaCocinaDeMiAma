import React, { useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MeseroContext } from '../context/MeseroContext';

export default function MeseroFooter() {
  const { activeTab, setActiveTab, navigateToMenu } = useContext(MeseroContext);
  const insets = useSafeAreaInsets();

  const tabs = [
    {
      key: 'menu',
      label: 'Menú',
      iconActive: 'book',
      iconInactive: 'book-outline',
    },
    {
      key: 'ordenes',
      label: 'Órdenes',
      iconActive: 'receipt',
      iconInactive: 'receipt-outline',
    },
    {
      key: 'mesas',
      label: 'Mesas',
      iconActive: 'grid',
      iconInactive: 'grid-outline',
    },
  ];

  const handleTabPress = (key) => {
    if (key === 'menu') {
      navigateToMenu();
    } else {
      setActiveTab(key);
    }
  };

  // Respetar insets.bottom cuando exista barra física/gestual del sistema
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 4;

  return (
    <View style={[styles.footerContainer, { paddingBottom: bottomPadding }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.iconInactive}
              size={20}
              color={isActive ? '#0D9488' : '#64748B'}
            />

            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 5,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#0D9488',
    fontWeight: '800',
  },
});
