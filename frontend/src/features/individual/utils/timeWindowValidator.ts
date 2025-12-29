// frontend/src/features/individual/utils/timeWindowValidator.ts

/**
 * Time Window Validator Utility
 * Sprint 2: Validates assessment time windows and access
 */

import { parseISO, isWithinInterval, isBefore, isAfter, addMinutes, differenceInMinutes } from "date-fns";

export interface TimeWindow {
  startTime: string | Date;
  endTime: string | Date;
  gracePeriodMinutes?: number;
}

export interface WindowValidation {
  isValid: boolean;
  canAccess: boolean;
  reason: string;
  status: "NOT_STARTED" | "ACTIVE" | "GRACE_PERIOD" | "EXPIRED";
  minutesRemaining?: number;
  minutesUntilStart?: number;
}

/**
 * Validate if current time is within assessment window
 */
export function validateTimeWindow(window: TimeWindow, currentTime: Date = new Date()): WindowValidation {
  const start = typeof window.startTime === "string" ? parseISO(window.startTime) : window.startTime;
  const end = typeof window.endTime === "string" ? parseISO(window.endTime) : window.endTime;
  const gracePeriod = window.gracePeriodMinutes || 0;
  const graceEnd = addMinutes(end, gracePeriod);

  // Before window opens
  if (isBefore(currentTime, start)) {
    const minutesUntilStart = differenceInMinutes(start, currentTime);
    return {
      isValid: false,
      canAccess: false,
      reason: "Assessment window has not opened yet",
      status: "NOT_STARTED",
      minutesUntilStart,
    };
  }

  // Within main window
  if (isWithinInterval(currentTime, { start, end })) {
    const minutesRemaining = differenceInMinutes(end, currentTime);
    return {
      isValid: true,
      canAccess: true,
      reason: "Assessment window is active",
      status: "ACTIVE",
      minutesRemaining,
    };
  }

  // Within grace period
  if (gracePeriod > 0 && isWithinInterval(currentTime, { start: end, end: graceEnd })) {
    const minutesRemaining = differenceInMinutes(graceEnd, currentTime);
    return {
      isValid: true,
      canAccess: true,
      reason: "Within grace period - submit soon!",
      status: "GRACE_PERIOD",
      minutesRemaining,
    };
  }

  // After grace period or window
  return {
    isValid: false,
    canAccess: false,
    reason: "Assessment window has closed",
    status: "EXPIRED",
  };
}

/**
 * Check if window is currently active
 */
export function isWindowActive(window: TimeWindow, currentTime: Date = new Date()): boolean {
  const validation = validateTimeWindow(window, currentTime);
  return validation.status === "ACTIVE" || validation.status === "GRACE_PERIOD";
}

/**
 * Check if window has expired
 */
export function isWindowExpired(window: TimeWindow, currentTime: Date = new Date()): boolean {
  const validation = validateTimeWindow(window, currentTime);
  return validation.status === "EXPIRED";
}

/**
 * Get window status
 */
export function getWindowStatus(window: TimeWindow, currentTime: Date = new Date()): WindowValidation["status"] {
  const validation = validateTimeWindow(window, currentTime);
  return validation.status;
}

/**
 * Calculate time remaining in minutes
 */
export function getTimeRemaining(window: TimeWindow, currentTime: Date = new Date()): number {
  const end = typeof window.endTime === "string" ? parseISO(window.endTime) : window.endTime;
  const gracePeriod = window.gracePeriodMinutes || 0;
  const graceEnd = addMinutes(end, gracePeriod);

  if (isAfter(currentTime, graceEnd)) {
    return 0;
  }

  return differenceInMinutes(graceEnd, currentTime);
}

/**
 * Check if within grace period
 */
export function isInGracePeriod(window: TimeWindow, currentTime: Date = new Date()): boolean {
  const validation = validateTimeWindow(window, currentTime);
  return validation.status === "GRACE_PERIOD";
}

/**
 * Get urgency level based on time remaining
 */
export function getUrgencyLevel(minutesRemaining: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (minutesRemaining <= 15) return "CRITICAL";
  if (minutesRemaining <= 60) return "HIGH";
  if (minutesRemaining <= 180) return "MEDIUM";
  return "LOW";
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return "Expired";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return `${mins}m`;
}

/**
 * Validate window configuration
 */
export function validateWindowConfig(window: TimeWindow): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const start = typeof window.startTime === "string" ? parseISO(window.startTime) : window.startTime;
  const end = typeof window.endTime === "string" ? parseISO(window.endTime) : window.endTime;

  if (isNaN(start.getTime())) {
    errors.push("Invalid start time");
  }

  if (isNaN(end.getTime())) {
    errors.push("Invalid end time");
  }

  if (!isBefore(start, end)) {
    errors.push("End time must be after start time");
  }

  const duration = differenceInMinutes(end, start);
  if (duration < 15) {
    errors.push("Window duration must be at least 15 minutes");
  }

  if (window.gracePeriodMinutes && window.gracePeriodMinutes < 0) {
    errors.push("Grace period cannot be negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if student can start assessment
 */
export function canStartAssessment(
  window: TimeWindow,
  alreadyStarted: boolean,
  currentTime: Date = new Date()
): { canStart: boolean; reason: string } {
  if (alreadyStarted) {
    return {
      canStart: true,
      reason: "Continue your assessment",
    };
  }

  const validation = validateTimeWindow(window, currentTime);

  if (validation.status === "NOT_STARTED") {
    return {
      canStart: false,
      reason: `Assessment opens in ${formatTimeRemaining(validation.minutesUntilStart || 0)}`,
    };
  }

  if (validation.status === "EXPIRED") {
    return {
      canStart: false,
      reason: "Assessment window has closed",
    };
  }

  if (validation.status === "GRACE_PERIOD") {
    return {
      canStart: false,
      reason: "Assessment window has closed. Cannot start new attempt during grace period.",
    };
  }

  return {
    canStart: true,
    reason: `${formatTimeRemaining(validation.minutesRemaining || 0)} remaining`,
  };
}

/**
 * Check if student can submit assessment
 */
export function canSubmitAssessment(
  window: TimeWindow,
  currentTime: Date = new Date()
): { canSubmit: boolean; reason: string } {
  const validation = validateTimeWindow(window, currentTime);

  if (validation.status === "EXPIRED") {
    return {
      canSubmit: false,
      reason: "Submission deadline has passed",
    };
  }

  return {
    canSubmit: true,
    reason: validation.status === "GRACE_PERIOD" 
      ? "Submitting in grace period" 
      : "Submission allowed",
  };
}

/**
 * Get window duration in minutes
 */
export function getWindowDuration(window: TimeWindow): number {
  const start = typeof window.startTime === "string" ? parseISO(window.startTime) : window.startTime;
  const end = typeof window.endTime === "string" ? parseISO(window.endTime) : window.endTime;
  return differenceInMinutes(end, start);
}

/**
 * Calculate recommended start time (leave buffer before deadline)
 */
export function getRecommendedStartTime(
  window: TimeWindow,
  estimatedDurationMinutes: number,
  bufferMinutes: number = 30
): Date {
  const end = typeof window.endTime === "string" ? parseISO(window.endTime) : window.endTime;
  const totalMinutesNeeded = estimatedDurationMinutes + bufferMinutes;
  return addMinutes(end, -totalMinutesNeeded);
}