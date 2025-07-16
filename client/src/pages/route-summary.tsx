import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Users, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RouteSummaryProps {
  sessionData: any;
  pickupData: any[];
  onStartNewRoute: () => void;
  onBackToDashboard: () => void;
}

export default function RouteSummary({ sessionData, pickupData, onStartNewRoute, onBackToDashboard }: RouteSummaryProps) {
  if (!sessionData) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No route data available</p>
            <Button onClick={onBackToDashboard} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pickedUpCount = pickupData.filter(p => p.status === 'picked_up').length;
  const noShowCount = pickupData.filter(p => p.status === 'no_show').length;
  const totalStudents = pickupData.length;

  const startTime = new Date(sessionData.startedAt);
  const endTime = sessionData.completedAt ? new Date(sessionData.completedAt) : new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
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
    </div>
  );
}