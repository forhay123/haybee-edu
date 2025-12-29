// frontend/src/features/individual/components/student/NullifiedSubmissionNotice.tsx

import { AlertTriangle, Clock, XCircle, Info } from "lucide-react";
import { format } from "date-fns";

interface NullifiedSubmissionNoticeProps {
  originalSubmissionTime: string;
  nullifiedReason: string;
  assessmentWindowStart: string;
  variant?: "inline" | "card";
}

export function NullifiedSubmissionNotice({
  originalSubmissionTime,
  nullifiedReason,
  assessmentWindowStart,
  variant = "inline",
}: NullifiedSubmissionNoticeProps) {
  
  if (variant === "inline") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 ml-9">
        <div className="flex items-start gap-2">
          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-red-900 mb-1">
              ⚠️ Previous Submission Invalidated
            </div>
            <div className="text-xs text-red-800">
              You submitted this assessment at{' '}
              <strong>{format(new Date(originalSubmissionTime), "h:mm a")}</strong>
              {' '}before the assessment window opened at{' '}
              <strong>{format(new Date(assessmentWindowStart), "h:mm a")}</strong>.
              This submission has been nullified and does not count.
            </div>
            <div className="mt-2 text-xs text-red-700 font-medium">
              ℹ️ You can submit again during the assessment window.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card variant for detailed view
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 mb-1">
            Submission Invalidated
          </h4>
          <p className="text-sm text-red-800">
            Your previous submission has been automatically nullified by the system.
          </p>
        </div>
      </div>

      <div className="bg-white border border-red-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-red-600" />
          <span className="text-gray-700">You submitted at:</span>
          <span className="font-semibold text-gray-900">
            {format(new Date(originalSubmissionTime), "MMMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-red-600" />
          <span className="text-gray-700">Assessment window opened at:</span>
          <span className="font-semibold text-gray-900">
            {format(new Date(assessmentWindowStart), "MMMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      </div>

      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-900 mb-1">
              Why was this nullified?
            </p>
            <p className="text-xs text-amber-800">
              To ensure fairness, all students must submit assessments during the designated time window. 
              Submissions made before the window opens are not counted. You may resubmit during the valid assessment period.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-red-700 font-medium text-center">
        {nullifiedReason}
      </div>
    </div>
  );
}

// Compact version for use in lists
export function NullifiedBadge() {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 border border-red-300 rounded-full text-xs font-medium">
      <XCircle className="h-3 w-3" />
      <span>Nullified</span>
    </div>
  );
}