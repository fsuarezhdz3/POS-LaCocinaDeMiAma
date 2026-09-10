import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Obtiene dinámicamente la IP de la computadora desde Expo Go para dispositivos físicos y emuladores
const getBackendUrl = () => {
  // En Expo SDK 54, manifest.hostUri contiene "IP:PUERTO" de Metro (ej. "192.168.1.15:8081")
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000/api`;
  }

  // Fallbacks
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }
  return 'http://localhost:3000/api';
};

export const API_URL = getBackendUrl();

console.log('🌐 Endpoint API Backend configurado en:', API_URL);
