// frontend/src/features/individual/hooks/student/useMyDailyProgress.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type {
  DailyProgressDto,
  ProgressUpdateRequest,
} from "../../api/assessmentInstancesApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const myDailyProgressKeys = {
  all: ["my-daily-progress"] as const,
  byDate: (date?: string) => ["my-daily-progress", date] as const,
  today: () => ["my-daily-progress", "today"] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Get my daily progress for a specific date
 */
export function useMyDailyProgress(date?: string) {
  return useQuery({
    queryKey: myDailyProgressKeys.byDate(date),
    queryFn: () => assessmentInstancesApi.getMyDailyProgress(date),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });
}

/**
 * Get my daily progress for today
 */
export function useMyTodayProgress() {
  const today = new Date().toISOString().split("T")[0];
  
  return useQuery({
    queryKey: myDailyProgressKeys.today(),
    queryFn: () => assessmentInstancesApi.getMyDailyProgress(today),
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 3, // Auto-refetch every 3 minutes
  });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

/**
 * Mark a lesson as complete
 */
export function useMarkLessonComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProgressUpdateRequest) =>
      assessmentInstancesApi.markLessonComplete(request),
    onSuccess: () => {
      // Invalidate all daily progress queries
      queryClient.invalidateQueries({
        queryKey: myDailyProgressKeys.all,
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
 * Get my progress for a specific day of the week
 */
export function useMyProgressForDay(daysFromToday: number) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysFromToday);
  const dateStr = targetDate.toISOString().split("T")[0];

  return useMyDailyProgress(dateStr);
}

/**
 * Get my progress for tomorrow
 */
export function useMyTomorrowProgress() {
  return useMyProgressForDay(1);
}

/**
 * Get my progress for yesterday
 */
export function useMyYesterdayProgress() {
  return useMyProgressForDay(-1);
}

/**
 * Get summary stats from daily progress
 */
export function useMyDailyProgressSummary(date?: string) {
  const { data, ...query } = useMyDailyProgress(date);

  const summary = data
    ? {
        date: data.date,
        totalLessons: data.lessons.length,
        completedLessons: data.lessons.filter((l) => l.status === "COMPLETED")
          .length,
        inProgressLessons: data.lessons.filter(
          (l) => l.status === "IN_PROGRESS"
        ).length,
        scheduledLessons: data.lessons.filter((l) => l.status === "SCHEDULED")
          .length,
        missedLessons: data.lessons.filter((l) => l.status === "MISSED").length,
        incompleteLessons: data.lessons.filter((l) => l.status === "INCOMPLETE")
          .length,
        completionRate:
          data.lessons.length > 0
            ? (data.lessons.filter((l) => l.status === "COMPLETED").length /
                data.lessons.length) *
              100
            : 0,
        hasLessons: data.lessons.length > 0,
        allCompleted:
          data.lessons.length > 0 &&
          data.lessons.every((l) => l.status === "COMPLETED"),
        hasIncomplete: data.lessons.some((l) => l.status === "INCOMPLETE"),
        hasMissed: data.lessons.some((l) => l.status === "MISSED"),
        averageScore: data.lessons.reduce((acc, l) => {
          if (l.score && l.maxScore) {
            return acc + (l.score / l.maxScore) * 100;
          }
          return acc;
        }, 0) / data.lessons.filter((l) => l.score).length || 0,
      }
    : undefined;

  return {
    ...query,
    data: summary,
  };
}

/**
 * Get lessons grouped by status
 */
export function useMyDailyProgressByStatus(date?: string) {
  const { data, ...query } = useMyDailyProgress(date);

  const grouped = data
    ? {
        completed: data.lessons.filter((l) => l.status === "COMPLETED"),
        inProgress: data.lessons.filter((l) => l.status === "IN_PROGRESS"),
        scheduled: data.lessons.filter((l) => l.status === "SCHEDULED"),
        missed: data.lessons.filter((l) => l.status === "MISSED"),
        incomplete: data.lessons.filter((l) => l.status === "INCOMPLETE"),
      }
    : undefined;

  return {
    ...query,
    data: grouped,
  };
}

/**
 * Get lessons grouped by subject
 */
export function useMyDailyProgressBySubject(date?: string) {
  const { data, ...query } = useMyDailyProgress(date);

  const grouped = data
    ? data.lessons.reduce((acc, lesson) => {
        const subjectName = lesson.subjectName;
        if (!acc[subjectName]) {
          acc[subjectName] = [];
        }
        acc[subjectName].push(lesson);
        return acc;
      }, {} as Record<string, typeof data.lessons>)
    : undefined;

  return {
    ...query,
    data: grouped,
  };
}

/**
 * Check if I have lessons today
 */
export function useHaveLessonsToday() {
  const { data, ...query } = useMyTodayProgress();

  const hasLessons = data ? data.lessons.length > 0 : false;

  return {
    ...query,
    hasLessons,
  };
}

/**
 * Get upcoming lessons for today (not yet completed)
 */
export function useMyUpcomingLessonsToday() {
  const { data, ...query } = useMyTodayProgress();

  const upcoming = data
    ? data.lessons.filter(
        (l) => l.status === "SCHEDULED" || l.status === "IN_PROGRESS"
      )
    : undefined;

  return {
    ...query,
    data: upcoming,
  };
}