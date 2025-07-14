import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Check for stored auth token
      const authToken = await SecureStore.getItemAsync('authToken');
      const storedUser = await SecureStore.getItemAsync('user');

      if (authToken && storedUser) {
        apiClient.setAuthToken(authToken);
        
        // Verify token is still valid
        try {
          const sessionData = await apiClient.get(API_ENDPOINTS.SESSION);
          if (sessionData.isAuthenticated) {
            setUser(JSON.parse(storedUser));
            return;
          }
        } catch (error) {
          // Token invalid, clear stored data
          await SecureStore.deleteItemAsync('authToken');
          await SecureStore.deleteItemAsync('user');
          apiClient.clearAuthToken();
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await apiClient.post(API_ENDPOINTS.LOGIN, {
        username,
        password
      });

      if (response.authToken) {
        // Store auth token securely
        await SecureStore.setItemAsync('authToken', response.authToken);
        await SecureStore.setItemAsync('user', JSON.stringify(response));
        
        apiClient.setAuthToken(response.authToken);
        setUser(response);
      } else {
        throw new Error('No auth token received');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await apiClient.post(API_ENDPOINTS.LOGOUT, {});
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear local data regardless
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('user');
      apiClient.clearAuthToken();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    checkSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}