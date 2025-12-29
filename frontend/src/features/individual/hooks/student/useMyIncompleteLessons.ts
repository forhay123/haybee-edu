// frontend/src/features/individual/hooks/student/useMyIncompleteLessons.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type { IncompleteLessonsReport } from "../../api/assessmentInstancesApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const myIncompleteLessonsKeys = {
  all: ["my-incomplete-lessons"] as const,
  byRange: (fromDate?: string, toDate?: string) =>
    ["my-incomplete-lessons", fromDate, toDate] as const,
  current: () => ["my-incomplete-lessons", "current"] as const,
  byReason: (reason: string) =>
    ["my-incomplete-lessons", "by-reason", reason] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Get my incomplete lessons
 */
export function useMyIncompleteLessons(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: myIncompleteLessonsKeys.byRange(fromDate, toDate),
    queryFn: () =>
      assessmentInstancesApi.getMyIncompleteLessons(fromDate, toDate),
    staleTime: 1000 * 60 * 3, // 3 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });
}

/**
 * Get my current incomplete lessons (no date filter)
 */
export function useMyCurrentIncompleteLessons() {
  return useQuery({
    queryKey: myIncompleteLessonsKeys.current(),
    queryFn: () => assessmentInstancesApi.getMyIncompleteLessons(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 4,
  });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

/**
 * Sync incomplete lessons
 */
export function useSyncIncompleteLessons() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => assessmentInstancesApi.syncIncompleteLessons(),
    onSuccess: () => {
      // Invalidate all incomplete lessons queries
      queryClient.invalidateQueries({
        queryKey: myIncompleteLessonsKeys.all,
      });
      
      // Also invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["my-stats"],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-comprehensive-lessons"],
      });
    },
  });
}

// ============================================================
// HELPER HOOKS
// ============================================================

/**
 * Get my incomplete lessons for the current week
 */
export function useMyIncompleteThisWeek() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fromDate = weekStart.toISOString().split("T")[0];
  const toDate = weekEnd.toISOString().split("T")[0];

  return useMyIncompleteLessons(fromDate, toDate);
}

/**
 * Get my incomplete lessons for the current month
 */
export function useMyIncompleteThisMonth() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const fromDate = monthStart.toISOString().split("T")[0];
  const toDate = monthEnd.toISOString().split("T")[0];

  return useMyIncompleteLessons(fromDate, toDate);
}

/**
 * Get incomplete lessons summary with computed values
 */
export function useMyIncompleteLessonsSummary(
  fromDate?: string,
  toDate?: string
) {
  const { data, ...query } = useMyIncompleteLessons(fromDate, toDate);

  const summary = data
    ? {
        studentId: data.studentId,
        studentName: data.studentName,
        totalIncomplete: data.totalIncomplete,
        incompleteByReason: data.incompleteByReason,
        fromDate: data.fromDate,
        toDate: data.toDate,
        // Computed values
        hasIncomplete: data.totalIncomplete > 0,
        reasonCount: Object.keys(data.incompleteByReason).length,
        mostCommonReason:
          Object.entries(data.incompleteByReason).sort(
            ([, a], [, b]) => b.length - a.length
          )[0]?.[0] || null,
        mostCommonReasonCount:
          Object.entries(data.incompleteByReason).sort(
            ([, a], [, b]) => b.length - a.length
          )[0]?.[1]?.length || 0,
        // Breakdown by subject
        subjectsAffected: new Set(
          Object.values(data.incompleteByReason)
            .flat()
            .map((lesson) => lesson.subjectName)
        ).size,
        // Breakdown by week
        weeksAffected: new Set(
          Object.values(data.incompleteByReason)
            .flat()
            .map((lesson) => lesson.weekNumber)
        ).size,
        // Can still complete count
        canStillCompleteCount: Object.values(data.incompleteByReason)
          .flat()
          .filter((lesson) => lesson.canStillComplete).length,
        // Critical count (high priority)
        criticalCount: Object.values(data.incompleteByReason)
          .flat()
          .filter(
            (lesson) =>
              lesson.incompleteReason === "MISSED_GRACE_PERIOD" ||
              lesson.incompleteReason === "NO_ASSESSMENT"
          ).length,
      }
    : undefined;

  return {
    ...query,
    data: summary,
  };
}

/**
 * Get incomplete lessons grouped by subject
 */
export function useMyIncompleteLessonsBySubject(
  fromDate?: string,
  toDate?: string
) {
  const { data, ...query } = useMyIncompleteLessons(fromDate, toDate);

  const bySubject = data
    ? Object.values(data.incompleteByReason)
        .flat()
        .reduce((acc, lesson) => {
          const subject = lesson.subjectName;
          if (!acc[subject]) {
            acc[subject] = [];
          }
          acc[subject].push(lesson);
          return acc;
        }, {} as Record<string, typeof data.incompleteByReason[string]>)
    : undefined;

  return {
    ...query,
    data: bySubject,
  };
}

/**
 * Get incomplete lessons that can still be completed
 */
export function useMyRecoverableIncompleteLessons(
  fromDate?: string,
  toDate?: string
) {
  const { data, ...query } = useMyIncompleteLessons(fromDate, toDate);

  const recoverable = data
    ? Object.values(data.incompleteByReason)
        .flat()
        .filter((lesson) => lesson.canStillComplete)
    : undefined;

  return {
    ...query,
    data: recoverable,
  };
}

/**
 * Get incomplete lessons by priority (critical vs normal)
 */
export function useMyIncompleteLessonsByPriority(
  fromDate?: string,
  toDate?: string
) {
  const { data, ...query } = useMyIncompleteLessons(fromDate, toDate);

  const byPriority = data
    ? {
        critical: Object.values(data.incompleteByReason)
          .flat()
          .filter(
            (lesson) =>
              lesson.incompleteReason === "MISSED_GRACE_PERIOD" ||
              lesson.incompleteReason === "NO_ASSESSMENT"
          ),
        normal: Object.values(data.incompleteByReason)
          .flat()
          .filter(
            (lesson) =>
              lesson.incompleteReason !== "MISSED_GRACE_PERIOD" &&
              lesson.incompleteReason !== "NO_ASSESSMENT"
          ),
      }
    : undefined;

  return {
    ...query,
    data: byPriority,
  };
}

/**
 * Get incomplete lessons count only
 */
export function useMyIncompleteLessonsCount(
  fromDate?: string,
  toDate?: string
) {
  const { data, ...query } = useMyIncompleteLessons(fromDate, toDate);

  return {
    ...query,
    count: data?.totalIncomplete || 0,
  };
}

/**
 * Check if I have any incomplete lessons
 */
export function useHaveIncompleteLessons() {
  const { data, ...query } = useMyCurrentIncompleteLessons();

  return {
    ...query,
    hasIncomplete: (data?.totalIncomplete || 0) > 0,
  };
}