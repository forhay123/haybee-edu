// frontend/src/features/individual/hooks/useAssessmentInstances.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../api/assessmentInstancesApi";
import type {
  AssessmentInstance,
  DailyProgressDto,
  ProgressUpdateRequest,
  ComprehensiveLessonsReport,
  IncompleteLessonsReport,
  LessonStats,
} from "../api/assessmentInstancesApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const assessmentInstanceKeys = {
  all: ["assessment-instances"] as const,
  dailyProgress: (studentId: number, date?: string) =>
    ["assessment-instances", "daily", studentId, date] as const,
  comprehensive: (
    studentId: number,
    fromDate?: string,
    toDate?: string,
    statusFilter?: string
  ) =>
    [
      "assessment-instances",
      "comprehensive",
      studentId,
      fromDate,
      toDate,
      statusFilter,
    ] as const,
  incomplete: (studentId: number, fromDate?: string, toDate?: string) =>
    ["assessment-instances", "incomplete", studentId, fromDate, toDate] as const,
  urgent: (studentId: number) =>
    ["assessment-instances", "urgent", studentId] as const,
  stats: (studentId: number, fromDate?: string, toDate?: string) =>
    ["assessment-instances", "stats", studentId, fromDate, toDate] as const,
  history: (studentId: number, from: string, to: string) =>
    ["assessment-instances", "history", studentId, from, to] as const,
  bySubject: (studentId: number, fromDate?: string, toDate?: string) =>
    ["assessment-instances", "by-subject", studentId, fromDate, toDate] as const,
};

// ============================================================
// STUDENT HOOKS (My Progress)
// ============================================================

/**
 * Get my daily progress
 */
export function useMyDailyProgress(date?: string) {
  return useQuery({
    queryKey: assessmentInstanceKeys.dailyProgress(0, date), // 0 for "me"
    queryFn: () => assessmentInstancesApi.getMyDailyProgress(date),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Get my comprehensive lessons
 */
export function useMyComprehensiveLessons(
  fromDate?: string,
  toDate?: string,
  statusFilter?: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.comprehensive(
      0,
      fromDate,
      toDate,
      statusFilter
    ),
    queryFn: () =>
      assessmentInstancesApi.getMyComprehensiveLessons(
        fromDate,
        toDate,
        statusFilter
      ),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get my incomplete lessons
 */
export function useMyIncompleteLessons(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: assessmentInstanceKeys.incomplete(0, fromDate, toDate),
    queryFn: () =>
      assessmentInstancesApi.getMyIncompleteLessons(fromDate, toDate),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get my urgent lessons
 */
export function useMyUrgentLessons() {
  return useQuery({
    queryKey: assessmentInstanceKeys.urgent(0),
    queryFn: () => assessmentInstancesApi.getMyUrgentLessons(),
    staleTime: 1000 * 60 * 1, // 1 minute - urgent items need frequent updates
    refetchInterval: 1000 * 60 * 2, // Auto-refetch every 2 minutes
  });
}

/**
 * Get my lesson statistics
 */
export function useMyStats(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: assessmentInstanceKeys.stats(0, fromDate, toDate),
    queryFn: () => assessmentInstancesApi.getMyStats(fromDate, toDate),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get my progress history
 */
export function useMyProgressHistory(from: string, to: string) {
  return useQuery({
    queryKey: assessmentInstanceKeys.history(0, from, to),
    queryFn: () => assessmentInstancesApi.getMyProgressHistory(from, to),
    enabled: !!from && !!to,
  });
}

// ============================================================
// TEACHER HOOKS (View Student Progress)
// ============================================================

/**
 * Get student's comprehensive lessons (Teacher view)
 */
export function useTeacherStudentLessons(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  status?: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.comprehensive(
      studentId,
      fromDate,
      toDate,
      status
    ),
    queryFn: () =>
      assessmentInstancesApi.getTeacherStudentLessons(
        studentId,
        fromDate,
        toDate,
        status
      ),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get student statistics (Teacher view)
 */
export function useTeacherStudentStats(
  studentId: number,
  fromDate?: string,
  toDate?: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.stats(studentId, fromDate, toDate),
    queryFn: () =>
      assessmentInstancesApi.getTeacherStudentStats(
        studentId,
        fromDate,
        toDate
      ),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================
// ADMIN HOOKS (Any Student)
// ============================================================

/**
 * Get any student's daily progress (Admin)
 */
export function useStudentDailyProgress(
  studentProfileId: number,
  date?: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.dailyProgress(studentProfileId, date),
    queryFn: () =>
      assessmentInstancesApi.getStudentDailyProgress(studentProfileId, date),
    enabled: !!studentProfileId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get student's comprehensive lessons (Admin)
 */
export function useStudentComprehensiveLessons(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  statusFilter?: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.comprehensive(
      studentId,
      fromDate,
      toDate,
      statusFilter
    ),
    queryFn: () =>
      assessmentInstancesApi.getStudentComprehensiveLessons(
        studentId,
        fromDate,
        toDate,
        statusFilter
      ),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get student's incomplete lessons (Admin)
 */
export function useStudentIncompleteLessons(
  studentId: number,
  fromDate?: string,
  toDate?: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.incomplete(studentId, fromDate, toDate),
    queryFn: () =>
      assessmentInstancesApi.getStudentIncompleteLessons(
        studentId,
        fromDate,
        toDate
      ),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get student's urgent lessons (Admin)
 */
export function useStudentUrgentLessons(studentId: number) {
  return useQuery({
    queryKey: assessmentInstanceKeys.urgent(studentId),
    queryFn: () => assessmentInstancesApi.getStudentUrgentLessons(studentId),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 2,
  });
}

/**
 * Get student's lessons by subject (Admin)
 */
export function useStudentLessonsBySubject(
  studentId: number,
  fromDate?: string,
  toDate?: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.bySubject(studentId, fromDate, toDate),
    queryFn: () =>
      assessmentInstancesApi.getStudentLessonsBySubject(
        studentId,
        fromDate,
        toDate
      ),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get student statistics (Admin)
 */
export function useStudentStats(
  studentId: number,
  fromDate?: string,
  toDate?: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.stats(studentId, fromDate, toDate),
    queryFn: () =>
      assessmentInstancesApi.getStudentStats(studentId, fromDate, toDate),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get student's progress history (Admin)
 */
export function useStudentProgressHistory(
  studentProfileId: number,
  from: string,
  to: string
) {
  return useQuery({
    queryKey: assessmentInstanceKeys.history(studentProfileId, from, to),
    queryFn: () =>
      assessmentInstancesApi.getStudentProgressHistory(
        studentProfileId,
        from,
        to
      ),
    enabled: !!studentProfileId && !!from && !!to,
  });
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Mark lesson as complete
 */
export function useMarkLessonComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProgressUpdateRequest) =>
      assessmentInstancesApi.markLessonComplete(request),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: assessmentInstanceKeys.all,
      });
    },
  });
}

/**
 * Sync incomplete lessons
 */
export function useSyncIncompleteLessons() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => assessmentInstancesApi.syncIncompleteLessons(),
    onSuccess: () => {
      // Invalidate all assessment instance queries
      queryClient.invalidateQueries({
        queryKey: assessmentInstanceKeys.all,
      });
    },
  });
}

// ============================================================
// HELPER HOOKS
// ============================================================

/**
 * Get today's lessons for current student
 */
export function useMyTodayLessons() {
  const today = new Date().toISOString().split("T")[0];
  return useMyDailyProgress(today);
}

/**
 * Get this week's lessons for current student
 */
export function useMyWeekLessons() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fromDate = weekStart.toISOString().split("T")[0];
  const toDate = weekEnd.toISOString().split("T")[0];

  return useMyComprehensiveLessons(fromDate, toDate);
}

/**
 * Get this month's lessons for current student
 */
export function useMyMonthLessons() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const fromDate = monthStart.toISOString().split("T")[0];
  const toDate = monthEnd.toISOString().split("T")[0];

  return useMyComprehensiveLessons(fromDate, toDate);
}