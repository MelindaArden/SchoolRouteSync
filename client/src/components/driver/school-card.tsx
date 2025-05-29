import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StudentList from "./student-list";
import { Clock, MapPin } from "lucide-react";

interface SchoolCardProps {
  school: any;
  students: any[];
  estimatedTime: string;
  status: "completed" | "next" | "pending";
  sessionId?: number;
}

export default function SchoolCard({
  school,
  students,
  estimatedTime,
  status,
  sessionId
}: SchoolCardProps) {
  const statusConfig = {
    completed: {
      badge: "Complete",
      badgeClass: "bg-green-600",
      borderClass: "border-l-green-500"
    },
    next: {
      badge: "Next",
      badgeClass: "bg-orange-600",
      borderClass: "border-l-orange-500"
    },
    pending: {
      badge: "Pending",
      badgeClass: "bg-gray-400",
      borderClass: ""
    }
  };

  const config = statusConfig[status];

  return (
    <Card className={`shadow-md overflow-hidden ${config.borderClass ? `border-l-4 ${config.borderClass}` : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-800">{school.name}</h4>
          <Badge className={`${config.badgeClass} text-white`}>
            {config.badge}
          </Badge>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{estimatedTime}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{school.address}</span>
          </div>
        </div>

        <div className="border-t pt-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">
            Students ({students.length})
          </h5>
          <StudentList 
            students={students} 
            isActive={status === "next"}
            sessionId={sessionId}
          />
        </div>
      </CardContent>
    </Card>
  );
}
