import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { Route, RouteSchool, School, Student, StudentPickup, PickupSession } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';

export default function RouteDetailScreen({ route, navigation }: any) {
  const { routeId } = route.params;
  const { user } = useAuth();
  const { getCurrentLocation } = useLocation();
  const [routeData, setRouteData] = useState<Route | null>(null);
  const [schools, setSchools] = useState<(School & { students: Student[] })[]>([]);
  const [pickups, setPickups] = useState<StudentPickup[]>([]);
  const [session, setSession] = useState<PickupSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRouteData();
  }, [routeId]);

  const loadRouteData = async () => {
    try {
      setLoading(true);

      // Load route data
      const routeResponse = await apiClient.get(`${API_ENDPOINTS.ROUTES}/${routeId}`);
      setRouteData(routeResponse);

      // Load route schools and students
      const schoolsResponse = await apiClient.get(`${API_ENDPOINTS.ROUTES}/${routeId}/schools`);
      setSchools(schoolsResponse);

      // Load active session
      const sessionsResponse = await apiClient.get(`${API_ENDPOINTS.PICKUP_SESSIONS}/today`);
      const activeSession = sessionsResponse.find(
        (s: PickupSession) => s.routeId === routeId && s.status === 'in_progress'
      );
      setSession(activeSession || null);

      // Load student pickups if session exists
      if (activeSession) {
        const pickupsResponse = await apiClient.get(`${API_ENDPOINTS.STUDENT_PICKUPS}/session/${activeSession.id}`);
        setPickups(pickupsResponse);
      }

    } catch (error) {
      console.error('Failed to load route data:', error);
      Alert.alert('Error', 'Failed to load route details');
    } finally {
      setLoading(false);
    }
  };

  const updateStudentStatus = async (studentId: number, schoolId: number, status: string) => {
    if (!session) {
      Alert.alert('Error', 'No active pickup session');
      return;
    }

    try {
      const currentLocation = await getCurrentLocation();
      
      await apiClient.put(`${API_ENDPOINTS.STUDENT_PICKUPS}/update`, {
        sessionId: session.id,
        studentId,
        schoolId,
        status,
        pickupTime: status === 'picked_up' ? new Date().toISOString() : null,
        latitude: currentLocation?.latitude.toString(),
        longitude: currentLocation?.longitude.toString(),
      });

      // Reload pickups data
      const pickupsResponse = await apiClient.get(`${API_ENDPOINTS.STUDENT_PICKUPS}/session/${session.id}`);
      setPickups(pickupsResponse);

    } catch (error) {
      console.error('Failed to update student status:', error);
      Alert.alert('Error', 'Failed to update student status');
    }
  };

  const getStudentPickup = (studentId: number) => {
    return pickups.find(p => p.studentId === studentId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'picked_up': return '#10b981';
      case 'no_show': return '#ef4444';
      case 'absent': return '#6b7280';
      default: return '#f59e0b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'picked_up': return 'checkmark-circle';
      case 'no_show': return 'close-circle';
      case 'absent': return 'remove-circle';
      default: return 'radio-button-off';
    }
  };

  const completeSchool = async (schoolId: number) => {
    const schoolStudents = schools.find(s => s.id === schoolId)?.students || [];
    const unprocessedStudents = schoolStudents.filter(student => {
      const pickup = getStudentPickup(student.id);
      return !pickup || pickup.status === 'pending';
    });

    if (unprocessedStudents.length > 0) {
      Alert.alert(
        'Incomplete Pickups',
        `You have ${unprocessedStudents.length} students not yet processed at this school. Please mark all students before proceeding.`
      );
      return;
    }

    Alert.alert(
      'School Complete',
      'All students at this school have been processed. Ready to move to next school?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => {
          // Navigate to next school or complete route
          const currentSchoolIndex = schools.findIndex(s => s.id === schoolId);
          if (currentSchoolIndex < schools.length - 1) {
            // More schools to visit
            Alert.alert('Next School', 'Proceed to the next school on your route.');
          } else {
            // Last school, offer to complete route
            Alert.alert(
              'Route Complete',
              'This was the last school on your route. Would you like to complete the entire route?',
              [
                { text: 'Not Yet', style: 'cancel' },
                { text: 'Complete Route', onPress: () => navigation.goBack() },
              ]
            );
          }
        }},
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading route details...</Text>
      </View>
    );
  }

  if (!routeData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Route not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Route Header */}
      <View style={styles.routeHeader}>
        <Text style={styles.routeName}>{routeData.name}</Text>
        {routeData.estimatedDuration && (
          <Text style={styles.routeDuration}>
            Estimated: {routeData.estimatedDuration} minutes
          </Text>
        )}
        {session && (
          <View style={styles.sessionInfo}>
            <Ionicons name="time" size={16} color="#10b981" />
            <Text style={styles.sessionText}>
              Started: {new Date(session.startTime!).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>

      {/* Schools */}
      {schools.map((school, index) => (
        <View key={school.id} style={styles.schoolCard}>
          <View style={styles.schoolHeader}>
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolNumber}>{index + 1}</Text>
              <View>
                <Text style={styles.schoolName}>{school.name}</Text>
                <Text style={styles.schoolAddress}>{school.address}</Text>
                <Text style={styles.dismissalTime}>
                  Dismissal: {school.dismissalTime}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={() => completeSchool(school.id)}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>

          {/* Students */}
          <View style={styles.studentsContainer}>
            <Text style={styles.studentsTitle}>
              Students ({school.students.length})
            </Text>
            {school.students.map((student) => {
              const pickup = getStudentPickup(student.id);
              const status = pickup?.status || 'pending';
              
              return (
                <View key={student.id} style={styles.studentCard}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {student.firstName} {student.lastName}
                    </Text>
                    <Text style={styles.studentGrade}>Grade {student.grade}</Text>
                    {student.parentPhone && (
                      <Text style={styles.studentPhone}>{student.parentPhone}</Text>
                    )}
                  </View>

                  <View style={styles.studentActions}>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        { backgroundColor: status === 'picked_up' ? '#10b981' : '#e5e7eb' }
                      ]}
                      onPress={() => updateStudentStatus(student.id, school.id, 'picked_up')}
                      disabled={!session}
                    >
                      <Ionicons 
                        name="checkmark" 
                        size={16} 
                        color={status === 'picked_up' ? '#ffffff' : '#6b7280'} 
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        { backgroundColor: status === 'no_show' ? '#ef4444' : '#e5e7eb' }
                      ]}
                      onPress={() => updateStudentStatus(student.id, school.id, 'no_show')}
                      disabled={!session}
                    >
                      <Ionicons 
                        name="close" 
                        size={16} 
                        color={status === 'no_show' ? '#ffffff' : '#6b7280'} 
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        { backgroundColor: status === 'absent' ? '#6b7280' : '#e5e7eb' }
                      ]}
                      onPress={() => updateStudentStatus(student.id, school.id, 'absent')}
                      disabled={!session}
                    >
                      <Ionicons 
                        name="remove" 
                        size={16} 
                        color={status === 'absent' ? '#ffffff' : '#6b7280'} 
                      />
                    </TouchableOpacity>
                  </View>

                  {pickup?.pickupTime && (
                    <Text style={styles.pickupTime}>
                      Picked up: {new Date(pickup.pickupTime).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },
  routeHeader: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  routeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  routeDuration: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionText: {
    fontSize: 14,
    color: '#10b981',
    marginLeft: 8,
    fontWeight: '500',
  },
  schoolCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  schoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  schoolInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  schoolAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  dismissalTime: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 2,
    fontWeight: '500',
  },
  completeButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  studentsContainer: {
    padding: 16,
  },
  studentsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  studentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  studentInfo: {
    marginBottom: 8,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  studentGrade: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  studentPhone: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 2,
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupTime: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '500',
  },
});