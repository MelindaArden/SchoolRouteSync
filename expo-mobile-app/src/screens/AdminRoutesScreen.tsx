import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { Route, User, PickupSession } from '../types';

export default function AdminRoutesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [activeSessions, setActiveSessions] = useState<PickupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [routesData, driversData, sessionsData] = await Promise.all([
        apiClient.get(API_ENDPOINTS.ROUTES),
        apiClient.get(API_ENDPOINTS.USERS),
        apiClient.get(`${API_ENDPOINTS.PICKUP_SESSIONS}/today`)
      ]);

      setRoutes(routesData);
      setDrivers(driversData.filter((user: User) => user.role === 'driver'));
      setActiveSessions(sessionsData.filter((session: PickupSession) => session.status === 'in_progress'));

    } catch (error) {
      console.error('Failed to load route data:', error);
      Alert.alert('Error', 'Failed to load route information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getDriverName = (driverId: number) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.firstName || driver.username}` : 'Unassigned';
  };

  const isRouteActive = (routeId: number) => {
    return activeSessions.some(session => session.routeId === routeId);
  };

  const createNewRoute = () => {
    Alert.alert(
      'Create Route',
      'This feature would open a route creation form. For now, routes can be created from the web dashboard.',
      [{ text: 'OK' }]
    );
  };

  const editRoute = (route: Route) => {
    Alert.alert(
      'Edit Route',
      `Edit "${route.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => {
          Alert.alert('Edit Route', 'Route editing would open here. Use web dashboard for full editing capabilities.');
        }},
      ]
    );
  };

  const deleteRoute = (route: Route) => {
    Alert.alert(
      'Delete Route',
      `Are you sure you want to delete "${route.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`${API_ENDPOINTS.ROUTES}/${route.id}`);
              setRoutes(prev => prev.filter(r => r.id !== route.id));
              Alert.alert('Success', 'Route deleted successfully');
            } catch (error) {
              console.error('Failed to delete route:', error);
              Alert.alert('Error', 'Failed to delete route');
            }
          }
        },
      ]
    );
  };

  const renderRoute = ({ item: route }: { item: Route }) => {
    const isActive = isRouteActive(route.id);
    
    return (
      <View style={[styles.routeCard, isActive && styles.activeRouteCard]}>
        <View style={styles.routeHeader}>
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.driverName}>
              Driver: {getDriverName(route.driverId)}
            </Text>
            {route.estimatedDuration && (
              <Text style={styles.duration}>
                Duration: {route.estimatedDuration} minutes
              </Text>
            )}
          </View>
          
          {isActive && (
            <View style={styles.activeIndicator}>
              <Ionicons name="radio-button-on" size={16} color="#10b981" />
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>

        <View style={styles.routeActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => editRoute(route)}
          >
            <Ionicons name="create" size={16} color="#2563eb" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { opacity: isActive ? 0.5 : 1 }]}
            onPress={() => deleteRoute(route)}
            disabled={isActive}
          >
            <Ionicons name="trash" size={16} color="#ef4444" />
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading routes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Management</Text>
        <TouchableOpacity style={styles.createButton} onPress={createNewRoute}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>New Route</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{routes.length}</Text>
          <Text style={styles.statLabel}>Total Routes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{activeSessions.length}</Text>
          <Text style={styles.statLabel}>Active Now</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{drivers.length}</Text>
          <Text style={styles.statLabel}>Available Drivers</Text>
        </View>
      </View>

      {/* Routes List */}
      <FlatList
        data={routes}
        renderItem={renderRoute}
        keyExtractor={(item) => item.id.toString()}
        style={styles.routesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="map" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Routes Created</Text>
            <Text style={styles.emptySubtitle}>
              Create your first pickup route to get started
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={createNewRoute}>
              <Text style={styles.emptyButtonText}>Create Route</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  routesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  routeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeRouteCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: '#2563eb',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  routeActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#2563eb',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});