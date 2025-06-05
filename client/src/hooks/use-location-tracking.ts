import { useEffect, useRef } from "react";
import { useGeolocation } from "./use-geolocation";
import { apiRequest } from "@/lib/queryClient";

interface LocationTrackingOptions {
  userId: number;
  sessionId?: number;
  enabled: boolean;
  updateInterval?: number; // in milliseconds
}

export function useLocationTracking(options: LocationTrackingOptions) {
  const { userId, sessionId, enabled, updateInterval = 30000 } = options; // Default 30 seconds
  const { location, startTracking, stopTracking, isTracking } = useGeolocation();
  const lastUpdateRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateLocationOnServer = async () => {
    if (!location) return;

    try {
      await apiRequest("POST", `/api/drivers/${userId}/location`, {
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        sessionId: sessionId || null,
        timestamp: new Date().toISOString(),
      });
      lastUpdateRef.current = Date.now();
    } catch (error) {
      console.error("Failed to update location on server:", error);
    }
  };

  useEffect(() => {
    if (enabled && location) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate >= updateInterval) {
        updateLocationOnServer();
      } else {
        // Schedule next update
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(
          updateLocationOnServer,
          updateInterval - timeSinceLastUpdate
        );
      }
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [location, enabled, updateInterval, userId, sessionId]);

  useEffect(() => {
    if (enabled && !isTracking) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      stopTracking();
    };
  }, []);

  return {
    location,
    isTracking,
    updateLocationOnServer,
  };
}