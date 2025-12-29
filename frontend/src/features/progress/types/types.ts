// ============================================================
// FILE: types.ts (COMPLETE WITH assessmentId and Validation)
// Location: frontend/src/features/progress/types/types.ts
// ============================================================

/**
 * Priority levels for ASPIRANT system
 */
export enum Priority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
}

/**
 * Priority configuration for UI display
 */
export interface PriorityConfig {
  label: string;
  color: string;
  icon: string;
}

/**
 * Lesson progress data transfer object
 * ✅ UPDATED: Added assessmentId
 */
export interface LessonProgressDto {
  id: number;
  lessonId: number;
  lessonTitle: string;
  subjectName: string;
  topicName: string;
  scheduledDate: string; // ISO date format: yyyy-MM-dd
  periodNumber: number;
  completed: boolean;
  completedAt?: string; // ISO datetime format
  priority?: number; // 1-4, lower is higher priority
  weight?: number; // Weight multiplier for progress calculation
  assessmentId?: number; // ✅ ADDED: ID of associated assessment
  hasActiveAssessment?: boolean; // ✅ ADDED: Whether lesson has an active assessment
  assessmentTitle?: string; // ✅ ADDED: Title of the assessment
}

/**
 * Daily progress data containing all lessons for a specific date
 */
export interface DailyProgressDto {
  date: string; // ISO date format: yyyy-MM-dd
  lessons: LessonProgressDto[];
}

/**
 * Request payload for marking a lesson as complete
 */
export interface ProgressUpdateRequest {
  lessonId: number;
  scheduledDate: string; // ISO date format: yyyy-MM-dd
  periodNumber: number;
}

/**
 * Subject-specific progress statistics
 */
export interface SubjectProgress {
  subjectName: string;
  total: number;
  completed: number;
  completionRate: number;
  totalWeight: number;
  completedWeight: number;
  withAssessments?: number; // ✅ ADDED: Count of lessons with assessments
  assessmentsCompleted?: number; // ✅ ADDED: Count of completed assessments
}

/**
 * Overall progress statistics
 */
export interface ProgressStats {
  totalLessons: number;
  completedLessons: number;
  completionRate: number;
  totalWeight: number;
  completedWeight: number;
  weightedRate: number;
  criticalCompleted: number;
  criticalTotal: number;
  criticalRate: number;
  highCompleted: number;
  highTotal: number;
  highRate: number;
  lessonsWithAssessments?: number; // ✅ ADDED: Count of lessons with assessments
  assessmentsCompleted?: number; // ✅ ADDED: Count of completed assessments
}

/**
 * Filter options for progress history
 */
export type CompletionFilter = 'all' | 'completed' | 'incomplete';
export type DateRangeFilter = 'week' | 'month' | 'custom';

/**
 * Props for components
 */
export interface DailyLessonCardProps {
  lesson: LessonProgressDto;
  onMarkComplete?: (lesson: LessonProgressDto) => void;
  isLoading?: boolean;
  showAssessmentInfo?: boolean; // ✅ ADDED: Whether to show assessment info
}

export interface DailyPlannerListProps {
  lessons: LessonProgressDto[];
  onMarkComplete?: (lesson: LessonProgressDto) => void;
  isMarkingComplete?: boolean;
  showAssessmentInfo?: boolean; // ✅ ADDED: Whether to show assessment info
}

export interface AspirantProgressOverviewProps {
  lessons: LessonProgressDto[];
}

/**
 * API response types
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

/**
 * Enum for incomplete lesson reasons
 */
export enum IncompleteLessonReason {
  NOT_ATTEMPTED = 'not_attempted',
  INCOMPLETE_ASSESSMENT = 'incomplete_assessment',
  NOT_PASSED = 'not_passed'
}

/**
 * Information about an incomplete lesson
 */
export interface IncompleteLessonInfo {
  lesson_id: number;
  lesson_title: string;
  subject_name: string;
  scheduled_date: string; // ISO date
  reason: IncompleteLessonReason;
  assessment_id?: number;
  last_score?: number;
  passing_score?: number;
  questions_answered?: number;
  total_questions?: number;
  time_limit_minutes?: number;
}

/**
 * Grouped incomplete lessons by reason
 */
export interface IncompleteLessonGrouped {
  not_attempted: IncompleteLessonInfo[];
  incomplete_assessment: IncompleteLessonInfo[];
  not_passed: IncompleteLessonInfo[];
}

/**
 * ✅ NEW: Validation result for assessment scheduling
 */
export interface ValidationResult {
  canCreate: boolean;
  questionCount: number;
  lessonTopicTitle: string;
  subjectName: string;
  reason?: string | string[];
}

/**
 * ✅ NEW: Assessment window information
 */
export interface AssessmentWindow {
  assessmentId: number;
  title: string;
  windowStart: string; // ISO datetime
  windowEnd: string; // ISO datetime
  isActive: boolean;
  isOverdue: boolean;
}

/**
 * Query key factories
 */
export const progressQueryKeys = {
  all: ['progress'] as const,
  dailyProgress: (date?: string) => [...progressQueryKeys.all, 'daily', date] as const,
  dailyProgressAdmin: (studentProfileId: number, date?: string) => 
    [...progressQueryKeys.all, 'daily', studentProfileId, date] as const,
  history: (from: string, to: string) => 
    [...progressQueryKeys.all, 'history', from, to] as const,
  historyAdmin: (studentProfileId: number, from: string, to: string) => 
    [...progressQueryKeys.all, 'history', studentProfileId, from, to] as const,
} as const;

/**
 * Constants
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.CRITICAL]: 'Critical',
  [Priority.HIGH]: 'High',
  [Priority.MEDIUM]: 'Medium',
  [Priority.LOW]: 'Low',
};

export const PRIORITY_COLORS: Record<Priority, PriorityConfig> = {
  [Priority.CRITICAL]: {
    label: 'Critical',
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: '🔴',
  },
  [Priority.HIGH]: {
    label: 'High',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: '🟠',
  },
  [Priority.MEDIUM]: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: '🟡',
  },
  [Priority.LOW]: {
    label: 'Low',
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: '🟢',
  },
};

/**
 * ✅ NEW: Assessment validation constants
 */
export const MIN_QUESTIONS_REQUIRED = 5;

/**
 * Utility type guards
 */
export function isValidPriority(value: number): value is Priority {
  return value >= 1 && value <= 4;
}

export function isCompletedLesson(lesson: LessonProgressDto): boolean {
  return lesson.completed === true;
}

export function hasWeight(lesson: LessonProgressDto): boolean {
  return !!lesson.weight && lesson.weight > 1;
}

/**
 * ✅ Check if lesson has an associated assessment
 */
export function hasAssessment(lesson: LessonProgressDto): boolean {
  return !!lesson.assessmentId && lesson.assessmentId > 0;
}

/**
 * ✅ NEW: Check if lesson has an active assessment
 */
export function hasActiveAssessment(lesson: LessonProgressDto): boolean {
  return lesson.hasActiveAssessment === true;
}

/**
 * ✅ NEW: Format validation error for display
 */
export const formatValidationError = (result: ValidationResult): string => {
  if (result.canCreate) return '';

  const missing = Math.max(0, MIN_QUESTIONS_REQUIRED - result.questionCount);

  if (result.questionCount === 0) {
    return `No questions available for "${result.lessonTopicTitle}" in ${result.subjectName}. Please add questions first.`;
  }

  if (missing > 0) {
    return `Insufficient questions: Found ${result.questionCount}/${MIN_QUESTIONS_REQUIRED} required. Need ${missing} more question${missing > 1 ? 's' : ''}.`;
  }

  // Normalize reason to array, then join for display
  const reasons = Array.isArray(result.reason)
    ? result.reason
    : result.reason
    ? [result.reason]
    : [];

  return reasons.join('; ') || 'Schedule validation failed';
};

/**
 * ✅ NEW: Get all validation errors as array
 */
export const getValidationErrors = (result: ValidationResult): string[] => {
  if (result.canCreate) return [];

  if (!result.reason) return [];

  return Array.isArray(result.reason)
    ? result.reason.map(r => r?.toString().trim()).filter(Boolean)
    : [result.reason.toString().trim()];
};

/**
 * ✅ NEW: Check if validation is successful
 */
export const isValidationSuccessful = (result: ValidationResult): boolean => {
  return result.canCreate;
};