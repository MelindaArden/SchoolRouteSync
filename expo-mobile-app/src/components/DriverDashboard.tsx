import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { Route, PickupSession } from '../types';

interface DriverDashboardProps {
  navigation: any;
}

export default function DriverDashboard({ navigation }: DriverDashboardProps) {
  const { user } = useAuth();
  const { location, tracking, startTracking, stopTracking, getCurrentLocation } = useLocation();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeSession, setActiveSession] = useState<PickupSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load driver's routes
      const routesData = await apiClient.get(`${API_ENDPOINTS.ROUTES}/driver/${user?.id}`);
      setRoutes(routesData);

      // Check for active pickup session
      const sessionsData = await apiClient.get(`${API_ENDPOINTS.PICKUP_SESSIONS}/today`);
      const userActiveSession = sessionsData.find(
        (session: PickupSession) => 
          session.driverId === user?.id && session.status === 'in_progress'
      );
      setActiveSession(userActiveSession || null);

    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load route data');
    } finally {
      setLoading(false);
    }
  };

  const startRoute = async (routeId: number) => {
    try {
      // Get current location
      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        Alert.alert('Location Error', 'Unable to get your current location. Please enable location services.');
        return;
      }

      // Create pickup session
      const sessionData = await apiClient.post(API_ENDPOINTS.PICKUP_SESSIONS, {
        routeId,
        driverId: user?.id,
        status: 'in_progress',
        startLatitude: currentLocation.latitude.toString(),
        startLongitude: currentLocation.longitude.toString(),
        date: new Date().toISOString().split('T')[0]
      });

      setActiveSession(sessionData);
      
      // Start location tracking
      await startTracking(sessionData.id);
      
      Alert.alert('Route Started', 'Your pickup route has been started. GPS tracking is now active.');
      
      // Navigate to route details
      navigation.navigate('RouteDetail', { routeId });

    } catch (error) {
      console.error('Failed to start route:', error);
      Alert.alert('Error', 'Failed to start route. Please try again.');
    }
  };

  const resumeRoute = () => {
    if (activeSession) {
      // Resume location tracking
      startTracking(activeSession.id);
      navigation.navigate('RouteDetail', { routeId: activeSession.routeId });
    }
  };

  const completeRoute = async () => {
    if (!activeSession) return;

    Alert.alert(
      'Complete Route',
      'Are you sure you want to complete this pickup route?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const currentLocation = await getCurrentLocation();
              
              await apiClient.put(`${API_ENDPOINTS.PICKUP_SESSIONS}/${activeSession.id}`, {
                status: 'completed',
                endTime: new Date().toISOString(),
                endLatitude: currentLocation?.latitude.toString(),
                endLongitude: currentLocation?.longitude.toString(),
              });

              stopTracking();
              setActiveSession(null);
              
              Alert.alert('Route Completed', 'Your pickup route has been completed successfully.');
              
            } catch (error) {
              console.error('Failed to complete route:', error);
              Alert.alert('Error', 'Failed to complete route. Please try again.');
            }
          }
        },
      ]
    );
  };

  const reportIssue = () => {
    Alert.alert(
      'Report Issue',
      'What type of issue would you like to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mechanical Issue', onPress: () => submitIssue('mechanical') },
        { text: 'Weather/Traffic', onPress: () => submitIssue('weather') },
        { text: 'Emergency', onPress: () => submitIssue('emergency') },
        { text: 'Other', onPress: () => submitIssue('other') },
      ]
    );
  };

  const submitIssue = async (type: string) => {
    try {
      await apiClient.post(API_ENDPOINTS.ISSUES, {
        driverId: user?.id,
        type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Issue`,
        description: `Issue reported from mobile app`,
        priority: type === 'emergency' ? 'urgent' : 'medium',
        status: 'open'
      });
      
      Alert.alert('Issue Reported', 'Your issue has been reported to administrators.');
    } catch (error) {
      console.error('Failed to report issue:', error);
      Alert.alert('Error', 'Failed to report issue. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your routes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Location Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons name="location" size={24} color={tracking ? "#10b981" : "#6b7280"} />
          <Text style={styles.statusTitle}>GPS Tracking</Text>
        </View>
        <Text style={styles.statusText}>
          {tracking ? 'Active - Location being tracked' : 'Inactive'}
        </Text>
        {location && (
          <Text style={styles.locationText}>
            Last update: {new Date(location.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Active Route */}
      {activeSession ? (
        <View style={styles.activeRouteCard}>
          <Text style={styles.activeRouteTitle}>Active Route</Text>
          <Text style={styles.activeRouteText}>
            Route in progress since {new Date(activeSession.startTime!).toLocaleTimeString()}
          </Text>
          <View style={styles.activeRouteButtons}>
            <TouchableOpacity style={styles.resumeButton} onPress={resumeRoute}>
              <Text style={styles.buttonText}>Continue Route</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeButton} onPress={completeRoute}>
              <Text style={styles.buttonText}>Complete Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Available Routes */
        <View style={styles.routesContainer}>
          <Text style={styles.sectionTitle}>Your Routes</Text>
          {routes.length === 0 ? (
            <View style={styles.noRoutesCard}>
              <Ionicons name="bus" size={48} color="#9ca3af" />
              <Text style={styles.noRoutesText}>No routes assigned</Text>
              <Text style={styles.noRoutesSubtext}>Contact your administrator</Text>
            </View>
          ) : (
            routes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => startRoute(route.id)}
              >
                <View style={styles.routeHeader}>
                  <Ionicons name="bus-outline" size={24} color="#2563eb" />
                  <Text style={styles.routeName}>{route.name}</Text>
                </View>
                <Text style={styles.routeDetails}>
                  Estimated duration: {route.estimatedDuration || 45} minutes
                </Text>
                <View style={styles.startButton}>
                  <Text style={styles.startButtonText}>Start Route</Text>
                  <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={reportIssue}>
            <Ionicons name="warning" size={24} color="#ef4444" />
            <Text style={styles.actionButtonText}>Report Issue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications" size={24} color="#2563eb" />
            <Text style={styles.actionButtonText}>Notifications</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#1f2937',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  locationText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  activeRouteCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  activeRouteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  activeRouteText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 16,
  },
  activeRouteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  routesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  noRoutesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noRoutesText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
  },
  noRoutesSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  routeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  routeDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
});