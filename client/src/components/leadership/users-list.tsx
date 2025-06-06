import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User, Shield, Users, Edit, Plus, Search, Phone, Mail } from "lucide-react";
import UserForm from "./user-form";

interface UsersListProps {
  onAddUser: () => void;
}

export default function UsersList({ onAddUser }: UsersListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  const filteredUsers = users.filter((user: any) =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const drivers = filteredUsers.filter((user: any) => user.role === "driver");
  const admins = filteredUsers.filter((user: any) => user.role === "leadership");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (editingUser) {
    return (
      <UserForm 
        user={editingUser} 
        onClose={() => setEditingUser(null)} 
      />
    );
  }

  const UserCard = ({ user }: { user: any }) => (
    <Card key={user.id} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              user.role === "leadership" ? "bg-purple-100" : "bg-blue-100"
            }`}>
              {user.role === "leadership" ? (
                <Shield className={`h-4 w-4 ${
                  user.role === "leadership" ? "text-purple-600" : "text-blue-600"
                }`} />
              ) : (
                <User className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {user.firstName} {user.lastName}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span>@{user.username}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={user.role === "leadership" ? "default" : "secondary"}>
              {user.role === "leadership" ? "Administrator" : "Driver"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingUser(user)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {user.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              {user.email}
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              {user.phone}
            </div>
          )}
          {user.mobileNumber && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4" />
              <span className="text-gray-600">Mobile:</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                SMS Enabled: {user.mobileNumber}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="mt-3">
          <Badge variant={user.isActive ? "outline" : "destructive"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <Button onClick={onAddUser} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search users by name, username, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Users Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "No users match your search criteria" : "No users have been added yet"}
            </p>
            {!searchTerm && (
              <Button onClick={onAddUser}>Add First User</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {admins.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                Administrators ({admins.length})
              </h3>
              <div className="grid gap-4">
                {admins.map((user: any) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {drivers.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Drivers ({drivers.length})
              </h3>
              <div className="grid gap-4">
                {drivers.map((user: any) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}