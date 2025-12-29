// frontend/src/services/assessmentInstanceService.ts

import axios from '../api/axios';
import type {
  AssessmentInstance,
  DailyProgressDto,
  ComprehensiveLessonsReport,
  IncompleteLessonsReport,
  LessonStats,
} from '../features/individual/api/assessmentInstancesApi';

/**
 * SPRINT 2-3: Assessment Instance Service
 * Handles multi-period assessment shuffling logic
 * Manages assessment instances and their relationships
 * Global service layer for assessment instance operations
 */

// ============================================================
// TYPES
// ============================================================

export interface AssessmentInstanceDto {
  id: number;
  baseAssessmentId: number;
  lessonTopicId: number;
  lessonTopicTitle: string;
  instanceSuffix: string; // A, B, C, etc.
  periodSequence: number; // 1, 2, 3, etc.
  totalPeriods: number;
  shuffledQuestionOrder: number[]; // Array of question IDs
  isActive: boolean;
  weekNumber: number;
  createdAt: string;
}

export interface AssessmentQuestionDto {
  id: number;
  assessmentId: number;
  questionText: string;
  questionType: string;
  orderNumber: number;
  points: number;
  options?: string[];
  correctAnswer?: string;
}

export interface MultiPeriodProgress {
  lessonTopicId: number;
  lessonTopicTitle: string;
  subjectName: string;
  totalPeriods: number;
  completedPeriods: number;
  progressRecords: AssessmentInstance[];
  completionPercentage: number;
  averageScore?: number;
  allCompleted: boolean;
}

export interface ShufflingValidation {
  assessmentId: number;
  questionCount: number;
  periodCount: number;
  sufficient: boolean;
  warningMessage?: string;
}

// ============================================================
// ASSESSMENT INSTANCE API CALLS
// ============================================================

/**
 * Get assessment instance by ID
 */
export async function getAssessmentInstance(
  instanceId: number
): Promise<AssessmentInstanceDto> {
  const res = await axios.get(`/assessment-instances/${instanceId}`);
  return res.data;
}

/**
 * Get all instances for a base assessment
 */
export async function getInstancesForAssessment(
  baseAssessmentId: number
): Promise<AssessmentInstanceDto[]> {
  const res = await axios.get(
    `/assessment-instances/assessment/${baseAssessmentId}`
  );
  return res.data;
}

/**
 * Get instance for a specific period sequence
 */
export async function getInstanceForPeriod(
  baseAssessmentId: number,
  periodSequence: number
): Promise<AssessmentInstanceDto> {
  const res = await axios.get(
    `/assessment-instances/assessment/${baseAssessmentId}/period/${periodSequence}`
  );
  return res.data;
}

/**
 * Get instances for a lesson topic
 */
export async function getInstancesForTopic(
  lessonTopicId: number,
  weekNumber?: number
): Promise<AssessmentInstanceDto[]> {
  const params = weekNumber ? { weekNumber } : {};
  const res = await axios.get(
    `/assessment-instances/topic/${lessonTopicId}`,
    { params }
  );
  return res.data;
}

/**
 * Create shuffled assessment instances (Admin only)
 */
export async function createShuffledInstances(request: {
  baseAssessmentId: number;
  lessonTopicId: number;
  periodCount: number;
  weekNumber: number;
}): Promise<AssessmentInstanceDto[]> {
  const res = await axios.post('/assessment-instances/shuffle', request);
  return res.data;
}

/**
 * Delete instances for regeneration (Admin only)
 */
export async function deleteInstancesForAssessment(
  baseAssessmentId: number
): Promise<{ deletedCount: number }> {
  const res = await axios.delete(
    `/assessment-instances/assessment/${baseAssessmentId}`
  );
  return res.data;
}

/**
 * Validate assessment for shuffling
 */
export async function validateAssessmentForShuffling(
  assessmentId: number,
  periodCount: number
): Promise<ShufflingValidation> {
  const res = await axios.post('/assessment-instances/validate', {
    assessmentId,
    periodCount,
  });
  return res.data;
}

// ============================================================
// MULTI-PERIOD PROGRESS TRACKING
// ============================================================

/**
 * Get multi-period progress for a lesson topic
 * Groups all progress records for topics that appear multiple times
 */
export function calculateMultiPeriodProgress(
  progressRecords: AssessmentInstance[]
): Map<number, MultiPeriodProgress> {
  const grouped = new Map<number, MultiPeriodProgress>();

  // Group by lesson topic
  progressRecords.forEach((record) => {
    const topicId = record.lessonTopicId;

    if (!grouped.has(topicId)) {
      grouped.set(topicId, {
        lessonTopicId: topicId,
        lessonTopicTitle: record.lessonTopicTitle,
        subjectName: record.subjectName,
        totalPeriods: 0,
        completedPeriods: 0,
        progressRecords: [],
        completionPercentage: 0,
        allCompleted: false,
      });
    }

    const progress = grouped.get(topicId)!;
    progress.progressRecords.push(record);
    progress.totalPeriods++;

    if (record.status === 'COMPLETED') {
      progress.completedPeriods++;
    }
  });

  // Calculate statistics
  grouped.forEach((progress) => {
    progress.completionPercentage =
      progress.totalPeriods > 0
        ? (progress.completedPeriods / progress.totalPeriods) * 100
        : 0;

    progress.allCompleted = progress.completedPeriods === progress.totalPeriods;

    // Calculate average score for completed periods
    const completedWithScores = progress.progressRecords.filter(
      (r) => r.status === 'COMPLETED' && r.score !== undefined
    );

    if (completedWithScores.length > 0) {
      const totalScore = completedWithScores.reduce(
        (sum, r) => sum + (r.score || 0),
        0
      );
      progress.averageScore = totalScore / completedWithScores.length;
    }
  });

  return grouped;
}

/**
 * Check if all periods in a multi-period lesson are completed
 */
export function areAllPeriodsCompleted(
  progressRecords: AssessmentInstance[]
): boolean {
  if (progressRecords.length === 0) return false;
  return progressRecords.every((record) => record.status === 'COMPLETED');
}

/**
 * Get completion percentage for multi-period lesson
 */
export function getCompletionPercentage(
  progressRecords: AssessmentInstance[]
): number {
  if (progressRecords.length === 0) return 0;

  const completedCount = progressRecords.filter(
    (r) => r.status === 'COMPLETED'
  ).length;

  return (completedCount / progressRecords.length) * 100;
}

/**
 * Get average score across multi-period lesson
 */
export function getAverageScore(
  progressRecords: AssessmentInstance[]
): number | null {
  const completedWithScores = progressRecords.filter(
    (r) => r.status === 'COMPLETED' && r.score !== undefined
  );

  if (completedWithScores.length === 0) return null;

  const totalScore = completedWithScores.reduce(
    (sum, r) => sum + (r.score || 0),
    0
  );

  return totalScore / completedWithScores.length;
}

// ============================================================
// ASSESSMENT INSTANCE UTILITIES
// ============================================================

/**
 * Get instance suffix from period sequence
 */
export function getInstanceSuffix(periodSequence: number): string {
  const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  return periodSequence <= suffixes.length
    ? suffixes[periodSequence - 1]
    : String(periodSequence);
}

/**
 * Parse shuffled question order from JSON string
 */
export function parseShuffledOrder(json: string): number[] {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to parse shuffled order:', error);
    return [];
  }
}

/**
 * Check if assessment has enough questions for shuffling
 */
export function hasEnoughQuestions(
  questionCount: number,
  periodCount: number
): boolean {
  // Recommended: at least 2x the number of periods
  return questionCount >= periodCount * 2;
}

/**
 * Get shuffling quality indicator
 */
export function getShufflingQuality(
  questionCount: number,
  periodCount: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  const ratio = questionCount / periodCount;

  if (ratio >= 3) return 'excellent'; // 3+ questions per period
  if (ratio >= 2) return 'good'; // 2+ questions per period
  if (ratio >= 1) return 'fair'; // 1+ questions per period
  return 'poor'; // Less than 1 question per period
}

// ============================================================
// PROGRESS FILTERING & GROUPING
// ============================================================

/**
 * Filter progress records by status
 */
export function filterByStatus(
  progressRecords: AssessmentInstance[],
  status: AssessmentInstance['status']
): AssessmentInstance[] {
  return progressRecords.filter((record) => record.status === status);
}

/**
 * Group progress records by date
 */
export function groupByDate(
  progressRecords: AssessmentInstance[]
): Map<string, AssessmentInstance[]> {
  const grouped = new Map<string, AssessmentInstance[]>();

  progressRecords.forEach((record) => {
    const date = record.scheduledDate;

    if (!grouped.has(date)) {
      grouped.set(date, []);
    }

    grouped.get(date)!.push(record);
  });

  // Sort each day by period number
  grouped.forEach((records) => {
    records.sort((a, b) => a.periodNumber - b.periodNumber);
  });

  return grouped;
}

/**
 * Group progress records by subject
 */
export function groupBySubject(
  progressRecords: AssessmentInstance[]
): Map<string, AssessmentInstance[]> {
  const grouped = new Map<string, AssessmentInstance[]>();

  progressRecords.forEach((record) => {
    const subject = record.subjectName;

    if (!grouped.has(subject)) {
      grouped.set(subject, []);
    }

    grouped.get(subject)!.push(record);
  });

  return grouped;
}

/**
 * Group progress records by lesson topic (for multi-period detection)
 */
export function groupByLessonTopic(
  progressRecords: AssessmentInstance[]
): Map<number, AssessmentInstance[]> {
  const grouped = new Map<number, AssessmentInstance[]>();

  progressRecords.forEach((record) => {
    const topicId = record.lessonTopicId;

    if (!grouped.has(topicId)) {
      grouped.set(topicId, []);
    }

    grouped.get(topicId)!.push(record);
  });

  return grouped;
}

// ============================================================
// STATISTICS & ANALYTICS
// ============================================================

/**
 * Calculate lesson statistics from progress records
 */
export function calculateLessonStats(
  progressRecords: AssessmentInstance[]
): LessonStats {
  const total = progressRecords.length;
  const completed = filterByStatus(progressRecords, 'COMPLETED').length;
  const missed = filterByStatus(progressRecords, 'MISSED').length;
  const inProgress = filterByStatus(progressRecords, 'IN_PROGRESS').length;
  const scheduled = filterByStatus(progressRecords, 'SCHEDULED').length;

  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  // Calculate average score
  const completedWithScores = progressRecords.filter(
    (r) => r.status === 'COMPLETED' && r.score !== undefined
  );

  const averageScore =
    completedWithScores.length > 0
      ? completedWithScores.reduce((sum, r) => sum + (r.score || 0), 0) /
        completedWithScores.length
      : undefined;

  // Calculate subject breakdown
  const bySubject = groupBySubject(progressRecords);
  const subjectBreakdown = Array.from(bySubject.entries()).map(
    ([subjectName, records]) => {
      const subjectCompleted = records.filter(
        (r) => r.status === 'COMPLETED'
      ).length;
      const subjectTotal = records.length;
      const subjectCompletionRate =
        subjectTotal > 0 ? (subjectCompleted / subjectTotal) * 100 : 0;

      const subjectScores = records.filter(
        (r) => r.status === 'COMPLETED' && r.score !== undefined
      );
      const subjectAvgScore =
        subjectScores.length > 0
          ? subjectScores.reduce((sum, r) => sum + (r.score || 0), 0) /
            subjectScores.length
          : undefined;

      return {
        subjectId: records[0].subjectId,
        subjectName,
        totalLessons: subjectTotal,
        completedLessons: subjectCompleted,
        completionRate: subjectCompletionRate,
        averageScore: subjectAvgScore,
      };
    }
  );

  return {
    totalLessons: total,
    completedLessons: completed,
    missedLessons: missed,
    inProgressLessons: inProgress,
    scheduledLessons: scheduled,
    completionRate,
    averageScore,
    subjectBreakdown,
  };
}

/**
 * Get incomplete lessons that can still be completed
 */
export function getRecoverableIncomplete(
  progressRecords: AssessmentInstance[]
): AssessmentInstance[] {
  return progressRecords.filter(
    (record) =>
      (record.status === 'INCOMPLETE' || record.status === 'MISSED') &&
      record.canStillComplete
  );
}

/**
 * Get urgent lessons (ending soon)
 */
export function getUrgentLessons(
  progressRecords: AssessmentInstance[],
  hoursThreshold: number = 24
): AssessmentInstance[] {
  const now = new Date();
  const threshold = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);

  return progressRecords.filter((record) => {
    if (record.status === 'COMPLETED' || record.status === 'MISSED') {
      return false;
    }

    const windowEnd = new Date(record.assessmentWindowEnd);
    return windowEnd <= threshold && windowEnd > now;
  });
}

// ============================================================
// EXPORT ALL
// ============================================================

export const assessmentInstanceService = {
  // API calls
  getAssessmentInstance,
  getInstancesForAssessment,
  getInstanceForPeriod,
  getInstancesForTopic,
  createShuffledInstances,
  deleteInstancesForAssessment,
  validateAssessmentForShuffling,

  // Multi-period tracking
  calculateMultiPeriodProgress,
  areAllPeriodsCompleted,
  getCompletionPercentage,
  getAverageScore,

  // Instance utilities
  getInstanceSuffix,
  parseShuffledOrder,
  hasEnoughQuestions,
  getShufflingQuality,

  // Filtering & grouping
  filterByStatus,
  groupByDate,
  groupBySubject,
  groupByLessonTopic,

  // Statistics
  calculateLessonStats,
  getRecoverableIncomplete,
  getUrgentLessons,
};

export default assessmentInstanceService;