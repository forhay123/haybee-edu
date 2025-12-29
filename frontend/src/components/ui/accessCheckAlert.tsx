// ============================================================
// FILE: accessCheckAlert.tsx
// Location: frontend/src/components/ui/accessCheckAlert.tsx
// ============================================================

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Lock, Unlock, CheckCircle, AlertTriangle, Clock, Info } from 'lucide-react';
import type { AccessCheckResult } from '../../features/assessments/types/assessmentTypes';
import { formatTime, formatDate } from '../../features/assessments/utils/accessCheckUtils';
import { CountdownTimer } from './countdownTimer';

interface AccessCheckAlertProps {
  accessData: AccessCheckResult | null | undefined;
  showCountdown?: boolean;
  showTimeWindow?: boolean;
  className?: string;
  onRetry?: () => void;
}

/**
 * Alert component that displays assessment access status information
 * Shows different variants based on access state with appropriate styling
 */
export const AccessCheckAlert: React.FC<AccessCheckAlertProps> = ({
  accessData,
  showCountdown = true,
  showTimeWindow = true,
  className = '',
  onRetry
}) => {
  // Loading state
  if (!accessData) {
    return (
      <Alert className={`border-blue-300 bg-blue-50 ${className}`}>
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Checking Access...</AlertTitle>
        <AlertDescription className="text-blue-700">
          Please wait while we verify your assessment access.
        </AlertDescription>
      </Alert>
    );
  }

  // Already submitted
  if (accessData.alreadySubmitted) {
    return (
      <Alert className={`border-green-300 bg-green-50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Assessment Completed</AlertTitle>
        <AlertDescription className="text-green-700">
          You have already submitted this assessment. Check your results to see your score.
        </AlertDescription>
      </Alert>
    );
  }

  // Can access - show countdown if enabled
  if (accessData.canAccess) {
    const isGracePeriod = accessData.gracePeriodActive;
    const Icon = isGracePeriod ? AlertTriangle : Unlock;

    return (
      <Alert className={`${isGracePeriod ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'} ${className}`}>
        <Icon className={`h-4 w-4 ${isGracePeriod ? 'text-yellow-600' : 'text-green-600'}`} />
        <AlertTitle className={isGracePeriod ? 'text-yellow-900' : 'text-green-900'}>
          {isGracePeriod ? 'Grace Period Active' : 'Assessment Available'}
        </AlertTitle>
        <AlertDescription className={isGracePeriod ? 'text-yellow-700' : 'text-green-700'}>
          {isGracePeriod ? (
            <>
              You are in the grace period. Complete and submit before time runs out!
              {showCountdown && accessData.windowEnd && (
                <div className="mt-3">
                  <CountdownTimer endTime={accessData.windowEnd} warningThreshold={5} />
                </div>
              )}
            </>
          ) : (
            <>
              You can now take this assessment.
              {showCountdown && accessData.windowEnd && (
                <div className="mt-3">
                  <CountdownTimer endTime={accessData.windowEnd} warningThreshold={10} />
                </div>
              )}
            </>
          )}
          
          {showTimeWindow && accessData.windowStart && accessData.windowEnd && (
            <div className="mt-3 text-xs space-y-1">
              <div>Window: {formatTime(accessData.windowStart)} - {formatTime(accessData.windowEnd)}</div>
              <div>Date: {formatDate(accessData.windowStart)}</div>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Not yet available
  if ((accessData.minutesUntilOpen ?? 0) > 0) {
    return (
      <Alert className={`border-blue-300 bg-blue-50 ${className}`}>
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Assessment Not Yet Available</AlertTitle>
        <AlertDescription className="text-blue-700">
          <div>This assessment will be available in {accessData.minutesUntilOpen} minutes.</div>
          
          {showTimeWindow && accessData.windowStart && accessData.windowEnd && (
            <div className="mt-3 text-xs space-y-1">
              <div>Opens at: {formatTime(accessData.windowStart)}</div>
              <div>Closes at: {formatTime(accessData.windowEnd)}</div>
              <div>Date: {formatDate(accessData.windowStart)}</div>
            </div>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-xs font-medium text-blue-700 hover:text-blue-900 underline"
            >
              Check again
            </button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Expired or locked
  return (
    <Alert className={`border-red-300 bg-red-50 ${className}`}>
      <Lock className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-900">Assessment Unavailable</AlertTitle>
      <AlertDescription className="text-red-700">
        <div>{accessData.reason || 'This assessment is no longer available.'}</div>
        
        {showTimeWindow && accessData.windowStart && accessData.windowEnd && (
          <div className="mt-3 text-xs space-y-1">
            <div>Window was: {formatTime(accessData.windowStart)} - {formatTime(accessData.windowEnd)}</div>
            <div>Date: {formatDate(accessData.windowStart)}</div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

/**
 * Compact inline alert (for cards/lists)
 */
export const CompactAccessAlert: React.FC<{
  accessData: AccessCheckResult | null | undefined;
  className?: string;
}> = ({ accessData, className = '' }) => {
  if (!accessData) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <Clock className="w-4 h-4" />
        <span>Checking access...</span>
      </div>
    );
  }

  if (accessData.alreadySubmitted) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
        <CheckCircle className="w-4 h-4" />
        <span>Completed</span>
      </div>
    );
  }

  if (accessData.canAccess) {
    return (
      <div className={`flex items-center gap-2 text-sm ${accessData.gracePeriodActive ? 'text-yellow-600' : 'text-green-600'} ${className}`}>
        {accessData.gracePeriodActive ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Unlock className="w-4 h-4" />
        )}
        <span>{accessData.gracePeriodActive ? 'Grace Period' : 'Available'}</span>
      </div>
    );
  }

  if ((accessData.minutesUntilOpen ?? 0) > 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-blue-600 ${className}`}>
        <Lock className="w-4 h-4" />
        <span>Opens in {accessData.minutesUntilOpen}m</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
      <Lock className="w-4 h-4" />
      <span>Unavailable</span>
    </div>
  );
};

/**
 * Simple info alert (for general information)
 */
export const AccessInfoAlert: React.FC<{
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}> = ({ title, message, type = 'info', className = '' }) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'border-green-300 bg-green-50',
          icon: 'text-green-600',
          title: 'text-green-900',
          desc: 'text-green-700',
          Icon: CheckCircle
        };
      case 'warning':
        return {
          container: 'border-yellow-300 bg-yellow-50',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          desc: 'text-yellow-700',
          Icon: AlertTriangle
        };
      case 'error':
        return {
          container: 'border-red-300 bg-red-50',
          icon: 'text-red-600',
          title: 'text-red-900',
          desc: 'text-red-700',
          Icon: Lock
        };
      case 'info':
      default:
        return {
          container: 'border-blue-300 bg-blue-50',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          desc: 'text-blue-700',
          Icon: Info
        };
    }
  };

  const styles = getStyles();

  return (
    <Alert className={`${styles.container} ${className}`}>
      <styles.Icon className={`h-4 w-4 ${styles.icon}`} />
      <AlertTitle className={styles.title}>{title}</AlertTitle>
      <AlertDescription className={styles.desc}>{message}</AlertDescription>
    </Alert>
  );
};

export default AccessCheckAlert;