// ============================================================
// FILE: AssessmentCountdownTimer.tsx
// Location: frontend/src/features/assessments/components/AssessmentCountdownTimer.tsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { LargeCountdown, CountdownTimer, CountdownBadge } from '../../../components/ui/countdownTimer';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import { AlertTriangle, Clock, Bell } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface AssessmentCountdownTimerProps {
  assessmentId: number;
  studentProfileId: number;
  variant?: 'large' | 'standard' | 'compact' | 'badge';
  onTimeExpired?: () => void;
  onWarning?: (minutesLeft: number) => void;
  warningThreshold?: number;
  showWarningAlert?: boolean;
  className?: string;
}

/**
 * Specialized countdown timer for assessments
 * Integrates with assessment access checking and provides warnings
 */
export const AssessmentCountdownTimer: React.FC<AssessmentCountdownTimerProps> = ({
  assessmentId,
  studentProfileId,
  variant = 'standard',
  onTimeExpired,
  onWarning,
  warningThreshold = 5,
  showWarningAlert = true,
  className = ''
}) => {
  const { accessData, canAccess } = useAssessmentAccess(assessmentId, studentProfileId);
  const [hasWarned, setHasWarned] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Check for warning threshold
  useEffect(() => {
    if (accessData?.minutesRemaining && accessData.minutesRemaining <= warningThreshold && !hasWarned) {
      setHasWarned(true);
      if (onWarning) {
        onWarning(accessData.minutesRemaining);
      }
    }
  }, [accessData?.minutesRemaining, warningThreshold, hasWarned, onWarning]);

  // Don't show if not accessible or no end time
  if (!canAccess || !accessData?.windowEnd) {
    return null;
  }

  const isWarning = (accessData.minutesRemaining ?? 0) <= warningThreshold;

  // Large variant - for main assessment page
  if (variant === 'large') {
    return (
      <div className={className}>
        <LargeCountdown
          endTime={accessData.windowEnd}
          title="Time Remaining"
          onExpire={onTimeExpired}
        />
        {isWarning && showWarningAlert && !warningDismissed && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-300 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-1">Time Running Out!</h4>
                <p className="text-sm text-orange-800">
                  You have less than {warningThreshold} minutes remaining. Make sure to submit your answers before time expires.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWarningDismissed(true)}
                className="text-orange-600 hover:text-orange-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Badge variant - minimal display
  if (variant === 'badge') {
    return (
      <CountdownBadge
        endTime={accessData.windowEnd}
        className={className}
      />
    );
  }

  // Compact variant - small display
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock className={`w-4 h-4 ${isWarning ? 'text-orange-600' : 'text-gray-600'}`} />
        <CountdownTimer
          endTime={accessData.windowEnd}
          size="sm"
          showIcon={false}
          showLabel={false}
          onExpire={onTimeExpired}
        />
      </div>
    );
  }

  // Standard variant - default display
  return (
    <div className={`p-4 bg-white border rounded-lg ${isWarning ? 'border-orange-300' : 'border-gray-200'} ${className}`}>
      <CountdownTimer
        endTime={accessData.windowEnd}
        warningThreshold={warningThreshold}
        onExpire={onTimeExpired}
      />
      {isWarning && showWarningAlert && (
        <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
          <Bell className="w-3 h-3" />
          <span>Hurry! Time is running out</span>
        </div>
      )}
    </div>
  );
};

/**
 * Floating countdown timer (sticks to screen)
 */
export const FloatingAssessmentTimer: React.FC<{
  assessmentId: number;
  studentProfileId: number;
  onTimeExpired?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}> = ({ assessmentId, studentProfileId, onTimeExpired, position = 'top-right' }) => {
  const { accessData, canAccess } = useAssessmentAccess(assessmentId, studentProfileId);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!canAccess || !accessData?.windowEnd) {
    return null;
  }

  const isWarning = (accessData.minutesRemaining ?? 0) <= 5;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div 
      className={`fixed z-50 ${positionClasses[position]}`}
      style={{ transition: 'all 0.3s ease' }}
    >
      <div 
        className={`${
          isWarning ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-300'
        } border-2 rounded-lg shadow-lg ${isExpanded ? 'p-4' : 'p-2'}`}
      >
        {isExpanded ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-gray-700">Assessment Timer</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Minimize
              </button>
            </div>
            <CountdownTimer
              endTime={accessData.windowEnd}
              size="md"
              warningThreshold={5}
              onExpire={onTimeExpired}
            />
            {isWarning && (
              <div className="text-xs text-orange-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Hurry!</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2"
          >
            <Clock className={`w-4 h-4 ${isWarning ? 'text-orange-600' : 'text-blue-600'}`} />
            <CountdownBadge endTime={accessData.windowEnd} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Timer with progress bar
 */
export const AssessmentTimerWithProgress: React.FC<{
  assessmentId: number;
  studentProfileId: number;
  onTimeExpired?: () => void;
  className?: string;
}> = ({ assessmentId, studentProfileId, onTimeExpired, className = '' }) => {
  const { accessData, canAccess } = useAssessmentAccess(assessmentId, studentProfileId);

  if (!canAccess || !accessData?.windowEnd || !accessData?.windowStart) {
    return null;
  }

  const totalSeconds = Math.floor(
    (new Date(accessData.windowEnd).getTime() - new Date(accessData.windowStart).getTime()) / 1000
  );
  
  const elapsedSeconds = Math.floor(
    (new Date().getTime() - new Date(accessData.windowStart).getTime()) / 1000
  );
  
  const progress = Math.min(100, (elapsedSeconds / totalSeconds) * 100);

  const getProgressColor = () => {
    if (progress > 80) return 'bg-red-500';
    if (progress > 60) return 'bg-orange-500';
    if (progress > 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Time Progress</span>
        <CountdownTimer
          endTime={accessData.windowEnd}
          size="sm"
          showIcon={false}
          onExpire={onTimeExpired}
        />
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default AssessmentCountdownTimer;