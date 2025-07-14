import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RouteDetailScreen from './src/screens/RouteDetailScreen';
import StudentListScreen from './src/screens/StudentListScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import AdminRoutesScreen from './src/screens/AdminRoutesScreen';
import AdminDriversScreen from './src/screens/AdminDriversScreen';
import AdminIssuesScreen from './src/screens/AdminIssuesScreen';
import AdminReportsScreen from './src/screens/AdminReportsScreen';
import { useAuth } from './src/context/AuthContext';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Could add a loading screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ 
                title: 'Driver Dashboard',
                headerLeft: () => null
              }}
            />
            <Stack.Screen 
              name="RouteDetail" 
              component={RouteDetailScreen}
              options={{ title: 'Route Details' }}
            />
            <Stack.Screen 
              name="StudentList" 
              component={StudentListScreen}
              options={{ title: 'Students' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationScreen}
              options={{ title: 'Notifications' }}
            />
            <Stack.Screen 
              name="AdminRoutes" 
              component={AdminRoutesScreen}
              options={{ title: 'Manage Routes' }}
            />
            <Stack.Screen 
              name="AdminDrivers" 
              component={AdminDriversScreen}
              options={{ title: 'Driver Status' }}
            />
            <Stack.Screen 
              name="AdminIssues" 
              component={AdminIssuesScreen}
              options={{ title: 'Manage Issues' }}
            />
            <Stack.Screen 
              name="AdminReports" 
              component={AdminReportsScreen}
              options={{ title: 'Reports & Analytics' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </LocationProvider>
    </AuthProvider>
  );
}