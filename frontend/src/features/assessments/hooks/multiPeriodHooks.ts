/**
 * Additional hooks for multi-period custom assessments
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { assessmentsApi } from '../api/assessmentsApi';
import { getStudentMyPeriods } from '../api/multiPeriodApi';
import { getPreviousSubmissionAnalysis } from '../api/customAssessmentsApi';
import type { PeriodProgressDto } from '../types/customAssessmentTypes';
import type { SubmissionAnalysis } from '../types/customAssessmentTypes';

// ============================================================
// usePeriodDependency
// ============================================================

interface UsePeriodDependencyOptions {
  progressId?: number;
  enabled?: boolean;
}

/**
 * Check if student can access a specific period
 * Returns access status, blocking reasons, and previous period status
 */
export const usePeriodDependency = (options: UsePeriodDependencyOptions) => {
  const { progressId, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['periodAccess', progressId],
    queryFn: () => assessmentsApi.checkPeriodAccess(progressId!),
    enabled: enabled && !!progressId,
    staleTime: 30000, // 30 seconds
  });

  const canAccess = data?.canAccess || false;
  const blockingReason = data?.blockingReason;
  const requiresCustomAssessment = data?.requiresCustomAssessment || false;
  const customAssessmentCreated = data?.customAssessmentCreated || false;

  // Determine if student should see "waiting for teacher" message
  const isWaitingForTeacher = requiresCustomAssessment && !customAssessmentCreated;

  // Determine if previous period is the blocker
  const isPreviousPeriodBlocking =
    !data?.previousPeriodCompleted && data?.previousPeriodProgressId;

  // Get user-friendly status message
  const statusMessage = useCallback(() => {
    if (!data) return '';

    if (data.status === 'COMPLETED') {
      return 'Completed';
    }

    if (!canAccess) {
      if (isWaitingForTeacher) {
        return 'Waiting for teacher to create custom assessment';
      }
      if (isPreviousPeriodBlocking) {
        return `Complete Period ${data.periodNumber - 1} first`;
      }
      return blockingReason || 'Not available';
    }

    if (data.status === 'AVAILABLE') {
      return 'Ready to start';
    }

    if (data.status === 'SCHEDULED') {
      return `Scheduled for ${data.scheduledDate}`;
    }

    return 'Not available';
  }, [data, canAccess, isWaitingForTeacher, isPreviousPeriodBlocking, blockingReason]);

  return {
    // Access control
    canAccess,
    blockingReason,
    statusMessage: statusMessage(),
    
    // Previous period info
    previousPeriodCompleted: data?.previousPeriodCompleted || false,
    previousPeriodProgressId: data?.previousPeriodProgressId,
    
    // Custom assessment info
    requiresCustomAssessment,
    customAssessmentCreated,
    isWaitingForTeacher,
    
    // Period info
    periodNumber: data?.periodNumber,
    totalPeriodsInSequence: data?.totalPeriodsInSequence,
    status: data?.status,
    
    // Assessment info
    assessmentId: data?.assessmentId,
    isCustomAssessment: data?.isCustomAssessment || false,
    
    // Completion info
    isCompleted: data?.status === 'COMPLETED',
    completedAt: data?.completedAt,
    score: data?.score,
    
    // Full data
    periodData: data,
    
    // Actions
    refetch,
    
    // Status
    isLoading,
    error,
  };
};

// ============================================================
// useMultiPeriodProgress
// ============================================================

interface UseMultiPeriodProgressOptions {
  subjectId?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Fetch all periods for student/subject combo
 * Calculate completion percentage and track which periods need attention
 */
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

// ============================================================
// useSubmissionAnalysis
// ============================================================

interface UseSubmissionAnalysisOptions {
  submissionId?: number;
  enabled?: boolean;
}

/**
 * Fetch detailed analysis of a submission
 * Used in custom assessment builder to identify weak areas
 */
export const useSubmissionAnalysis = (options: UseSubmissionAnalysisOptions) => {
  const { submissionId, enabled = true } = options;

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['submissionAnalysis', submissionId],
    queryFn: () => getPreviousSubmissionAnalysis(submissionId!),
    enabled: enabled && !!submissionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get weak topics (topics with <60% success rate)
  const weakTopics = useCallback(() => {
    if (!analysis) return [];
    return analysis.topicPerformance
      .filter((t) => t.isWeakArea)
      .sort((a, b) => a.successRate - b.successRate);
  }, [analysis]);

  // Get strong topics (topics with >80% success rate)
  const strongTopics = useCallback(() => {
    if (!analysis) return [];
    return analysis.topicPerformance
      .filter((t) => t.successRate >= 80)
      .sort((a, b) => b.successRate - a.successRate);
  }, [analysis]);

  // Get incorrect questions
  const incorrectQuestions = useCallback(() => {
    if (!analysis) return [];
    return analysis.questionBreakdown.filter((q) => !q.isCorrect);
  }, [analysis]);

  // Get questions by topic
  const questionsByTopic = useCallback((topicName: string) => {
    if (!analysis) return [];
    return analysis.questionBreakdown.filter((q) => q.topic === topicName);
  }, [analysis]);

  // Get recommended focus areas sorted by priority
  const recommendedFocusAreas = useCallback(() => {
    if (!analysis) return [];
    return [...analysis.recommendedFocusAreas].sort((a, b) => a.priority - b.priority);
  }, [analysis]);

  // Check if needs remedial work
  const needsRemedialWork = analysis?.scorePercentage !== undefined && analysis.scorePercentage < 60;

  // Check if performance is excellent
  const isExcellentPerformance =
    analysis?.scorePercentage !== undefined && analysis.scorePercentage >= 90;

  return {
    // Full analysis
    analysis,
    
    // Breakdown
    weakTopics: weakTopics(),
    strongTopics: strongTopics(),
    incorrectQuestions: incorrectQuestions(),
    recommendedFocusAreas: recommendedFocusAreas(),
    
    // Query helpers
    questionsByTopic,
    
    // Flags
    needsRemedialWork,
    isExcellentPerformance,
    
    // Metrics
    scorePercentage: analysis?.scorePercentage,
    totalQuestions: analysis?.totalQuestions,
    correctCount: analysis?.correctCount,
    incorrectCount: analysis?.incorrectCount,
    
    // Actions
    refetch,
    
    // Status
    isLoading,
    error,
  };
};

export default {
  usePeriodDependency,
  useMultiPeriodProgress,
  useSubmissionAnalysis,
};
