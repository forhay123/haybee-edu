// src/features/progress/utils/utils.ts

import { LessonProgressDto, ProgressStats, SubjectProgress } from '../types/types';

/**
 * Calculate overall progress statistics
 * ✅ UPDATED: Added assessment tracking
 */
export function calculateProgressStats(lessons: LessonProgressDto[]): ProgressStats {
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(l => l.completed).length;
  const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const totalWeight = lessons.reduce((sum, l) => sum + (l.weight || 1), 0);
  const completedWeight = lessons
    .filter(l => l.completed)
    .reduce((sum, l) => sum + (l.weight || 1), 0);
  const weightedRate = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

  const criticalLessons = lessons.filter(l => l.priority === 1);
  const criticalCompleted = criticalLessons.filter(l => l.completed).length;
  const criticalRate = criticalLessons.length > 0 
    ? (criticalCompleted / criticalLessons.length) * 100 
    : 0;

  const highLessons = lessons.filter(l => l.priority === 2);
  const highCompleted = highLessons.filter(l => l.completed).length;
  const highRate = highLessons.length > 0 
    ? (highCompleted / highLessons.length) * 100 
    : 0;

  // ✅ NEW: Track assessments
  const lessonsWithAssessments = lessons.filter(l => l.hasActiveAssessment).length;
  const assessmentsCompleted = lessons.filter(l => l.hasActiveAssessment && l.completed).length;

  return {
    totalLessons,
    completedLessons,
    completionRate,
    totalWeight,
    completedWeight,
    weightedRate,
    criticalCompleted,
    criticalTotal: criticalLessons.length,
    criticalRate,
    highCompleted,
    highTotal: highLessons.length,
    highRate,
    lessonsWithAssessments,
    assessmentsCompleted,
  };
}

/**
 * Calculate progress breakdown by subject
 * ✅ UPDATED: Added assessment tracking
 */
export function calculateSubjectProgress(lessons: LessonProgressDto[]): SubjectProgress[] {
  const subjectMap = new Map<string, SubjectProgress>();

  lessons.forEach((lesson) => {
    const subject = lesson.subjectName;
    const weight = lesson.weight || 1;

    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, {
        subjectName: subject,
        total: 0,
        completed: 0,
        completionRate: 0,
        totalWeight: 0,
        completedWeight: 0,
        withAssessments: 0,
        assessmentsCompleted: 0,
      });
    }

    const subjectData = subjectMap.get(subject)!;
    subjectData.total += 1;
    subjectData.totalWeight += weight;

    if (lesson.completed) {
      subjectData.completed += 1;
      subjectData.completedWeight += weight;
    }

    // ✅ NEW: Track assessments
    if (lesson.hasActiveAssessment) {
      subjectData.withAssessments! += 1;
      if (lesson.completed) {
        subjectData.assessmentsCompleted! += 1;
      }
    }
  });

  // Calculate completion rates
  const subjects = Array.from(subjectMap.values()).map((s) => ({
    ...s,
    completionRate: s.total > 0 ? (s.completed / s.total) * 100 : 0,
  }));

  // Sort by completion rate (descending)
  return subjects.sort((a, b) => b.completionRate - a.completionRate);
}

/**
 * Group lessons by date
 */
export function groupLessonsByDate(
  lessons: LessonProgressDto[]
): Record<string, LessonProgressDto[]> {
  return lessons.reduce((acc, lesson) => {
    const date = lesson.scheduledDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(lesson);
    return acc;
  }, {} as Record<string, LessonProgressDto[]>);
}

/**
 * Sort lessons by priority (critical first) then by period number
 */
export function sortLessonsByPriority(lessons: LessonProgressDto[]): LessonProgressDto[] {
  return [...lessons].sort((a, b) => {
    // First sort by priority (lower number = higher priority)
    const priorityA = a.priority || 4;
    const priorityB = b.priority || 4;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Then sort by period number
    return a.periodNumber - b.periodNumber;
  });
}

/**
 * Filter lessons by completion status
 */
export function filterLessonsByCompletion(
  lessons: LessonProgressDto[],
  filter: 'all' | 'completed' | 'incomplete'
): LessonProgressDto[] {
  if (filter === 'completed') {
    return lessons.filter(l => l.completed);
  }
  if (filter === 'incomplete') {
    return lessons.filter(l => !l.completed);
  }
  return lessons;
}

/**
 * Filter lessons by priority level
 */
export function filterLessonsByPriority(
  lessons: LessonProgressDto[],
  priority: number | null
): LessonProgressDto[] {
  if (priority === null) {
    return lessons;
  }
  return lessons.filter(l => l.priority === priority);
}

/**
 * ✅ NEW: Filter lessons by assessment status
 */
export function filterLessonsByAssessment(
  lessons: LessonProgressDto[],
  filter: 'all' | 'with-assessment' | 'without-assessment'
): LessonProgressDto[] {
  if (filter === 'with-assessment') {
    return lessons.filter(l => l.hasActiveAssessment);
  }
  if (filter === 'without-assessment') {
    return lessons.filter(l => !l.hasActiveAssessment);
  }
  return lessons;
}

/**
 * Get top performing subjects
 */
export function getTopPerformingSubjects(
  lessons: LessonProgressDto[],
  limit: number = 3
): SubjectProgress[] {
  const subjects = calculateSubjectProgress(lessons);
  return subjects.slice(0, limit);
}

/**
 * Calculate streak (consecutive days with 100% completion)
 */
export function calculateStreak(
  groupedLessons: Record<string, LessonProgressDto[]>
): number {
  const sortedDates = Object.keys(groupedLessons).sort((a, b) => b.localeCompare(a));
  let streak = 0;

  for (const date of sortedDates) {
    const lessons = groupedLessons[date];
    const allCompleted = lessons.every(l => l.completed);
    
    if (allCompleted) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get completion trend (last 7 days)
 */
export function getCompletionTrend(
  groupedLessons: Record<string, LessonProgressDto[]>
): Array<{ date: string; rate: number }> {
  const sortedDates = Object.keys(groupedLessons)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 7);

  return sortedDates.map(date => {
    const lessons = groupedLessons[date];
    const completed = lessons.filter(l => l.completed).length;
    const rate = lessons.length > 0 ? (completed / lessons.length) * 100 : 0;
    
    return { date, rate };
  }).reverse();
}

/**
 * Format duration in readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get priority emoji
 */
export function getPriorityEmoji(priority: number): string {
  const emojiMap: Record<number, string> = {
    1: '🔴',
    2: '🟠',
    3: '🟡',
    4: '🟢',
  };
  return emojiMap[priority] || '⚪';
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: number): string {
  const labelMap: Record<number, string> = {
    1: 'Critical',
    2: 'High',
    3: 'Medium',
    4: 'Low',
  };
  return labelMap[priority] || 'Unknown';
}

/**
 * Get priority color classes
 */
export function getPriorityColorClasses(priority: number): string {
  const colorMap: Record<number, string> = {
    1: 'bg-red-100 text-red-700 border-red-300',
    2: 'bg-orange-100 text-orange-700 border-orange-300',
    3: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    4: 'bg-green-100 text-green-700 border-green-300',
  };
  return colorMap[priority] || 'bg-gray-100 text-gray-700 border-gray-300';
}

/**
 * Calculate estimated time to complete remaining lessons
 */
export function estimateTimeToComplete(
  lessons: LessonProgressDto[],
  averageMinutesPerLesson: number = 45
): number {
  const incompleteLessons = lessons.filter(l => !l.completed);
  const totalWeight = incompleteLessons.reduce((sum, l) => sum + (l.weight || 1), 0);
  return Math.ceil(totalWeight * averageMinutesPerLesson);
}

/**
 * Check if all lessons are completed
 */
export function areAllLessonsCompleted(lessons: LessonProgressDto[]): boolean {
  return lessons.length > 0 && lessons.every(l => l.completed);
}

/**
 * Get incomplete high priority lessons
 */
export function getIncompleteHighPriorityLessons(
  lessons: LessonProgressDto[]
): LessonProgressDto[] {
  return lessons.filter(l => !l.completed && (l.priority === 1 || l.priority === 2));
}

/**
 * ✅ NEW: Get lessons with active assessments
 */
export function getLessonsWithActiveAssessments(
  lessons: LessonProgressDto[]
): LessonProgressDto[] {
  return lessons.filter(l => l.hasActiveAssessment);
}

/**
 * ✅ NEW: Get incomplete lessons with assessments
 */
export function getIncompleteLessonsWithAssessments(
  lessons: LessonProgressDto[]
): LessonProgressDto[] {
  return lessons.filter(l => !l.completed && l.hasActiveAssessment);
}

/**
 * ✅ NEW: Calculate assessment completion rate
 */
export function calculateAssessmentCompletionRate(
  lessons: LessonProgressDto[]
): number {
  const lessonsWithAssessments = lessons.filter(l => l.hasActiveAssessment);
  if (lessonsWithAssessments.length === 0) return 0;
  
  const completedWithAssessments = lessonsWithAssessments.filter(l => l.completed);
  return (completedWithAssessments.length / lessonsWithAssessments.length) * 100;
}

/**
 * ✅ NEW: Group lessons by assessment status
 */
export function groupLessonsByAssessmentStatus(
  lessons: LessonProgressDto[]
): {
  withAssessment: LessonProgressDto[];
  withoutAssessment: LessonProgressDto[];
  assessmentCompleted: LessonProgressDto[];
  assessmentIncomplete: LessonProgressDto[];
} {
  const withAssessment = lessons.filter(l => l.hasActiveAssessment);
  const withoutAssessment = lessons.filter(l => !l.hasActiveAssessment);
  const assessmentCompleted = withAssessment.filter(l => l.completed);
  const assessmentIncomplete = withAssessment.filter(l => !l.completed);

  return {
    withAssessment,
    withoutAssessment,
    assessmentCompleted,
    assessmentIncomplete,
  };
}

/**
 * ✅ NEW: Get assessment statistics
 */
export function getAssessmentStatistics(
  lessons: LessonProgressDto[]
): {
  total: number;
  withAssessment: number;
  withoutAssessment: number;
  assessmentCompleted: number;
  assessmentIncomplete: number;
  assessmentCompletionRate: number;
} {
  const groups = groupLessonsByAssessmentStatus(lessons);
  
  return {
    total: lessons.length,
    withAssessment: groups.withAssessment.length,
    withoutAssessment: groups.withoutAssessment.length,
    assessmentCompleted: groups.assessmentCompleted.length,
    assessmentIncomplete: groups.assessmentIncomplete.length,
    assessmentCompletionRate: calculateAssessmentCompletionRate(lessons),
  };
}