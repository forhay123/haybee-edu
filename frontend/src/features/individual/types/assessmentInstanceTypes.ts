/**
 * Assessment Instance Types
 * SPRINT 8: Assessment Window & Multi-Period Tracking
 */

// ============================================================
// ASSESSMENT AVAILABILITY DTO
// ============================================================

export type AvailabilityStatus =
  | 'NOT_YET_AVAILABLE'
  | 'AVAILABLE'
  | 'DEADLINE_APPROACHING'
  | 'GRACE_PERIOD'
  | 'EXPIRED';

export type UrgencyLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export type StatusColor = 'green' | 'yellow' | 'orange' | 'red';

export interface AssessmentAvailabilityDto {
  // Assessment identification
  scheduleId: number;
  progressId: number;
  assessmentInstanceId: number;
  assessmentTitle: string;
  
  // Subject and topic
  subjectName: string;
  lessonTopicTitle: string;
  weekNumber: number;
  
  // Window timing
  windowStart: string; // LocalDateTime
  windowEnd: string; // LocalDateTime
  graceDeadline: string; // LocalDateTime
  currentTime: string; // LocalDateTime
  
  // Availability status
  availabilityStatus: AvailabilityStatus;
  isAvailable: boolean;
  isExpired: boolean;
  isInGracePeriod: boolean;
  
  // Time calculations
  minutesUntilAvailable?: number;
  minutesUntilDeadline?: number;
  minutesUntilGraceExpiry?: number;
  timeRemainingDisplay: string;
  
  // Countdown information
  showCountdown: boolean;
  countdownLabel: string;
  urgencyLevel: UrgencyLevel;
  
  // User messages
  statusMessage: string;
  actionMessage: string;
  
  // Visual indicators
  statusColor: StatusColor;
  statusIcon: string;
  pulseAnimation: boolean;
}

// ============================================================
// ASSESSMENT PERIOD DTO
// ============================================================

export type PeriodStatus =
  | 'PENDING'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'MISSED'
  | 'GRACE_EXPIRED';

export type StatusIconType = '✅' | '⏳' | '❌' | '🕒';

export type StatusColorType = 'success' | 'warning' | 'danger' | 'info';

export interface AssessmentPeriodDto {
  // Period identification
  scheduleId: number;
  progressId: number;
  periodSequence: number;
  totalPeriodsInSequence: number;
  
  // Schedule information
  scheduledDate: string; // LocalDate
  dayOfWeek: string;
  startTime: string; // LocalTime
  endTime: string; // LocalTime
  timeSlot: string;
  periodNumber: number;
  
  // Assessment window
  windowStart: string; // LocalDateTime
  windowEnd: string; // LocalDateTime
  graceDeadline: string; // LocalDateTime
  isWindowOpen: boolean;
  isGracePeriodActive: boolean;
  minutesUntilDeadline: number;
  
  // Completion status
  status: PeriodStatus;
  completed: boolean;
  completedAt?: string; // LocalDateTime
  submittedAt?: string; // LocalDateTime
  
  // Assessment details
  assessmentInstanceId: number;
  assessmentTitle: string;
  totalQuestions: number;
  attemptedQuestions: number;
  
  // Scoring
  score?: number;
  maxScore?: number;
  grade?: string;
  
  // Incomplete tracking
  isMissed: boolean;
  incompleteReason?: string;
  markedIncompleteAt?: string; // LocalDateTime
  
  // Dependencies (for multi-period topics)
  hasPreviousPeriod: boolean;
  previousPeriodCompleted: boolean;
  previousPeriodStatus?: string;
  
  // Actions
  canStart: boolean;
  actionUrl?: string;
  actionLabel: string;
  
  // Visual indicators
  statusIcon: StatusIconType;
  statusColor: StatusColorType;
  progressLabel: string;
}

// ============================================================
// MULTI-ASSESSMENT PROGRESS DTO
// ============================================================

export type CompletionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'INCOMPLETE';

export interface MultiAssessmentProgressDto {
  // Lesson topic information
  lessonTopicId: number;
  lessonTopicTitle: string;
  description: string;
  weekNumber: number;
  
  // Subject information
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  
  // Overall completion status
  completionStatus: CompletionStatus;
  completionPercentage: number;
  
  // Multi-period tracking
  totalPeriods: number;
  completedPeriods: number;
  pendingPeriods: number;
  missedPeriods: number;
  
  // Individual period details
  periods: AssessmentPeriodDto[];
  
  // Scoring information
  averageScore?: number;
  totalPossiblePoints?: number;
  earnedPoints?: number;
  
  // Timeline
  firstPeriodDate: string; // LocalDate
  lastPeriodDate: string; // LocalDate
  nextPeriodDate?: string; // LocalDate
  
  // Alerts and warnings
  hasUpcomingDeadline: boolean;
  hasMissedPeriods: boolean;
  allPeriodsCompleted: boolean;
  statusMessage: string;
  
  // Action items
  canStartNextPeriod: boolean;
  nextPeriodScheduleId?: number;
  nextPeriodActionUrl?: string;
}

// ============================================================
// LESSON TOPIC COMPLETION DTO
// ============================================================

export type LessonCompletionStatus =
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'NOT_STARTED'
  | 'INCOMPLETE';

export interface LessonTopicCompletionDto {
  // Lesson topic identification
  lessonTopicId: number;
  topicTitle: string;
  weekNumber: number;
  
  // Subject information
  subjectId: number;
  subjectName: string;
  
  // Completion summary
  completionStatus: LessonCompletionStatus;
  completionPercentage: number;
  totalPeriods: number;
  completedPeriods: number;
  
  // Scoring summary
  averageScore?: number;
  averageGrade?: string;
  passedAllPeriods: boolean;
  
  // Timeline
  startDate: string; // LocalDate
  completionDate?: string; // LocalDate
  daysToComplete?: number;
  
  // Status flags
  isFullyCompleted: boolean;
  hasIncomplete: boolean;
  isOverdue: boolean;
  
  // Visual representation
  statusBadge: string;
  statusColor: string;
  progressBar: string;
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface AssessmentWindowRequest {
  scheduleId: number;
  studentId: number;
}

export interface MultiPeriodProgressRequest {
  lessonTopicId: number;
  studentId: number;
  weekNumber?: number;
}

export interface AssessmentSubmissionRequest {
  assessmentInstanceId: number;
  progressId: number;
  answers: Record<string, any>;
  submittedAt: string; // LocalDateTime
}

export interface AssessmentSubmissionResponse {
  success: boolean;
  message: string;
  score?: number;
  maxScore?: number;
  grade?: string;
  feedback?: string;
  completedAt: string; // LocalDateTime
}