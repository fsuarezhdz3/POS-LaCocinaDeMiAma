import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [obscurePassword, setObscurePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!usuario.trim() || !password.trim()) {
      setErrorMessage('Por favor ingrese su usuario y contraseña');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const res = await login(usuario.trim(), password.trim());

    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Superior con Logo SVG e Identificación */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.svg')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>

            <Text style={styles.appTitle}>La cocina de mi a'ma</Text>
            <Text style={styles.appSubtitle}>Punto de Venta</Text>
          </View>

          {/* Tarjeta de Formulario Flotante */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar Sesión</Text>

            {/* Campo Usuario */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Usuario</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputLeftIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ingrese su nombre de usuario"
                  placeholderTextColor="#94A3B8"
                  value={usuario}
                  onChangeText={setUsuario}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Campo Contraseña */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputLeftIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={obscurePassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setObscurePassword(!obscurePassword)}
                  style={styles.eyeToggle}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={obscurePassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón de Ingresar al Sistema */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Ingresar al Sistema</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Mensaje de Error */}
            {errorMessage !== '' && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#DC2626"
                  style={styles.errorIcon}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
  },

  /* Header y Logo */
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
    maxWidth: 450,
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 120,
    height: 120,
  },

  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 450,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 24,
  },

  /* Form inputs */
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  eyeToggle: {
    padding: 6,
  },

  /* Button */
  submitButton: {
    backgroundColor: '#0F172A',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },

  /* Error container */
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
});
