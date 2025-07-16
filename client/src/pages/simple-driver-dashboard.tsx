import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Route as RouteIcon, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleDriverDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function SimpleDriverDashboard({ user, onLogout }: SimpleDriverDashboardProps) {
  const { toast } = useToast();

  // Fetch driver's routes
  const { data: routes = [], isLoading } = useQuery({
    queryKey: [`/api/drivers/${user.id}/routes`],
  });

  // Fetch today's sessions
  const { data: sessions = [] } = useQuery({
    queryKey: [`/api/drivers/${user.id}/sessions/today`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Route Runner</h1>
            </div>
            <Button onClick={onLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {user.firstName}!
          </h2>
          <p className="text-gray-600">Driver Dashboard</p>
        </div>

        {/* Routes */}
        <div className="space-y-4">
          {routes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <RouteIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Routes Assigned</h3>
                <p className="text-gray-600">
                  You don't have any routes assigned yet. Please contact your administrator.
                </p>
              </CardContent>
            </Card>
          ) : (
            routes.map((route: any) => (
              <Card key={route.id}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <RouteIcon className="h-5 w-5 mr-2 text-blue-600" />
                    {route.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-600" />
                      <span>{route.totalStudents || 0} students</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <span>{route.schools?.length || 0} schools</span>
                    </div>
                  </div>
                  
                  {route.schools && route.schools.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Schools:</h4>
                      <div className="space-y-2">
                        {route.schools.map((schoolData: any) => (
                          <div key={schoolData.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium text-gray-900">
                              {schoolData.school?.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {schoolData.students?.length || 0} students • 
                              Dismissal: {schoolData.school?.dismissalTime}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sessions Info */}
        {sessions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Today's Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessions.map((session: any) => (
                  <div key={session.id} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{session.route?.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        <Card className="mt-6 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-500 space-y-1">
              <div>User ID: {user.id}</div>
              <div>Username: {user.username}</div>
              <div>Routes Count: {routes.length}</div>
              <div>Sessions Count: {sessions.length}</div>
              <div>Timestamp: {new Date().toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}