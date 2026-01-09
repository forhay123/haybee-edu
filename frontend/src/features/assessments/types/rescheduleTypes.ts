// src/features/assessments/types/rescheduleTypes.ts

/**
 * Assessment window reschedule data transfer object
 * Matches backend WindowRescheduleDto
 */
export interface WindowRescheduleDto {
  // Identification
  id: number;
  dailyScheduleId: number;
  assessmentId: number;
  studentId: number;
  studentName?: string;
  teacherId: number;
  teacherName?: string;
  
  // Subject & Lesson info
  subjectName?: string;
  lessonTitle?: string;
  
  // Original windows (CANCELLED)
  originalWindowStart: string; // ISO datetime
  originalWindowEnd: string;   // ISO datetime
  originalGraceEnd?: string;   // ISO datetime
  
  // NEW rescheduled windows (1-hour window)
  newWindowStart: string;      // ISO datetime
  newWindowEnd: string;        // ISO datetime (always +1 hour)
  newGraceEnd?: string;        // ISO datetime (always +30 min after end)
  
  // Metadata
  reason: string;
  rescheduledAt: string;       // ISO datetime
  rescheduledByTeacherId: number;
  
  // Status
  isActive: boolean;
  cancelledAt?: string;        // ISO datetime
  cancelledReason?: string;
  
  // Computed fields
  timeDifference?: string;     // e.g., "+2 hours later"
  isCurrentlyActive?: boolean;
  isOneHourWindow?: boolean;
}

/**
 * Request payload for rescheduling assessment
 * Matches backend WindowRescheduleRequest
 */
export interface WindowRescheduleRequest {
  dailyScheduleId: number;
  newWindowStart: string;      // ISO datetime format
  reason: string;              // Min 10 chars, max 500
  // Note: newWindowEnd is auto-calculated by backend (+1 hour)
  // Note: newGraceEnd is auto-calculated by backend (+30 min)
}

/**
 * Request payload for cancelling reschedule
 */
export interface CancelRescheduleRequest {
  reason: string;
}

/**
 * Reschedule status enum
 */
export enum RescheduleStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED'
}

/**
 * Validation result for reschedule timing
 */
export interface RescheduleValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Props for reschedule modal
 */
export interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: {
    progressId: number;
    lessonTopicTitle: string;
    subjectName: string;
    studentName?: string;
    assessmentWindowStart?: string;
    assessmentWindowEnd?: string;
    assessmentId?: number;
  };
  onSuccess?: () => void;
}

/**
 * Props for reschedule badge
 */
export interface RescheduleBadgeProps {
  reschedule: WindowRescheduleDto;
  variant?: 'compact' | 'detailed';
}

/**
 * Filter options for reschedule list
 */
export interface RescheduleFilters {
  status?: RescheduleStatus;
  studentId?: number;
  fromDate?: string;
  toDate?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if lesson has an active reschedule
 */
export function hasActiveReschedule(reschedule?: WindowRescheduleDto | null): boolean {
  if (!reschedule) return false;
  return reschedule.isActive && !reschedule.cancelledAt;
}

/**
 * Check if reschedule can be cancelled
 * Can only cancel BEFORE the new window starts
 */
export function canCancelReschedule(reschedule?: WindowRescheduleDto | null): boolean {
  if (!reschedule || !hasActiveReschedule(reschedule)) {
    return false;
  }
  
  const now = new Date();
  const newWindowStart = new Date(reschedule.newWindowStart);
  
  return now < newWindowStart;
}

/**
 * Validate reschedule timing
 */
export function validateRescheduleTime(
  newWindowStart: Date | string,
  originalWindowStart: Date | string
): RescheduleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const now = new Date();
  const newStart = typeof newWindowStart === 'string' ? new Date(newWindowStart) : newWindowStart;
  const originalStart = typeof originalWindowStart === 'string' ? new Date(originalWindowStart) : originalWindowStart;
  
  // Must be in the future
  if (newStart <= now) {
    errors.push('New window must be in the future');
  }
  
  // Must be before original window starts (anti-cheating)
  if (now >= originalStart) {
    errors.push('Cannot reschedule after original window has started');
  }
  
  // Cannot be more than 3 months ahead
  const threeMonthsFromNow = new Date(now);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  
  if (newStart > threeMonthsFromNow) {
    errors.push('Cannot reschedule more than 3 months ahead');
  }
  
  // Warning if very soon (less than 1 hour)
  const oneHourFromNow = new Date(now);
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
  
  if (newStart < oneHourFromNow && newStart > now) {
    warnings.push('Rescheduling to less than 1 hour from now - student may not have time to prepare');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate reschedule reason
 */
export function validateReason(reason: string): RescheduleValidation {
  const errors: string[] = [];
  
  if (!reason || reason.trim().length === 0) {
    errors.push('Reason is required');
  } else if (reason.trim().length < 10) {
    errors.push('Reason must be at least 10 characters');
  } else if (reason.trim().length > 500) {
    errors.push('Reason cannot exceed 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format time difference for display
 */
export function formatTimeDifference(
  originalStart: Date | string,
  newStart: Date | string
): string {
  const original = typeof originalStart === 'string' ? new Date(originalStart) : originalStart;
  const newTime = typeof newStart === 'string' ? new Date(newStart) : newStart;
  
  const diffMs = newTime.getTime() - original.getTime();
  const diffHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
  const diffDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  
  if (diffDays > 0) {
    return newTime > original 
      ? `+${diffDays} day${diffDays > 1 ? 's' : ''} later`
      : `-${diffDays} day${diffDays > 1 ? 's' : ''} earlier`;
  }
  
  return newTime > original
    ? `+${diffHours} hour${diffHours > 1 ? 's' : ''} later`
    : `-${diffHours} hour${diffHours > 1 ? 's' : ''} earlier`;
}

/**
 * Calculate new window end time (always +1 hour)
 */
export function calculateNewWindowEnd(newWindowStart: Date | string): Date {
  const start = typeof newWindowStart === 'string' ? new Date(newWindowStart) : newWindowStart;
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return end;
}

/**
 * Calculate grace period end (always +30 min after window end)
 */
export function calculateGraceEnd(newWindowEnd: Date | string): Date {
  const end = typeof newWindowEnd === 'string' ? new Date(newWindowEnd) : newWindowEnd;
  const grace = new Date(end);
  grace.setMinutes(grace.getMinutes() + 30);
  return grace;
}

/**
 * Format datetime for API (ISO string)
 */
export function formatForApi(date: Date): string {
  return date.toISOString();
}

/**
 * Check if reschedule is currently in effect
 */
export function isRescheduleActive(reschedule?: WindowRescheduleDto | null): boolean {
  if (!reschedule) return false;
  
  const now = new Date();
  const newStart = new Date(reschedule.newWindowStart);
  const newEnd = new Date(reschedule.newWindowEnd);
  
  return (
    hasActiveReschedule(reschedule) &&
    now >= newStart &&
    now <= newEnd
  );
}

/**
 * Get status badge config for reschedule
 */
export function getRescheduleStatusConfig(reschedule: WindowRescheduleDto): {
  label: string;
  color: string;
  icon: string;
} {
  if (!reschedule.isActive || reschedule.cancelledAt) {
    return {
      label: 'Cancelled',
      color: 'bg-gray-100 text-gray-800',
      icon: '❌'
    };
  }
  
  if (isRescheduleActive(reschedule)) {
    return {
      label: 'Active Now',
      color: 'bg-green-100 text-green-800',
      icon: '✅'
    };
  }
  
  return {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-800',
    icon: '🔄'
  };
}

// ============================================================
// CONSTANTS
// ============================================================

export const RESCHEDULE_CONSTRAINTS = {
  MIN_REASON_LENGTH: 10,
  MAX_REASON_LENGTH: 500,
  WINDOW_DURATION_HOURS: 1,
  GRACE_PERIOD_MINUTES: 30,
  MAX_FUTURE_MONTHS: 3,
} as const;

export const RESCHEDULE_MESSAGES = {
  SUCCESS_CREATE: 'Assessment rescheduled successfully',
  SUCCESS_CANCEL: 'Reschedule cancelled successfully',
  ERROR_GENERIC: 'Failed to reschedule assessment',
  ERROR_TOO_LATE: 'Cannot reschedule - original window has started',
  ERROR_DUPLICATE: 'Assessment already rescheduled',
  ERROR_INVALID_TIME: 'Invalid reschedule time',
  WARNING_SOON: 'Student may not have time to prepare',
} as const;