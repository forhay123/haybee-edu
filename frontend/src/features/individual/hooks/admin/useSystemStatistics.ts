// frontend/src/features/individual/hooks/admin/useSystemStatistics.ts

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../api/analyticsApi";
import { incompleteTrackingApi } from "../../api/incompleteTrackingApi";
import type {
  SystemDashboardDto,
  WeeklyTrendsDto,
  SubjectBreakdown,
  RecentActivity,
} from "../../api/analyticsApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const systemStatisticsKeys = {
  all: ["system-statistics"] as const,
  dashboard: () => ["system-statistics", "dashboard"] as const,
  summary: () => ["system-statistics", "summary"] as const,
  weeklyTrends: () => ["system-statistics", "weekly-trends"] as const,
  trendDirection: () => ["system-statistics", "trend-direction"] as const,
  underperformingSubjects: () =>
    ["system-statistics", "underperforming-subjects"] as const,
  recentCritical: () => ["system-statistics", "recent-critical"] as const,
  incompleteSystem: (startDate: string, endDate: string) =>
    ["system-statistics", "incomplete", startDate, endDate] as const,
};

// ============================================================
// DASHBOARD HOOKS
// ============================================================

/**
 * Get system dashboard (Admin only)
 */
export function useSystemDashboard() {
  return useQuery({
    queryKey: systemStatisticsKeys.dashboard(),
    queryFn: () => analyticsApi.getSystemDashboard(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });
}

/**
 * Get dashboard summary (key metrics only)
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: systemStatisticsKeys.summary(),
    queryFn: () => analyticsApi.getDashboardSummary(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}

// ============================================================
// TRENDS HOOKS
// ============================================================

/**
 * Get weekly trends (last 4 weeks)
 */
export function useWeeklyTrends() {
  return useQuery({
    queryKey: systemStatisticsKeys.weeklyTrends(),
    queryFn: () => analyticsApi.getWeeklyTrends(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get trend direction
 */
export function useTrendDirection() {
  return useQuery({
    queryKey: systemStatisticsKeys.trendDirection(),
    queryFn: () => analyticsApi.getTrendDirection(),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================
// SUBJECT ANALYSIS HOOKS
// ============================================================

/**
 * Get subjects with low completion rates
 */
export function useUnderperformingSubjects() {
  return useQuery({
    queryKey: systemStatisticsKeys.underperformingSubjects(),
    queryFn: () => analyticsApi.getUnderperformingSubjects(),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================
// ACTIVITY HOOKS
// ============================================================

/**
 * Get recent critical activities
 */
export function useRecentCriticalActivities() {
  return useQuery({
    queryKey: systemStatisticsKeys.recentCritical(),
    queryFn: () => analyticsApi.getRecentCriticalActivities(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 3,
  });
}

// ============================================================
// INCOMPLETE STATISTICS HOOKS
// ============================================================

/**
 * Get system-wide incomplete statistics
 */
export function useSystemIncompleteStatistics(
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: systemStatisticsKeys.incompleteSystem(startDate, endDate),
    queryFn: () =>
      incompleteTrackingApi.getSystemStatistics(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================
// EXPORT HOOKS
// ============================================================

/**
 * Download dashboard as CSV file
 */
export function useDownloadDashboardCSV() {
  return useQuery({
    queryKey: ["system-statistics", "csv-download"],
    queryFn: () => analyticsApi.downloadDashboardCSV(),
    enabled: false, // Manual trigger only
    staleTime: 0, // Always fresh
  });
}

// ============================================================
// COMPUTED/ENHANCED HOOKS
// ============================================================

/**
 * Get dashboard with computed metrics
 */
export function useEnhancedDashboard() {
  const { data, ...query } = useSystemDashboard();

  const enhanced = data
    ? {
        ...data,
        // Computed percentages
        studentsWithTimetablesPercent:
          data.totalIndividualStudents > 0
            ? Math.round(
                (data.schedulesThisWeek / data.totalIndividualStudents) * 100
              )
            : 0,
        // Health status colors
        healthColor:
          data.systemHealth.overallStatus === "HEALTHY"
            ? "green"
            : data.systemHealth.overallStatus === "WARNING"
            ? "yellow"
            : "red",
        // Issue severity
        hasCriticalIssues: data.systemHealth.criticalIssues > 0,
        hasWarnings: data.systemHealth.warnings > 0,
        // Completion status
        completionStatus:
          data.overallCompletionRate >= 80
            ? "excellent"
            : data.overallCompletionRate >= 60
            ? "good"
            : data.overallCompletionRate >= 40
            ? "fair"
            : "poor",
        // Alerts status
        hasAlerts:
          data.totalMissingTopics > 0 || data.unresolvedConflicts > 0,
        alertsCount: data.totalMissingTopics + data.unresolvedConflicts,
      }
    : undefined;

  return {
    ...query,
    data: enhanced,
  };
}

/**
 * Get subject performance summary
 */
export function useSubjectPerformanceSummary() {
  const { data, ...query } = useSystemDashboard();

  const summary = data
    ? {
        subjects: data.subjectBreakdown,
        totalSubjects: data.subjectBreakdown.length,
        topPerforming: data.subjectBreakdown
          .filter((s) => s.averageCompletionRate >= 80)
          .sort((a, b) => b.averageCompletionRate - a.averageCompletionRate),
        underperforming: data.subjectBreakdown
          .filter((s) => s.averageCompletionRate < 60)
          .sort((a, b) => a.averageCompletionRate - b.averageCompletionRate),
        averageCompletion:
          data.subjectBreakdown.reduce(
            (acc, s) => acc + s.averageCompletionRate,
            0
          ) / data.subjectBreakdown.length,
        averageScore:
          data.subjectBreakdown.reduce((acc, s) => acc + s.averageScore, 0) /
          data.subjectBreakdown.length,
      }
    : undefined;

  return {
    ...query,
    data: summary,
  };
}

/**
 * Get weekly trend analysis
 */
export function useWeeklyTrendAnalysis() {
  const { data, ...query } = useWeeklyTrends();

  const analysis = data
    ? {
        ...data,
        weeklyData: data.weeklyTrends,
        currentWeek: data.currentWeek,
        trend: data.overallTrend,
        // Trend indicators
        isImproving: data.overallTrend === "IMPROVING",
        isDeclining: data.overallTrend === "DECLINING",
        isStable: data.overallTrend === "STABLE",
        hasInsufficientData: data.overallTrend === "INSUFFICIENT_DATA",
        // Latest week comparison
        latestWeek: data.weeklyTrends[data.weeklyTrends.length - 1],
        previousWeek: data.weeklyTrends[data.weeklyTrends.length - 2],
        // Calculated changes
        completionRateChange:
          data.weeklyTrends.length >= 2
            ? data.weeklyTrends[data.weeklyTrends.length - 1].completionRate -
              data.weeklyTrends[data.weeklyTrends.length - 2].completionRate
            : 0,
        scoreChange:
          data.weeklyTrends.length >= 2
            ? data.weeklyTrends[data.weeklyTrends.length - 1].averageScore -
              data.weeklyTrends[data.weeklyTrends.length - 2].averageScore
            : 0,
      }
    : undefined;

  return {
    ...query,
    data: analysis,
  };
}

/**
 * Get system health metrics
 */
export function useSystemHealthMetrics() {
  const { data, ...query } = useSystemDashboard();

  const metrics = data
    ? {
        overallStatus: data.systemHealth.overallStatus,
        criticalIssues: data.systemHealth.criticalIssues,
        warnings: data.systemHealth.warnings,
        totalIssues:
          data.systemHealth.criticalIssues + data.systemHealth.warnings,
        missingTopics: data.totalMissingTopics,
        unresolvedConflicts: data.unresolvedConflicts,
        completionRate: data.overallCompletionRate,
        generationSuccessful: data.lastGenerationSuccessful,
        // Status flags
        isHealthy: data.systemHealth.overallStatus === "HEALTHY",
        hasWarnings: data.systemHealth.overallStatus === "WARNING",
        isCritical: data.systemHealth.overallStatus === "CRITICAL",
        needsAttention:
          data.systemHealth.criticalIssues > 0 ||
          !data.lastGenerationSuccessful ||
          data.unresolvedConflicts > 5 ||
          data.totalMissingTopics > 10,
        // Visual indicators
        statusColor:
          data.systemHealth.overallStatus === "HEALTHY"
            ? "green"
            : data.systemHealth.overallStatus === "WARNING"
            ? "yellow"
            : "red",
        statusIcon:
          data.systemHealth.overallStatus === "HEALTHY"
            ? "✅"
            : data.systemHealth.overallStatus === "WARNING"
            ? "⚠️"
            : "❌",
      }
    : undefined;

  return {
    ...query,
    data: metrics,
  };
}