// ============================================================
// alert-dialog.tsx
// Location: frontend/src/components/ui/alert-dialog.tsx
// ============================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// Header
export const AlertDialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
);

// Title
export const AlertDialogTitle = ({
  children,
  className = "",
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>
);

// Description
export const AlertDialogDescription = ({
  children,
  className = "",
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-gray-600", className)}>{children}</p>
);

// Content wrapper
export const AlertDialogContent = ({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("", className)}>{children}</div>
);

// Footer
export const AlertDialogFooter = ({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex justify-end gap-3 mt-6", className)}>{children}</div>
);

// Buttons
export const AlertDialogCancel = ({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export const AlertDialogAction = ({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700",
      className
    )}
    {...props}
  >
    {children}
  </button>
);
