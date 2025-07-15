import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const { toast } = useToast();

  const startTracking = (userId?: number, sessionId?: number) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    setIsTracking(true);
    setError(null);

    // Enhanced mobile-optimized GPS tracking options
    const options = {
      enableHighAccuracy: true,
      timeout: 30000, // Increased timeout for mobile devices
      maximumAge: 5000, // Reduced max age for more frequent updates
    };

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        console.log('📍 GPS position received:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: new Date(position.timestamp).toISOString()
        });
        
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        
        setLocation(newLocation);
        
        // Automatically update server if userId is provided
        if (userId) {
          updateLocationOnServer(position, userId, sessionId);
        }
      },
      (error) => {
        let message = "Unknown location error";
        console.error('GPS tracking error:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location access denied. Please enable location permissions in your browser settings and refresh the page.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "GPS signal unavailable. Try moving to an area with better signal, ensure location services are enabled on your device, or refresh the page.";
            break;
          case error.TIMEOUT:
            message = "Location request timed out. Checking for GPS signal...";
            break;
        }
        setError(message);
        
        // Don't show toast for timeout errors, just log them
        if (error.code !== error.TIMEOUT) {
          toast({
            title: "GPS Location Issue",
            description: message,
            variant: "destructive",
            duration: 8000, // Show longer for important location instructions
          });
        }
        
        // Don't stop tracking on temporary errors
        if (error.code === error.TIMEOUT) {
          console.log('GPS timeout, continuing to track...');
        } else {
          setIsTracking(false);
        }
      },
      options
    );
    
    console.log('📍 GPS tracking started for user:', userId, 'session:', sessionId);
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const updateLocationOnServer = async (
    location: GeolocationPosition, 
    userId: number,
    sessionId?: number
  ) => {
    try {
      const locationData = {
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
        sessionId,
        speed: location.coords.speed?.toString() || undefined,
        bearing: location.coords.heading?.toString() || undefined,
        accuracy: location.coords.accuracy?.toString() || undefined,
      };
      
      console.log('📍 Sending enhanced GPS data to server:', locationData);
      
      await apiRequest("POST", `/api/drivers/${userId}/location`, locationData);
    } catch (error) {
      console.error("Failed to update location on server:", error);
    }
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    location,
    isTracking,
    error,
    startTracking,
    stopTracking,
    updateLocationOnServer,
  };
}
