import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { Route, PickupSession } from '../types';
import DriverDashboard from '../components/DriverDashboard';
import AdminDashboard from '../components/AdminDashboard';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { requestPermission, hasPermission } = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Request location permission on app start
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh will be handled by individual dashboard components
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>
            {user.firstName || user.username}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {user.role === 'driver' ? (
          <DriverDashboard navigation={navigation} />
        ) : (
          <AdminDashboard navigation={navigation} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
});