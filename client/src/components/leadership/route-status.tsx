import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RouteStatusProps {
  routeName: string;
  driverName: string;
  status: string;
  progress: number;
  currentLocation: string;
  studentsPickedUp: number;
  totalStudents: number;
}

export default function RouteStatus({
  routeName,
  driverName,
  status,
  progress,
  currentLocation,
  studentsPickedUp,
  totalStudents
}: RouteStatusProps) {
  const getStatusConfig = (status: string, progress: number) => {
    if (status === "completed") {
      return { label: "Complete", className: "bg-green-600" };
    }
    if (status === "in_progress") {
      if (progress >= 80) return { label: "On Time", className: "bg-green-600" };
      if (progress >= 50) return { label: "In Progress", className: "bg-blue-600" };
      return { label: "Behind", className: "bg-red-600" };
    }
    return { label: "Pending", className: "bg-gray-400" };
  };

  const statusConfig = getStatusConfig(status, progress);
  const initials = driverName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Card className="shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-white text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-800">{routeName}</p>
              <p className="text-sm text-gray-600">{driverName}</p>
            </div>
          </div>
          <div className="text-right">
            <Badge className={`${statusConfig.className} text-white mb-1`}>
              {statusConfig.label}
            </Badge>
            <p className="text-xs text-gray-500">
              {studentsPickedUp}/{totalStudents} picked up
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">{currentLocation}</p>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              status === "completed" ? "bg-green-600" :
              progress >= 50 ? "bg-blue-600" : "bg-red-600"
            }`}
            style={{ width: `${Math.max(progress, 0)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
