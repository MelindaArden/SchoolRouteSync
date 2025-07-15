import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Activity, 
  Clock, 
  Navigation,
  RefreshCw,
  Car,
  School,
  Route as RouteIcon
} from "lucide-react";

interface GpsMapViewerProps {
  selectedSessionId: number | null;
  onSelectSession: (sessionId: number | null) => void;
}

interface DriverLocation {
  id: number;
  driverId: number;
  sessionId: number | null;
  latitude: string;
  longitude: string;
  timestamp: string;
  driver: {
    id: number;
    firstName: string;
    lastName: string;
  };
  session: {
    id: number;
    routeId: number;
    status: string;
    route: {
      id: number;
      name: string;
    };
  } | null;
}

interface RouteHistory {
  id: number;
  sessionId: number;
  driverId: number;
  routeId: number;
  routeName: string;
  startTime: string;
  endTime: string | null;
  completionStatus: string;
  driver: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export default function GpsMapViewer({ selectedSessionId, onSelectSession }: GpsMapViewerProps) {
  const [mapContainer, setMapContainer] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Fetch active driver locations
  const { data: driverLocations = [], refetch: refetchLocations } = useQuery<DriverLocation[]>({
    queryKey: ["/api/driver-locations"],
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Fetch route history
  const { data: routeHistory = [], refetch: refetchHistory } = useQuery<RouteHistory[]>({
    queryKey: ["/api/gps/route-history"],
    refetchInterval: 30000, // Update every 30 seconds
  });

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!window.google) {
        // Load Google Maps API if not loaded
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBGjE8ZQRqKqBPDUn6zE8sF1Yr-_-DqD9A&libraries=geometry`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
        return;
      }

      // Nashville center coordinates
      const nashville = { lat: 36.1627, lng: -86.7816 };
      
      const map = new google.maps.Map(document.getElementById('gps-map') as HTMLElement, {
        zoom: 11,
        center: nashville,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      setMapContainer(map);
    };

    initMap();
  }, []);

  // Update map markers when driver locations change
  useEffect(() => {
    if (!mapContainer || !driverLocations.length) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    const newMarkers: google.maps.Marker[] = [];

    // Add markers for active drivers
    driverLocations.forEach(location => {
      if (location.session?.status === 'in_progress') {
        const marker = new google.maps.Marker({
          position: {
            lat: parseFloat(location.latitude),
            lng: parseFloat(location.longitude)
          },
          map: mapContainer,
          title: `${location.driver.firstName} ${location.driver.lastName} - ${location.session.route.name}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
                <path d="M8 12l2 2 4-4" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16)
          },
          animation: google.maps.Animation.BOUNCE
        });

        // Create info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold">${location.driver.firstName} ${location.driver.lastName}</h3>
              <p class="text-sm text-gray-600">Route: ${location.session.route.name}</p>
              <p class="text-sm text-gray-600">Status: ${location.session.status}</p>
              <p class="text-xs text-gray-500">Last update: ${new Date(location.timestamp).toLocaleTimeString()}</p>
              <p class="text-xs font-mono text-gray-500">GPS: ${parseFloat(location.latitude).toFixed(6)}, ${parseFloat(location.longitude).toFixed(6)}</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapContainer, marker);
          onSelectSession(location.sessionId);
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    // Auto-fit map to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      mapContainer.fitBounds(bounds);
      
      // Don't zoom in too much for single markers
      if (newMarkers.length === 1) {
        google.maps.event.addListenerOnce(mapContainer, 'bounds_changed', () => {
          if (mapContainer.getZoom()! > 15) {
            mapContainer.setZoom(15);
          }
        });
      }
    }
  }, [mapContainer, driverLocations, onSelectSession]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const activeDrivers = driverLocations.filter(loc => loc.session?.status === 'in_progress');
  const todayRoutes = routeHistory.filter(route => {
    const routeDate = new Date(route.startTime).toDateString();
    const today = new Date().toDateString();
    return routeDate === today;
  });

  return (
    <div className="space-y-6">
      {/* Map Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live GPS Tracking Map
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchLocations();
                  refetchHistory();
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Simulate GPS data for testing
                  if (activeDrivers.length > 0) {
                    activeDrivers.forEach(async (driver) => {
                      try {
                        await fetch(`/api/gps/simulate/${driver.sessionId}`, { method: 'POST' });
                      } catch (error) {
                        console.error('GPS simulation error:', error);
                      }
                    });
                    setTimeout(() => {
                      refetchLocations();
                      refetchHistory();
                    }, 2000);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                Simulate GPS
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Active Drivers</span>
              </div>
              <div className="text-lg font-bold text-green-800">{activeDrivers.length}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <RouteIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">Today's Routes</span>
              </div>
              <div className="text-lg font-bold text-blue-800">{todayRoutes.length}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <School className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-600">Completed</span>
              </div>
              <div className="text-lg font-bold text-purple-800">
                {todayRoutes.filter(route => route.completionStatus === 'completed').length}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-600">In Progress</span>
              </div>
              <div className="text-lg font-bold text-orange-800">
                {todayRoutes.filter(route => route.completionStatus === 'in_progress').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <Card>
        <CardContent className="p-0">
          <div id="gps-map" className="w-full h-96 rounded-lg"></div>
        </CardContent>
      </Card>

      {/* Active Drivers List */}
      {activeDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Drivers ({activeDrivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeDrivers.map(location => (
                <div
                  key={location.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedSessionId === location.sessionId ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectSession(location.sessionId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <h4 className="font-medium">{location.driver.firstName} {location.driver.lastName}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <RouteIcon className="h-3 w-3" />
                          {location.session?.route.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {location.session?.status}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Updated: {formatTime(location.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">GPS Coordinates:</span>
                      <p className="font-mono text-xs">
                        {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Session ID:</span>
                      <p className="font-mono text-xs">#{location.sessionId}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Route History */}
      {todayRoutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Route History ({todayRoutes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayRoutes.map(route => (
                <div
                  key={route.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedSessionId === route.sessionId ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectSession(route.sessionId)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{route.driver.firstName} {route.driver.lastName}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <RouteIcon className="h-3 w-3" />
                        {route.routeName}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={route.completionStatus === 'completed' ? 'default' : 'secondary'}>
                        {route.completionStatus}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(route.startTime)} - {route.endTime ? formatTime(route.endTime) : 'In Progress'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Drivers Message */}
      {activeDrivers.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center py-8 text-gray-500">
              <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Drivers</h3>
              <p>No drivers are currently on active routes. Use the "Simulate GPS" button to generate test data.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}