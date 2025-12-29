// frontend/src/features/individual/hooks/student/useMyUrgentLessons.ts

import { useQuery } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type { AssessmentInstance } from "../../api/assessmentInstancesApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const myUrgentLessonsKeys = {
  all: ["my-urgent-lessons"] as const,
  current: () => ["my-urgent-lessons", "current"] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Get my urgent lessons
 */
export function useMyUrgentLessons() {
  return useQuery({
    queryKey: myUrgentLessonsKeys.current(),
    queryFn: () => assessmentInstancesApi.getMyUrgentLessons(),
    staleTime: 1000 * 60 * 1, // 1 minute - urgent items need frequent updates
    refetchInterval: 1000 * 60 * 2, // Auto-refetch every 2 minutes
  });
}

// ============================================================
// HELPER HOOKS
// ============================================================

/**
 * Get urgent lessons with priority categorization
 */
export function useMyUrgentLessonsWithPriority() {
  const { data, ...query } = useMyUrgentLessons();

  const categorized = data
    ? {
        all: data,
        total: data.length,
        // Categorize by urgency
        critical: data.filter((lesson) => {
          const windowEnd = new Date(lesson.assessmentWindowEnd);
          const now = new Date();
          const hoursRemaining =
            (windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursRemaining <= 2; // Less than 2 hours
        }),
        high: data.filter((lesson) => {
          const windowEnd = new Date(lesson.assessmentWindowEnd);
          const now = new Date();
          const hoursRemaining =
            (windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursRemaining > 2 && hoursRemaining <= 6; // 2-6 hours
        }),
        medium: data.filter((lesson) => {
          const windowEnd = new Date(lesson.assessmentWindowEnd);
          const now = new Date();
          const hoursRemaining =
            (windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursRemaining > 6 && hoursRemaining <= 24; // 6-24 hours
        }),
        low: data.filter((lesson) => {
          const windowEnd = new Date(lesson.assessmentWindowEnd);
          const now = new Date();
          const hoursRemaining =
            (windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursRemaining > 24; // More than 24 hours
        }),
      }
    : undefined;

  return {
    ...query,
    data: categorized,
  };
}

/**
 * Get urgent lessons grouped by subject
 */
export function useMyUrgentLessonsBySubject() {
  const { data, ...query } = useMyUrgentLessons();

  const bySubject = data
    ? data.reduce((acc, lesson) => {
        const subject = lesson.subjectName;
        if (!acc[subject]) {
          acc[subject] = [];
        }
        acc[subject].push(lesson);
        return acc;
      }, {} as Record<string, AssessmentInstance[]>)
    : undefined;

  return {
    ...query,
    data: bySubject,
  };
}

/**
 * Get urgent lessons sorted by deadline
 */
export function useMyUrgentLessonsSortedByDeadline() {
  const { data, ...query } = useMyUrgentLessons();

  const sorted = data
    ? [...data].sort((a, b) => {
        const aEnd = new Date(a.assessmentWindowEnd).getTime();
        const bEnd = new Date(b.assessmentWindowEnd).getTime();
        return aEnd - bEnd; // Earliest deadline first
      })
    : undefined;

  return {
    ...query,
    data: sorted,
  };
}

/**
 * Get most urgent lesson (closest deadline)
 */
export function useMostUrgentLesson() {
  const { data, ...query } = useMyUrgentLessonsSortedByDeadline();

  const mostUrgent = data && data.length > 0 ? data[0] : undefined;

  return {
    ...query,
    data: mostUrgent,
  };
}

/**
 * Get urgent lessons with time remaining
 */
export function useMyUrgentLessonsWithTimeRemaining() {
  const { data, ...query } = useMyUrgentLessons();

  const withTimeRemaining = data
    ? data.map((lesson) => {
        const windowEnd = new Date(lesson.assessmentWindowEnd);
        const now = new Date();
        const msRemaining = windowEnd.getTime() - now.getTime();
        const hoursRemaining = msRemaining / (1000 * 60 * 60);
        const minutesRemaining = msRemaining / (1000 * 60);

        return {
          ...lesson,
          msRemaining,
          hoursRemaining,
          minutesRemaining,
          daysRemaining: hoursRemaining / 24,
          timeRemainingLabel:
            hoursRemaining < 1
              ? `${Math.floor(minutesRemaining)} minutes`
              : hoursRemaining < 24
              ? `${Math.floor(hoursRemaining)} hours`
              : `${Math.floor(hoursRemaining / 24)} days`,
          urgencyLevel:
            hoursRemaining <= 2
              ? "critical"
              : hoursRemaining <= 6
              ? "high"
              : hoursRemaining <= 24
              ? "medium"
              : "low",
          urgencyColor:
            hoursRemaining <= 2
              ? "red"
              : hoursRemaining <= 6
              ? "orange"
              : hoursRemaining <= 24
              ? "yellow"
              : "green",
        };
      })
    : undefined;

  return {
    ...query,
    data: withTimeRemaining,
  };
}

/**
 * Check if I have urgent lessons
 */
export function useHaveUrgentLessons() {
  const { data, ...query } = useMyUrgentLessons();

  return {
    ...query,
    hasUrgent: (data?.length || 0) > 0,
    urgentCount: data?.length || 0,
  };
}

/**
 * Check if I have critical urgent lessons (< 2 hours)
 */
export function useHaveCriticalUrgentLessons() {
  const { data, ...query } = useMyUrgentLessonsWithPriority();

  return {
    ...query,
    hasCritical: (data?.critical.length || 0) > 0,
    criticalCount: data?.critical.length || 0,
  };
}

/**
 * Get urgent lessons count by priority
 */
export function useUrgentLessonsCountByPriority() {
  const { data, ...query } = useMyUrgentLessonsWithPriority();

  const counts = data
    ? {
        total: data.total,
        critical: data.critical.length,
        high: data.high.length,
        medium: data.medium.length,
        low: data.low.length,
      }
    : undefined;

  return {
    ...query,
    data: counts,
  };
}