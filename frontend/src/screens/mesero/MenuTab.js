import React, { useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeseroContext } from '../../context/MeseroContext';

import DesayunosView from './DesayunosView';
import ComidaView from './ComidaView';
import BebidasView from './BebidasView';
import AntojitosView from './AntojitosView';
import TortasView from './TortasView';
import PostresView from './PostresView';
import ExtrasView from './ExtrasView';
import LitrosView from './LitrosView';
import EntradasView from './EntradasView';
import PlatosFuertesView from './PlatosFuertesView';
import GuarnicionesView from './GuarnicionesView';

export default function MenuTab() {
  const { selectedMesa, activeCategoryView, setActiveCategoryView, showSinMesaModal } = useContext(MeseroContext);
  const { width } = useWindowDimensions();

  // Cálculo de columnas responsivo para Tablet en Vertical y Horizontal
  const cardWidth = width > 1024 ? '18.5%' : width > 768 ? '23.5%' : width > 500 ? '31.5%' : '48%';

  // Lista de categorías del menú con imágenes .webp desde assets
  const categorias = [
    { id: 'desayunos', nombre: 'DESAYUNOS', image: require('../../../assets/desayunos.webp'), icon: 'egg-outline', color: '#D97706', bg: '#FEF3C7' },
    { id: 'comida', nombre: 'COMIDA', image: require('../../../assets/comidas.webp'), icon: 'restaurant-outline', color: '#EA580C', bg: '#FFEDD5' },
    { id: 'bebidas', nombre: 'BEBIDAS', image: require('../../../assets/Bebidas.webp'), icon: 'wine-outline', color: '#0284C7', bg: '#E0F2FE' },
    { id: 'antojitos', nombre: 'ANTOJITOS', image: require('../../../assets/antojitos.webp'), icon: 'fast-food-outline', color: '#DC2626', bg: '#FEE2E2' },
    { id: 'tortas', nombre: 'TORTAS', image: require('../../../assets/tortas.webp'), icon: 'nutrition-outline', color: '#B45309', bg: '#FEF3C7' },
    { id: 'postres', nombre: 'POSTRES', image: require('../../../assets/Postres.webp'), icon: 'ice-cream-outline', color: '#EC4899', bg: '#FCE7F3' },
    { id: 'extras', nombre: 'EXTRAS', image: require('../../../assets/extras.webp'), icon: 'add-circle-outline', color: '#475569', bg: '#F1F5F9' },
    { id: 'litros', nombre: 'LITROS', image: require('../../../assets/litros.webp'), icon: 'beaker-outline', color: '#0D9488', bg: '#CCFBF1' },
  ];

  // Al hacer clic en una categoría
  const handleSelectCategoria = (cat) => {
    if (!selectedMesa) {
      showSinMesaModal();
      return;
    }
    setActiveCategoryView(cat.id);
  };

  // Si está dentro de la vista de Desayunos
  if (activeCategoryView === 'desayunos') {
    return <DesayunosView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Comida
  if (activeCategoryView === 'comida') {
    return <ComidaView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Bebidas
  if (activeCategoryView === 'bebidas') {
    return <BebidasView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Antojitos
  if (activeCategoryView === 'antojitos') {
    return <AntojitosView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Tortas
  if (activeCategoryView === 'tortas') {
    return <TortasView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Postres
  if (activeCategoryView === 'postres') {
    return <PostresView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Extras
  if (activeCategoryView === 'extras') {
    return <ExtrasView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Litros
  if (activeCategoryView === 'litros') {
    return <LitrosView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Entradas
  if (activeCategoryView === 'entradas') {
    return <EntradasView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Platos Fuertes
  if (activeCategoryView === 'platos_fuertes') {
    return <PlatosFuertesView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  // Si está dentro de la vista de Guarniciones
  if (activeCategoryView === 'guarniciones') {
    return <GuarnicionesView onVolverMenu={() => setActiveCategoryView(null)} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Título de la Sección */}
      <Text style={styles.sectionTitle}>Menú de Alimentos</Text>

      {/* Grid Responsivo de Recuadros de Categorías */}
      <View style={styles.gridContainer}>
        {categorias.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryCard, { width: cardWidth }]}
            onPress={() => handleSelectCategoria(cat)}
            activeOpacity={0.85}
          >
            {/* Área de la Imagen */}
            <View style={styles.cardTopArea}>
              {cat.image ? (
                <Image
                  source={cat.image}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.iconCircle, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon} size={36} color={cat.color} />
                </View>
              )}
            </View>

            {/* Banner Inferior */}
            <View style={styles.cardBottomBanner}>
              <Text style={styles.categoryNameText} numberOfLines={1}>
                {cat.nombre}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },

  /* Banner Mesa */
  mesaIndicatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  mesaIndicatorText: {
    fontSize: 13,
    color: '#64748B',
  },
  mesaIndicatorBold: {
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Título */
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  /* Grid Responsivo */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  categoryCard: {
    height: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    justifyContent: 'space-between',
  },
  cardTopArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Banner Inferior */
  cardBottomBanner: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryNameText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
