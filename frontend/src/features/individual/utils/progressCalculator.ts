// frontend/src/features/individual/utils/progressCalculator.ts

/**
 * Progress Calculator Utility
 * Sprint 3: Calculates completion rates and progress metrics
 */

export interface ProgressMetrics {
  totalItems: number;
  completedItems: number;
  incompleteItems: number;
  completionRate: number;
  averageScore?: number;
  grade?: string;
}

export interface MultiPeriodProgress {
  totalPeriods: number;
  completedPeriods: number;
  pendingPeriods: number;
  missedPeriods: number;
  completionPercentage: number;
  allPeriodsCompleted: boolean;
}

/**
 * Calculate completion rate percentage
 */
export function calculateCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Calculate average score
 */
export function calculateAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
}

/**
 * Calculate weighted average score
 */
export function calculateWeightedAverage(
  scores: Array<{ score: number; weight: number }>
): number {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = scores.reduce(
    (sum, item) => sum + item.score * item.weight,
    0
  );

  return Math.round(weightedSum / totalWeight);
}

/**
 * Calculate grade from percentage score
 */
export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  if (percentage >= 50) return "E";
  return "F";
}

/**
 * Calculate progress metrics for a set of items
 */
export function calculateProgressMetrics(
  items: Array<{
    completed: boolean;
    score?: number;
    maxScore?: number;
  }>
): ProgressMetrics {
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.completed).length;
  const incompleteItems = totalItems - completedItems;
  const completionRate = calculateCompletionRate(completedItems, totalItems);

  // Calculate average score from completed items with scores
  const itemsWithScores = items.filter(
    (item) => item.completed && item.score !== undefined && item.maxScore !== undefined
  );

  let averageScore: number | undefined;
  let grade: string | undefined;

  if (itemsWithScores.length > 0) {
    const percentages = itemsWithScores.map((item) =>
      Math.round((item.score! / item.maxScore!) * 100)
    );
    averageScore = calculateAverageScore(percentages);
    grade = calculateGrade(averageScore);
  }

  return {
    totalItems,
    completedItems,
    incompleteItems,
    completionRate,
    averageScore,
    grade,
  };
}

/**
 * Calculate multi-period progress
 */
export function calculateMultiPeriodProgress(
  periods: Array<{
    completed: boolean;
    status: "PENDING" | "COMPLETED" | "MISSED" | "IN_PROGRESS";
  }>
): MultiPeriodProgress {
  const totalPeriods = periods.length;
  const completedPeriods = periods.filter((p) => p.completed).length;
  const missedPeriods = periods.filter((p) => p.status === "MISSED").length;
  const pendingPeriods = totalPeriods - completedPeriods - missedPeriods;
  const completionPercentage = calculateCompletionRate(
    completedPeriods,
    totalPeriods
  );
  const allPeriodsCompleted = completedPeriods === totalPeriods;

  return {
    totalPeriods,
    completedPeriods,
    pendingPeriods,
    missedPeriods,
    completionPercentage,
    allPeriodsCompleted,
  };
}

/**
 * Calculate weekly progress
 */
export function calculateWeeklyProgress(
  schedules: Array<{ completed: boolean }>
): { completed: number; total: number; rate: number } {
  const total = schedules.length;
  const completed = schedules.filter((s) => s.completed).length;
  const rate = calculateCompletionRate(completed, total);

  return { completed, total, rate };
}

/**
 * Calculate subject progress
 */
export function calculateSubjectProgress(
  lessons: Array<{
    completed: boolean;
    score?: number;
    maxScore?: number;
  }>
): ProgressMetrics {
  return calculateProgressMetrics(lessons);
}

/**
 * Calculate term progress
 */
export function calculateTermProgress(
  currentWeek: number,
  totalWeeks: number
): number {
  return calculateCompletionRate(currentWeek, totalWeeks);
}

/**
 * Calculate performance trend
 */
export function calculatePerformanceTrend(
  recentScores: number[],
  windowSize: number = 3
): "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA" {
  if (recentScores.length < windowSize) {
    return "INSUFFICIENT_DATA";
  }

  const recent = recentScores.slice(-windowSize);
  const previous = recentScores.slice(-windowSize * 2, -windowSize);

  if (previous.length === 0) {
    return "INSUFFICIENT_DATA";
  }

  const recentAvg = calculateAverageScore(recent);
  const previousAvg = calculateAverageScore(previous);

  const difference = recentAvg - previousAvg;

  if (difference > 5) return "IMPROVING";
  if (difference < -5) return "DECLINING";
  return "STABLE";
}

/**
 * Calculate streak of consecutive completions
 */
export function calculateStreak(
  items: Array<{ completed: boolean; date: string }>
): number {
  const sorted = [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  for (const item of sorted) {
    if (item.completed) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate projected final score
 */
export function calculateProjectedScore(
  currentAverage: number,
  completedWeight: number,
  remainingWeight: number,
  projectedPerformance: number = currentAverage
): number {
  const completedContribution = currentAverage * completedWeight;
  const remainingContribution = projectedPerformance * remainingWeight;
  const totalWeight = completedWeight + remainingWeight;

  if (totalWeight === 0) return currentAverage;

  return Math.round(
    (completedContribution + remainingContribution) / totalWeight
  );
}

/**
 * Check if student is on track
 */
export function isOnTrack(
  currentCompletionRate: number,
  expectedCompletionRate: number,
  tolerance: number = 10
): boolean {
  return currentCompletionRate >= expectedCompletionRate - tolerance;
}

/**
 * Calculate expected completion rate
 */
export function calculateExpectedCompletionRate(
  currentWeek: number,
  totalWeeks: number
): number {
  return calculateCompletionRate(currentWeek, totalWeeks);
}

/**
 * Get performance level
 */
export function getPerformanceLevel(
  averageScore: number
): "EXCELLENT" | "GOOD" | "AVERAGE" | "NEEDS_IMPROVEMENT" | "AT_RISK" {
  if (averageScore >= 85) return "EXCELLENT";
  if (averageScore >= 75) return "GOOD";
  if (averageScore >= 60) return "AVERAGE";
  if (averageScore >= 50) return "NEEDS_IMPROVEMENT";
  return "AT_RISK";
}

/**
 * Calculate time efficiency
 */
export function calculateTimeEfficiency(
  scheduledHours: number,
  completedHours: number
): number {
  if (scheduledHours === 0) return 0;
  return Math.round((completedHours / scheduledHours) * 100);
}

/**
 * Calculate attendance rate
 */
export function calculateAttendanceRate(
  attended: number,
  scheduled: number
): number {
  return calculateCompletionRate(attended, scheduled);
}

/**
 * Group progress by period
 */
export function groupProgressByPeriod<T extends { weekNumber: number }>(
  items: T[]
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();

  items.forEach((item) => {
    if (!grouped.has(item.weekNumber)) {
      grouped.set(item.weekNumber, []);
    }
    grouped.get(item.weekNumber)!.push(item);
  });

  return grouped;
}

/**
 * Calculate completion velocity (items per week)
 */
export function calculateCompletionVelocity(
  completedItems: number,
  numberOfWeeks: number
): number {
  if (numberOfWeeks === 0) return 0;
  return Math.round((completedItems / numberOfWeeks) * 10) / 10;
}

/**
 * Predict completion date
 */
export function predictCompletionDate(
  remainingItems: number,
  completionVelocity: number,
  currentWeek: number
): number {
  if (completionVelocity === 0) return currentWeek;
  const weeksNeeded = Math.ceil(remainingItems / completionVelocity);
  return currentWeek + weeksNeeded;
}