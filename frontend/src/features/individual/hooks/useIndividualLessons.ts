// frontend/src/features/individual/hooks/useIndividualLessons.ts

import { useQuery } from "@tanstack/react-query";
import { lessonTopicApi } from "../api/individualApi";
import { IndividualLessonTopicDto } from "../types/individualTypes";

/**
 * Hook for fetching all lesson topics for an individual student
 */
export function useIndividualLessons(studentProfileId: number) {
  const {
    data: lessons,
    isLoading,
    error,
    refetch,
  } = useQuery<IndividualLessonTopicDto[]>({
    queryKey: ["individual-lessons", studentProfileId],
    queryFn: () => lessonTopicApi.getByStudent(studentProfileId),
    enabled: !!studentProfileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    lessons: lessons || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching lesson topics for a specific subject
 */
export function useIndividualLessonsBySubject(
  studentProfileId: number,
  subjectId: number
) {
  const {
    data: lessons,
    isLoading,
    error,
    refetch,
  } = useQuery<IndividualLessonTopicDto[]>({
    queryKey: ["individual-lessons", studentProfileId, subjectId],
    queryFn: () => lessonTopicApi.getByStudentAndSubject(studentProfileId, subjectId),
    enabled: !!studentProfileId && !!subjectId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    lessons: lessons || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get lesson statistics
 */
export function useLessonStats(lessons: IndividualLessonTopicDto[]) {
  const totalLessons = lessons.length;

  // Group by subject
  const bySubject = lessons.reduce((acc, lesson) => {
    const subjectName = lesson.subjectName;
    if (!acc[subjectName]) {
      acc[subjectName] = {
        count: 0,
        subjectId: lesson.subjectId,
        lessons: [],
      };
    }
    acc[subjectName].count++;
    acc[subjectName].lessons.push(lesson);
    return acc;
  }, {} as Record<string, { count: number; subjectId: number; lessons: IndividualLessonTopicDto[] }>);

  // Group by week
  const byWeek = lessons.reduce((acc, lesson) => {
    const week = lesson.weekNumber;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(lesson);
    return acc;
  }, {} as Record<number, IndividualLessonTopicDto[]>);

  // Group by term
  const byTerm = lessons.reduce((acc, lesson) => {
    const term = lesson.termName || "Unassigned";
    if (!acc[term]) {
      acc[term] = [];
    }
    acc[term].push(lesson);
    return acc;
  }, {} as Record<string, IndividualLessonTopicDto[]>);

  // Get unique subjects
  const subjects = Object.entries(bySubject).map(([name, data]) => ({
    name,
    id: data.subjectId,
    count: data.count,
  }));

  // Calculate average confidence score
  const lessonsWithConfidence = lessons.filter((l) => l.mappingConfidence !== undefined);
  const averageConfidence =
    lessonsWithConfidence.length > 0
      ? lessonsWithConfidence.reduce((sum, l) => sum + (l.mappingConfidence || 0), 0) /
        lessonsWithConfidence.length
      : null;

  // Get weeks covered
  const weeks = [...new Set(lessons.map((l) => l.weekNumber))].sort((a, b) => a - b);
  const totalWeeks = weeks.length;

  return {
    totalLessons,
    bySubject,
    byWeek,
    byTerm,
    subjects,
    averageConfidence,
    weeks,
    totalWeeks,
  };
}

/**
 * Hook for filtering lessons
 */
export function useFilteredLessons(
  lessons: IndividualLessonTopicDto[],
  filters?: {
    subjectId?: number;
    weekNumber?: number;
    termId?: number;
    searchQuery?: string;
  }
) {
  let filtered = [...lessons];

  if (filters?.subjectId) {
    filtered = filtered.filter((l) => l.subjectId === filters.subjectId);
  }

  if (filters?.weekNumber) {
    filtered = filtered.filter((l) => l.weekNumber === filters.weekNumber);
  }

  if (filters?.termId) {
    filtered = filtered.filter((l) => l.termId === filters.termId);
  }

  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.topicTitle.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query) ||
        l.subjectName.toLowerCase().includes(query)
    );
  }

  return filtered;
}

/**
 * Hook for sorting lessons
 */
export function useSortedLessons(
  lessons: IndividualLessonTopicDto[],
  sortBy: "week" | "subject" | "date" | "title" = "week"
) {
  const sorted = [...lessons].sort((a, b) => {
    switch (sortBy) {
      case "week":
        return a.weekNumber - b.weekNumber;
      case "subject":
        return a.subjectName.localeCompare(b.subjectName);
      case "date":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "title":
        return a.topicTitle.localeCompare(b.topicTitle);
      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * Hook to get lessons for current week
 */
export function useCurrentWeekLessons(
  lessons: IndividualLessonTopicDto[],
  currentWeek?: number
) {
  if (!currentWeek) {
    // Calculate current week based on term start date
    // This is a simplified calculation - you may need to adjust based on your term structure
    const now = new Date();
    const termStartDate = new Date(now.getFullYear(), 8, 1); // September 1st
    const diffTime = Math.abs(now.getTime() - termStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    currentWeek = Math.ceil(diffDays / 7);
  }

  return lessons.filter((l) => l.weekNumber === currentWeek);
}

/**
 * Hook to get lessons grouped by subject with progress
 */
export function useLessonProgress(lessons: IndividualLessonTopicDto[]) {
  const stats = useLessonStats(lessons);

  const subjectProgress = Object.entries(stats.bySubject).map(([name, data]) => {
    const subjectLessons = data.lessons;
    const averageConfidence =
      subjectLessons
        .filter((l) => l.mappingConfidence)
        .reduce((sum, l) => sum + (l.mappingConfidence || 0), 0) / subjectLessons.length;

    return {
      subjectName: name,
      subjectId: data.subjectId,
      totalLessons: data.count,
      averageConfidence,
      weeks: [...new Set(subjectLessons.map((l) => l.weekNumber))],
    };
  });

  return {
    subjectProgress,
    overallStats: stats,
  };
}