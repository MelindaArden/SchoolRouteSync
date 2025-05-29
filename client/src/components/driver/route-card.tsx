import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin } from "lucide-react";

interface RouteCardProps {
  route: any;
  totalStudents: number;
  completedPickups: number;
  nextSchool?: any;
  isActive: boolean;
  onStart: () => void;
  onComplete: () => void;
}

export default function RouteCard({
  route,
  totalStudents,
  completedPickups,
  nextSchool,
  isActive,
  onStart,
  onComplete
}: RouteCardProps) {
  const progress = totalStudents > 0 ? (completedPickups / totalStudents) * 100 : 0;
  const nextSchoolTime = nextSchool ? "2:45 PM" : "Complete";

  return (
    <Card className="shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-800">
            {route.name} - Today
          </h2>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-green-600" : ""}
          >
            {isActive ? "Active" : "Ready"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <div>
              <span className="text-gray-600">Next School:</span>
              <p className="font-medium">{nextSchool?.name || "Complete"}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <span className="text-gray-600">ETA:</span>
              <p className="font-medium text-primary">{nextSchoolTime}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div>
              <span className="text-gray-600">Students:</span>
              <p className="font-medium">{totalStudents} total</p>
            </div>
          </div>
          <div>
            <span className="text-gray-600">Progress:</span>
            <p className="font-medium text-green-600">
              {completedPickups}/{totalStudents} picked up
            </p>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {!isActive ? (
          <Button onClick={onStart} className="w-full bg-primary">
            Start Route
          </Button>
        ) : (
          <Button onClick={onComplete} className="w-full bg-green-600 hover:bg-green-700">
            Complete Route
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
