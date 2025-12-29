// ============================================================
// FILE 1: assessmentStatusBadge.tsx
// Location: frontend/src/components/ui/assessmentStatusBadge.tsx
// ============================================================

import React from 'react';
import { CustomBadge as Badge } from './custom-badge';
import { Lock, Unlock, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { AccessCheckResult } from '../../features/assessments/types/assessmentTypes';

interface AssessmentStatusBadgeProps {
  accessData: AccessCheckResult | null | undefined;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Badge component to display assessment access status
 * Shows different colors and icons based on access state
 */
export const AssessmentStatusBadge: React.FC<AssessmentStatusBadgeProps> = ({
  accessData,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  // Loading state
  if (!accessData) {
    return (
      <Badge variant="outline" className={`${getSizeClasses(size)} ${className}`}>
        {showIcon && <Clock className="w-3 h-3 mr-1" />}
        <span>Loading...</span>
      </Badge>
    );
  }

  // Already submitted
  if (accessData.alreadySubmitted) {
    return (
      <Badge 
        variant="outline" 
        className={`bg-green-50 text-green-700 border-green-300 ${getSizeClasses(size)} ${className}`}
      >
        {showIcon && <CheckCircle className="w-3 h-3 mr-1" />}
        <span>Submitted</span>
      </Badge>
    );
  }

  // Available (can access)
  if (accessData.canAccess) {
    // In grace period
    if (accessData.gracePeriodActive) {
      return (
        <Badge 
          variant="outline" 
          className={`bg-yellow-50 text-yellow-700 border-yellow-300 ${getSizeClasses(size)} ${className}`}
        >
          {showIcon && <AlertCircle className="w-3 h-3 mr-1" />}
          <span>Grace Period</span>
        </Badge>
      );
    }

    // Normal available state
    return (
      <Badge 
        variant="outline" 
        className={`bg-blue-50 text-blue-700 border-blue-300 ${getSizeClasses(size)} ${className}`}
      >
        {showIcon && <Unlock className="w-3 h-3 mr-1" />}
        <span>Available</span>
      </Badge>
    );
  }

  // Locked (not available yet or expired)
  const isNotYetOpen = (accessData.minutesUntilOpen ?? 0) > 0;
  
  return (
    <Badge 
      variant="outline" 
      className={`bg-red-50 text-red-700 border-red-300 ${getSizeClasses(size)} ${className}`}
    >
      {showIcon && <Lock className="w-3 h-3 mr-1" />}
      <span>{isNotYetOpen ? 'Locked' : 'Expired'}</span>
    </Badge>
  );
};

/**
 * Simple text-only status badge (no icons)
 */
export const AssessmentStatusText: React.FC<{
  accessData: AccessCheckResult | null | undefined;
  className?: string;
}> = ({ accessData, className = '' }) => {
  return (
    <AssessmentStatusBadge 
      accessData={accessData} 
      showIcon={false} 
      className={className}
    />
  );
};

/**
 * Compact status indicator (icon only)
 */
export const AssessmentStatusIcon: React.FC<{
  accessData: AccessCheckResult | null | undefined;
  size?: number;
  className?: string;
}> = ({ accessData, size = 16, className = '' }) => {
  if (!accessData) {
    return <Clock className={className} style={{ width: size, height: size }} />;
  }

  if (accessData.alreadySubmitted) {
    return <CheckCircle className={`text-green-600 ${className}`} style={{ width: size, height: size }} />;
  }

  if (accessData.canAccess) {
    if (accessData.gracePeriodActive) {
      return <AlertCircle className={`text-yellow-600 ${className}`} style={{ width: size, height: size }} />;
    }
    return <Unlock className={`text-blue-600 ${className}`} style={{ width: size, height: size }} />;
  }

  return <Lock className={`text-red-600 ${className}`} style={{ width: size, height: size }} />;
};

/**
 * Detailed status badge with time information
 */
export const AssessmentStatusDetailed: React.FC<{
  accessData: AccessCheckResult | null | undefined;
  className?: string;
}> = ({ accessData, className = '' }) => {
  if (!accessData) {
    return <AssessmentStatusBadge accessData={accessData} className={className} />;
  }

  const getDetailText = () => {
    if (accessData.alreadySubmitted) {
      return 'Submitted';
    }

    if (accessData.canAccess) {
      const remaining = accessData.minutesRemaining ?? 0;
      if (accessData.gracePeriodActive) {
        return `Grace: ${remaining}m left`;
      }
      return `Available: ${remaining}m left`;
    }

    if ((accessData.minutesUntilOpen ?? 0) > 0) {
      return `Opens in ${accessData.minutesUntilOpen}m`;
    }

    return 'Expired';
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getStatusColor(accessData)} ${className}`}
    >
      <AssessmentStatusIcon accessData={accessData} size={14} className="mr-1.5" />
      <span className="text-xs font-medium">{getDetailText()}</span>
    </Badge>
  );
};

// Helper functions
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'text-xs px-2 py-0.5';
    case 'lg':
      return 'text-base px-3 py-1.5';
    case 'md':
    default:
      return 'text-sm px-2.5 py-1';
  }
}

function getStatusColor(accessData: AccessCheckResult): string {
  if (accessData.alreadySubmitted) {
    return 'bg-green-50 text-green-700 border-green-300';
  }

  if (accessData.canAccess) {
    if (accessData.gracePeriodActive) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-300';
    }
    return 'bg-blue-50 text-blue-700 border-blue-300';
  }

  return 'bg-red-50 text-red-700 border-red-300';
}

export default AssessmentStatusBadge;