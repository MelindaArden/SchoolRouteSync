import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Phone, Eye } from "lucide-react";

interface AlertCardProps {
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  onContact?: () => void;
  onViewDetails?: () => void;
}

export default function AlertCard({
  type,
  title,
  message,
  timestamp,
  onContact,
  onViewDetails
}: AlertCardProps) {
  const typeConfig = {
    error: {
      bgClass: "bg-red-50 border-red-200",
      borderClass: "border-l-red-500",
      iconClass: "text-red-600",
      titleClass: "text-red-800",
      messageClass: "text-red-600",
      timestampClass: "text-red-500",
      buttonClass: "text-red-600 hover:text-red-800"
    },
    warning: {
      bgClass: "bg-yellow-50 border-yellow-200",
      borderClass: "border-l-yellow-500",
      iconClass: "text-yellow-600",
      titleClass: "text-yellow-800",
      messageClass: "text-yellow-600",
      timestampClass: "text-yellow-500",
      buttonClass: "text-yellow-600 hover:text-yellow-800"
    },
    info: {
      bgClass: "bg-blue-50 border-blue-200",
      borderClass: "border-l-blue-500",
      iconClass: "text-blue-600",
      titleClass: "text-blue-800",
      messageClass: "text-blue-600",
      timestampClass: "text-blue-500",
      buttonClass: "text-blue-600 hover:text-blue-800"
    }
  };

  const config = typeConfig[type];
  const Icon = type === "error" ? AlertTriangle : type === "warning" ? Clock : AlertTriangle;

  return (
    <Card className={`${config.bgClass} border-l-4 ${config.borderClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Icon className={`h-5 w-5 ${config.iconClass}`} />
              <p className={`font-medium ${config.titleClass}`}>{title}</p>
            </div>
            <p className={`text-sm ${config.messageClass} mb-2`}>{message}</p>
            <p className={`text-xs ${config.timestampClass}`}>{timestamp}</p>
          </div>
          <div className="flex space-x-2 ml-4">
            {onContact && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onContact}
                className={config.buttonClass}
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}
            {onViewDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onViewDetails}
                className={config.buttonClass}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
