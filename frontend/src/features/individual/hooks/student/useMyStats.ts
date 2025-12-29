// frontend/src/features/individual/hooks/student/useMyStats.ts

import { useQuery } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type { LessonStats } from "../../api/assessmentInstancesApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const myStatsKeys = {
  all: ["my-stats"] as const,
  byRange: (fromDate?: string, toDate?: string) =>
    ["my-stats", fromDate, toDate] as const,
  current: () => ["my-stats", "current"] as const,
  thisWeek: () => ["my-stats", "this-week"] as const,
  thisMonth: () => ["my-stats", "this-month"] as const,
  thisTerm: () => ["my-stats", "this-term"] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Get my lesson statistics
 */
export function useMyStats(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: myStatsKeys.byRange(fromDate, toDate),
    queryFn: () => assessmentInstancesApi.getMyStats(fromDate, toDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get my current statistics (all time)
 */
export function useMyCurrentStats() {
  return useQuery({
    queryKey: myStatsKeys.current(),
    queryFn: () => assessmentInstancesApi.getMyStats(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get my statistics for this week
 */
export function useMyStatsThisWeek() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fromDate = weekStart.toISOString().split("T")[0];
  const toDate = weekEnd.toISOString().split("T")[0];

  return useQuery({
    queryKey: myStatsKeys.thisWeek(),
    queryFn: () => assessmentInstancesApi.getMyStats(fromDate, toDate),
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Get my statistics for this month
 */
export function useMyStatsThisMonth() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const fromDate = monthStart.toISOString().split("T")[0];
  const toDate = monthEnd.toISOString().split("T")[0];

  return useQuery({
    queryKey: myStatsKeys.thisMonth(),
    queryFn: () => assessmentInstancesApi.getMyStats(fromDate, toDate),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================
// HELPER HOOKS
// ============================================================

/**
 * Get statistics with computed percentages and insights
 */
export function useMyStatsWithInsights(fromDate?: string, toDate?: string) {
  const { data, ...query } = useMyStats(fromDate, toDate);

  const enhanced = data
    ? {
        ...data,
        // Computed percentages
        missedPercentage:
          data.totalLessons > 0
            ? (data.missedLessons / data.totalLessons) * 100
            : 0,
        inProgressPercentage:
          data.totalLessons > 0
            ? (data.inProgressLessons / data.totalLessons) * 100
            : 0,
        scheduledPercentage:
          data.totalLessons > 0
            ? (data.scheduledLessons / data.totalLessons) * 100
            : 0,
        // Performance level
        performanceLevel:
          data.completionRate >= 90
            ? "excellent"
            : data.completionRate >= 75
            ? "good"
            : data.completionRate >= 60
            ? "average"
            : "needs-improvement",
        // Score grade
        scoreGrade: data.averageScore
          ? data.averageScore >= 90
            ? "A"
            : data.averageScore >= 80
            ? "B"
            : data.averageScore >= 70
            ? "C"
            : data.averageScore >= 60
            ? "D"
            : "F"
          : undefined,
        // Flags
        hasExcellentCompletion: data.completionRate >= 90,
        hasGoodCompletion: data.completionRate >= 75,
        needsImprovement: data.completionRate < 60,
        hasMissedLessons: data.missedLessons > 0,
        hasInProgress: data.inProgressLessons > 0,
        // Subject performance
        bestSubject: data.subjectBreakdown.length > 0 
          ? data.subjectBreakdown.reduce((best, current) =>
              current.completionRate > best.completionRate ? current : best
            )
          : undefined,
        worstSubject: data.subjectBreakdown.length > 0
          ? data.subjectBreakdown.reduce((worst, current) =>
              current.completionRate < worst.completionRate ? current : worst
            )
          : undefined,
      }
    : undefined;

  return {
    ...query,
    data: enhanced,
  };
}

/**
 * Get subject breakdown with rankings
 */
export function useMyStatsSubjectBreakdown(fromDate?: string, toDate?: string) {
  const { data, ...query } = useMyStats(fromDate, toDate);

  const breakdown = data
    ? {
        subjects: data.subjectBreakdown,
        totalSubjects: data.subjectBreakdown.length,
        // Sorted by completion rate
        byCompletionRate: [...data.subjectBreakdown].sort(
          (a, b) => b.completionRate - a.completionRate
        ),
        // Sorted by average score
        byAverageScore: [...data.subjectBreakdown].sort((a, b) => {
          const aScore = a.averageScore || 0;
          const bScore = b.averageScore || 0;
          return bScore - aScore;
        }),
        // Top performers
        topPerformers: data.subjectBreakdown.filter(
          (s) => s.completionRate >= 80
        ),
        // Need attention
        needAttention: data.subjectBreakdown.filter(
          (s) => s.completionRate < 60
        ),
        // Average completion across subjects
        averageCompletion:
          data.subjectBreakdown.length > 0
            ? data.subjectBreakdown.reduce(
                (sum, s) => sum + s.completionRate,
                0
              ) / data.subjectBreakdown.length
            : 0,
        // Average score across subjects
        averageScore:
          data.subjectBreakdown.length > 0
            ? data.subjectBreakdown.reduce(
                (sum, s) => sum + (s.averageScore || 0),
                0
              ) / data.subjectBreakdown.length
            : 0,
      }
    : undefined;

  return {
    ...query,
    data: breakdown,
  };
}

/**
 * Get performance comparison (current vs previous period)
 */
export function useMyStatsComparison() {
  // Current week
  const currentWeekQuery = useMyStatsThisWeek();
  
  // Previous week
  const today = new Date();
  const prevWeekStart = new Date(today);
  prevWeekStart.setDate(today.getDate() - today.getDay() - 7);
  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setDate(prevWeekStart.getDate() + 6);

  const fromDate = prevWeekStart.toISOString().split("T")[0];
  const toDate = prevWeekEnd.toISOString().split("T")[0];

  const previousWeekQuery = useQuery({
    queryKey: ["my-stats", "previous-week"],
    queryFn: () => assessmentInstancesApi.getMyStats(fromDate, toDate),
    staleTime: 1000 * 60 * 5,
  });

  const comparison =
    currentWeekQuery.data && previousWeekQuery.data
      ? {
          current: currentWeekQuery.data,
          previous: previousWeekQuery.data,
          // Changes
          completionRateChange:
            currentWeekQuery.data.completionRate -
            previousWeekQuery.data.completionRate,
          averageScoreChange: currentWeekQuery.data.averageScore
            ? (currentWeekQuery.data.averageScore || 0) -
              (previousWeekQuery.data.averageScore || 0)
            : 0,
          completedLessonsChange:
            currentWeekQuery.data.completedLessons -
            previousWeekQuery.data.completedLessons,
          missedLessonsChange:
            currentWeekQuery.data.missedLessons -
            previousWeekQuery.data.missedLessons,
          // Trends
          isImproving:
            currentWeekQuery.data.completionRate >
            previousWeekQuery.data.completionRate,
          isDeclining:
            currentWeekQuery.data.completionRate <
            previousWeekQuery.data.completionRate,
          isStable:
            currentWeekQuery.data.completionRate ===
            previousWeekQuery.data.completionRate,
        }
      : undefined;

  return {
    isLoading: currentWeekQuery.isLoading || previousWeekQuery.isLoading,
    isError: currentWeekQuery.isError || previousWeekQuery.isError,
    error: currentWeekQuery.error || previousWeekQuery.error,
    data: comparison,
  };
}

/**
 * Get quick summary for dashboard cards
 */
export function useMyQuickStats() {
  const { data, ...query } = useMyCurrentStats();

  const quickStats = data
    ? {
        totalLessons: data.totalLessons,
        completedLessons: data.completedLessons,
        completionRate: data.completionRate,
        averageScore: data.averageScore,
        missedLessons: data.missedLessons,
        // Quick indicators
        completionLabel:
          data.completionRate >= 90
            ? "Excellent"
            : data.completionRate >= 75
            ? "Good"
            : data.completionRate >= 60
            ? "Average"
            : "Needs Work",
        completionColor:
          data.completionRate >= 90
            ? "green"
            : data.completionRate >= 75
            ? "blue"
            : data.completionRate >= 60
            ? "yellow"
            : "red",
        hasIssues: data.missedLessons > 0 || data.completionRate < 60,
      }
    : undefined;

  return {
    ...query,
    data: quickStats,
  };
}