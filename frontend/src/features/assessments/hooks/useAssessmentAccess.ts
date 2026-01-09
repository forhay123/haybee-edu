// ============================================================
// FILE: useAssessmentAccess.ts (UPDATED - Better Expired Detection)
// Location: frontend/src/features/assessments/hooks/useAssessmentAccess.ts
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { scheduleValidationApi } from '../api/scheduleValidationApi';
import type { AccessCheckResult } from '../types/assessmentTypes';
import { isAlreadySubmitted } from '../types/assessmentTypes';

// ============================================================
// QUERY KEYS
// ============================================================

export const assessmentAccessKeys = {
  all: ['assessment-access'] as const,
  check: (assessmentId: number, studentId: number) => 
    [...assessmentAccessKeys.all, 'check', assessmentId, studentId] as const,
  status: (assessmentId: number, studentId: number) => 
    [...assessmentAccessKeys.all, 'status', assessmentId, studentId] as const,
};

// ============================================================
// MAIN HOOK: useAssessmentAccess
// ============================================================

/**
 * Hook to check and monitor assessment access in real-time
 * 
 * Features:
 * - Auto-polling every 30 seconds (configurable)
 * - Real-time countdown updates
 * - Status code handling (ALLOWED, NOT_YET_OPEN, EXPIRED, etc.)
 * - Grace period detection
 * 
 * @param assessmentId - ID of the assessment
 * @param studentProfileId - ID of the student profile
 * @param pollingInterval - Polling interval in milliseconds (default: 30000)
 */
export const useAssessmentAccess = (
  assessmentId: number,
  studentProfileId: number,
  pollingInterval: number = 30000
) => {
  const [minutesUntilOpen, setMinutesUntilOpen] = useState<number | null>(null);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  // Main query to check access
  const query = useQuery({
    queryKey: assessmentAccessKeys.check(assessmentId, studentProfileId),
    queryFn: () => 
      scheduleValidationApi.checkAssessmentAccess(assessmentId, studentProfileId),
    enabled: !!assessmentId && !!studentProfileId,
    refetchInterval: pollingInterval, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    staleTime: 5000, // Consider data fresh for 5 seconds
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Update state when query data changes
  useEffect(() => {
    if (query.data) {
      setMinutesUntilOpen(query.data.minutesUntilOpen ?? null);
      setMinutesRemaining(query.data.minutesRemaining ?? null);
    }
  }, [query.data]);

  // ✅ IMPROVED: Better status detection
  const alreadySubmitted = isAlreadySubmitted(query.data);
  const isExpired = query.data?.statusCode === 'EXPIRED';
  const isNotYetOpen = query.data?.statusCode === 'NOT_YET_OPEN';

  return {
    // React Query properties
    ...query,
    
    // Access data
    accessData: query.data,
    
    // Access flags
    canAccess: query.data?.canAccess ?? false,
    isLocked: isNotYetOpen, // ✅ FIXED: Locked = not yet open (not expired)
    isOpen: query.data?.canAccess && !alreadySubmitted,
    isAlreadySubmitted: alreadySubmitted,
    isExpired: isExpired, // ✅ FIXED: Better expired detection
    isNotYetOpen: isNotYetOpen, // ✅ NEW: Separate state for not-yet-open
    
    // Time tracking
    minutesUntilOpen,
    minutesRemaining,
    
    // Status code
    statusCode: query.data?.statusCode,
    
    // Window info
    windowStart: query.data?.windowStart,
    windowEnd: query.data?.windowEnd,
    
    // Grace period
    gracePeriodActive: query.data?.gracePeriodActive ?? false,
  };
};

// ============================================================
// GRACE PERIOD HOOK
// ============================================================

/**
 * Hook to check if assessment is in grace period
 * Grace period is typically the last 5 minutes before deadline
 * 
 * @param assessmentId - ID of the assessment
 * @param studentProfileId - ID of the student profile
 */
export const useIsInGracePeriod = (
  assessmentId: number,
  studentProfileId: number
) => {
  const { accessData } = useAssessmentAccess(assessmentId, studentProfileId);

  const isInGracePeriod = 
    accessData?.gracePeriodActive === true && 
    (accessData?.minutesRemaining ?? 0) <= 5;

  return {
    isInGracePeriod,
    minutesRemaining: accessData?.minutesRemaining,
    windowEnd: accessData?.windowEnd,
    gracePeriodActive: accessData?.gracePeriodActive,
  };
};

// ============================================================
// REFRESH STATUS HOOK
// ============================================================

/**
 * Hook to manually refresh access status
 * Use this when you need to force a refresh (e.g., after an action)
 * 
 * @param assessmentId - ID of the assessment
 * @param studentProfileId - ID of the student profile
 */
export const useRefreshAccessStatus = (
  assessmentId: number,
  studentProfileId: number
) => {
  const query = useQuery({
    queryKey: assessmentAccessKeys.status(assessmentId, studentProfileId),
    queryFn: () => 
      scheduleValidationApi.checkAssessmentAccess(assessmentId, studentProfileId),
    enabled: false, // Don't auto-run, only on manual refetch
  });

  return {
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    data: query.data,
  };
};

// ============================================================
// BATCH ACCESS CHECK HOOK
// ============================================================

/**
 * Hook to check access for multiple assessments at once
 * Useful for dashboard views showing multiple assessments
 * 
 * @param assessmentIds - Array of assessment IDs
 * @param studentProfileId - ID of the student profile
 */
export const useBatchAssessmentAccess = (
  assessmentIds: number[],
  studentProfileId: number
) => {
  const queries = useQuery({
    queryKey: ['assessment-access-batch', assessmentIds, studentProfileId],
    queryFn: async () => {
      const results = await Promise.all(
        assessmentIds.map(id =>
          scheduleValidationApi.checkAssessmentAccess(id, studentProfileId)
            .then(data => ({ id, data, error: null }))
            .catch(error => ({ id, data: null, error }))
        )
      );
      
      // Convert array to map for easier lookup
      return results.reduce((acc, { id, data, error }) => {
        acc[id] = { data, error };
        return acc;
      }, {} as Record<number, { data: AccessCheckResult | null; error: any }>);
    },
    enabled: assessmentIds.length > 0 && !!studentProfileId,
    refetchInterval: 60000, // Refresh every minute for batch checks
    staleTime: 10000,
  });

  return {
    ...queries,
    accessMap: queries.data ?? {},
    getAccess: (assessmentId: number) => queries.data?.[assessmentId]?.data,
    hasError: (assessmentId: number) => !!queries.data?.[assessmentId]?.error,
  };
};

// ============================================================
// UTILITY HOOKS
// ============================================================

/**
 * Hook to determine if assessment is accessible within a time range
 * Useful for scheduling and planning features
 */
export const useAssessmentTimeWindow = (assessmentId: number, studentProfileId: number) => {
  const { accessData } = useAssessmentAccess(assessmentId, studentProfileId);

  return {
    windowStart: accessData?.windowStart ? new Date(accessData.windowStart) : null,
    windowEnd: accessData?.windowEnd ? new Date(accessData.windowEnd) : null,
    currentTime: accessData?.currentTime ? new Date(accessData.currentTime) : null,
    isInWindow: accessData?.canAccess ?? false,
    hasStarted: accessData?.windowStart 
      ? new Date() >= new Date(accessData.windowStart)
      : false,
    hasEnded: accessData?.windowEnd
      ? new Date() >= new Date(accessData.windowEnd)
      : false,
  };
};