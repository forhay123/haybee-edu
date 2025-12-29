// ============================================================
// statusIndicator.tsx (NEW - Sprint 3)
// Location: frontend/src/components/ui/statusIndicator.tsx
// ============================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  status: "online" | "offline" | "busy" | "away";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

export const StatusIndicator = ({
  status,
  size = "md",
  pulse = true,
  className = "",
  ...props
}: StatusIndicatorProps) => {
  const sizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const colors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    busy: "bg-red-500",
    away: "bg-yellow-500",
  };

  return (
    <div
      className={cn(
        "rounded-full",
        sizes[size],
        colors[status],
        pulse && "animate-pulse",
        className
      )}
      {...props}
    />
  );
};
