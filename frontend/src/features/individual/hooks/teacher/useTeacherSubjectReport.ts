// ============================================================
// FILE 6: useTeacherSubjectReport.ts
// Path: frontend/src/features/individual/hooks/teacher/useTeacherSubjectReport.ts
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../api/analyticsApi";
import type { TeacherSubjectPerformanceDto } from "../../api/analyticsApi";

export function useTeacherSubjectReport(
  teacherId: number,
  subjectId: number,
  startDate?: string,
  endDate?: string,
  enabled = true
) {
  return useQuery<TeacherSubjectPerformanceDto>({
    queryKey: ["teacher", "subjectReport", teacherId, subjectId, startDate, endDate],
    queryFn: () =>
      analyticsApi.getTeacherSubjectReport(teacherId, subjectId, startDate, endDate),
    enabled: enabled && !!teacherId && !!subjectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentWeekTeacherReport(
  teacherId: number,
  subjectId: number,
  enabled = true
) {
  return useQuery<TeacherSubjectPerformanceDto>({
    queryKey: ["teacher", "currentWeekReport", teacherId, subjectId],
    queryFn: () => analyticsApi.getCurrentWeekTeacherReport(teacherId, subjectId),
    enabled: enabled && !!teacherId && !!subjectId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useTeacherMonthlyReport(
  teacherId: number,
  subjectId: number,
  enabled = true
) {
  return useQuery<TeacherSubjectPerformanceDto>({
    queryKey: ["teacher", "monthlyReport", teacherId, subjectId],
    queryFn: () => analyticsApi.getTeacherMonthlyReport(teacherId, subjectId),
    enabled: enabled && !!teacherId && !!subjectId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTeacherTermReport(
  teacherId: number,
  subjectId: number,
  enabled = true
) {
  return useQuery<TeacherSubjectPerformanceDto>({
    queryKey: ["teacher", "termReport", teacherId, subjectId],
    queryFn: () => analyticsApi.getTeacherTermReport(teacherId, subjectId),
    enabled: enabled && !!teacherId && !!subjectId,
    staleTime: 15 * 60 * 1000,
  });
}
