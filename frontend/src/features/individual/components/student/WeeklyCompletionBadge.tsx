// frontend/src/features/individual/components/student/WeeklyCompletionBadge.tsx

import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

interface WeeklyCompletionBadgeProps {
  completionRate: number;
  totalAssessments: number;
  completedCount: number;
  variant?: "default" | "detailed";
  size?: "sm" | "md" | "lg";
}

export function WeeklyCompletionBadge({
  completionRate,
  totalAssessments,
  completedCount,
  variant = "default",
  size = "md",
}: WeeklyCompletionBadgeProps) {
  const getStatusConfig = () => {
    if (completionRate === 100) {
      return {
        icon: CheckCircle2,
        label: "Perfect Week!",
        color: "bg-green-500/10 text-green-700 border-green-300",
        iconColor: "text-green-600",
      };
    }
    if (completionRate >= 80) {
      return {
        icon: CheckCircle2,
        label: "Great Progress",
        color: "bg-blue-500/10 text-blue-700 border-blue-300",
        iconColor: "text-blue-600",
      };
    }
    if (completionRate >= 60) {
      return {
        icon: Clock,
        label: "Good Progress",
        color: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
        iconColor: "text-yellow-600",
      };
    }
    if (completionRate >= 40) {
      return {
        icon: AlertTriangle,
        label: "Needs Attention",
        color: "bg-orange-500/10 text-orange-700 border-orange-300",
        iconColor: "text-orange-600",
      };
    }
    return {
      icon: XCircle,
      label: "Behind Schedule",
      color: "bg-red-500/10 text-red-700 border-red-300",
      iconColor: "text-red-600",
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs py-0.5 px-2",
    md: "text-sm py-1 px-3",
    lg: "text-base py-1.5 px-4",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (variant === "detailed") {
    return (
      <div className={`inline-flex items-center gap-2 rounded-full border ${config.color} ${sizeClasses[size]}`}>
        <Icon className={`${iconSizes[size]} ${config.iconColor}`} />
        <div className="flex items-center gap-2">
          <span className="font-semibold">{Math.round(completionRate)}%</span>
          <span className="text-xs opacity-75">
            ({completedCount}/{totalAssessments})
          </span>
        </div>
      </div>
    );
  }

  return (
    <Badge variant="outline" className={`${config.color} ${sizeClasses[size]} gap-1.5`}>
      <Icon className={`${iconSizes[size]} ${config.iconColor}`} />
      <span>{config.label}</span>
      <span className="font-semibold ml-1">{Math.round(completionRate)}%</span>
    </Badge>
  );
}