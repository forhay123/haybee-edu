// ============================================================
// progressBar.tsx (NEW - Sprint 3)
// Location: frontend/src/components/ui/progressBar.tsx
// ============================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0–100
  color?: "blue" | "green" | "red" | "yellow";
  height?: "sm" | "md" | "lg";
}

export const Progress = React.forwardRef<
  HTMLDivElement,
  ProgressBarProps
>(({ value, color = "blue", height = "md", className = "", ...props }, ref) => {
  const heights = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    yellow: "bg-yellow-500",
  };

  return (
    <div
      ref={ref}
      className={cn("w-full bg-gray-200 rounded-full", heights[height], className)}
      {...props}
    >
      <div
        className={cn(
          "rounded-full transition-all duration-300",
          colors[color]
        )}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
});

Progress.displayName = "ProgressBar";
