import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@pos_token');
      const storedUser = await AsyncStorage.getItem('@pos_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Error al cargar datos del almacenamiento local:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (nombre, contrasena) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, contrasena }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Error al iniciar sesión' };
      }

      await AsyncStorage.setItem('@pos_token', data.token);
      await AsyncStorage.setItem('@pos_user', JSON.stringify(data.usuario));

      setToken(data.token);
      setUser(data.usuario);

      return { success: true, usuario: data.usuario };
    } catch (error) {
      console.error('Error de red al intentar hacer login:', error);
      return { success: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión.' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@pos_token');
      await AsyncStorage.removeItem('@pos_user');
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
