// ============================================================
// FILE 8: useTeacherStudentLessons.ts
// Path: frontend/src/features/individual/hooks/teacher/useTeacherStudentLessons.ts
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type { ComprehensiveLessonsReport } from "../../api/assessmentInstancesApi";

export function useTeacherStudentLessons(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  status?: string,
  enabled = true
) {
  return useQuery<ComprehensiveLessonsReport>({
    queryKey: ["teacher", "studentLessons", studentId, fromDate, toDate, status],
    queryFn: () =>
      assessmentInstancesApi.getTeacherStudentLessons(studentId, fromDate, toDate, status),
    enabled: enabled && !!studentId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useTeacherStudentLessonsByStatus(
  studentId: number,
  status: "COMPLETED" | "SCHEDULED" | "IN_PROGRESS" | "MISSED",
  enabled = true
) {
  return useTeacherStudentLessons(studentId, undefined, undefined, status, enabled);
}

export function useTeacherStudentCurrentWeekLessons(
  studentId: number,
  enabled = true
) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fromDate = weekStart.toISOString().split("T")[0];
  const toDate = weekEnd.toISOString().split("T")[0];

  return useTeacherStudentLessons(studentId, fromDate, toDate, undefined, enabled);
}