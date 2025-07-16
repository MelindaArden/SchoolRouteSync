import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Users, MapPin, Home, AlertTriangle, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RouteSummaryProps {
  sessionData: any;
  pickupData: any[];
  onStartNewRoute: () => void;
  onBackToDashboard: () => void;
  onNavigate?: (view: string) => void;
}

export default function RouteSummary({ sessionData, pickupData, onStartNewRoute, onBackToDashboard, onNavigate }: RouteSummaryProps) {
  console.log('RouteSummary rendered with:', { sessionData, pickupData });
  
  if (!sessionData) {
    console.log('No session data found, showing fallback');
    return (
      <div className="max-w-4xl mx-auto p-4 pb-20">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Route Complete!</h1>
          <p className="text-gray-600">Your route has been successfully completed</p>
          <div className="space-y-4">
            <Button 
              onClick={onStartNewRoute}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              Start New Route
            </Button>
            <Button 
              onClick={onBackToDashboard}
              variant="outline"
              size="lg"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Bottom Navigation Menu */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex justify-around items-center max-w-md mx-auto">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600"
              onClick={() => onNavigate && onNavigate("routes")}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">Routes</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600"
              onClick={() => onNavigate && onNavigate("notify")}
            >
              <AlertTriangle className="h-5 w-5" />
              <span className="text-xs">Notify</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600"
              onClick={() => onNavigate && onNavigate("welcome")}
            >
              <Navigation className="h-5 w-5" />
              <span className="text-xs">Welcome</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pickedUpCount = pickupData.filter(p => p.status === 'picked_up').length;
  const noShowCount = pickupData.filter(p => p.status === 'no_show').length;
  const totalStudents = pickupData.length;

  // Handle potential null/undefined dates safely
  const startTimeValue = sessionData.startedAt || sessionData.startTime || sessionData.createdAt;
  const endTimeValue = sessionData.completedAt || sessionData.completedTime || new Date().toISOString();
  
  const startTime = startTimeValue ? new Date(startTimeValue) : new Date();
  const endTime = endTimeValue ? new Date(endTimeValue) : new Date();
  
  // Ensure we have valid dates before calculating duration
  const duration = (startTime && endTime && !isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) 
    ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) 
    : 0; // Default to 0 minutes if dates are invalid

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Route Complete!</h1>
        <p className="text-gray-600">Great job completing your pickup route</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{pickedUpCount}</div>
            <div className="text-sm text-gray-600">Students Picked Up</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{duration}m</div>
            <div className="text-sm text-gray-600">Total Time</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{sessionData.route?.schools?.length || 0}</div>
            <div className="text-sm text-gray-600">Schools Visited</div>
          </CardContent>
        </Card>
      </div>

      {/* Route Details */}
      <Card>
        <CardHeader>
          <CardTitle>Route Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Route Name</label>
              <p className="text-lg font-semibold">{sessionData.route?.name || 'Unknown Route'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Driver</label>
              <p className="text-lg font-semibold">{sessionData.driver?.first_name} {sessionData.driver?.last_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Started</label>
              <p className="text-lg">{formatDistanceToNow(startTime, { addSuffix: true })}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Completed</label>
              <p className="text-lg">{sessionData.completedAt ? formatDistanceToNow(endTime, { addSuffix: true }) : 'Just now'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Pickup Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Student Pickup Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Total Students: {totalStudents}</span>
              <span>Completion Rate: {totalStudents > 0 ? Math.round((pickedUpCount / totalStudents) * 100) : 0}%</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pickedUpCount > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700">✓ Picked Up ({pickedUpCount})</h4>
                  <div className="space-y-1">
                    {pickupData
                      .filter(p => p.status === 'picked_up')
                      .map(pickup => (
                        <div key={pickup.id} className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {pickup.student?.first_name} {pickup.student?.last_name}
                          </Badge>
                          {pickup.pickedUpAt && (
                            <span className="text-xs text-gray-500">
                              {new Date(pickup.pickedUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {noShowCount > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-700">✗ Not Present ({noShowCount})</h4>
                  <div className="space-y-1">
                    {pickupData
                      .filter(p => p.status === 'no_show')
                      .map(pickup => (
                        <div key={pickup.id} className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            {pickup.student?.first_name} {pickup.student?.last_name}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={onStartNewRoute}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          Start New Route
        </Button>
        <Button 
          onClick={onBackToDashboard}
          variant="outline"
          size="lg"
        >
          Back to Dashboard
        </Button>
      </div>

      {/* Bottom Navigation Menu */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600"
            onClick={() => onNavigate && onNavigate("routes")}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Routes</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600"
            onClick={() => onNavigate && onNavigate("notify")}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs">Notify</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600"
            onClick={() => onNavigate && onNavigate("welcome")}
          >
            <Navigation className="h-5 w-5" />
            <span className="text-xs">Welcome</span>
          </Button>
        </div>
      </div>
    </div>
  );
}