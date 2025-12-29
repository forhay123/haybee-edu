// ============================================================
// FILE: countdownTimer.tsx
// Location: frontend/src/components/ui/countdownTimer.tsx
// ============================================================

import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAssessmentCountdown } from '../../features/assessments/hooks/useAssessmentPolling';

interface CountdownTimerProps {
  endTime: string | null | undefined;
  onExpire?: () => void;
  showIcon?: boolean;
  showLabel?: boolean;
  warningThreshold?: number; // minutes
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Real-time countdown timer component
 * Updates every second and shows warning when time is running out
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  onExpire,
  showIcon = true,
  showLabel = true,
  warningThreshold = 5,
  className = '',
  size = 'md'
}) => {
  const countdown = useAssessmentCountdown(endTime, true);

  // Call onExpire callback when timer expires
  React.useEffect(() => {
    if (countdown.isExpired && onExpire) {
      onExpire();
    }
  }, [countdown.isExpired, onExpire]);

  if (!endTime) {
    return null;
  }

  const isWarning = countdown.minutes < warningThreshold && !countdown.isExpired;
  const Icon = isWarning ? AlertTriangle : Clock;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-lg';
      case 'md':
      default:
        return 'text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-5 h-5';
      case 'md':
      default:
        return 'w-4 h-4';
    }
  };

  if (countdown.isExpired) {
    return (
      <div className={`flex items-center gap-2 text-red-600 font-semibold ${getSizeClasses()} ${className}`}>
        {showIcon && <Clock className={getIconSize()} />}
        <span>Time Expired</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${isWarning ? 'text-orange-600' : 'text-gray-700'} ${getSizeClasses()} ${className}`}>
      {showIcon && <Icon className={`${getIconSize()} ${isWarning ? 'animate-pulse' : ''}`} />}
      <div className="flex items-baseline gap-1">
        {showLabel && <span className="font-medium">Time left:</span>}
        <span className={`font-mono font-bold ${isWarning ? 'text-orange-700' : ''}`}>
          {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

/**
 * Compact countdown (numbers only)
 */
export const CompactCountdown: React.FC<{
  endTime: string | null | undefined;
  className?: string;
}> = ({ endTime, className = '' }) => {
  return (
    <CountdownTimer 
      endTime={endTime}
      showIcon={false}
      showLabel={false}
      size="sm"
      className={className}
    />
  );
};

/**
 * Countdown with progress bar
 */
export const CountdownWithProgress: React.FC<{
  endTime: string | null | undefined;
  startTime: string | null | undefined;
  className?: string;
}> = ({ endTime, startTime, className = '' }) => {
  const countdown = useAssessmentCountdown(endTime, true);

  if (!endTime || !startTime) {
    return null;
  }

  const totalSeconds = Math.floor(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
  );
  const remainingSeconds = countdown.totalSeconds;
  const progress = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  const getProgressColor = () => {
    if (progress < 20) return 'bg-red-500';
    if (progress < 40) return 'bg-orange-500';
    if (progress < 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <CountdownTimer endTime={endTime} />
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Countdown badge (for inline display)
 */
export const CountdownBadge: React.FC<{
  endTime: string | null | undefined;
  className?: string;
}> = ({ endTime, className = '' }) => {
  const countdown = useAssessmentCountdown(endTime, true);

  if (!endTime) return null;

  const isWarning = countdown.minutes < 5 && !countdown.isExpired;

  const getBadgeClasses = () => {
    if (countdown.isExpired) {
      return 'bg-red-100 text-red-700 border border-red-300';
    }
    if (isWarning) {
      return 'bg-orange-100 text-orange-700 border border-orange-300';
    }
    return 'bg-blue-100 text-blue-700 border border-blue-300';
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getBadgeClasses()} ${className}`}>
      <Clock className="w-3 h-3" />
      {countdown.isExpired ? (
        'Expired'
      ) : (
        <span className="font-mono">
          {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')}
        </span>
      )}
    </span>
  );
};

/**
 * Large countdown display (for assessment page)
 */
export const LargeCountdown: React.FC<{
  endTime: string | null | undefined;
  title?: string;
  className?: string;
  onExpire?: () => void;
}> = ({ endTime, title = 'Time Remaining', className = '' }) => {
  const countdown = useAssessmentCountdown(endTime, true);

  if (!endTime) return null;

  const isWarning = countdown.minutes < 5 && !countdown.isExpired;

  const getContainerClasses = () => {
    if (countdown.isExpired) {
      return 'bg-red-50 border-red-300';
    }
    if (isWarning) {
      return 'bg-orange-50 border-orange-300';
    }
    return 'bg-blue-50 border-blue-300';
  };

  const getTitleClasses = () => {
    if (countdown.isExpired) return 'text-red-700';
    if (isWarning) return 'text-orange-700';
    return 'text-blue-700';
  };

  const getTimeClasses = () => {
    if (isWarning) return 'text-orange-700';
    return 'text-blue-700';
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${getContainerClasses()} ${className}`}>
      <div className="text-center">
        <div className={`text-sm font-medium mb-2 ${getTitleClasses()}`}>
          {title}
        </div>
        {countdown.isExpired ? (
          <div className="text-3xl font-bold text-red-600">
            Time Expired
          </div>
        ) : (
          <div className={`text-5xl font-mono font-bold ${getTimeClasses()}`}>
            {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')}
          </div>
        )}
        {isWarning && !countdown.isExpired && (
          <div className="mt-2 text-xs text-orange-600 font-medium">
            ⚠️ Less than 5 minutes remaining!
          </div>
        )}
      </div>
    </div>
  );
};

export default CountdownTimer;