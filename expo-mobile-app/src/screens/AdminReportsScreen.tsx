import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { PickupSession, StudentPickup, User, Route } from '../types';

interface ReportStats {
  totalRoutes: number;
  completedToday: number;
  totalStudents: number;
  studentsPickedUp: number;
  averageCompletionTime: number;
  onTimePercentage: number;
}

export default function AdminReportsScreen() {
  const [stats, setStats] = useState<ReportStats>({
    totalRoutes: 0,
    completedToday: 0,
    totalStudents: 0,
    studentsPickedUp: 0,
    averageCompletionTime: 0,
    onTimePercentage: 0,
  });
  const [recentSessions, setRecentSessions] = useState<PickupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);

      const [
        sessionsData,
        pickupsData,
        usersData,
        routesData
      ] = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.PICKUP_SESSIONS}/today`),
        apiClient.get(`${API_ENDPOINTS.STUDENT_PICKUPS}/today`),
        apiClient.get(API_ENDPOINTS.USERS),
        apiClient.get(API_ENDPOINTS.ROUTES)
      ]);

      // Calculate statistics
      const completedSessions = sessionsData.filter((s: PickupSession) => s.status === 'completed');
      const totalStudentsToday = pickupsData.length;
      const studentsPickedUpToday = pickupsData.filter((p: StudentPickup) => p.status === 'picked_up').length;
      
      // Calculate average completion time
      const avgTime = completedSessions.reduce((acc: number, session: PickupSession) => {
        return acc + (session.duration || 0);
      }, 0) / (completedSessions.length || 1);

      // Calculate on-time percentage (mock calculation - would need actual tardiness data)
      const onTimePercentage = completedSessions.length > 0 ? 
        (completedSessions.filter((s: PickupSession) => (s.duration || 0) <= 60).length / completedSessions.length) * 100 : 0;

      setStats({
        totalRoutes: routesData.length,
        completedToday: completedSessions.length,
        totalStudents: totalStudentsToday,
        studentsPickedUp: studentsPickedUpToday,
        averageCompletionTime: Math.round(avgTime),
        onTimePercentage: Math.round(onTimePercentage),
      });

      setRecentSessions(completedSessions.slice(0, 5));

    } catch (error) {
      console.error('Failed to load report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV Report', onPress: () => {
          Alert.alert('Export', 'CSV export would be generated here. Use web dashboard for full export capabilities.');
        }},
        { text: 'PDF Summary', onPress: () => {
          Alert.alert('Export', 'PDF export would be generated here. Use web dashboard for full export capabilities.');
        }},
      ]
    );
  };

  const viewDetailedReport = () => {
    Alert.alert(
      'Detailed Reports',
      'For comprehensive reporting and analytics, please use the web dashboard which provides advanced filtering, date ranges, and detailed breakdowns.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Performance</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportData}>
          <Ionicons name="download" size={16} color="#2563eb" />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{stats.completedToday}</Text>
          <Text style={styles.metricLabel}>Completed Routes</Text>
          <Text style={styles.metricSubtext}>of {stats.totalRoutes} total</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{stats.studentsPickedUp}</Text>
          <Text style={styles.metricLabel}>Students Picked Up</Text>
          <Text style={styles.metricSubtext}>of {stats.totalStudents} total</Text>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{stats.averageCompletionTime}m</Text>
          <Text style={styles.metricLabel}>Avg Route Time</Text>
          <Text style={styles.metricSubtext}>completion duration</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{stats.onTimePercentage}%</Text>
          <Text style={styles.metricLabel}>On-Time Rate</Text>
          <Text style={styles.metricSubtext}>routes under 60min</Text>
        </View>
      </View>

      {/* Pickup Success Rate */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Pickup Success Rate</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(stats.studentsPickedUp / stats.totalStudents) * 100 || 0}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {stats.totalStudents > 0 
            ? `${Math.round((stats.studentsPickedUp / stats.totalStudents) * 100)}%`
            : '0%'
          } of students picked up successfully
        </Text>
      </View>

      {/* Recent Completed Routes */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Completed Routes</Text>
        {recentSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar" size={32} color="#9ca3af" />
            <Text style={styles.emptyText}>No routes completed today</Text>
          </View>
        ) : (
          recentSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionRoute}>Route {session.routeId}</Text>
                <Text style={styles.sessionTime}>
                  {session.duration ? `${session.duration}m` : 'N/A'}
                </Text>
              </View>
              <Text style={styles.sessionDetails}>
                Completed: {new Date(session.endTime!).toLocaleTimeString()}
              </Text>
              <Text style={styles.sessionDriver}>
                Driver ID: {session.driverId}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Performance Insights */}
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        
        <View style={styles.insightCard}>
          <Ionicons name="trending-up" size={24} color="#10b981" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>Efficiency Score</Text>
            <Text style={styles.insightDescription}>
              {stats.onTimePercentage >= 80 ? 'Excellent' : 
               stats.onTimePercentage >= 60 ? 'Good' : 'Needs Improvement'} - 
              Most routes completed within expected timeframe
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="people" size={24} color="#2563eb" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>Student Coverage</Text>
            <Text style={styles.insightDescription}>
              {stats.totalStudents > 0 && (stats.studentsPickedUp / stats.totalStudents) >= 0.9
                ? 'Excellent pickup rate with minimal absences'
                : 'Monitor student attendance patterns'
              }
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="time" size={24} color="#f59e0b" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>Route Optimization</Text>
            <Text style={styles.insightDescription}>
              {stats.averageCompletionTime <= 45 
                ? 'Routes are well-optimized'
                : 'Consider reviewing route efficiency'
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={viewDetailedReport}>
          <Ionicons name="analytics" size={20} color="#2563eb" />
          <Text style={styles.actionButtonText}>View Detailed Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={exportData}>
          <Ionicons name="share" size={20} color="#2563eb" />
          <Text style={styles.actionButtonText}>Share Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  exportText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionRoute: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sessionTime: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  sessionDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  sessionDriver: {
    fontSize: 12,
    color: '#9ca3af',
  },
  insightsSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  insightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightText: {
    marginLeft: 16,
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});