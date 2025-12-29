// ============================================================
// FILE 3: AssignmentSuccessToast.tsx
// Path: frontend/src/features/individual/components/teacher/AssignmentSuccessToast.tsx
// ============================================================

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AssignmentSuccessToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  autoCloseDuration?: number;
}

export function AssignmentSuccessToast({
  show,
  message,
  onClose,
  autoCloseDuration = 5000,
}: AssignmentSuccessToastProps) {
  useEffect(() => {
    if (show && autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDuration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right">
      <Card className="bg-green-50 border-green-500 border-2 shadow-lg p-4 min-w-[300px] max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-900 mb-1">
              Assignment Successful!
            </h4>
            <p className="text-sm text-green-800">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-green-600 hover:text-green-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </Card>
    </div>
  );
}