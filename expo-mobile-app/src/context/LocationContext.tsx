import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { apiClient } from '../config/api';
import { LocationData } from '../types';
import { useAuth } from './AuthContext';

interface LocationContextType {
  location: LocationData | null;
  tracking: boolean;
  startTracking: (sessionId?: number) => Promise<void>;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<LocationData | null>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [tracking, setTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        // Also request background permission for better tracking
        await Location.requestBackgroundPermissionsAsync();
      }
      
      return granted;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) return null;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000, // 10 seconds
      });

      const locationData: LocationData = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        timestamp: locationResult.timestamp,
        accuracy: locationResult.coords.accuracy || undefined,
        speed: locationResult.coords.speed || undefined,
        heading: locationResult.coords.heading || undefined,
      };

      setLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Failed to get location:', error);
      return null;
    }
  };

  const startTracking = async (sessionId?: number) => {
    try {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      if (subscription) {
        subscription.remove();
      }

      const newSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30 seconds - matches your current web app
          distanceInterval: 50, // 50 meters
        },
        async (locationUpdate) => {
          const locationData: LocationData = {
            latitude: locationUpdate.coords.latitude,
            longitude: locationUpdate.coords.longitude,
            timestamp: locationUpdate.timestamp,
            accuracy: locationUpdate.coords.accuracy || undefined,
            speed: locationUpdate.coords.speed || undefined,
            heading: locationUpdate.coords.heading || undefined,
          };

          setLocation(locationData);

          // Send location to backend (matches your existing API)
          if (user) {
            try {
              await apiClient.post('/api/driver-location', {
                driverId: user.id,
                sessionId: sessionId,
                latitude: locationData.latitude.toString(),
                longitude: locationData.longitude.toString(),
                timestamp: new Date(locationData.timestamp).toISOString(),
                speed: locationData.speed,
                heading: locationData.heading,
              });
            } catch (error) {
              console.error('Failed to send location to server:', error);
            }
          }
        }
      );

      setSubscription(newSubscription);
      setTracking(true);
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      throw error;
    }
  };

  const stopTracking = () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
    setTracking(false);
  };

  const value: LocationContextType = {
    location,
    tracking,
    startTracking,
    stopTracking,
    getCurrentLocation,
    hasPermission,
    requestPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}