// frontend/src/features/individual/hooks/useProgressReports.ts

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/analyticsApi";
import type {
  TeacherSubjectPerformanceDto,
  AtRiskStudentsDto,
} from "../api/analyticsApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const progressReportKeys = {
  all: ["progress-reports"] as const,
  teacherSubject: (
    teacherId: number,
    subjectId: number,
    startDate?: string,
    endDate?: string
  ) =>
    [
      "progress-reports",
      "teacher",
      teacherId,
      "subject",
      subjectId,
      startDate,
      endDate,
    ] as const,
  teacherCurrentWeek: (teacherId: number, subjectId: number) =>
    ["progress-reports", "teacher", teacherId, "subject", subjectId, "current-week"] as const,
  atRisk: (
    teacherId: number,
    subjectId: number,
    startDate?: string,
    endDate?: string
  ) =>
    [
      "progress-reports",
      "at-risk",
      teacherId,
      subjectId,
      startDate,
      endDate,
    ] as const,
  monthlyReport: (teacherId: number, subjectId: number) =>
    ["progress-reports", "teacher", teacherId, "subject", subjectId, "monthly"] as const,
  termReport: (teacherId: number, subjectId: number) =>
    ["progress-reports", "teacher", teacherId, "subject", subjectId, "term"] as const,
};

// ============================================================
// TEACHER REPORT HOOKS
// ============================================================

/**
 * Get teacher's subject performance report
 */
export function useTeacherSubjectReport(
  teacherId: number,
  subjectId: number,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: progressReportKeys.teacherSubject(
      teacherId,
      subjectId,
      startDate,
      endDate
    ),
    queryFn: () =>
      analyticsApi.getTeacherSubjectReport(
        teacherId,
        subjectId,
        startDate,
        endDate
      ),
    enabled: !!teacherId && !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get current week teacher report
 */
export function useCurrentWeekTeacherReport(
  teacherId: number,
  subjectId: number
) {
  return useQuery({
    queryKey: progressReportKeys.teacherCurrentWeek(teacherId, subjectId),
    queryFn: () =>
      analyticsApi.getCurrentWeekTeacherReport(teacherId, subjectId),
    enabled: !!teacherId && !!subjectId,
    staleTime: 1000 * 60 * 2, // 2 minutes for current week
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });
}

/**
 * Get at-risk students for a teacher's subject
 */
export function useAtRiskStudents(
  teacherId: number,
  subjectId: number,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: progressReportKeys.atRisk(
      teacherId,
      subjectId,
      startDate,
      endDate
    ),
    queryFn: () =>
      analyticsApi.getAtRiskStudents(teacherId, subjectId, startDate, endDate),
    enabled: !!teacherId && !!subjectId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

/**
 * Get teacher report for current month
 */
export function useTeacherMonthlyReport(teacherId: number, subjectId: number) {
  return useQuery({
    queryKey: progressReportKeys.monthlyReport(teacherId, subjectId),
    queryFn: () =>
      analyticsApi.getTeacherMonthlyReport(teacherId, subjectId),
    enabled: !!teacherId && !!subjectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get teacher report for current term
 */
export function useTeacherTermReport(teacherId: number, subjectId: number) {
  return useQuery({
    queryKey: progressReportKeys.termReport(teacherId, subjectId),
    queryFn: () => analyticsApi.getTeacherTermReport(teacherId, subjectId),
    enabled: !!teacherId && !!subjectId,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// ============================================================
// COMPARISON HOOKS
// ============================================================

/**
 * Get performance comparison for multiple teachers
 */
export function useTeacherPerformanceComparison(
  teacherSubjects: Array<{ teacherId: number; subjectId: number }>,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: [
      "progress-reports",
      "comparison",
      teacherSubjects,
      startDate,
      endDate,
    ],
    queryFn: () =>
      analyticsApi.compareTeacherPerformance(
        teacherSubjects,
        startDate,
        endDate
      ),
    enabled: teacherSubjects.length > 0,
    staleTime: 1000 * 60 * 10,
  });
}