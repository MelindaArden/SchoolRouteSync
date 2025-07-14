import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient, API_ENDPOINTS } from '../config/api';
import { Student, School } from '../types';

export default function StudentListScreen({ route, navigation }: any) {
  const { schoolId } = route.params;
  const [students, setStudents] = useState<Student[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load school data
      const schoolResponse = await apiClient.get(`${API_ENDPOINTS.ROUTES}/schools/${schoolId}`);
      setSchool(schoolResponse);

      // Load students for this school
      const studentsResponse = await apiClient.get(`${API_ENDPOINTS.ROUTES}/schools/${schoolId}/students`);
      setStudents(studentsResponse);

    } catch (error) {
      console.error('Failed to load student data:', error);
      Alert.alert('Error', 'Failed to load student information');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const callParent = (phoneNumber: string, studentName: string) => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'No phone number available for this student');
      return;
    }

    Alert.alert(
      'Call Parent',
      `Call parent of ${studentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => {
          // In a real app, you would use Linking.openURL(`tel:${phoneNumber}`)
          Alert.alert('Calling...', `Would call ${phoneNumber}`);
        }},
      ]
    );
  };

  const renderStudent = ({ item: student }: { item: Student }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>
          {student.firstName} {student.lastName}
        </Text>
        <Text style={styles.studentGrade}>Grade {student.grade}</Text>
        
        {student.parentPhone && (
          <TouchableOpacity 
            style={styles.phoneContainer}
            onPress={() => callParent(student.parentPhone!, `${student.firstName} ${student.lastName}`)}
          >
            <Ionicons name="call" size={16} color="#2563eb" />
            <Text style={styles.phoneText}>{student.parentPhone}</Text>
          </TouchableOpacity>
        )}

        {student.emergencyContact && (
          <View style={styles.emergencyContainer}>
            <Ionicons name="alert-circle" size={16} color="#f59e0b" />
            <Text style={styles.emergencyText}>Emergency: {student.emergencyContact}</Text>
          </View>
        )}

        {student.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text" size={16} color="#6b7280" />
            <Text style={styles.notesText}>{student.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.studentActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#e5e7eb' }]}
          onPress={() => {
            Alert.alert('Student Options', 'Choose an action:', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Mark Absent', onPress: () => markAbsent(student.id) },
              { text: 'Add Note', onPress: () => addNote(student.id) },
            ]);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const markAbsent = async (studentId: number) => {
    try {
      await apiClient.post('/api/student-absences', {
        studentId,
        date: new Date().toISOString().split('T')[0],
        reason: 'Marked absent by driver'
      });
      
      Alert.alert('Success', 'Student marked as absent for today');
    } catch (error) {
      console.error('Failed to mark student absent:', error);
      Alert.alert('Error', 'Failed to mark student absent');
    }
  };

  const addNote = (studentId: number) => {
    Alert.prompt(
      'Add Note',
      'Enter a note for this student:',
      async (text) => {
        if (text) {
          try {
            await apiClient.put(`/api/students/${studentId}`, {
              notes: text
            });
            loadData(); // Refresh data
            Alert.alert('Success', 'Note added successfully');
          } catch (error) {
            console.error('Failed to add note:', error);
            Alert.alert('Error', 'Failed to add note');
          }
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* School Header */}
      {school && (
        <View style={styles.schoolHeader}>
          <Text style={styles.schoolName}>{school.name}</Text>
          <Text style={styles.schoolAddress}>{school.address}</Text>
          <Text style={styles.dismissalTime}>
            Dismissal: {school.dismissalTime}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Students List */}
      <View style={styles.studentsHeader}>
        <Text style={styles.studentsCount}>
          {filteredStudents.length} Students
          {searchQuery.length > 0 && ` (filtered from ${students.length})`}
        </Text>
      </View>

      <FlatList
        data={filteredStudents}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id.toString()}
        style={styles.studentsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {searchQuery.length > 0 ? 'No students match your search' : 'No students assigned to this school'}
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
  schoolHeader: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  schoolName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  schoolAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  dismissalTime: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: 4,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  studentsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  studentsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  studentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  studentCard: {
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
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  studentGrade: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 14,
    color: '#2563eb',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  emergencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 12,
    color: '#f59e0b',
    marginLeft: 8,
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  studentActions: {
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
});