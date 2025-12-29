// frontend/src/features/individual/hooks/student/useMultiPeriodProgress.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentInstancesApi } from "../../api/assessmentInstancesApi";
import type {
  AssessmentInstance,
  ComprehensiveLessonsReport,
} from "../../api/assessmentInstancesApi";

// ============================================================
// TYPES
// ============================================================

export interface MultiPeriodLessonProgress {
  lessonTopicId: number;
  lessonTopicTitle: string;
  subjectId: number;
  subjectName: string;
  weekNumber: number;
  totalPeriods: number;
  completedPeriods: number;
  incompletePeriods: number;
  scheduledPeriods: number;
  completionPercentage: number;
  isFullyCompleted: boolean;
  averageScore?: number;
  periods: PeriodProgress[];
  nextPendingPeriod?: PeriodProgress;
  allPeriodsExpired: boolean;
}

export interface PeriodProgress {
  progressId: number;
  periodSequence: number; // 1 of 3, 2 of 3, etc.
  scheduledDate: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  assessmentInstanceId: string;
  assessmentWindowStart: string;
  assessmentWindowEnd: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "INCOMPLETE";
  isAccessible: boolean;
  canStillComplete: boolean;
  score?: number;
  maxScore?: number;
  grade?: string;
  completedAt?: string;
  incompleteReason?: string;
  autoMarkedIncompleteAt?: string;
  timeRemaining?: string; // Human-readable: "2 hours 15 minutes"
  isPending: boolean; // True if scheduled but not completed
}

export interface MultiPeriodSummary {
  totalLessons: number;
  fullyCompletedLessons: number;
  partiallyCompletedLessons: number;
  incompleteLessons: number;
  scheduledLessons: number;
  overallCompletionRate: number;
  averageScore?: number;
  bySubject: Record<string, SubjectMultiPeriodStats>;
  urgentAssessments: PeriodProgress[]; // Due within 24 hours
  missedPeriods: PeriodProgress[];
}

export interface SubjectMultiPeriodStats {
  subjectId: number;
  subjectName: string;
  totalLessons: number;
  fullyCompletedLessons: number;
  completionRate: number;
  averageScore?: number;
}

// ============================================================
// HOOK: useMultiPeriodProgress
// ============================================================

export function useMultiPeriodProgress(
  fromDate?: string,
  toDate?: string,
  enabled = true
) {
  const queryClient = useQueryClient();

  // ============================================================
  // FETCH COMPREHENSIVE LESSONS
  // ============================================================

  const { data: lessonsReport, ...queryState } = useQuery<ComprehensiveLessonsReport>({
    queryKey: ["multiPeriodProgress", "comprehensive", fromDate, toDate],
    queryFn: () =>
      assessmentInstancesApi.getMyComprehensiveLessons(fromDate, toDate),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // ============================================================
  // TRANSFORM TO MULTI-PERIOD STRUCTURE
  // ============================================================

  const multiPeriodLessons: MultiPeriodLessonProgress[] = transformToMultiPeriod(
    lessonsReport?.lessons || []
  );

  // ============================================================
  // CALCULATE SUMMARY
  // ============================================================

  const summary: MultiPeriodSummary = calculateSummary(multiPeriodLessons);

  // ============================================================
  // FILTER METHODS
  // ============================================================

  const getFullyCompletedLessons = () => {
    return multiPeriodLessons.filter((lesson) => lesson.isFullyCompleted);
  };

  const getPartiallyCompletedLessons = () => {
    return multiPeriodLessons.filter(
      (lesson) =>
        lesson.completedPeriods > 0 &&
        lesson.completedPeriods < lesson.totalPeriods
    );
  };

  const getIncompleteLessons = () => {
    return multiPeriodLessons.filter(
      (lesson) => lesson.incompletePeriods > 0 || lesson.allPeriodsExpired
    );
  };

  const getScheduledLessons = () => {
    return multiPeriodLessons.filter((lesson) => lesson.scheduledPeriods > 0);
  };

  const getUrgentAssessments = () => {
    return summary.urgentAssessments;
  };

  const getMissedPeriods = () => {
    return summary.missedPeriods;
  };

  const getLessonById = (lessonTopicId: number) => {
    return multiPeriodLessons.find(
      (lesson) => lesson.lessonTopicId === lessonTopicId
    );
  };

  const getLessonsBySubject = (subjectId: number) => {
    return multiPeriodLessons.filter(
      (lesson) => lesson.subjectId === subjectId
    );
  };

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Data
    multiPeriodLessons,
    summary,
    lessonsReport,

    // Query states
    isLoading: queryState.isLoading,
    error: queryState.error,
    refetch: queryState.refetch,

    // Filter methods
    getFullyCompletedLessons,
    getPartiallyCompletedLessons,
    getIncompleteLessons,
    getScheduledLessons,
    getUrgentAssessments,
    getMissedPeriods,
    getLessonById,
    getLessonsBySubject,
  };
}

// ============================================================
// TRANSFORMATION HELPER
// ============================================================

function transformToMultiPeriod(
  lessons: AssessmentInstance[]
): MultiPeriodLessonProgress[] {
  // Group lessons by lessonTopicId
  const grouped: Record<number, AssessmentInstance[]> = {};

  lessons.forEach((lesson) => {
    if (!lesson.lessonTopicId) return;

    if (!grouped[lesson.lessonTopicId]) {
      grouped[lesson.lessonTopicId] = [];
    }
    grouped[lesson.lessonTopicId].push(lesson);
  });

  // Transform each group into MultiPeriodLessonProgress
  return Object.entries(grouped).map(([lessonTopicIdStr, periods]) => {
    const lessonTopicId = parseInt(lessonTopicIdStr);
    const firstPeriod = periods[0];

    // Sort by scheduled date and period number
    const sortedPeriods = [...periods].sort((a, b) => {
      const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
      if (dateCompare !== 0) return dateCompare;
      return a.periodNumber - b.periodNumber;
    });

    // Transform to PeriodProgress
    const periodProgress: PeriodProgress[] = sortedPeriods.map(
      (period, index) => ({
        progressId: period.id,
        periodSequence: index + 1,
        scheduledDate: period.scheduledDate,
        dayOfWeek: new Date(period.scheduledDate).toLocaleDateString("en-US", {
          weekday: "long",
        }),
        periodNumber: period.periodNumber,

        // Derived times from assessment window
        startTime: new Date(period.assessmentWindowStart).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        endTime: new Date(period.assessmentWindowEnd).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),

        assessmentInstanceId: period.id.toString(),
        assessmentWindowStart: period.assessmentWindowStart,
        assessmentWindowEnd: period.assessmentWindowEnd,
        status: period.status,
        isAccessible: period.canStillComplete,
        canStillComplete: period.canStillComplete,
        score: period.score,
        maxScore: period.maxScore,
        grade: period.grade,
        completedAt: period.completedAt,
        incompleteReason: period.incompleteReason,
        autoMarkedIncompleteAt: period.autoMarkedIncompleteAt,
        timeRemaining: calculateTimeRemaining(period.assessmentWindowEnd),
        isPending:
          period.status === "SCHEDULED" || period.status === "IN_PROGRESS",
      })
    );

    // Calculate stats
    const completedPeriods = periodProgress.filter(
      (p) => p.status === "COMPLETED"
    ).length;
    const incompletePeriods = periodProgress.filter(
      (p) => p.status === "INCOMPLETE" || p.status === "MISSED"
    ).length;
    const scheduledPeriods = periodProgress.filter(
      (p) => p.status === "SCHEDULED"
    ).length;

    const totalPeriods = periodProgress.length;
    const completionPercentage =
      totalPeriods > 0 ? (completedPeriods / totalPeriods) * 100 : 0;
    const isFullyCompleted = completedPeriods === totalPeriods;

    // Calculate average score
    const completedWithScores = periodProgress.filter(
      (p) => p.status === "COMPLETED" && p.score !== undefined
    );
    const averageScore =
      completedWithScores.length > 0
        ? completedWithScores.reduce((sum, p) => sum + (p.score || 0), 0) /
          completedWithScores.length
        : undefined;

    // Find next pending period
    const nextPendingPeriod = periodProgress.find(
      (p) => p.isPending && p.canStillComplete
    );

    // Check if all periods expired
    const allPeriodsExpired = periodProgress.every(
      (p) => !p.canStillComplete && p.status !== "COMPLETED"
    );

    return {
      lessonTopicId,
      lessonTopicTitle: firstPeriod.lessonTopicTitle,
      subjectId: firstPeriod.subjectId,
      subjectName: firstPeriod.subjectName,
      weekNumber: extractWeekNumber(firstPeriod.scheduledDate),
      totalPeriods,
      completedPeriods,
      incompletePeriods,
      scheduledPeriods,
      completionPercentage,
      isFullyCompleted,
      averageScore,
      periods: periodProgress,
      nextPendingPeriod,
      allPeriodsExpired,
    };
  });
}

// ============================================================
// SUMMARY CALCULATION
// ============================================================

function calculateSummary(
  lessons: MultiPeriodLessonProgress[]
): MultiPeriodSummary {
  const fullyCompletedLessons = lessons.filter((l) => l.isFullyCompleted).length;
  const partiallyCompletedLessons = lessons.filter(
    (l) => l.completedPeriods > 0 && l.completedPeriods < l.totalPeriods
  ).length;
  const incompleteLessons = lessons.filter(
    (l) => l.incompletePeriods > 0 || l.allPeriodsExpired
  ).length;
  const scheduledLessons = lessons.filter((l) => l.scheduledPeriods > 0).length;

  const totalLessons = lessons.length;
  const overallCompletionRate =
    totalLessons > 0 ? (fullyCompletedLessons / totalLessons) * 100 : 0;

  // Calculate overall average score
  const lessonsWithScores = lessons.filter((l) => l.averageScore !== undefined);
  const averageScore =
    lessonsWithScores.length > 0
      ? lessonsWithScores.reduce((sum, l) => sum + (l.averageScore || 0), 0) /
        lessonsWithScores.length
      : undefined;

  // Group by subject
  const bySubject: Record<string, SubjectMultiPeriodStats> = {};
  lessons.forEach((lesson) => {
    const subject = lesson.subjectName;
    if (!bySubject[subject]) {
      bySubject[subject] = {
        subjectId: lesson.subjectId,
        subjectName: subject,
        totalLessons: 0,
        fullyCompletedLessons: 0,
        completionRate: 0,
        averageScore: undefined,
      };
    }

    bySubject[subject].totalLessons++;
    if (lesson.isFullyCompleted) {
      bySubject[subject].fullyCompletedLessons++;
    }

    // Update completion rate
    bySubject[subject].completionRate =
      (bySubject[subject].fullyCompletedLessons /
        bySubject[subject].totalLessons) *
      100;
  });

  // Calculate average scores per subject
  Object.keys(bySubject).forEach((subject) => {
    const subjectLessons = lessons.filter((l) => l.subjectName === subject);
    const withScores = subjectLessons.filter((l) => l.averageScore !== undefined);
    bySubject[subject].averageScore =
      withScores.length > 0
        ? withScores.reduce((sum, l) => sum + (l.averageScore || 0), 0) /
          withScores.length
        : undefined;
  });

  // Get urgent assessments (due within 24 hours)
  const now = new Date();
  const urgentAssessments: PeriodProgress[] = [];
  lessons.forEach((lesson) => {
    lesson.periods.forEach((period) => {
      if (period.isPending && period.canStillComplete) {
        const windowEnd = new Date(period.assessmentWindowEnd);
        const hoursRemaining =
          (windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursRemaining <= 24 && hoursRemaining > 0) {
          urgentAssessments.push(period);
        }
      }
    });
  });

  // Sort urgent by time remaining
  urgentAssessments.sort((a, b) => {
    return (
      new Date(a.assessmentWindowEnd).getTime() -
      new Date(b.assessmentWindowEnd).getTime()
    );
  });

  // Get missed periods
  const missedPeriods: PeriodProgress[] = [];
  lessons.forEach((lesson) => {
    lesson.periods.forEach((period) => {
      if (period.status === "MISSED" || period.status === "INCOMPLETE") {
        missedPeriods.push(period);
      }
    });
  });

  return {
    totalLessons,
    fullyCompletedLessons,
    partiallyCompletedLessons,
    incompleteLessons,
    scheduledLessons,
    overallCompletionRate,
    averageScore,
    bySubject,
    urgentAssessments,
    missedPeriods,
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function calculateTimeRemaining(windowEnd: string): string {
  const now = new Date();
  const end = new Date(windowEnd);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ${hours % 24} hour${
      hours % 24 !== 1 ? "s" : ""
    }`;
  }

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min${
      minutes !== 1 ? "s" : ""
    }`;
  }

  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

function extractWeekNumber(scheduledDate: string): number {
  // This is a simplified version - you might need to calculate based on term start date
  // For now, extract from the date itself or return a placeholder
  const date = new Date(scheduledDate);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.ceil(daysSinceStart / 7);
}

// ============================================================
// STANDALONE HOOKS
// ============================================================

/**
 * Get multi-period progress for current week
 */
export function useCurrentWeekMultiPeriodProgress() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fromDate = weekStart.toISOString().split("T")[0];
  const toDate = weekEnd.toISOString().split("T")[0];

  return useMultiPeriodProgress(fromDate, toDate);
}

/**
 * Get multi-period progress for current month
 */
export function useCurrentMonthMultiPeriodProgress() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const fromDate = monthStart.toISOString().split("T")[0];
  const toDate = monthEnd.toISOString().split("T")[0];

  return useMultiPeriodProgress(fromDate, toDate);
}

/**
 * Get multi-period progress for a specific lesson topic
 */
export function useLessonMultiPeriodProgress(
  lessonTopicId: number,
  fromDate?: string,
  toDate?: string
) {
  const { multiPeriodLessons, ...rest } = useMultiPeriodProgress(
    fromDate,
    toDate
  );

  const lesson = multiPeriodLessons.find(
    (l) => l.lessonTopicId === lessonTopicId
  );

  return {
    lesson,
    ...rest,
  };
}