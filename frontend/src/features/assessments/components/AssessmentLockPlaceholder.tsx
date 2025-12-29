// ============================================================
// FILE 4: AssessmentLockPlaceholder.tsx
// Location: frontend/src/features/assessments/components/AssessmentLockPlaceholder.tsx
// ============================================================

import React from 'react';
import { Lock, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import { formatTime, formatDate } from '../utils/accessCheckUtils';
import type { AccessCheckResult } from '../types/assessmentTypes';

interface AssessmentLockPlaceholderProps {
  assessmentId: number;
  studentProfileId: number;
  assessmentTitle?: string;
  onRefresh?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

/**
 * Full-page placeholder shown when assessment is locked or unavailable
 * Displays appropriate message and actions based on access status
 */
export const AssessmentLockPlaceholder: React.FC<AssessmentLockPlaceholderProps> = ({
  assessmentId,
  studentProfileId,
  assessmentTitle = 'Assessment',
  onRefresh,
  showBackButton = true,
  onBack,
  className = ''
}) => {
  const { accessData, refetch, isRefetching } = useAssessmentAccess(assessmentId, studentProfileId);

  const handleRefresh = () => {
    refetch();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (!accessData) {
    return <LoadingPlaceholder />;
  }

  if (accessData.alreadySubmitted) {
    return <SubmittedPlaceholder onBack={onBack} showBackButton={showBackButton} />;
  }

  if (accessData.canAccess) {
    return null; // Don't show placeholder if accessible
  }

  const isNotYetOpen = (accessData.minutesUntilOpen ?? 0) > 0;

  return (
    <div className={`flex items-center justify-center min-h-screen bg-gray-50 p-6 ${className}`}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Icon */}
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isNotYetOpen ? 'bg-blue-100' : 'bg-red-100'
        }`}>
          <Lock className={`w-8 h-8 ${isNotYetOpen ? 'text-blue-600' : 'text-red-600'}`} />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isNotYetOpen ? 'Assessment Not Yet Available' : 'Assessment Unavailable'}
        </h2>

        {/* Assessment Name */}
        <p className="text-gray-600 mb-4">{assessmentTitle}</p>

        {/* Message */}
        <div className="mb-6">
          {isNotYetOpen ? (
            <div className="space-y-3">
              <p className="text-gray-700">
                This assessment will be available in <strong>{accessData.minutesUntilOpen} minutes</strong>.
              </p>
              {accessData.windowStart && (
                <div className="p-4 bg-blue-50 rounded-lg text-sm space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-900">Opens at: <strong>{formatTime(accessData.windowStart)}</strong></span>
                  </div>
                  <div className="text-blue-700">
                    {formatDate(accessData.windowStart)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-700">
                {accessData.reason || 'This assessment is no longer available.'}
              </p>
              {accessData.windowEnd && (
                <div className="p-4 bg-red-50 rounded-lg text-sm">
                  <p className="text-red-900">
                    The assessment window has closed.
                  </p>
                  <p className="text-red-700 mt-1">
                    Closed at: {formatTime(accessData.windowEnd)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isNotYetOpen && (
            <Button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="w-full"
            >
              {isRefetching ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Check Again
                </>
              )}
            </Button>
          )}
          
          {showBackButton && (
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full"
            >
              Back to Assessments
            </Button>
          )}
        </div>

        {/* Help Text */}
        {isNotYetOpen && (
          <p className="mt-6 text-xs text-gray-500">
            This page will automatically refresh when the assessment becomes available.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Loading placeholder
 */
const LoadingPlaceholder: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <Clock className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
      <p className="text-gray-600">Checking assessment access...</p>
    </div>
  </div>
);

/**
 * Submitted placeholder
 */
const SubmittedPlaceholder: React.FC<{
  onBack?: () => void;
  showBackButton?: boolean;
}> = ({ onBack, showBackButton }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Completed</h2>
      <p className="text-gray-600 mb-6">
        You have already submitted this assessment. Check your results to see how you did.
      </p>
      {showBackButton && (
        <Button onClick={onBack} className="w-full">
          View Results
        </Button>
      )}
    </div>
  </div>
);

/**
 * Inline lock indicator (for cards/lists)
 */
export const InlineLockIndicator: React.FC<{
  accessData: AccessCheckResult | null | undefined;
  className?: string;
}> = ({ accessData, className = '' }) => {
  if (!accessData || accessData.canAccess || accessData.alreadySubmitted) {
    return null;
  }

  const isNotYetOpen = (accessData.minutesUntilOpen ?? 0) > 0;

  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200 ${className}`}>
      <Lock className="w-4 h-4 text-gray-600" />
      <span className="text-sm text-gray-700">
        {isNotYetOpen 
          ? `Opens in ${accessData.minutesUntilOpen}m`
          : 'Unavailable'
        }
      </span>
    </div>
  );
};

/**
 * Card lock overlay (for assessment cards)
 */
export const CardLockOverlay: React.FC<{
  accessData: AccessCheckResult | null | undefined;
  onCheckAgain?: () => void;
  className?: string;
}> = ({ accessData, onCheckAgain, className = '' }) => {
  if (!accessData || accessData.canAccess || accessData.alreadySubmitted) {
    return null;
  }

  const isNotYetOpen = (accessData.minutesUntilOpen ?? 0) > 0;

  return (
    <div className={`absolute inset-0 bg-gray-900 bg-opacity-60 rounded-lg flex items-center justify-center ${className}`}>
      <div className="text-center text-white p-6">
        <Lock className="w-12 h-12 mx-auto mb-3" />
        <p className="font-semibold mb-2">
          {isNotYetOpen ? 'Not Yet Available' : 'Unavailable'}
        </p>
        {isNotYetOpen && (
          <p className="text-sm mb-3">Opens in {accessData.minutesUntilOpen} minutes</p>
        )}
        {onCheckAgain && isNotYetOpen && (
          <Button size="sm" variant="outline" onClick={onCheckAgain} className="text-white border-white hover:bg-white hover:text-gray-900">
            <Clock className="w-3 h-3 mr-1" />
            Check Status
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Banner notification for locked assessment
 */
export const LockBanner: React.FC<{
  accessData: AccessCheckResult | null | undefined;
  onDismiss?: () => void;
  className?: string;
}> = ({ accessData, onDismiss, className = '' }) => {
  if (!accessData || accessData.canAccess || accessData.alreadySubmitted) {
    return null;
  }

  const isNotYetOpen = (accessData.minutesUntilOpen ?? 0) > 0;

  return (
    <div className={`p-4 border-l-4 ${
      isNotYetOpen ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'
    } rounded ${className}`}>
      <div className="flex items-start gap-3">
        <Info className={`w-5 h-5 flex-shrink-0 ${
          isNotYetOpen ? 'text-blue-600' : 'text-red-600'
        }`} />
        <div className="flex-1">
          <p className={`font-medium ${
            isNotYetOpen ? 'text-blue-900' : 'text-red-900'
          }`}>
            {isNotYetOpen ? 'Assessment Scheduled' : 'Assessment Unavailable'}
          </p>
          <p className={`text-sm mt-1 ${
            isNotYetOpen ? 'text-blue-700' : 'text-red-700'
          }`}>
            {isNotYetOpen 
              ? `This assessment will be available in ${accessData.minutesUntilOpen} minutes.`
              : (accessData.reason || 'This assessment is no longer available.')
            }
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default AssessmentLockPlaceholder;