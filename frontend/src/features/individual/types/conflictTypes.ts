// frontend/src/features/individual/types/conflictTypes.ts

/**
 * Types for schedule conflict resolution
 * Maps to backend DTOs: ConflictDto, ConflictResolutionRequest, ConflictResolutionResponse
 */

// ============================================================
// CONFLICT TYPES
// ============================================================

export type ConflictType =
  | "TIME_OVERLAP"
  | "DUPLICATE_SUBJECT"
  | "INVALID_TIME"
  | "MISSING_SUBJECT"
  | "SCHEDULE_GAP";

export type ConflictSeverity = "HIGH" | "MEDIUM" | "LOW";

export type ResolutionAction =
  | "DELETE_PERIOD_1"
  | "DELETE_PERIOD_2"
  | "EDIT_TIME_PERIOD_1"
  | "EDIT_TIME_PERIOD_2"
  | "MERGE_PERIODS"
  | "SPLIT_PERIOD"
  | "KEEP_PERIOD_1"
  | "KEEP_PERIOD_2";

// ============================================================
// CONFLICT DTO
// ============================================================

export interface ConflictingPeriod {
  scheduleId: number;
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  room?: string;
  teacher?: string;
}

export interface ConflictDto {
  // Conflict identification
  conflictId: number;
  conflictType: ConflictType;

  // Student information
  studentProfileId: number;
  studentName: string;
  className?: string;
  timetableId: number;

  // Conflict timing
  dayOfWeek: string;
  conflictDate?: string;

  // Conflicting periods
  period1: ConflictingPeriod;
  period2?: ConflictingPeriod;

  // Conflict description
  description: string;
  severity: ConflictSeverity;

  // Resolution status
  isResolved: boolean;
  resolutionAction?: ResolutionAction;
  resolvedBy?: string;
  resolvedAt?: string;

  // Impact analysis
  affectedWeeksCount?: number;
  affectedWeekNumbers?: number[];

  // Suggested resolutions
  suggestedResolutions?: string[];
}

// ============================================================
// CONFLICT RESOLUTION REQUEST
// ============================================================

export interface ConflictResolutionRequest {
  // Timetable with conflicts
  timetableId: number;

  // Day of conflict
  dayOfWeek: string;

  // Resolution action
  resolutionAction: ResolutionAction;

  // Entry index to act on (primary entry)
  entryIndex: number;

  // Second entry index (for MERGE_PERIODS action)
  secondEntryIndex?: number;

  // Split time (for SPLIT_PERIOD action)
  splitTime?: string;

  // If editing time, new time values
  newStartTime?: string;
  newEndTime?: string;

  // User performing resolution
  resolvedByUserId: number;

  // Optional notes
  notes?: string;

  // Whether to regenerate schedules after resolution
  regenerateSchedules?: boolean;

  // Whether to notify student of resolution
  notifyStudent?: boolean;

  // List of week numbers to regenerate (if null, regenerate all affected weeks)
  weekNumbersToRegenerate?: number[];
}

// ============================================================
// CONFLICT RESOLUTION RESPONSE
// ============================================================

export interface ConflictResolutionResponse {
  // Whether resolution was successful
  success: boolean;

  // Response message
  message: string;

  // Timetable that was updated
  timetableId: number;

  // Student affected
  studentProfileId: number;
  studentName: string;

  // Resolution details
  resolutionAction: ResolutionAction;
  dayOfWeek: string;
  entryIndex: number;

  // What was changed
  removedSubject?: string;
  keptSubject?: string;
  editedSubject?: string;
  oldTime?: string;
  newTime?: string;

  // Impact of resolution
  schedulesDeleted?: number;
  schedulesRegenerated?: number;
  affectedWeekNumbers?: number[];

  // Notification status
  studentNotified?: boolean;

  // Resolution metadata
  resolvedByUserId: number;
  resolvedAt: string;

  // Remaining conflicts (if any)
  remainingConflictsCount?: number;
  remainingConflicts?: string[];

  // Warnings or issues
  warnings?: string[];
}

// ============================================================
// CONFLICT SUMMARY
// ============================================================

export interface ConflictSummary {
  totalConflicts: number;
  unresolvedConflicts: number;
  resolvedConflicts: number;
  conflictsByType: Record<string, number>;
  conflictsBySeverity: Record<string, number>;
  affectedStudentsCount: number;
  affectedTimetablesCount: number;
}

// ============================================================
// UI HELPER TYPES
// ============================================================

export interface ConflictGroup {
  timetableId: number;
  studentName: string;
  conflicts: ConflictDto[];
  totalConflicts: number;
  unresolvedConflicts: number;
}

export interface ConflictsByDay {
  [dayOfWeek: string]: ConflictDto[];
}

export interface ConflictResolutionOption {
  action: ResolutionAction;
  label: string;
  description: string;
  icon?: string;
  requiresTimeEdit?: boolean;
  requiresSecondEntry?: boolean;
  requiresSplitTime?: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

export const CONFLICT_SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  HIGH: "red",
  MEDIUM: "yellow",
  LOW: "blue",
};

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  TIME_OVERLAP: "Time Overlap",
  DUPLICATE_SUBJECT: "Duplicate Subject",
  INVALID_TIME: "Invalid Time",
  MISSING_SUBJECT: "Missing Subject",
  SCHEDULE_GAP: "Schedule Gap",
};

export const RESOLUTION_ACTION_LABELS: Record<ResolutionAction, string> = {
  DELETE_PERIOD_1: "Delete First Period",
  DELETE_PERIOD_2: "Delete Second Period",
  EDIT_TIME_PERIOD_1: "Edit First Period Time",
  EDIT_TIME_PERIOD_2: "Edit Second Period Time",
  MERGE_PERIODS: "Merge Periods",
  SPLIT_PERIOD: "Split Period",
  KEEP_PERIOD_1: "Keep First Period",
  KEEP_PERIOD_2: "Keep Second Period",
};

export const RESOLUTION_OPTIONS: ConflictResolutionOption[] = [
  {
    action: "DELETE_PERIOD_1",
    label: "Delete First Period",
    description: "Remove the first conflicting period",
    icon: "trash",
  },
  {
    action: "DELETE_PERIOD_2",
    label: "Delete Second Period",
    description: "Remove the second conflicting period",
    icon: "trash",
  },
  {
    action: "EDIT_TIME_PERIOD_1",
    label: "Edit First Period Time",
    description: "Change the time of the first period",
    icon: "clock",
    requiresTimeEdit: true,
  },
  {
    action: "EDIT_TIME_PERIOD_2",
    label: "Edit Second Period Time",
    description: "Change the time of the second period",
    icon: "clock",
    requiresTimeEdit: true,
  },
  {
    action: "MERGE_PERIODS",
    label: "Merge Periods",
    description: "Combine both periods into one",
    icon: "merge",
    requiresSecondEntry: true,
  },
  {
    action: "SPLIT_PERIOD",
    label: "Split Period",
    description: "Split one period into two",
    icon: "split",
    requiresSplitTime: true,
  },
];