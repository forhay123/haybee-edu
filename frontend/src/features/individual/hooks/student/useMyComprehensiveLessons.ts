// frontend/src/features/individual/hooks/student/useMyComprehensiveLessons.ts

import { useQuery } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type { ComprehensiveLessonsReport } from "../../api/assessmentInstancesApi";

// ============================================================
// QUERY KEYS
// ============================================================

export const myComprehensiveLessonsKeys = {
  all: ["my-comprehensive-lessons"] as const,
  byRange: (fromDate?: string, toDate?: string, statusFilter?: string) =>
    ["my-comprehensive-lessons", fromDate, toDate, statusFilter] as const,
  current: () => ["my-comprehensive-lessons", "current"] as const,
  thisWeek: () => ["my-comprehensive-lessons", "this-week"] as const,
  thisMonth: () => ["my-comprehensive-lessons", "this-month"] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

/**
 * Get my comprehensive lessons
 */
export function useMyComprehensiveLessons(
  fromDate?: string,
  toDate?: string,
  statusFilter?: string
) {
  return useQuery({
    queryKey: myComprehensiveLessonsKeys.byRange(fromDate, toDate, statusFilter),
    queryFn: () =>
      assessmentInstancesApi.getMyComprehensiveLessons(fromDate, toDate, statusFilter),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get my current comprehensive lessons (no filter)
 */
export function useMyCurrentComprehensiveLessons() {
  return useQuery({
    queryKey: myComprehensiveLessonsKeys.current(),
    queryFn: () => assessmentInstancesApi.getMyComprehensiveLessons(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get my comprehensive lessons for this week
 */
export function useMyComprehensiveLessonsThisWeek() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fromDate = weekStart.toISOString().split("T")[0];
  const toDate = weekEnd.toISOString().split("T")[0];

  return useQuery({
    queryKey: myComprehensiveLessonsKeys.thisWeek(),
    queryFn: () => assessmentInstancesApi.getMyComprehensiveLessons(fromDate, toDate),
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Get my comprehensive lessons for this month
 */
export function useMyComprehensiveLessonsThisMonth() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const fromDate = monthStart.toISOString().split("T")[0];
  const toDate = monthEnd.toISOString().split("T")[0];

  return useQuery({
    queryKey: myComprehensiveLessonsKeys.thisMonth(),
    queryFn: () => assessmentInstancesApi.getMyComprehensiveLessons(fromDate, toDate),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get completed lessons only
 */
export function useMyCompletedLessons(fromDate?: string, toDate?: string) {
  return useMyComprehensiveLessons(fromDate, toDate, "COMPLETED");
}

/**
 * Get incomplete lessons only
 */
export function useMyIncompleteLessonsOnly(fromDate?: string, toDate?: string) {
  return useMyComprehensiveLessons(fromDate, toDate, "INCOMPLETE");
}

/**
 * Get missed lessons only
 */
export function useMyMissedLessons(fromDate?: string, toDate?: string) {
  return useMyComprehensiveLessons(fromDate, toDate, "MISSED");
}

/**
 * Get in-progress lessons only
 */
export function useMyInProgressLessons(fromDate?: string, toDate?: string) {
  return useMyComprehensiveLessons(fromDate, toDate, "IN_PROGRESS");
}

// ============================================================
// HELPER HOOKS
// ============================================================

/**
 * Get comprehensive lessons with enhanced summary
 */
export function useMyComprehensiveLessonsWithSummary(
  fromDate?: string,
  toDate?: string,
  statusFilter?: string
) {
  const { data, ...query } = useMyComprehensiveLessons(fromDate, toDate, statusFilter);

  const enhanced = data
    ? {
        ...data,
        // Additional computed values
        hasLessons: data.totalLessons > 0,
        allCompleted: data.completedCount === data.totalLessons,
        hasIncomplete: data.missedCount > 0 || data.inProgressCount > 0,
        // Performance indicators
        performanceLevel:
          data.completionRate >= 90
            ? "excellent"
            : data.completionRate >= 75
            ? "good"
            : data.completionRate >= 60
            ? "average"
            : "needs-improvement",
        performanceColor:
          data.completionRate >= 90
            ? "green"
            : data.completionRate >= 75
            ? "blue"
            : data.completionRate >= 60
            ? "yellow"
            : "red",
        // Status breakdown percentages
        completedPercentage: (data.completedCount / data.totalLessons) * 100,
        missedPercentage: (data.missedCount / data.totalLessons) * 100,
        inProgressPercentage: (data.inProgressCount / data.totalLessons) * 100,
        scheduledPercentage: (data.scheduledCount / data.totalLessons) * 100,
      }
    : undefined;

  return {
    ...query,
    data: enhanced,
  };
}

/**
 * Get lessons grouped by subject
 */
export function useMyLessonsBySubject(
  fromDate?: string,
  toDate?: string,
  statusFilter?: string
) {
  const { data, ...query } = useMyComprehensiveLessons(fromDate, toDate, statusFilter);

  const bySubject = data
    ? data.lessons.reduce((acc, lesson) => {
        const subject = lesson.subjectName;
        if (!acc[subject]) {
          acc[subject] = [];
        }
        acc[subject].push(lesson);
        return acc;
      }, {} as Record<string, typeof data.lessons>)
    : undefined;

  return {
    ...query,
    data: bySubject,
  };
}

/**
 * Get lessons grouped by status
 */
export function useMyLessonsByStatus(fromDate?: string, toDate?: string) {
  const { data, ...query } = useMyComprehensiveLessons(fromDate, toDate);

  const byStatus = data
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
    data: byStatus,
  };
}

/**
 * Get lessons timeline (sorted by date)
 */
export function useMyLessonsTimeline(fromDate?: string, toDate?: string) {
  const { data, ...query } = useMyComprehensiveLessons(fromDate, toDate);

  const timeline = data
    ? [...data.lessons].sort((a, b) => {
        const dateA = new Date(a.scheduledDate).getTime();
        const dateB = new Date(b.scheduledDate).getTime();
        return dateA - dateB;
      })
    : undefined;

  return {
    ...query,
    data: timeline,
  };
}

/**
 * Get subject performance summary
 */
export function useMySubjectPerformanceSummary(
  fromDate?: string,
  toDate?: string
) {
  const { data, ...query } = useMyComprehensiveLessons(fromDate, toDate);

  const subjectSummary = data
    ? Object.entries(
        data.lessons.reduce((acc, lesson) => {
          const subject = lesson.subjectName;
          if (!acc[subject]) {
            acc[subject] = {
              subjectName: subject,
              total: 0,
              completed: 0,
              missed: 0,
              inProgress: 0,
              scheduled: 0,
              totalScore: 0,
              scoredLessons: 0,
            };
          }
          acc[subject].total++;
          if (lesson.status === "COMPLETED") acc[subject].completed++;
          if (lesson.status === "MISSED") acc[subject].missed++;
          if (lesson.status === "IN_PROGRESS") acc[subject].inProgress++;
          if (lesson.status === "SCHEDULED") acc[subject].scheduled++;
          if (lesson.score && lesson.maxScore) {
            acc[subject].totalScore += (lesson.score / lesson.maxScore) * 100;
            acc[subject].scoredLessons++;
          }
          return acc;
        }, {} as Record<string, any>)
      ).map(([subject, stats]) => ({
        subjectName: subject,
        totalLessons: stats.total,
        completedLessons: stats.completed,
        missedLessons: stats.missed,
        inProgressLessons: stats.inProgress,
        scheduledLessons: stats.scheduled,
        completionRate: (stats.completed / stats.total) * 100,
        averageScore:
          stats.scoredLessons > 0 ? stats.totalScore / stats.scoredLessons : undefined,
      }))
    : undefined;

  return {
    ...query,
    data: subjectSummary,
  };
}

/**
 * Get recent activity (last 7 days)
 */
export function useMyRecentActivity() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const fromDate = sevenDaysAgo.toISOString().split("T")[0];
  const toDate = today.toISOString().split("T")[0];

  return useMyComprehensiveLessons(fromDate, toDate);
}

/**
 * Get upcoming lessons (next 7 days)
 */
export function useMyUpcomingLessons() {
  const today = new Date();
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);

  const fromDate = today.toISOString().split("T")[0];
  const toDate = sevenDaysLater.toISOString().split("T")[0];

  return useMyComprehensiveLessons(fromDate, toDate, "SCHEDULED");
}