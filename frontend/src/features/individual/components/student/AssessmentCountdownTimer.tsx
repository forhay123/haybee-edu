// frontend/src/features/individual/components/student/AssessmentCountdownTimer.tsx

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";

interface AssessmentCountdownTimerProps {
  targetDate: string | Date;
  label?: string;
  urgencyLevel?: "normal" | "warning" | "critical";
  onExpire?: () => void;
  showIcon?: boolean;
  variant?: "default" | "compact" | "inline";
}

export function AssessmentCountdownTimer({
  targetDate,
  label = "Time Remaining",
  urgencyLevel = "normal",
  onExpire,
  showIcon = true,
  variant = "default",
}: AssessmentCountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const [urgency, setUrgency] = useState(urgencyLevel);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const secondsLeft = differenceInSeconds(target, now);

      if (secondsLeft <= 0) {
        setIsExpired(true);
        setTimeRemaining("Expired");
        onExpire?.();
        return;
      }

      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;
      const seconds = secondsLeft % 60;

      // Update urgency based on time remaining
      if (secondsLeft < 3600) {
        // Less than 1 hour
        setUrgency("critical");
      } else if (secondsLeft < 86400) {
        // Less than 24 hours
        setUrgency("warning");
      } else {
        setUrgency("normal");
      }

      // Format display
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  const getUrgencyConfig = () => {
    if (isExpired) {
      return {
        icon: CheckCircle2,
        color: "bg-gray-500/10 text-gray-700 border-gray-300",
        iconColor: "text-gray-600",
        pulse: false,
      };
    }

    switch (urgency) {
      case "critical":
        return {
          icon: AlertTriangle,
          color: "bg-red-500/10 text-red-700 border-red-300",
          iconColor: "text-red-600",
          pulse: true,
        };
      case "warning":
        return {
          icon: Clock,
          color: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
          iconColor: "text-yellow-600",
          pulse: true,
        };
      default:
        return {
          icon: Clock,
          color: "bg-blue-500/10 text-blue-700 border-blue-300",
          iconColor: "text-blue-600",
          pulse: false,
        };
    }
  };

  const config = getUrgencyConfig();
  const Icon = config.icon;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2">
        {showIcon && (
          <Icon
            className={`h-4 w-4 ${config.iconColor} ${config.pulse ? "animate-pulse" : ""}`}
          />
        )}
        <span className={`font-mono font-semibold ${isExpired ? "text-gray-600" : ""}`}>
          {timeRemaining}
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Badge variant="outline" className={`${config.color} gap-1.5 font-mono`}>
        {showIcon && (
          <Icon className={`h-3.5 w-3.5 ${config.pulse ? "animate-pulse" : ""}`} />
        )}
        <span>{timeRemaining}</span>
      </Badge>
    );
  }

  // Default: card variant
  return (
    <Card className={`${config.color} ${config.pulse ? "animate-pulse" : ""}`}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium opacity-75">
            {showIcon && <Icon className="h-4 w-4" />}
            <span>{label}</span>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight">
            {timeRemaining}
          </div>
          {!isExpired && urgency === "critical" && (
            <div className="text-xs font-semibold uppercase tracking-wide">
              ⚠️ Urgent - Submit Now!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}