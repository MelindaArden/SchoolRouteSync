import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Route as RouteIcon,
  Target,
  Activity,
  Play,
  Square
} from "lucide-react";

interface GpsRouteMapProps {
  sessionId: number;
  driverId: number;
  driverName: string;
  routeName: string;
  isActive: boolean;
  routePath: {
    coordinates: { lat: number; lng: number; timestamp: string; speed?: number }[];
    schoolTimestamps: { schoolId: number; schoolName: string; arrivalTime: string; departureTime?: string }[];
  };
  schoolStops: {
    id: number;
    name: string;
    address: string;
    latitude: string;
    longitude: string;
    arrivalTime?: string;
    departureTime?: string;
  }[];
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
}

export default function GpsRouteMap({ 
  sessionId, 
  driverId, 
  driverName, 
  routeName, 
  isActive, 
  routePath, 
  schoolStops, 
  currentLocation 
}: GpsRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [directionsService, setDirectionsService] = useState<any>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [polyline, setPolyline] = useState<any>(null);

  // Load Google Maps API
  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBvOkBwb07O2k02pDd02BF58dUrPnUQ0Qg&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const google = window.google;
    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 36.1627, lng: -86.7816 }, // Default to Nashville
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    const directionsServiceInstance = new google.maps.DirectionsService();
    const directionsRendererInstance = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: isActive ? "#2563eb" : "#6b7280",
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });

    directionsRendererInstance.setMap(mapInstance);

    setMap(mapInstance);
    setDirectionsService(directionsServiceInstance);
    setDirectionsRenderer(directionsRendererInstance);
  }, [mapLoaded, isActive]);

  // Update map with route data
  useEffect(() => {
    if (!map || !routePath || !schoolStops.length) return;

    const google = window.google;
    
    // Clear existing markers and polyline
    markers.forEach(marker => marker.setMap(null));
    if (polyline) polyline.setMap(null);

    const newMarkers: any[] = [];
    const bounds = new google.maps.LatLngBounds();

    // Add school stop markers
    schoolStops.forEach((school, index) => {
      const lat = parseFloat(school.latitude);
      const lng = parseFloat(school.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      const position = { lat, lng };
      bounds.extend(position);

      // Find school timestamp data
      const schoolTimestamp = routePath.schoolTimestamps.find(st => st.schoolId === school.id);
      
      // Create custom marker icon
      const markerIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: schoolTimestamp?.arrivalTime ? "#22c55e" : "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: 8
      };

      const marker = new google.maps.Marker({
        position,
        map,
        icon: markerIcon,
        title: school.name,
        zIndex: 100
      });

      // Create info window content
      const infoContent = `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">${school.name}</h3>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${school.address}</p>
          ${schoolTimestamp?.arrivalTime ? `
            <div style="margin-top: 8px; padding: 4px 8px; background: #dcfce7; border-radius: 4px;">
              <strong style="color: #166534;">Arrived:</strong> ${formatTime(schoolTimestamp.arrivalTime)}
              ${schoolTimestamp.departureTime ? `<br><strong style="color: #166534;">Departed:</strong> ${formatTime(schoolTimestamp.departureTime)}` : ''}
            </div>
          ` : `
            <div style="margin-top: 8px; padding: 4px 8px; background: #fef2f2; border-radius: 4px;">
              <span style="color: #dc2626;">Not visited yet</span>
            </div>
          `}
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    // Add current location marker if active
    if (isActive && currentLocation) {
      const currentMarker = new google.maps.Marker({
        position: { lat: currentLocation.lat, lng: currentLocation.lng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          scale: 10
        },
        title: `${driverName} - Current Location`,
        zIndex: 200,
        animation: google.maps.Animation.BOUNCE
      });

      bounds.extend({ lat: currentLocation.lat, lng: currentLocation.lng });
      newMarkers.push(currentMarker);
    }

    // Draw route path if coordinates exist
    if (routePath.coordinates.length > 0) {
      const pathCoordinates = routePath.coordinates.map(coord => ({
        lat: coord.lat,
        lng: coord.lng
      }));

      const routePolyline = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: isActive ? "#2563eb" : "#6b7280",
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });

      pathCoordinates.forEach(coord => bounds.extend(coord));
      setPolyline(routePolyline);
    }

    setMarkers(newMarkers);
    
    // Fit map to bounds
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  }, [map, routePath, schoolStops, currentLocation, isActive, driverName]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return "In Progress";
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const visitedSchools = routePath.schoolTimestamps.length;
  const totalSchools = schoolStops.length;

  return (
    <div className="space-y-4">
      {/* Route Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <RouteIcon className="h-5 w-5" />
                {routeName}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Driver: {driverName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? (
                  <>
                    <Activity className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1" />
                    Completed
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Schools Visited</div>
              <div className="text-lg font-bold text-blue-600">{visitedSchools}/{totalSchools}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">GPS Points</div>
              <div className="text-lg font-bold text-green-600">{routePath.coordinates.length}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Current Status</div>
              <div className="text-lg font-bold text-purple-600">
                {isActive ? "En Route" : "Completed"}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Last Update</div>
              <div className="text-lg font-bold text-orange-600">
                {currentLocation ? formatTime(currentLocation.timestamp) : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={mapRef} 
            style={{ width: '100%', height: '400px' }}
            className="rounded-lg border"
          />
          {!mapLoaded && (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* School Stops Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            School Stops Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schoolStops.map((school, index) => {
              const timestamp = routePath.schoolTimestamps.find(st => st.schoolId === school.id);
              const isVisited = !!timestamp?.arrivalTime;
              
              return (
                <div key={school.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isVisited ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{school.name}</div>
                    <div className="text-sm text-gray-600">{school.address}</div>
                  </div>
                  <div className="text-right">
                    {isVisited ? (
                      <div className="text-sm">
                        <div className="font-medium text-green-600">
                          Arrived: {formatTime(timestamp.arrivalTime)}
                        </div>
                        {timestamp.departureTime && (
                          <div className="text-gray-600">
                            Departed: {formatTime(timestamp.departureTime)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}