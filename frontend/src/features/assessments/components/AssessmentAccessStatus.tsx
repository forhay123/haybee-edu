// ============================================================
// FILE: AssessmentAccessStatus.tsx
// Location: frontend/src/features/assessments/components/AssessmentAccessStatus.tsx
// ============================================================

import React from 'react';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import { CompactAccessAlert } from '../../../components/ui/accessCheckAlert';
import { AssessmentStatusDetailed } from '../../../components/ui/assessmentStatusBadge';
import { CountdownBadge } from '../../../components/ui/countdownTimer';
import { formatTime, formatDate } from '../utils/accessCheckUtils';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

interface AssessmentAccessStatusProps {
  assessmentId: number;
  studentProfileId: number;
  variant?: 'full' | 'compact' | 'minimal';
  showCountdown?: boolean;
  showTimeWindow?: boolean;
  className?: string;
}

/**
 * Component to display assessment access status in various formats
 * Automatically polls for real-time updates
 */
export const AssessmentAccessStatus: React.FC<AssessmentAccessStatusProps> = ({
  assessmentId,
  studentProfileId,
  variant = 'full',
  showCountdown = true,
  showTimeWindow = true,
  className = ''
}) => {
  const { accessData, isLoading } = useAssessmentAccess(assessmentId, studentProfileId);

  // Minimal variant - just badge
  if (variant === 'minimal') {
    return (
      <div className={className}>
        <AssessmentStatusDetailed accessData={accessData} />
      </div>
    );
  }

  // Compact variant - inline status
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <CompactAccessAlert accessData={accessData} />
        {showCountdown && accessData?.canAccess && accessData?.windowEnd && (
          <CountdownBadge endTime={accessData.windowEnd} />
        )}
      </div>
    );
  }

  // Full variant - detailed status display
  if (isLoading || !accessData) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Checking access status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gray-50 rounded-lg space-y-3 ${className}`}>
      {/* Status Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900 mb-1">Access Status</h4>
          <CompactAccessAlert accessData={accessData} />
        </div>
        <AssessmentStatusDetailed accessData={accessData} />
      </div>

      {/* Countdown Timer */}
      {showCountdown && accessData.canAccess && accessData.windowEnd && (
        <div className="p-3 bg-white border border-gray-200 rounded">
          <CountdownBadge endTime={accessData.windowEnd} />
        </div>
      )}

      {/* Time Window Information */}
      {showTimeWindow && (accessData.windowStart || accessData.windowEnd) && (
        <div className="space-y-2 text-sm">
          {accessData.windowStart && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Opens:</span>
              <span>{formatTime(accessData.windowStart)}</span>
            </div>
          )}
          {accessData.windowEnd && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Closes:</span>
              <span>{formatTime(accessData.windowEnd)}</span>
            </div>
          )}
          {accessData.windowStart && (
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Date:</span>
              <span>{formatDate(accessData.windowStart)}</span>
            </div>
          )}
        </div>
      )}

      {/* Grace Period Warning */}
      {accessData.gracePeriodActive && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-800">
            <strong>Grace Period:</strong> You have {accessData.minutesRemaining} minutes remaining to complete and submit.
          </div>
        </div>
      )}

      {/* Minutes Until Open */}
      {!accessData.canAccess && (accessData.minutesUntilOpen ?? 0) > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <Clock className="w-4 h-4" />
          <span>Opens in <strong>{accessData.minutesUntilOpen} minutes</strong></span>
        </div>
      )}

      {/* Reason (if locked) */}
      {!accessData.canAccess && !accessData.alreadySubmitted && accessData.reason && (
        <div className="text-xs text-gray-600 italic">
          {accessData.reason}
        </div>
      )}
    </div>
  );
};

/**
 * Inline status for use in tables or lists
 */
export const InlineAssessmentStatus: React.FC<{
  assessmentId: number;
  studentProfileId: number;
  showTime?: boolean;
  className?: string;
}> = ({ assessmentId, studentProfileId, showTime = false, className = '' }) => {
  const { accessData } = useAssessmentAccess(assessmentId, studentProfileId);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <AssessmentStatusDetailed accessData={accessData} />
      {showTime && accessData?.canAccess && accessData?.windowEnd && (
        <span className="text-xs text-gray-600">
          • {formatTime(accessData.windowEnd)}
        </span>
      )}
    </div>
  );
};

/**
 * Status summary for dashboard widgets
 */
export const AssessmentStatusSummary: React.FC<{
  assessmentId: number;
  studentProfileId: number;
  className?: string;
}> = ({ assessmentId, studentProfileId, className = '' }) => {
  const { accessData, canAccess, isAlreadySubmitted, minutesRemaining, minutesUntilOpen } = useAssessmentAccess(
    assessmentId,
    studentProfileId
  );

  if (!accessData) {
    return null;
  }

  const getStatusMessage = () => {
    if (isAlreadySubmitted) {
      return { text: 'Completed', color: 'text-green-600' };
    }
    if (canAccess) {
      const remaining = minutesRemaining ?? 0;
      return { 
        text: remaining < 10 ? `Urgent: ${remaining}m left` : `Available: ${remaining}m left`, 
        color: remaining < 10 ? 'text-orange-600' : 'text-blue-600' 
      };
    }
    if ((minutesUntilOpen ?? 0) > 0) {
      return { text: `Opens in ${minutesUntilOpen}m`, color: 'text-gray-600' };
    }
    return { text: 'Not Available', color: 'text-red-600' };
  };

  const status = getStatusMessage();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`text-sm font-medium ${status.color}`}>
        {status.text}
      </div>
    </div>
  );
};

export default AssessmentAccessStatus;