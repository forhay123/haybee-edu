// src/features/assessments/hooks/useAdminAssessments.ts

import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { 
  adminAssessmentsApi,
  AdminAssessmentStats,
  AdminSubmissionFilter,
  AdminAssessmentFilter
} from '../api/adminAssessmentsApi';
import { gradingApi } from '../api/gradingApi';
import type { 
  Assessment,
  AssessmentSubmission,
  PendingSubmission 
} from '../types/assessmentTypes';

// ============================================
// Query Keys
// ============================================
export const adminAssessmentKeys = {
  all: ['admin', 'assessments'] as const,
  overviewStats: () => [...adminAssessmentKeys.all, 'overview-stats'] as const,
  submissions: (filter?: AdminSubmissionFilter) => 
    [...adminAssessmentKeys.all, 'submissions', filter] as const,
  pendingGrading: () => [...adminAssessmentKeys.all, 'pending-grading'] as const,
  assessments: (filter?: AdminAssessmentFilter) => 
    [...adminAssessmentKeys.all, 'list', filter] as const,
  studentPerformance: (studentId: number) => 
    [...adminAssessmentKeys.all, 'student', studentId, 'performance'] as const,
  subjectBreakdown: (subjectId: number) => 
    [...adminAssessmentKeys.all, 'subject', subjectId, 'breakdown'] as const,
  systemOverview: () => [...adminAssessmentKeys.all, 'system-overview'] as const,
  dashboardSummary: () => [...adminAssessmentKeys.all, 'dashboard-summary'] as const,
  classPerformance: (classId: number) => 
    [...adminAssessmentKeys.all, 'class-performance', classId] as const,
  teacherAnalytics: (teacherId: number) => 
    [...adminAssessmentKeys.all, 'teacher-analytics', teacherId] as const,
  gradingStats: () => [...adminAssessmentKeys.all, 'grading-stats'] as const,
};

// ============================================
// Core Admin Hooks
// ============================================

/**
 * Get admin assessment overview statistics
 */
export const useAdminOverviewStats = (): UseQueryResult<AdminAssessmentStats> => {
  return useQuery({
    queryKey: adminAssessmentKeys.overviewStats(),
    queryFn: adminAssessmentsApi.getOverviewStats,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Get all submissions with optional filters
 */
export const useAdminAllSubmissions = (
  filter?: AdminSubmissionFilter
): UseQueryResult<AssessmentSubmission[]> => {
  return useQuery({
    queryKey: adminAssessmentKeys.submissions(filter),
    queryFn: () => adminAssessmentsApi.getAllSubmissions(filter),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
};

/**
 * Get all pending grading submissions
 */
export const useAdminPendingGrading = (): UseQueryResult<PendingSubmission[]> => {
  return useQuery({
    queryKey: adminAssessmentKeys.pendingGrading(),
    queryFn: adminAssessmentsApi.getAllPendingGrading,
    staleTime: 20000, // 20 seconds - more frequent for pending items
    refetchOnWindowFocus: true,
  });
};

/**
 * Get all assessments with optional filters
 */
export const useAdminAllAssessments = (
  filter?: AdminAssessmentFilter
): UseQueryResult<Assessment[]> => {
  return useQuery({
    queryKey: adminAssessmentKeys.assessments(filter),
    queryFn: () => adminAssessmentsApi.getAllAssessments(filter),
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });
};

/**
 * Get student performance details
 */
export const useAdminStudentPerformance = (
  studentId: number
): UseQueryResult<any> => {
  return useQuery({
    queryKey: adminAssessmentKeys.studentPerformance(studentId),
    queryFn: () => adminAssessmentsApi.getStudentPerformance(studentId),
    enabled: !!studentId && studentId > 0,
    staleTime: 60000,
  });
};

/**
 * Get subject breakdown details
 */
export const useAdminSubjectBreakdown = (
  subjectId: number
): UseQueryResult<any> => {
  return useQuery({
    queryKey: adminAssessmentKeys.subjectBreakdown(subjectId),
    queryFn: () => adminAssessmentsApi.getSubjectBreakdown(subjectId),
    enabled: !!subjectId && subjectId > 0,
    staleTime: 60000,
  });
};

/**
 * Get system overview
 */
export const useAdminSystemOverview = (): UseQueryResult<any> => {
  return useQuery({
    queryKey: adminAssessmentKeys.systemOverview(),
    queryFn: adminAssessmentsApi.getSystemOverview,
    staleTime: 60000,
  });
};

/**
 * Get dashboard summary
 */
export const useAdminDashboardSummary = (): UseQueryResult<any> => {
  return useQuery({
    queryKey: adminAssessmentKeys.dashboardSummary(),
    queryFn: adminAssessmentsApi.getDashboardSummary,
    staleTime: 30000,
  });
};

// ============================================
// Additional Performance Hooks
// ============================================

/**
 * Get class performance details
 */
export const useAdminClassPerformance = (classId: number) => {
  return useQuery({
    queryKey: adminAssessmentKeys.classPerformance(classId),
    queryFn: () => adminAssessmentsApi.getClassPerformance(classId),
    enabled: !!classId && classId > 0,
    staleTime: 60000,
  });
};

/**
 * Get teacher analytics
 */
export const useAdminTeacherAnalytics = (teacherId: number) => {
  return useQuery({
    queryKey: adminAssessmentKeys.teacherAnalytics(teacherId),
    queryFn: () => adminAssessmentsApi.getTeacherAnalytics(teacherId),
    enabled: !!teacherId && teacherId > 0,
    staleTime: 60000,
  });
};

// ============================================
// Grading Statistics Hooks
// ============================================

/**
 * Get grading statistics for admin/teacher dashboard
 * Shows pending submissions, pending answers, and recent activity
 * Auto-refreshes every 30 seconds
 */
export const useAdminGradingStats = () => {
  return useQuery({
    queryKey: adminAssessmentKeys.gradingStats(),
    queryFn: () => gradingApi.getGradingStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 20000,
  });
};

/**
 * Get count of pending grading items
 */
export const usePendingGradingCount = () => {
  const { data } = useAdminGradingStats();
  
  return {
    totalPending: data?.totalPendingSubmissions ?? 0,
    totalAnswers: data?.totalPendingAnswers ?? 0,
    uniqueStudents: data?.uniqueStudents ?? 0,
    hasPending: (data?.totalPendingSubmissions ?? 0) > 0,
  };
};

/**
 * Get recent grading activity
 */
export const useRecentGradingActivity = () => {
  const { data, isLoading } = useAdminGradingStats();
  
  return {
    recentSubmissions: data?.recentSubmissions ?? [],
    hasRecent: (data?.recentSubmissions?.length ?? 0) > 0,
    isLoading,
  };
};

/**
 * Check if there are items needing attention
 */
export const useGradingNotifications = () => {
  const { data } = useAdminGradingStats();
  const pendingCount = data?.totalPendingSubmissions ?? 0;
  const urgentCount = data?.recentSubmissions?.filter(
    (sub: any) => {
      const submittedAt = new Date(sub.submittedAt);
      const hoursSince = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60);
      return hoursSince > 24; // Urgent if more than 24 hours old
    }
  ).length ?? 0;

  return {
    hasPending: pendingCount > 0,
    pendingCount,
    hasUrgent: urgentCount > 0,
    urgentCount,
    shouldNotify: pendingCount > 0 || urgentCount > 0,
  };
};

// ============================================
// Combined Dashboard Hooks
// ============================================

/**
 * Hook that combines overview and grading stats for dashboard
 * Useful for admin dashboard pages that need both datasets
 */
export const useAdminDashboardData = () => {
  const overview = useAdminSystemOverview();
  const gradingStats = useAdminGradingStats();

  return {
    overview: {
      data: overview.data,
      isLoading: overview.isLoading,
      error: overview.error,
      refetch: overview.refetch,
    },
    grading: {
      data: gradingStats.data,
      isLoading: gradingStats.isLoading,
      error: gradingStats.error,
      refetch: gradingStats.refetch,
    },
    isLoading: overview.isLoading || gradingStats.isLoading,
    hasError: !!overview.error || !!gradingStats.error,
    refetchAll: () => {
      overview.refetch();
      gradingStats.refetch();
    },
  };
};

/**
 * Alternative overview hook (uses getSystemOverview instead of getOverviewStats)
 */
export const useAdminAssessmentOverview = () => {
  return useQuery({
    queryKey: adminAssessmentKeys.systemOverview(),
    queryFn: () => adminAssessmentsApi.getSystemOverview(),
    staleTime: 60000,
  });
};

// ============================================
// Manual Refresh Utilities
// ============================================

/**
 * Hook to manually refresh all admin assessment data
 */
export const useRefreshAdminData = () => {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: adminAssessmentKeys.all });
  };

  const refreshOverview = () => {
    queryClient.invalidateQueries({ queryKey: adminAssessmentKeys.overviewStats() });
    queryClient.invalidateQueries({ queryKey: adminAssessmentKeys.systemOverview() });
  };

  const refreshGradingStats = () => {
    queryClient.invalidateQueries({ queryKey: adminAssessmentKeys.gradingStats() });
  };

  const refreshSubmissions = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => 
        query.queryKey[0] === 'admin' && 
        query.queryKey[1] === 'assessments' && 
        query.queryKey[2] === 'submissions'
    });
  };

  const refreshPendingGrading = () => {
    queryClient.invalidateQueries({ queryKey: adminAssessmentKeys.pendingGrading() });
  };

  return {
    refreshAll,
    refreshOverview,
    refreshGradingStats,
    refreshSubmissions,
    refreshPendingGrading,
  };
};

// ============================================
// Legacy Aliases (for backwards compatibility)
// ============================================

/**
 * @deprecated Use useAdminSystemOverview instead
 * Kept for backwards compatibility
 */
export const useAdminStudentsOverview = useAdminSystemOverview;

/**
 * @deprecated Use useAdminSystemOverview instead
 * Kept for backwards compatibility
 */
export const useAdminSubjectsOverview = useAdminSystemOverview;