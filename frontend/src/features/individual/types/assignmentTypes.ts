// frontend/src/features/individual/types/assignmentTypes.ts

/**
 * DTO for pending assignment information
 * Represents a schedule that needs a lesson topic assigned
 */
export interface PendingAssignmentDto {
  // Schedule identification
  scheduleId: number;
  scheduledDate: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;

  // Student information
  studentProfileId: number;
  studentName: string;
  className: string;
  studentType: string;

  // Subject information
  subjectId: number | null;
  subjectName: string;
  subjectCode: string | null;

  // Schedule status
  scheduleStatus: string | null;
  missingLessonTopic: boolean;
  assignmentMethod: string | null;
  daysPending: number;
  hasConflict: boolean;

  // Week number (calculated from date if not provided by backend)
  weekNumber?: number;

  // Suggestions (populated separately)
  suggestedTopics?: SuggestedTopicDto[];
}

/**
 * DTO for suggested lesson topics
 * Represents AI/algorithm-suggested topics for assignment
 */
export interface SuggestedTopicDto {
  topicId: number;
  topicTitle: string;
  description: string | null;
  weekNumber: number | null;
  alreadyUsedByStudent: boolean;
  usageCount: number;
  matchScore?: number;
  matchReason?: string;
}

/**
 * Request DTO for manual topic assignment
 * Used for both single and bulk assignment
 */
export interface ManualAssignmentRequest {
  // Single assignment
  scheduleId?: number;

  // Bulk assignment
  scheduleIds?: number[];

  // Required fields
  lessonTopicId: number;
  assignedByUserId: number;
  assignmentMethod: 'ADMIN_MANUAL' | 'TEACHER_MANUAL' | 'QUICK_ASSIGN';

  // Optional fields
  notes?: string;
  sendNotifications?: boolean;
}

/**
 * Response DTO for manual assignment operations
 * Contains details about assignment success/failure
 */
export interface ManualAssignmentResponse {
  success: boolean;
  message: string;

  // Assignment details
  updatedScheduleIds: number[];
  assignedTopicId: number;
  assignedTopicTitle: string;
  schedulesUpdatedCount: number;

  // Metadata
  assignedByUserId: number;
  assignmentMethod: string;
  assignedAt: string;
  schedulesRegenerated: boolean;

  // Notifications
  notificationsSent: boolean;
  notificationsSentCount?: number;

  // Errors and warnings
  warnings?: string[];
  failedScheduleIds?: number[];
}

/**
 * Summary statistics for pending assignments
 * Used in admin dashboard
 */
export interface PendingAssignmentsSummary {
  totalPending: number;
  bySubject: Record<string, number>;
  byWeek: Record<number, number>;
  byStudent: Record<string, number>;
  urgentCount: number;
  withSuggestionsCount: number;
}

/**
 * Filter options for pending assignments query
 */
export interface PendingAssignmentsFilter {
  weekNumber?: number;
  subjectId?: number;
  studentProfileId?: number;
  dateFrom?: string;
  dateTo?: string;
  onlyUrgent?: boolean;
  onlyWithoutSuggestions?: boolean;
}

/**
 * Bulk assignment validation result
 */
export interface BulkAssignmentValidation {
  isValid: boolean;
  allSameSubject: boolean;
  subjectId: number | null;
  subjectName: string | null;
  scheduleCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Assignment history entry
 * For displaying who assigned what and when
 */
export interface AssignmentHistory {
  scheduleId: number;
  lessonTopicId: number;
  lessonTopicTitle: string;
  assignedByUserId: number;
  assignedByUserName: string;
  assignmentMethod: string;
  assignedAt: string;
  notes: string | null;
}

/**
 * Progress tracking for bulk operations
 */
export interface BulkAssignmentProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentScheduleId: number | null;
  isComplete: boolean;
  errors: Array<{
    scheduleId: number;
    error: string;
  }>;
}

/**
 * Quick assign options
 * For one-click assignment using top suggestion
 */
export interface QuickAssignOptions {
  scheduleId: number;
  useTopSuggestion: boolean;
  sendNotification: boolean;
}

/**
 * Assignment analytics
 * For reporting and dashboard displays
 */
export interface AssignmentAnalytics {
  totalAssignments: number;
  manualAssignments: number;
  autoAssignments: number;
  assignmentsBySubject: Record<string, number>;
  assignmentsByWeek: Record<number, number>;
  averageAssignmentTime: number; // seconds
  assignmentsToday: number;
  assignmentsThisWeek: number;
}

/**
 * Notification payload for assignment events
 */
export interface AssignmentNotification {
  scheduleId: number;
  studentProfileId: number;
  lessonTopicTitle: string;
  subjectName: string;
  scheduledDate: string;
  periodNumber: number;
  assignedByUserName: string;
  assignmentMethod: string;
}

/**
 * Type guard functions
 */
export const isSingleAssignment = (
  request: ManualAssignmentRequest
): request is ManualAssignmentRequest & { scheduleId: number } => {
  return request.scheduleId !== undefined && request.scheduleIds === undefined;
};

export const isBulkAssignment = (
  request: ManualAssignmentRequest
): request is ManualAssignmentRequest & { scheduleIds: number[] } => {
  return request.scheduleIds !== undefined && request.scheduleIds.length > 0;
};

/**
 * Helper function to validate bulk assignment
 */
export const validateBulkAssignment = (
  schedules: PendingAssignmentDto[],
  topicId: number
): BulkAssignmentValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (schedules.length === 0) {
    errors.push("No schedules selected for bulk assignment");
  }

  // Check if all schedules have the same subject
  const subjects = new Set(schedules.map(s => s.subjectId));
  const allSameSubject = subjects.size === 1;

  if (!allSameSubject) {
    errors.push("All schedules must be for the same subject");
  }

  // Check for conflicts
  const conflictCount = schedules.filter(s => s.hasConflict).length;
  if (conflictCount > 0) {
    warnings.push(`${conflictCount} schedule(s) have conflicts`);
  }

  // Check for already assigned
  const alreadyAssigned = schedules.filter(s => !s.missingLessonTopic).length;
  if (alreadyAssigned > 0) {
    warnings.push(`${alreadyAssigned} schedule(s) already have topics assigned`);
  }

  return {
    isValid: errors.length === 0,
    allSameSubject,
    subjectId: allSameSubject ? schedules[0].subjectId : null,
    subjectName: allSameSubject ? schedules[0].subjectName : null,
    scheduleCount: schedules.length,
    errors,
    warnings,
  };
};

/**
 * Helper function to get assignment method display name
 */
export const getAssignmentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    ADMIN_MANUAL: "Admin Manual",
    TEACHER_MANUAL: "Teacher Manual",
    QUICK_ASSIGN: "Quick Assign",
    AUTO_ASSIGNED: "Auto Assigned",
  };
  return labels[method] || method;
};

/**
 * Helper function to calculate urgency level
 */
export const getUrgencyLevel = (daysPending: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (daysPending < 0) return 'critical'; // Past due
  if (daysPending === 0) return 'high'; // Today
  if (daysPending === 1) return 'medium'; // Tomorrow
  return 'low'; // Future
};

/**
 * Helper function to format pending assignment summary
 */
export const formatPendingSummary = (summary: PendingAssignmentsSummary): string => {
  const parts: string[] = [];
  
  if (summary.totalPending === 0) {
    return "No pending assignments";
  }

  parts.push(`${summary.totalPending} total`);
  
  if (summary.urgentCount > 0) {
    parts.push(`${summary.urgentCount} urgent`);
  }

  return parts.join(", ");
};