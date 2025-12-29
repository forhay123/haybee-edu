/**
 * Weekly Generation Types
 * SPRINT 6: Weekly Schedule Generation & Archiving
 */

// ============================================================
// MANUAL ASSIGNMENT REQUEST/RESPONSE
// ============================================================

export interface ManualAssignmentRequest {
  // Schedule ID(s) to assign topic to
  scheduleId?: number;
  scheduleIds?: number[];
  
  // Lesson topic to assign
  lessonTopicId: number;
  
  // User performing the assignment
  assignedByUserId: number;
  
  // Assignment method
  assignmentMethod: 'MANUAL_ADMIN' | 'MANUAL_TEACHER';
  
  // Optional filters for bulk assignment
  weekNumber?: number;
  subjectId?: number;
  studentProfileId?: number;
  
  // Optional notes
  notes?: string;
  
  // Flags
  regenerateSchedules?: boolean;
  sendNotifications?: boolean;
}

export interface ManualAssignmentResponse {
  // Success flag
  success: boolean;
  
  // Response message
  message: string;
  
  // Schedule IDs that were updated
  updatedScheduleIds: number[];
  
  // Lesson topic info
  assignedTopicId: number;
  assignedTopicTitle: string;
  
  // Counts
  schedulesUpdatedCount: number;
  progressRecordsUpdated: number;
  
  // Assignment metadata
  assignedByUserId: number;
  assignmentMethod: string;
  assignedAt: string; // Instant
  
  // Flags
  schedulesRegenerated: boolean;
  notificationsSent: boolean;
  notificationsSentCount: number;
  
  // Issues
  warnings: string[];
  failedScheduleIds: number[];
  errorDetails?: string;
}

// ============================================================
// PENDING ASSIGNMENT DTO
// ============================================================

export interface SuggestedTopicDto {
  topicId: number;
  topicTitle: string;
  description: string;
  weekNumber: number;
  alreadyUsedByStudent: boolean;
  usageCount: number;
}

export interface PendingAssignmentDto {
  // Schedule information
  scheduleId: number;
  scheduledDate: string; // LocalDate
  dayOfWeek: string;
  periodNumber: number;
  startTime: string; // LocalTime
  endTime: string; // LocalTime
  
  // Student information
  studentProfileId: number;
  studentName: string;
  className: string;
  studentType: string;
  
  // Subject information
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  
  // Week information
  weekNumber: number;
  termId: number;
  termName: string;
  
  // Status information
  scheduleStatus: string;
  missingLessonTopic: boolean;
  assignmentMethod?: string;
  
  // Multi-period information
  periodSequence?: number;
  totalPeriodsForTopic?: number;
  linkedScheduleIds: number[];
  
  // Suggested topics
  suggestedTopics: SuggestedTopicDto[];
  
  // Metrics
  daysPending: number;
  hasConflict: boolean;
}

// ============================================================
// RESCHEDULING TYPES
// ============================================================

export interface ReschedulingTimeSlotDto {
  // Alternate day info
  alternateDay: string; // LocalDate
  
  // Time suggestions
  suggestedStartTime: string;
  suggestedEndTime: string;
  originalStartTime: string;
  originalEndTime: string;
  
  // Capacity info
  existingPeriodsOnDay: number;
  dayOfWeek: string;
  
  // Availability
  available: boolean;
  conflictReason?: string;
}

export interface PublicHolidayDto {
  id: number;
  date: string; // LocalDate
  name: string;
  description?: string;
  holidayType: string;
  isRecurring: boolean;
}

export interface ReschedulingInfoDto {
  // Holiday date
  saturdayDate: string; // LocalDate
  
  // Holiday details
  holiday: PublicHolidayDto;
  
  // Rescheduling status
  reschedulingRequired: boolean;
  
  // Alternate day
  suggestedAlternateDay: string; // LocalDate
  
  // Strategy
  reschedulingStrategy: string;
  
  // Metrics
  periodsToReschedule: number;
  canAcceptPeriods: boolean;
  currentPeriodsOnAlternateDay: number;
  maxPeriodsPerDay: number;
  
  // Time slot
  timeSlot: ReschedulingTimeSlotDto;
  
  // Week info
  weekNumber: number;
  
  // Notes
  notes?: string;
}

// ============================================================
// SCHEDULE TYPES
// ============================================================

export interface IndividualDailyScheduleDto {
  id: number;               // DailySchedule ID
  progressId?: number;
  studentProfileId: number;
  scheduledDate: string; // LocalDate
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  completed: boolean;
  scheduleSource: 'INDIVIDUAL' | 'CLASS';
  individualTimetableId?: number;
  
  // ✅ NEW: Separate access controls
  lessonContentAccessible?: boolean;
  assessmentAccessible?: boolean;
  
  // Assessment window timing
  assessmentWindowStart?: string;
  assessmentWindowEnd?: string;
  gracePeriodEnd?: string;
}

// ============================================================
// API REQUEST TYPES
// ============================================================

export interface WeeklyGenerationRequest {
  termId: number;
  weekNumber: number;
  forceRegenerate?: boolean;
  studentIds?: number[];
}

export interface WeeklyGenerationResponse {
  success: boolean;
  message: string;
  weekNumber: number;
  schedulesGenerated: number;
  studentsProcessed: number;
  errors: string[];
  warnings: string[];
  generatedAt: string; // LocalDateTime
}

export interface ArchiveRequest {
  termId: number;
  weekNumber: number;
  archiveType: 'COMPLETED' | 'ALL' | 'INCOMPLETE';
}

export interface ArchiveResponse {
  success: boolean;
  message: string;
  schedulesArchived: number;
  progressRecordsArchived: number;
  archivedAt: string; // LocalDateTime
}