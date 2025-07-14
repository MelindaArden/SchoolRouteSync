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
import { Issue, User } from '../types';

export default function AdminIssuesScreen() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [issuesData, driversData] = await Promise.all([
        apiClient.get(API_ENDPOINTS.ISSUES),
        apiClient.get(API_ENDPOINTS.USERS)
      ]);

      setIssues(issuesData.sort((a: Issue, b: Issue) => 
        new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
      ));
      setDrivers(driversData.filter((user: User) => user.role === 'driver'));

    } catch (error) {
      console.error('Failed to load issues data:', error);
      Alert.alert('Error', 'Failed to load issues information');
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
    return driver 
      ? `${driver.firstName || driver.username}` 
      : 'Unknown Driver';
  };

  const updateIssueStatus = async (issueId: number, newStatus: string) => {
    try {
      await apiClient.put(`${API_ENDPOINTS.ISSUES}/${issueId}`, {
        status: newStatus,
        resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : null
      });

      // Update local state
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? { ...issue, status: newStatus as any, resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined }
          : issue
      ));

      Alert.alert('Success', `Issue marked as ${newStatus}`);
    } catch (error) {
      console.error('Failed to update issue status:', error);
      Alert.alert('Error', 'Failed to update issue status');
    }
  };

  const deleteIssue = async (issueId: number) => {
    Alert.alert(
      'Delete Issue',
      'Are you sure you want to delete this issue? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`${API_ENDPOINTS.ISSUES}/${issueId}`);
              setIssues(prev => prev.filter(issue => issue.id !== issueId));
              Alert.alert('Success', 'Issue deleted successfully');
            } catch (error) {
              console.error('Failed to delete issue:', error);
              Alert.alert('Error', 'Failed to delete issue');
            }
          }
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return '#10b981';
      case 'in_progress': return '#f59e0b';
      case 'open': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mechanical': return 'construct';
      case 'weather': return 'rainy';
      case 'traffic': return 'car';
      case 'emergency': return 'alert-circle';
      case 'maintenance': return 'settings';
      default: return 'help-circle';
    }
  };

  const renderIssue = ({ item: issue }: { item: Issue }) => (
    <View style={styles.issueCard}>
      <View style={styles.issueHeader}>
        <View style={styles.issueInfo}>
          <View style={styles.issueTitleRow}>
            <Ionicons 
              name={getTypeIcon(issue.type) as any} 
              size={20} 
              color={getPriorityColor(issue.priority)} 
            />
            <Text style={styles.issueTitle}>{issue.title}</Text>
          </View>
          
          <Text style={styles.driverName}>
            Reported by: {getDriverName(issue.driverId)}
          </Text>
          
          <Text style={styles.reportTime}>
            {new Date(issue.reportedAt).toLocaleDateString()} at{' '}
            {new Date(issue.reportedAt).toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.issueBadges}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(issue.priority) }]}>
            <Text style={styles.badgeText}>{issue.priority.toUpperCase()}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(issue.status) }]}>
            <Text style={styles.badgeText}>{issue.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.issueDescription}>{issue.description}</Text>

      {issue.resolvedAt && (
        <Text style={styles.resolvedTime}>
          Resolved: {new Date(issue.resolvedAt).toLocaleDateString()} at{' '}
          {new Date(issue.resolvedAt).toLocaleTimeString()}
        </Text>
      )}

      <View style={styles.issueActions}>
        {issue.status === 'open' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
              onPress={() => updateIssueStatus(issue.id, 'in_progress')}
            >
              <Text style={styles.actionButtonText}>Start Work</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#10b981' }]}
              onPress={() => updateIssueStatus(issue.id, 'resolved')}
            >
              <Text style={styles.actionButtonText}>Mark Resolved</Text>
            </TouchableOpacity>
          </>
        )}

        {issue.status === 'in_progress' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={() => updateIssueStatus(issue.id, 'resolved')}
          >
            <Text style={styles.actionButtonText}>Mark Resolved</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
          onPress={() => deleteIssue(issue.id)}
        >
          <Ionicons name="trash" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading issues...</Text>
      </View>
    );
  }

  const openIssues = issues.filter(issue => issue.status === 'open');
  const inProgressIssues = issues.filter(issue => issue.status === 'in_progress');
  const resolvedIssues = issues.filter(issue => issue.status === 'resolved');

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>{openIssues.length}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{inProgressIssues.length}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{resolvedIssues.length}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Issues List */}
      <FlatList
        data={issues}
        renderItem={renderIssue}
        keyExtractor={(item) => item.id.toString()}
        style={styles.issuesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            <Text style={styles.emptyTitle}>No Issues Reported</Text>
            <Text style={styles.emptySubtitle}>
              Great! No issues have been reported by drivers.
            </Text>
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
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  issuesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  issueCard: {
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
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  issueInfo: {
    flex: 1,
    marginRight: 12,
  },
  issueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  reportTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  issueBadges: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  issueDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  resolvedTime: {
    fontSize: 12,
    color: '#10b981',
    marginBottom: 12,
    fontWeight: '500',
  },
  issueActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
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
});