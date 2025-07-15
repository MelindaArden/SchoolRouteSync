import { MapPin, Clock, CheckCircle, Route as RouteIcon } from "lucide-react";

interface RouteCompletionImageProps {
  routeName: string;
  driverName: string;
  startTime: string;
  endTime: string;
  routePath: Array<{
    id: number;
    latitude: string;
    longitude: string;
    timestamp: string;
    speed?: number;
  }>;
  schoolStops: Array<{
    schoolId: number;
    schoolName: string;
    latitude: string;
    longitude: string;
    arrivalTime: string;
    departureTime?: string;
    studentsPickedUp: number;
    totalStudents: number;
    duration: number;
  }>;
  onImageGenerated?: (imageData: string) => void;
}

export default function RouteCompletionImage({ 
  routeName, 
  driverName, 
  startTime, 
  endTime,
  routePath,
  schoolStops,
  onImageGenerated 
}: RouteCompletionImageProps) {
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCoordinate = (coord: string) => {
    return parseFloat(coord).toFixed(6);
  };

  const calculateTotalDuration = () => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate map bounds for visualization
  const allLatitudes = [
    ...routePath.map(p => parseFloat(p.latitude)),
    ...schoolStops.map(s => parseFloat(s.latitude))
  ];
  const allLongitudes = [
    ...routePath.map(p => parseFloat(p.longitude)),
    ...schoolStops.map(s => parseFloat(s.longitude))
  ];

  const minLat = Math.min(...allLatitudes);
  const maxLat = Math.max(...allLatitudes);
  const minLng = Math.min(...allLongitudes);
  const maxLng = Math.max(...allLongitudes);

  const mapWidth = 1200;
  const mapHeight = 800;
  const padding = 80;

  // Convert GPS coordinates to SVG coordinates
  const coordToSVG = (lat: number, lng: number) => {
    const x = padding + ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 2 * padding);
    const y = mapHeight - padding - ((lat - minLat) / (maxLat - minLat)) * (mapHeight - 2 * padding);
    return { x, y };
  };

  // Generate route path for SVG
  const routePathPoints = routePath.map(point => {
    const { x, y } = coordToSVG(parseFloat(point.latitude), parseFloat(point.longitude));
    return `${x},${y}`;
  }).join(' ');

  // Generate the completion image and call the callback
  const generateCompletionImage = () => {
    const svgElement = document.getElementById('route-completion-svg');
    if (svgElement && onImageGenerated) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      canvas.width = mapWidth;
      canvas.height = mapHeight + 200; // Extra space for header
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create image from SVG
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          ctx.drawImage(img, 0, 150);
          URL.revokeObjectURL(url);
          
          // Add header text
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 28px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Route Completion Report: ${routeName}`, canvas.width / 2, 40);
          
          ctx.font = '20px Arial';
          ctx.fillText(`Driver: ${driverName}`, canvas.width / 2, 75);
          
          ctx.font = '16px Arial';
          ctx.fillText(`Completed: ${formatTime(endTime)} | Duration: ${calculateTotalDuration()}`, canvas.width / 2, 105);
          
          const imageData = canvas.toDataURL('image/png');
          onImageGenerated(imageData);
        };
        
        img.src = url;
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-600" />
          Route Completion Report
        </h2>
        <div className="text-gray-600">
          <p className="text-lg font-semibold">{routeName}</p>
          <p>Driver: {driverName}</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm">
            <span>Started: {formatTime(startTime)}</span>
            <span>•</span>
            <span>Completed: {formatTime(endTime)}</span>
            <span>•</span>
            <span>Duration: {calculateTotalDuration()}</span>
          </div>
        </div>
      </div>

      <div className="relative bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200">
        <svg 
          id="route-completion-svg"
          width={mapWidth} 
          height={mapHeight} 
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background grid pattern */}
          <defs>
            <pattern id="completion-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <rect width="50" height="50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
            <pattern id="completion-roads" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="none"/>
              <path d="M0,50 L100,50" stroke="#d1d5db" strokeWidth="3"/>
              <path d="M50,0 L50,100" stroke="#d1d5db" strokeWidth="3"/>
            </pattern>
          </defs>
          
          <rect width={mapWidth} height={mapHeight} fill="#f9fafb"/>
          <rect width={mapWidth} height={mapHeight} fill="url(#completion-grid)"/>
          <rect width={mapWidth} height={mapHeight} fill="url(#completion-roads)" opacity="0.4"/>
          
          {/* Completed route path */}
          {routePath.length > 1 && (
            <polyline
              points={routePathPoints}
              fill="none"
              stroke="#16a34a"
              strokeWidth="5"
              strokeDasharray="none"
              opacity="0.8"
            />
          )}
          
          {/* School stops with completion pins */}
          {schoolStops.map((stop, index) => {
            const { x, y } = coordToSVG(parseFloat(stop.latitude), parseFloat(stop.longitude));
            return (
              <g key={stop.schoolId}>
                {/* School pin */}
                <circle
                  cx={x}
                  cy={y}
                  r="18"
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth="4"
                />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {index + 1}
                </text>
                
                {/* School name */}
                <text
                  x={x}
                  y={y - 30}
                  textAnchor="middle"
                  fill="#374151"
                  fontSize="14"
                  fontWeight="600"
                >
                  {stop.schoolName}
                </text>
                
                {/* Arrival time */}
                <text
                  x={x}
                  y={y + 45}
                  textAnchor="middle"
                  fill="#059669"
                  fontSize="12"
                  fontWeight="500"
                >
                  {formatTime(stop.arrivalTime)}
                </text>
                
                {/* Students picked up */}
                <text
                  x={x}
                  y={y + 60}
                  textAnchor="middle"
                  fill="#7c2d12"
                  fontSize="11"
                  fontWeight="500"
                >
                  {stop.studentsPickedUp}/{stop.totalStudents} students
                </text>
              </g>
            );
          })}
          
          {/* Route waypoints with timestamps */}
          {routePath.map((point, index) => {
            if (index % 15 === 0 || index === routePath.length - 1) {
              const { x, y } = coordToSVG(parseFloat(point.latitude), parseFloat(point.longitude));
              return (
                <g key={point.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill="#16a34a"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={x + 12}
                    y={y - 8}
                    fill="#047857"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {formatTime(point.timestamp)}
                  </text>
                </g>
              );
            }
            return null;
          })}
          
          {/* Start point */}
          {routePath.length > 0 && (
            <g>
              <circle
                cx={coordToSVG(parseFloat(routePath[0].latitude), parseFloat(routePath[0].longitude)).x}
                cy={coordToSVG(parseFloat(routePath[0].latitude), parseFloat(routePath[0].longitude)).y}
                r="15"
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth="4"
              />
              <text
                x={coordToSVG(parseFloat(routePath[0].latitude), parseFloat(routePath[0].longitude)).x}
                y={coordToSVG(parseFloat(routePath[0].latitude), parseFloat(routePath[0].longitude)).y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="bold"
              >
                START
              </text>
            </g>
          )}
          
          {/* End point */}
          {routePath.length > 0 && (
            <g>
              <circle
                cx={coordToSVG(parseFloat(routePath[routePath.length - 1].latitude), parseFloat(routePath[routePath.length - 1].longitude)).x}
                cy={coordToSVG(parseFloat(routePath[routePath.length - 1].latitude), parseFloat(routePath[routePath.length - 1].longitude)).y}
                r="15"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="4"
              />
              <text
                x={coordToSVG(parseFloat(routePath[routePath.length - 1].latitude), parseFloat(routePath[routePath.length - 1].longitude)).x}
                y={coordToSVG(parseFloat(routePath[routePath.length - 1].latitude), parseFloat(routePath[routePath.length - 1].longitude)).y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="bold"
              >
                END
              </text>
            </g>
          )}
        </svg>
        
        {/* Route completion summary overlay */}
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg border max-w-md">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <RouteIcon className="h-4 w-4" />
            Route Summary
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-600">Total Stops</p>
              <p className="font-semibold">{schoolStops.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Students Picked Up</p>
              <p className="font-semibold">
                {schoolStops.reduce((sum, stop) => sum + stop.studentsPickedUp, 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">GPS Points</p>
              <p className="font-semibold">{routePath.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Completion Rate</p>
              <p className="font-semibold text-green-600">100%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate completion image button */}
      <div className="mt-6 text-center">
        <button
          onClick={generateCompletionImage}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Generate Route Completion Image
        </button>
      </div>
    </div>
  );
}