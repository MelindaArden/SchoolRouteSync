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
import { User, PickupSession, DriverLocation } from '../types';

export default function AdminDriversScreen() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [activeSessions, setActiveSessions] = useState<PickupSession[]>([]);
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    
    // Refresh data every 30 seconds for live tracking
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [driversData, sessionsData, locationsData] = await Promise.all([
        apiClient.get(API_ENDPOINTS.USERS),
        apiClient.get(`${API_ENDPOINTS.PICKUP_SESSIONS}/today`),
        apiClient.get('/api/driver-locations')
      ]);

      setDrivers(driversData.filter((user: User) => user.role === 'driver'));
      setActiveSessions(sessionsData.filter((session: PickupSession) => session.status === 'in_progress'));
      setDriverLocations(locationsData);

    } catch (error) {
      console.error('Failed to load driver data:', error);
      Alert.alert('Error', 'Failed to load driver information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getDriverStatus = (driverId: number) => {
    const hasActiveSession = activeSessions.some(session => session.driverId === driverId);
    return hasActiveSession ? 'active' : 'available';
  };

  const getDriverLocation = (driverId: number) => {
    return driverLocations.find(location => location.driverId === driverId);
  };

  const getActiveSession = (driverId: number) => {
    return activeSessions.find(session => session.driverId === driverId);
  };

  const contactDriver = (driver: User) => {
    if (!driver.phone) {
      Alert.alert('No Phone Number', 'No phone number available for this driver');
      return;
    }

    Alert.alert(
      'Contact Driver',
      `Call ${driver.firstName || driver.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => {
          // In a real app, you would use Linking.openURL(`tel:${driver.phone}`)
          Alert.alert('Calling...', `Would call ${driver.phone}`);
        }},
      ]
    );
  };

  const viewDriverLocation = (driver: User) => {
    const location = getDriverLocation(driver.id);
    
    if (!location) {
      Alert.alert('No Location', 'No recent location data available for this driver');
      return;
    }

    const lastUpdate = new Date(location.timestamp).toLocaleString();
    
    Alert.alert(
      'Driver Location',
      `${driver.firstName || driver.username}\n\nLast Location Update:\n${lastUpdate}\n\nCoordinates:\n${location.latitude}, ${location.longitude}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Open in Maps', onPress: () => {
          // In a real app, you would open maps with the coordinates
          Alert.alert('Maps', `Would open maps at ${location.latitude}, ${location.longitude}`);
        }},
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'available': return '#2563eb';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'radio-button-on';
      case 'available': return 'checkmark-circle';
      default: return 'radio-button-off';
    }
  };

  const renderDriver = ({ item: driver }: { item: User }) => {
    const status = getDriverStatus(driver.id);
    const location = getDriverLocation(driver.id);
    const session = getActiveSession(driver.id);
    
    return (
      <View style={styles.driverCard}>
        <View style={styles.driverHeader}>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>
              {driver.firstName && driver.lastName 
                ? `${driver.firstName} ${driver.lastName}` 
                : driver.username}
            </Text>
            <View style={styles.statusContainer}>
              <Ionicons 
                name={getStatusIcon(status) as any} 
                size={16} 
                color={getStatusColor(status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                {status === 'active' ? 'On Route' : 'Available'}
              </Text>
            </View>
            
            {driver.email && (
              <Text style={styles.driverEmail}>{driver.email}</Text>
            )}
          </View>

          <View style={styles.driverActions}>
            {driver.phone && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => contactDriver(driver)}
              >
                <Ionicons name="call" size={20} color="#2563eb" />
              </TouchableOpacity>
            )}
            
            {location && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => viewDriverLocation(driver)}
              >
                <Ionicons name="location" size={20} color="#10b981" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active Session Info */}
        {session && (
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Current Route</Text>
            <Text style={styles.sessionDetails}>
              Route ID: {session.routeId}
            </Text>
            <Text style={styles.sessionDetails}>
              Started: {new Date(session.startTime!).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* Location Info */}
        {location && (
          <View style={styles.locationInfo}>
            <Ionicons name="time" size={14} color="#6b7280" />
            <Text style={styles.locationText}>
              Last seen: {new Date(location.timestamp).toLocaleTimeString()}
            </Text>
            {location.speed && (
              <Text style={styles.speedText}>
                Speed: {Math.round(location.speed * 2.237)} mph
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading drivers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{drivers.length}</Text>
          <Text style={styles.statLabel}>Total Drivers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{activeSessions.length}</Text>
          <Text style={styles.statLabel}>Active Routes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {drivers.length - activeSessions.length}
          </Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>

      {/* Drivers List */}
      <FlatList
        data={drivers}
        renderItem={renderDriver}
        keyExtractor={(item) => item.id.toString()}
        style={styles.driversList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Drivers Found</Text>
            <Text style={styles.emptySubtitle}>
              No drivers are currently registered in the system
            </Text>
          </View>
        )}
      />

      {/* Auto-refresh indicator */}
      <View style={styles.refreshIndicator}>
        <Ionicons name="refresh" size={14} color="#6b7280" />
        <Text style={styles.refreshText}>Auto-refreshing every 30 seconds</Text>
      </View>
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
  driversList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  driverCard: {
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
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  driverEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  sessionDetails: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 2,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  speedText: {
    fontSize: 12,
    color: '#2563eb',
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
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
  },
  refreshText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
});