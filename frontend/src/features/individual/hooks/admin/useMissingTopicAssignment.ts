// frontend/src/features/individual/hooks/admin/useMissingTopicAssignment.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { multiAssessmentApi } from "../../../assessments/api/multiAssessmentApi";
import type {
  PendingAssignmentDto,
  ManualAssignmentRequest,
  ManualAssignmentResponse,
  SuggestedTopicDto,
  PendingAssignmentsSummary,
  PendingAssignmentsFilter,
} from "../../types/assignmentTypes";

// ============================================================
// QUERY HOOKS: Fetch Pending Assignments (ADMIN)
// ============================================================

/**
 * Get all pending assignments (Admin only)
 * Shows all schedules across all students that need topic assignment
 */
export function useAllPendingAssignments(enabled = true) {
  return useQuery<PendingAssignmentDto[]>({
    queryKey: ["admin", "pendingAssignments", "all"],
    queryFn: () => multiAssessmentApi.getAllPendingAssignments(),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Get pending assignments filtered by week number
 */
export function usePendingAssignmentsByWeek(
  weekNumber: number,
  enabled = true
) {
  return useQuery<PendingAssignmentDto[]>({
    queryKey: ["admin", "pendingAssignments", "week", weekNumber],
    queryFn: () => multiAssessmentApi.getPendingAssignmentsByWeek(weekNumber),
    enabled: enabled && !!weekNumber,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get pending assignments filtered by subject
 */
export function usePendingAssignmentsBySubject(
  subjectId: number,
  enabled = true
) {
  return useQuery<PendingAssignmentDto[]>({
    queryKey: ["admin", "pendingAssignments", "subject", subjectId],
    queryFn: () => multiAssessmentApi.getPendingAssignmentsBySubject(subjectId),
    enabled: enabled && !!subjectId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get pending assignments for a specific student
 */
export function usePendingAssignmentsForStudent(
  studentProfileId: number,
  enabled = true
) {
  return useQuery<PendingAssignmentDto[]>({
    queryKey: ["admin", "pendingAssignments", "student", studentProfileId],
    queryFn: () =>
      multiAssessmentApi.getPendingAssignmentsForStudent(studentProfileId),
    enabled: enabled && !!studentProfileId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get pending assignments summary with statistics
 */
export function usePendingAssignmentsSummary(enabled = true) {
  return useQuery<PendingAssignmentsSummary>({
    queryKey: ["admin", "pendingAssignments", "summary"],
    queryFn: () => multiAssessmentApi.getPendingAssignmentsSummary(),
    enabled,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Get pending assignments for a date range
 */
export function usePendingAssignmentsByDateRange(
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery<PendingAssignmentDto[]>({
    queryKey: ["admin", "pendingAssignments", "dateRange", startDate, endDate],
    queryFn: () =>
      multiAssessmentApi.getPendingAssignmentsByDateRange(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get pending assignments for today
 */
export function useTodayPendingAssignments(enabled = true) {
  return useQuery<PendingAssignmentDto[]>({
    queryKey: ["admin", "pendingAssignments", "today", new Date().toISOString().split("T")[0]],
    queryFn: () => multiAssessmentApi.getPendingAssignmentsForToday(),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
}

/**
 * Get pending assignments for current week
 */
export function useCurrentWeekPendingAssignments(
  termStartDate: string,
  enabled = true
) {
  return useQuery<PendingAssignmentDto[]>({
    queryKey: ["admin", "pendingAssignments", "currentWeek", termStartDate],
    queryFn: () =>
      multiAssessmentApi.getPendingAssignmentsForCurrentWeek(termStartDate),
    enabled: enabled && !!termStartDate,
    staleTime: 1 * 60 * 1000,
  });
}

// ============================================================
// QUERY HOOKS: Suggested Topics
// ============================================================

/**
 * Get suggested topics for a specific schedule
 */
export function useSuggestedTopics(scheduleId: number, enabled = true) {
  return useQuery<SuggestedTopicDto[]>({
    queryKey: ["admin", "suggestedTopics", scheduleId],
    queryFn: () => multiAssessmentApi.getSuggestedTopics(scheduleId),
    enabled: enabled && !!scheduleId,
    staleTime: 5 * 60 * 1000, // 5 minutes - suggestions don't change often
  });
}

// ============================================================
// MUTATION HOOKS: Assignment Operations
// ============================================================

/**
 * Assign a lesson topic to a single schedule
 */
export function useAssignTopicToSchedule() {
  const queryClient = useQueryClient();

  return useMutation<ManualAssignmentResponse, Error, ManualAssignmentRequest>({
    mutationFn: (request) => multiAssessmentApi.assignTopicToSchedule(request),
    onSuccess: () => {
      // Invalidate all pending assignment queries
      queryClient.invalidateQueries({ queryKey: ["admin", "pendingAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
      queryClient.invalidateQueries({ queryKey: ["student", "schedule"] });
    },
  });
}

/**
 * Bulk assign lesson topic to multiple schedules
 */
export function useBulkAssignTopic() {
  const queryClient = useQueryClient();

  return useMutation<ManualAssignmentResponse, Error, ManualAssignmentRequest>({
    mutationFn: (request) => multiAssessmentApi.bulkAssignTopic(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pendingAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
      queryClient.invalidateQueries({ queryKey: ["student", "schedule"] });
    },
  });
}

/**
 * Quick assign using top suggested topic
 */
export function useQuickAssignTopSuggestion() {
  const queryClient = useQueryClient();

  return useMutation<ManualAssignmentResponse, Error, number>({
    mutationFn: (scheduleId) =>
      multiAssessmentApi.quickAssignTopSuggestion(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pendingAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
    },
  });
}

/**
 * Bulk quick assign using top suggestions for multiple schedules
 */
export function useBulkQuickAssign() {
  const queryClient = useQueryClient();

  return useMutation<ManualAssignmentResponse[], Error, number[]>({
    mutationFn: (scheduleIds) => multiAssessmentApi.bulkQuickAssign(scheduleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pendingAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
    },
  });
}

/**
 * Assign same topic to multiple schedules
 */
export function useAssignSameTopicToMultiple() {
  const queryClient = useQueryClient();

  return useMutation<
    ManualAssignmentResponse,
    Error,
    { scheduleIds: number[]; lessonTopicId: number; notes?: string }
  >({
    mutationFn: ({ scheduleIds, lessonTopicId, notes }) =>
      multiAssessmentApi.assignSameTopicToMultipleSchedules(
        scheduleIds,
        lessonTopicId,
        notes
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pendingAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["individualSchedule"] });
    },
  });
}

// ============================================================
// CUSTOM HOOKS WITH ANALYTICS
// ============================================================

/**
 * Hook to get pending assignments with enhanced summary and filtering
 */
export function usePendingAssignmentsWithAnalytics(
  filter?: PendingAssignmentsFilter,
  enabled = true
) {
  const { data: allAssignments, ...queryState } = useAllPendingAssignments(enabled);

  // Apply client-side filtering if needed
  const filteredAssignments = allAssignments
    ? allAssignments.filter((assignment) => {
        if (filter?.weekNumber && assignment.weekNumber !== filter.weekNumber) {
          return false;
        }
        if (filter?.subjectId && assignment.subjectId !== filter.subjectId) {
          return false;
        }
        if (
          filter?.studentProfileId &&
          assignment.studentProfileId !== filter.studentProfileId
        ) {
          return false;
        }
        if (filter?.onlyUrgent) {
          const scheduledDate = new Date(assignment.scheduledDate);
          const today = new Date();
          const diffDays = Math.ceil(
            (scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays > 2) return false;
        }
        if (
          filter?.onlyWithoutSuggestions &&
          assignment.suggestedTopics &&
          assignment.suggestedTopics.length > 0
        ) {
          return false;
        }
        return true;
      })
    : [];

  // Calculate analytics
  const analytics = filteredAssignments
    ? {
        total: filteredAssignments.length,
        needsAssignment: filteredAssignments.filter((a) => a.missingLessonTopic)
          .length,
        bySubject: filteredAssignments.reduce((acc, assignment) => {
          const subject = assignment.subjectName;
          acc[subject] = (acc[subject] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byWeek: filteredAssignments.reduce((acc, assignment) => {
          const week = assignment.weekNumber || 0;
          acc[week] = (acc[week] || 0) + 1;
          return acc;
        }, {} as Record<number, number>),
        byStudent: filteredAssignments.reduce((acc, assignment) => {
          const student = assignment.studentName;
          acc[student] = (acc[student] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        urgent: filteredAssignments.filter((a) => {
          const scheduledDate = new Date(a.scheduledDate);
          const today = new Date();
          const diffDays = Math.ceil(
            (scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return diffDays <= 2 && a.missingLessonTopic;
        }),
        withConflicts: filteredAssignments.filter((a) => a.hasConflict).length,
        avgDaysPending:
          filteredAssignments.length > 0
            ? filteredAssignments.reduce((sum, a) => sum + a.daysPending, 0) /
              filteredAssignments.length
            : 0,
      }
    : null;

  return {
    ...queryState,
    assignments: filteredAssignments,
    analytics,
  };
}

/**
 * Hook to track assignment statistics for dashboard
 */
export function useAssignmentStatistics(enabled = true) {
  const { data: summary, isLoading } = usePendingAssignmentsSummary(enabled);

  const statistics = summary
    ? {
        totalPending: summary.totalPending,
        percentageComplete:
          summary.totalPending === 0
            ? 100
            : Math.round(
                ((Object.values(summary.bySubject).reduce((a, b) => a + b, 0) -
                  summary.totalPending) /
                  Object.values(summary.bySubject).reduce((a, b) => a + b, 0)) *
                  100
              ),
        subjectsNeedingAttention: Object.entries(summary.bySubject)
          .filter(([_, count]) => count > 5)
          .map(([subject]) => subject),
        upcomingWeeks: Object.keys(summary.byWeek)
          .map(Number)
          .sort((a, b) => a - b)
          .slice(0, 4), // Next 4 weeks
        urgentAssignments: summary.urgentCount,
        assignmentsWithSuggestions: summary.withSuggestionsCount,
      }
    : null;

  return {
    statistics,
    isLoading,
  };
}

/**
 * Hook to count pending assignments (for badge display)
 */
export function usePendingAssignmentsCount(enabled = true) {
  return useQuery<number>({
    queryKey: ["admin", "pendingAssignments", "count"],
    queryFn: async () => {
      const assignments = await multiAssessmentApi.getAllPendingAssignments();
      return assignments.length;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

export const useAssignTopic = useAssignTopicToSchedule;