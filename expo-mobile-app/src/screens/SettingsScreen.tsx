import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { hasPermission, requestPermission, tracking, stopTracking } = useLocation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationPermission, setLocationPermission] = useState(hasPermission);

  useEffect(() => {
    checkNotificationPermission();
    setLocationPermission(hasPermission);
  }, [hasPermission]);

  const checkNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      Alert.alert(
        'Disable Notifications',
        'You will need to disable notifications in your device settings.',
        [{ text: 'OK' }]
      );
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationsEnabled(true);
        Alert.alert('Success', 'Notifications enabled successfully');
      } else {
        Alert.alert('Permission Denied', 'Unable to enable notifications');
      }
    }
  };

  const toggleLocation = async () => {
    if (locationPermission) {
      Alert.alert(
        'Location Permission',
        'Location permission is required for route tracking. You can disable it in your device settings, but this will affect app functionality.',
        [{ text: 'OK' }]
      );
    } else {
      const granted = await requestPermission();
      if (granted) {
        setLocationPermission(true);
        Alert.alert('Success', 'Location permission granted');
      } else {
        Alert.alert('Permission Denied', 'Location permission is required for route tracking');
      }
    }
  };

  const clearAppData = () => {
    Alert.alert(
      'Clear App Data',
      'This will clear all cached data and log you out. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data', 
          style: 'destructive',
          onPress: async () => {
            if (tracking) {
              stopTracking();
            }
            logout();
          }
        },
      ]
    );
  };

  const showAppInfo = () => {
    Alert.alert(
      'App Information',
      `School Bus Driver App\nVersion: 1.0.0\n\nThis app helps drivers manage their pickup routes and track students safely.`,
      [{ text: 'OK' }]
    );
  };

  const contactSupport = () => {
    Alert.alert(
      'Contact Support',
      'For technical support or questions, please contact your school transportation administrator.',
      [{ text: 'OK' }]
    );
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    danger = false 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons 
          name={icon as any} 
          size={24} 
          color={danger ? '#ef4444' : '#6b7280'} 
        />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, danger && { color: '#ef4444' }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightElement || (onPress && (
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      ))}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* User Profile */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {user?.firstName && user?.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : user?.username}
          </Text>
          <Text style={styles.profileRole}>
            {user?.role === 'driver' ? 'Driver' : 'Administrator'}
          </Text>
          {user?.email && (
            <Text style={styles.profileEmail}>{user.email}</Text>
          )}
        </View>
      </View>

      {/* Permissions */}
      <SettingSection title="Permissions">
        <SettingItem
          icon="location"
          title="Location Access"
          subtitle={locationPermission ? "Enabled - Required for route tracking" : "Disabled - Enable for route tracking"}
          onPress={toggleLocation}
          rightElement={
            <Switch
              value={locationPermission}
              onValueChange={toggleLocation}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={locationPermission ? '#2563eb' : '#9ca3af'}
            />
          }
        />
        
        <SettingItem
          icon="notifications"
          title="Push Notifications"
          subtitle={notificationsEnabled ? "Enabled - Receive route updates" : "Disabled - Enable for route updates"}
          onPress={toggleNotifications}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={notificationsEnabled ? '#2563eb' : '#9ca3af'}
            />
          }
        />
      </SettingSection>

      {/* App Settings */}
      <SettingSection title="Application">
        <SettingItem
          icon="refresh"
          title="Clear App Data"
          subtitle="Clear cached data and log out"
          onPress={clearAppData}
          danger
        />
        
        <SettingItem
          icon="information-circle"
          title="App Information"
          subtitle="Version and app details"
          onPress={showAppInfo}
        />
        
        <SettingItem
          icon="help-circle"
          title="Help & Support"
          subtitle="Contact your administrator"
          onPress={contactSupport}
        />
      </SettingSection>

      {/* Account */}
      <SettingSection title="Account">
        <SettingItem
          icon="log-out"
          title="Sign Out"
          subtitle="Sign out of your account"
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
              ]
            );
          }}
          danger
        />
      </SettingSection>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          School Bus Driver App v1.0.0
        </Text>
        <Text style={styles.footerText}>
          Built for safe and efficient student transportation
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 4,
  },
});