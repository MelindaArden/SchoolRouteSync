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

  const startTracking = () => {
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

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    };

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        
        setLocation(newLocation);
      },
      (error) => {
        let message = "Unknown location error";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        setError(message);
        toast({
          title: "Location Error",
          description: message,
          variant: "destructive",
        });
      },
      options
    );
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
      await apiRequest("POST", `/api/drivers/${userId}/location`, {
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        sessionId,
      });
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
