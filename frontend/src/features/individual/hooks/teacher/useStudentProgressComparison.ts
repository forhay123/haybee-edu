// ============================================================
// FILE 5: useStudentProgressComparison.ts
// Path: frontend/src/features/individual/hooks/teacher/useStudentProgressComparison.ts
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type { LessonStats } from "../../api/assessmentInstancesApi";

interface StudentProgressComparison {
  studentId: number;
  studentName: string;
  stats: LessonStats;
}

export function useMultipleStudentsProgress(
  studentIds: number[],
  fromDate?: string,
  toDate?: string,
  enabled = true
) {
  return useQuery<StudentProgressComparison[]>({
    queryKey: ["teacher", "studentsComparison", studentIds, fromDate, toDate],
    queryFn: async () => {
      const statsPromises = studentIds.map(async (studentId) => {
        const stats = await assessmentInstancesApi.getTeacherStudentStats(
          studentId,
          fromDate,
          toDate
        );
        return {
          studentId,
          studentName: `Student ${studentId}`, // You might want to fetch actual names
          stats,
        };
      });

      return Promise.all(statsPromises);
    },
    enabled: enabled && studentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentsComparisonSummary(
  studentIds: number[],
  fromDate?: string,
  toDate?: string,
  enabled = true
) {
  const { data, ...queryState } = useMultipleStudentsProgress(
    studentIds,
    fromDate,
    toDate,
    enabled
  );

  const summary = data
    ? {
        totalStudents: data.length,
        averageCompletionRate:
          data.reduce((sum, s) => sum + s.stats.completionRate, 0) / data.length,
        averageScore: data.reduce((sum, s) => sum + (s.stats.averageScore || 0), 0) / data.length,
        topPerformers: [...data]
          .sort((a, b) => b.stats.completionRate - a.stats.completionRate)
          .slice(0, 3),
        needsAttention: data.filter((s) => s.stats.completionRate < 50),
      }
    : null;

  return {
    ...queryState,
    data,
    summary,
  };
}