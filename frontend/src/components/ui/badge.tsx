// frontend/src/components/ui/badge.tsx

import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-blue-100 text-blue-800 border-blue-200",
      secondary: "bg-gray-100 text-gray-800 border-gray-200",
      destructive: "bg-red-100 text-red-800 border-red-200",
      outline: "border border-gray-300 text-gray-700 bg-transparent",
      success: "bg-green-100 text-green-800 border-green-200",
      warning: "bg-orange-100 text-orange-800 border-orange-200",
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = "Badge";