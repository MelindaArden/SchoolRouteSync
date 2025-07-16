import { AlertTriangle, RouteIcon, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "@/lib/types";

interface SimpleFallbackDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function SimpleFallbackDashboard({ user, onLogout }: SimpleFallbackDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Route Runner - Admin Dashboard</h1>
          <button 
            onClick={onLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <div>
              <h3 className="font-semibold text-green-800">Welcome back, {user.firstName || user.username}!</h3>
              <p className="text-green-700 text-sm">You're logged in successfully to Route Runner.</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Routes</p>
                  <p className="text-2xl font-bold">Loading...</p>
                </div>
                <RouteIcon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">Loading...</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">On Time %</p>
                  <p className="text-2xl font-bold">Loading...</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="text-center">
          <p className="text-gray-600 mb-4">Dashboard is loading data. Please wait or try refreshing.</p>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Full Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}