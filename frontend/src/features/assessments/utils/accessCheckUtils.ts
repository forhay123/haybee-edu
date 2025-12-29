// ============================================================
// FILE 7: UPDATE accessCheckUtils.ts (NEW)
// Location: frontend/src/features/assessments/utils/accessCheckUtils.ts
// ============================================================

import type { AccessCheckResult } from '../types/assessmentTypes';

/**
 * Format time for display
 */
export const formatTime = (isoDateTime: string | null | undefined): string => {
  if (!isoDateTime) return 'N/A';
  
  try {
    const date = new Date(isoDateTime);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return 'Invalid time';
  }
};

/**
 * Format date for display
 */
export const formatDate = (isoDateTime: string | null | undefined): string => {
  if (!isoDateTime) return 'N/A';
  
  try {
    const date = new Date(isoDateTime);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Get status badge styling based on access result
 */
export const getAccessStatusStyle = (accessData: AccessCheckResult | null | undefined) => {
  if (!accessData) {
    return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', badge: 'bg-gray-200' };
  }

  if (accessData.alreadySubmitted) {
    return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', badge: 'bg-green-200' };
  }

  if (accessData.canAccess) {
    return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-200' };
  }

  if (accessData.gracePeriodActive) {
    return { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-200' };
  }

  return { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-200' };
};

/**
 * Get human-readable access status message
 */
export const getAccessStatusMessage = (accessData: AccessCheckResult | null | undefined): string => {
  if (!accessData) return 'Loading...';

  if (accessData.alreadySubmitted) {
    return 'Already submitted';
  }

  if (accessData.canAccess) {
    return accessData.gracePeriodActive 
      ? `In grace period (${accessData.minutesRemaining} min remaining)`
      : `Available (${accessData.minutesRemaining} min remaining)`;
  }

  if (accessData.minutesUntilOpen !== undefined && accessData.minutesUntilOpen > 0) {
    return `Opens in ${accessData.minutesUntilOpen} minutes`;
  }

  return accessData.reason || 'Not available';
};

/**
 * Check if should show warning (last 5 minutes)
 */
export const shouldShowWarning = (minutesRemaining: number | null | undefined): boolean => {
  return minutesRemaining !== null && minutesRemaining !== undefined && minutesRemaining <= 5 && minutesRemaining > 0;
};

/**
 * Format countdown display as MM:SS
 */
export const formatCountdown = (minutes: number, seconds: number): string => {
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get icon name based on access status
 */
export const getAccessStatusIcon = (accessData: AccessCheckResult | null | undefined): string => {
  if (!accessData) return 'clock';

  if (accessData.alreadySubmitted) return 'check-circle';
  if (accessData.canAccess) return 'unlock';
  if (accessData.gracePeriodActive) return 'alert-circle';
  return 'lock';
};