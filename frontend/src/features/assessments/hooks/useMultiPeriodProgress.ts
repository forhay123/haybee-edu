/**
 * Hook to fetch all periods for student/subject combo
 * Calculate completion percentage and track which periods need attention
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getStudentMyPeriods } from '../api/multiPeriodApi';
import type { PeriodProgressDto } from '../types/customAssessmentTypes';

interface UseMultiPeriodProgressOptions {
  subjectId?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

export const useMultiPeriodProgress = (options: UseMultiPeriodProgressOptions) => {
  const { subjectId, enabled = true, refetchInterval } = options;

  const { data: periods = [], isLoading, error, refetch } = useQuery({
    queryKey: ['multiPeriodProgress', subjectId],
    queryFn: () => getStudentMyPeriods(subjectId!),
    enabled: enabled && !!subjectId,
    refetchInterval,
  });

  // Calculate statistics
  const statistics = useCallback(() => {
    const total = periods.length;
    const completed = periods.filter((p) => p.isCompleted).length;
    const available = periods.filter((p) => p.canAccess && !p.isCompleted).length;
    const locked = periods.filter((p) => !p.canAccess && !p.isCompleted).length;
    const waitingForTeacher = periods.filter(
      (p) => p.requiresCustomAssessment && !p.customAssessmentCreated
    ).length;

    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate average score for completed periods
    const completedWithScores = periods.filter((p) => p.isCompleted && p.score !== undefined);
    const averageScore =
      completedWithScores.length > 0
        ? completedWithScores.reduce((sum, p) => sum + (p.score || 0), 0) / completedWithScores.length
        : 0;

    return {
      total,
      completed,
      available,
      locked,
      waitingForTeacher,
      completionPercentage,
      averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
    };
  }, [periods]);

  // Get next period to work on
  const nextPeriod = useCallback((): PeriodProgressDto | undefined => {
    return periods.find((p) => p.canAccess && !p.isCompleted);
  }, [periods]);

  // Get periods needing attention
  const periodsNeedingAttention = useCallback((): PeriodProgressDto[] => {
    return periods.filter(
      (p) =>
        !p.isCompleted &&
        (p.requiresCustomAssessment && !p.customAssessmentCreated || !p.canAccess)
    );
  }, [periods]);

  // Group periods by status
  const periodsByStatus = useCallback(() => {
    return {
      completed: periods.filter((p) => p.status === 'COMPLETED'),
      available: periods.filter((p) => p.status === 'AVAILABLE'),
      waitingAssessment: periods.filter((p) => p.status === 'WAITING_ASSESSMENT'),
      locked: periods.filter((p) => p.status === 'LOCKED'),
      scheduled: periods.filter((p) => p.status === 'SCHEDULED'),
      windowClosed: periods.filter((p) => p.status === 'WINDOW_CLOSED'),
    };
  }, [periods]);

  return {
    // Data
    periods,
    statistics: statistics(),
    nextPeriod: nextPeriod(),
    periodsNeedingAttention: periodsNeedingAttention(),
    periodsByStatus: periodsByStatus(),
    
    // Actions
    refetch,
    
    // Status
    isLoading,
    error,
  };
};

export default useMultiPeriodProgress;
