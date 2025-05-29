import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function useWebSocket(userId: number) {
  const ws = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      ws.current?.send(JSON.stringify({ type: "auth", userId }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "session_created":
            queryClient.invalidateQueries({ queryKey: ['/api/pickup-sessions'] });
            toast({
              title: "Route Started",
              description: "A new pickup route has begun",
            });
            break;
            
          case "pickup_updated":
            queryClient.invalidateQueries({ queryKey: ['/api/pickup-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['/api/student-pickups'] });
            break;
            
          case "location_updated":
            // Update location data if needed
            break;
            
          default:
            console.log("Unknown WebSocket message:", data);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.current?.close();
    };
  }, [userId, toast]);

  return ws.current;
}
