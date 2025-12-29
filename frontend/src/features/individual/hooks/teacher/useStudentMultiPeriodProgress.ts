// ============================================================
// FILE 2: useStudentMultiPeriodProgress.ts
// Path: frontend/src/features/individual/hooks/teacher/useStudentMultiPeriodProgress.ts
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type {
  ComprehensiveLessonsReport,
  LessonStats,
  AssessmentInstance,
} from "../../api/assessmentInstancesApi";

export function useStudentComprehensiveLessons(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  status?: string,
  enabled = true
) {
  return useQuery<ComprehensiveLessonsReport>({
    queryKey: ["teacher", "student", studentId, "comprehensiveLessons", fromDate, toDate, status],
    queryFn: () =>
      assessmentInstancesApi.getTeacherStudentLessons(studentId, fromDate, toDate, status),
    enabled: enabled && !!studentId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useStudentLessonStats(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  enabled = true
) {
  return useQuery<LessonStats>({
    queryKey: ["teacher", "student", studentId, "lessonStats", fromDate, toDate],
    queryFn: () =>
      assessmentInstancesApi.getTeacherStudentStats(studentId, fromDate, toDate),
    enabled: enabled && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentCurrentWeekLessons(studentId: number, enabled = true) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fromDate = weekStart.toISOString().split("T")[0];
  const toDate = weekEnd.toISOString().split("T")[0];

  return useStudentComprehensiveLessons(studentId, fromDate, toDate, undefined, enabled);
}

export function useStudentCurrentMonthLessons(studentId: number, enabled = true) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const fromDate = monthStart.toISOString().split("T")[0];
  const toDate = monthEnd.toISOString().split("T")[0];

  return useStudentComprehensiveLessons(studentId, fromDate, toDate, undefined, enabled);
}

export function useStudentCompletedLessons(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  enabled = true
) {
  return useStudentComprehensiveLessons(studentId, fromDate, toDate, "COMPLETED", enabled);
}

export function useStudentPendingLessons(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  enabled = true
) {
  return useStudentComprehensiveLessons(studentId, fromDate, toDate, "SCHEDULED", enabled);
}
