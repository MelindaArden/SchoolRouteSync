import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Plus,
  LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface MasterDashboardProps {
  masterAdmin: any;
  onLogout: () => void;
}

export default function MasterDashboard({ masterAdmin, onLogout }: MasterDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Business creation form state
  const [newBusiness, setNewBusiness] = useState({
    name: "",
    displayName: "",
    contactEmail: "",
    contactPhone: "",
    address: ""
  });

  // Fetch businesses data
  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ["/api/master/businesses"],
    refetchInterval: 30000,
  });

  // Fetch analytics data
  const { data: analytics = {}, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/master/analytics"],
    refetchInterval: 60000,
  });

  // Fetch feedback data
  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ["/api/master/feedback"],
    refetchInterval: 30000,
  });

  // Fetch system errors
  const { data: errors = [], isLoading: errorsLoading } = useQuery({
    queryKey: ["/api/master/errors"],
    refetchInterval: 30000,
  });

  // Create business mutation
  const createBusinessMutation = useMutation({
    mutationFn: async (businessData: any) => {
      return await apiRequest("POST", "/api/master/businesses", businessData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Business account created successfully",
      });
      setNewBusiness({
        name: "",
        displayName: "",
        contactEmail: "",
        contactPhone: "",
        address: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master/businesses"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create business",
        variant: "destructive",
      });
    },
  });

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newBusiness.name || !newBusiness.displayName || !newBusiness.contactEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createBusinessMutation.mutate(newBusiness);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-600 rounded-full p-2">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Master Dashboard</h1>
                <p className="text-sm text-gray-500">Platform Administration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {masterAdmin.firstName} {masterAdmin.lastName}
                </p>
                <p className="text-xs text-gray-500">Master Administrator</p>
              </div>
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="businesses">Businesses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="errors">System Errors</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{businesses.length}</div>
                  <p className="text-xs text-muted-foreground">
                    +{businesses.filter((b: any) => new Date(b.createdAt) > new Date(Date.now() - 30*24*60*60*1000)).length} this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalActiveUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all businesses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics.monthlyRevenue || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +{analytics.revenueGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {errors.length === 0 ? "Good" : "Issues"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {errors.length} errors today
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businesses.slice(0, 5).map((business: any) => (
                    <div key={business.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{business.displayName}</p>
                        <p className="text-sm text-gray-500">Business: {business.name}</p>
                      </div>
                      <Badge variant={business.isActive ? "default" : "destructive"}>
                        {business.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create New Business */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Create New Business</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateBusiness} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Business Name (URL-safe)</Label>
                      <Input
                        id="name"
                        value={newBusiness.name}
                        onChange={(e) => setNewBusiness({...newBusiness, name: e.target.value})}
                        placeholder="e.g., my-school-transport"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={newBusiness.displayName}
                        onChange={(e) => setNewBusiness({...newBusiness, displayName: e.target.value})}
                        placeholder="e.g., My School Transport"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={newBusiness.contactEmail}
                        onChange={(e) => setNewBusiness({...newBusiness, contactEmail: e.target.value})}
                        placeholder="admin@business.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        value={newBusiness.contactPhone}
                        onChange={(e) => setNewBusiness({...newBusiness, contactPhone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={newBusiness.address}
                        onChange={(e) => setNewBusiness({...newBusiness, address: e.target.value})}
                        placeholder="Business address"
                        rows={2}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createBusinessMutation.isPending}
                    >
                      {createBusinessMutation.isPending ? "Creating..." : "Create Business"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Businesses List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Businesses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {businessesLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {businesses.map((business: any) => (
                          <div key={business.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-medium">{business.displayName}</h3>
                              <p className="text-sm text-gray-500">{business.name}</p>
                              <p className="text-xs text-gray-400">{business.contactEmail}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <Badge variant={business.isActive ? "default" : "destructive"}>
                                {business.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <p className="text-xs text-gray-500">
                                Created {new Date(business.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Usage Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Routes Today:</span>
                      <span className="font-medium">{analytics.totalRoutesToday || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Students Transported:</span>
                      <span className="font-medium">{analytics.totalStudentsTransported || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Distance Covered:</span>
                      <span className="font-medium">{analytics.totalDistance || 0} miles</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Average Route Time:</span>
                      <span className="font-medium">{analytics.averageRouteTime || 0} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">On-Time Rate:</span>
                      <span className="font-medium">{analytics.onTimeRate || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">User Satisfaction:</span>
                      <span className="font-medium">{analytics.userSatisfaction || 0}/5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Uptime:</span>
                      <span className="font-medium">{analytics.uptime || 99.9}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Error Rate:</span>
                      <span className="font-medium">{analytics.errorRate || 0.1}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Response Time:</span>
                      <span className="font-medium">{analytics.responseTime || 200}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">${analytics.monthlyRevenue || 0}</div>
                    <p className="text-sm text-gray-500">Monthly Revenue</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{businesses.length}</div>
                    <p className="text-sm text-gray-500">Active Subscriptions</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      ${analytics.averageRevenuePerBusiness || 0}
                    </div>
                    <p className="text-sm text-gray-500">Average per Business</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>User Feedback</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedbackLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : feedback.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No feedback received yet</p>
                ) : (
                  <div className="space-y-4">
                    {feedback.map((item: any) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge variant="outline">{item.feedbackType}</Badge>
                            {item.rating && (
                              <span className="ml-2 text-sm">
                                {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">{item.subject}</h4>
                        <p className="text-sm text-gray-600">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Errors Tab */}
          <TabsContent value="errors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>System Errors</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {errorsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : errors.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No system errors reported</p>
                ) : (
                  <div className="space-y-3">
                    {errors.map((error: any) => (
                      <div key={error.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-red-800">{error.errorType}</h4>
                            <p className="text-sm text-red-600 mt-1">{error.errorMessage}</p>
                            <p className="text-xs text-red-500 mt-2">{error.url}</p>
                          </div>
                          <span className="text-xs text-red-500">
                            {new Date(error.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}