// frontend/src/features/individual/components/student/WindowStatusIndicator.tsx

import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Clock, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { differenceInDays, isPast, isFuture, format } from "date-fns";

interface WindowStatusIndicatorProps {
  startDate: string | Date;
  endDate: string | Date;
  isCompleted?: boolean;
  showDaysRemaining?: boolean;
  variant?: "badge" | "inline" | "card";
}

export function WindowStatusIndicator({
  startDate,
  endDate,
  isCompleted = false,
  showDaysRemaining = true,
  variant = "badge",
}: WindowStatusIndicatorProps) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  const isBeforeWindow = isFuture(start);
  const isAfterWindow = isPast(end);
  const isWithinWindow = !isBeforeWindow && !isAfterWindow;

  const daysRemaining = isWithinWindow ? differenceInDays(end, now) : 0;
  const daysUntilStart = isBeforeWindow ? differenceInDays(start, now) : 0;

  const getStatusConfig = () => {
    if (isCompleted) {
      return {
        icon: CheckCircle2,
        label: "Completed",
        color: "bg-green-500/10 text-green-700 border-green-300",
        iconColor: "text-green-600",
      };
    }

    if (isAfterWindow) {
      return {
        icon: XCircle,
        label: "Window Closed",
        color: "bg-red-500/10 text-red-700 border-red-300",
        iconColor: "text-red-600",
      };
    }

    if (isBeforeWindow) {
      return {
        icon: Calendar,
        label: `Opens in ${daysUntilStart} day${daysUntilStart !== 1 ? "s" : ""}`,
        color: "bg-gray-500/10 text-gray-700 border-gray-300",
        iconColor: "text-gray-600",
      };
    }

    // Within window
    if (daysRemaining === 0) {
      return {
        icon: Clock,
        label: "Due Today!",
        color: "bg-orange-500/10 text-orange-700 border-orange-300",
        iconColor: "text-orange-600",
      };
    }

    if (daysRemaining <= 2) {
      return {
        icon: Clock,
        label: `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left`,
        color: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
        iconColor: "text-yellow-600",
      };
    }

    return {
      icon: Clock,
      label: `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`,
      color: "bg-blue-500/10 text-blue-700 border-blue-300",
      iconColor: "text-blue-600",
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
        <span className="font-medium">{config.label}</span>
        {showDaysRemaining && isWithinWindow && !isCompleted && (
          <span className="text-muted-foreground">
            ({daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left)
          </span>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`rounded-lg border p-3 ${config.color}`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
          <div className="flex-1">
            <div className="font-semibold">{config.label}</div>
            {showDaysRemaining && isWithinWindow && !isCompleted && (
              <div className="text-xs mt-0.5 opacity-75">
                Window closes on {format(end, "MMM d, yyyy 'at' h:mm a")}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: badge variant
  return (
    <Badge variant="outline" className={`${config.color} gap-1.5`}>
      <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
      <span>{config.label}</span>
    </Badge>
  );
}