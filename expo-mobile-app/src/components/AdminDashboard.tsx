import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { PickupSession, DriverLocation, Issue, User, Route } from '../types';

interface AdminDashboardProps {
  navigation: any;
}

interface DashboardStats {
  activeRoutes: number;
  totalDrivers: number;
  completedToday: number;
  openIssues: number;
}

export default function AdminDashboard({ navigation }: AdminDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeRoutes: 0,
    totalDrivers: 0,
    completedToday: 0,
    openIssues: 0,
  });
  const [activeSessions, setActiveSessions] = useState<PickupSession[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<DriverLocation[]>([]);
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all dashboard data in parallel
      const [
        sessionsData,
        driversData,
        issuesData,
        usersData,
        routesData,
        locationsData
      ] = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.PICKUP_SESSIONS}/today`),
        apiClient.get(API_ENDPOINTS.USERS),
        apiClient.get(API_ENDPOINTS.ISSUES),
        apiClient.get(API_ENDPOINTS.USERS),
        apiClient.get(API_ENDPOINTS.ROUTES),
        apiClient.get('/api/driver-locations')
      ]);

      // Calculate stats
      const activeRoutesCount = sessionsData.filter((s: PickupSession) => s.status === 'in_progress').length;
      const totalDriversCount = usersData.filter((u: User) => u.role === 'driver' && u.isActive).length;
      const completedTodayCount = sessionsData.filter((s: PickupSession) => s.status === 'completed').length;
      const openIssuesCount = issuesData.filter((i: Issue) => i.status === 'open').length;

      setStats({
        activeRoutes: activeRoutesCount,
        totalDrivers: totalDriversCount,
        completedToday: completedTodayCount,
        openIssues: openIssuesCount,
      });

      setActiveSessions(sessionsData.filter((s: PickupSession) => s.status === 'in_progress'));
      setActiveDrivers(locationsData.slice(0, 5)); // Show top 5 recent locations
      setRecentIssues(issuesData.filter((i: Issue) => i.status === 'open').slice(0, 3));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const navigateToRoutes = () => {
    navigation.navigate('AdminRoutes');
  };

  const navigateToDrivers = () => {
    navigation.navigate('AdminDrivers');
  };

  const navigateToIssues = () => {
    navigation.navigate('AdminIssues');
  };

  const navigateToReports = () => {
    navigation.navigate('AdminReports');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="bus" size={24} color="#2563eb" />
            <Text style={styles.statNumber}>{stats.activeRoutes}</Text>
            <Text style={styles.statLabel}>Active Routes</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="people" size={24} color="#16a34a" />
            <Text style={styles.statNumber}>{stats.totalDrivers}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#d97706" />
            <Text style={styles.statNumber}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Completed Today</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="warning" size={24} color="#dc2626" />
            <Text style={styles.statNumber}>{stats.openIssues}</Text>
            <Text style={styles.statLabel}>Open Issues</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Management</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={navigateToRoutes}>
            <Ionicons name="map" size={32} color="#2563eb" />
            <Text style={styles.actionTitle}>Routes</Text>
            <Text style={styles.actionSubtitle}>Manage pickup routes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={navigateToDrivers}>
            <Ionicons name="people" size={32} color="#059669" />
            <Text style={styles.actionTitle}>Drivers</Text>
            <Text style={styles.actionSubtitle}>View driver status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={navigateToIssues}>
            <Ionicons name="alert-circle" size={32} color="#dc2626" />
            <Text style={styles.actionTitle}>Issues</Text>
            <Text style={styles.actionSubtitle}>Handle reported issues</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={navigateToReports}>
            <Ionicons name="analytics" size={32} color="#7c3aed" />
            <Text style={styles.actionTitle}>Reports</Text>
            <Text style={styles.actionSubtitle}>View analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <View style={styles.activeSessionsContainer}>
          <Text style={styles.sectionTitle}>Active Routes</Text>
          {activeSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Ionicons name="radio-button-on" size={16} color="#10b981" />
                <Text style={styles.sessionTitle}>Route {session.routeId}</Text>
                <Text style={styles.sessionTime}>
                  {new Date(session.startTime!).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.sessionDriver}>Driver ID: {session.driverId}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Issues */}
      {recentIssues.length > 0 && (
        <View style={styles.issuesContainer}>
          <View style={styles.issuesHeader}>
            <Text style={styles.sectionTitle}>Recent Issues</Text>
            <TouchableOpacity onPress={navigateToIssues}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentIssues.map((issue) => (
            <View key={issue.id} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <Ionicons 
                  name="warning" 
                  size={16} 
                  color={issue.priority === 'urgent' ? '#dc2626' : '#f59e0b'} 
                />
                <Text style={styles.issueTitle}>{issue.title}</Text>
                <Text style={styles.issuePriority}>{issue.priority}</Text>
              </View>
              <Text style={styles.issueDescription} numberOfLines={2}>
                {issue.description}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
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
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  activeSessionsContainer: {
    marginBottom: 24,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  sessionTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  sessionDriver: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 24,
  },
  issuesContainer: {
    marginBottom: 24,
  },
  issuesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  issueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  issuePriority: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  issueDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 24,
  },
});