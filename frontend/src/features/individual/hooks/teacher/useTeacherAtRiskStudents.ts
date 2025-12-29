// ============================================================
// FILE 7: useTeacherAtRiskStudents.ts
// Path: frontend/src/features/individual/hooks/teacher/useTeacherAtRiskStudents.ts
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../../api/analyticsApi";
import type { AtRiskStudentsDto } from "../../api/analyticsApi";

export function useTeacherAtRiskStudents(
  teacherId: number,
  subjectId: number,
  startDate?: string,
  endDate?: string,
  enabled = true
) {
  return useQuery<AtRiskStudentsDto>({
    queryKey: ["teacher", "atRiskStudents", teacherId, subjectId, startDate, endDate],
    queryFn: () =>
      analyticsApi.getAtRiskStudents(teacherId, subjectId, startDate, endDate),
    enabled: enabled && !!teacherId && !!subjectId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useCurrentTermAtRiskStudents(
  teacherId: number,
  subjectId: number,
  enabled = true
) {
  const now = new Date();
  const termStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const startDate = termStart.toISOString().split("T")[0];
  const endDate = now.toISOString().split("T")[0];

  return useTeacherAtRiskStudents(teacherId, subjectId, startDate, endDate, enabled);
}

export function useAtRiskStudentsSummary(
  teacherId: number,
  subjectId: number,
  enabled = true
) {
  const { data, ...queryState } = useTeacherAtRiskStudents(
    teacherId,
    subjectId,
    undefined,
    undefined,
    enabled
  );

  const summary = data
    ? {
        total: data.atRiskCount,
        percentage: (data.atRiskCount / data.totalStudents) * 100,
        byConcern: data.atRiskStudents.reduce((acc, student) => {
          student.concerns.forEach((concern) => {
            acc[concern] = (acc[concern] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>),
        criticalStudents: data.atRiskStudents.filter(
          (s) => s.averageScore < 40 || s.completionRate < 30
        ),
      }
    : null;

  return {
    ...queryState,
    data,
    summary,
  };
}