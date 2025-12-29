// ============================================================
// FILE 3: useStudentIncompleteAssessments.ts
// Path: frontend/src/features/individual/hooks/teacher/useStudentIncompleteAssessments.ts
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type { IncompleteLessonsReport } from "../../api/assessmentInstancesApi";

export function useStudentIncompleteLessons(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  enabled = true
) {
  return useQuery<IncompleteLessonsReport>({
    queryKey: ["teacher", "student", studentId, "incompleteLessons", fromDate, toDate],
    queryFn: () =>
      assessmentInstancesApi.getStudentIncompleteLessons(studentId, fromDate, toDate),
    enabled: enabled && !!studentId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useStudentIncompleteByReason(
  studentId: number,
  fromDate?: string,
  toDate?: string,
  enabled = true
) {
  const { data, ...queryState } = useStudentIncompleteLessons(
    studentId,
    fromDate,
    toDate,
    enabled
  );

  return {
    ...queryState,
    data,
    incompleteByReason: data?.incompleteByReason || {},
  };
}

export function useStudentCurrentWeekIncomplete(studentId: number, enabled = true) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fromDate = weekStart.toISOString().split("T")[0];
  const toDate = weekEnd.toISOString().split("T")[0];

  return useStudentIncompleteLessons(studentId, fromDate, toDate, enabled);
}

export function useStudentCurrentMonthIncomplete(studentId: number, enabled = true) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const fromDate = monthStart.toISOString().split("T")[0];
  const toDate = monthEnd.toISOString().split("T")[0];

  return useStudentIncompleteLessons(studentId, fromDate, toDate, enabled);
}