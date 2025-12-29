/**
 * Incomplete Tracking Types
 * SPRINT 11: Incomplete Tracking
 */

// ============================================================
// INCOMPLETE PROGRESS DTO
// ============================================================

export interface IncompleteProgressDto {
  id: number;
  
  // Student information
  studentId: number;
  studentName: string;
  studentEmail: string;
  
  // Subject information
  subjectId: number;
  subjectName: string;
  
  // Lesson information
  lessonTopicId: number;
  lessonTopicTitle: string;
  weekNumber: number;
  
  // Schedule information
  scheduledDate: string; // LocalDate
  periodNumber: number;
  dayOfWeek: string;
  
  // Incomplete details
  incompleteReason: string;
  autoMarkedIncompleteAt: string; // LocalDateTime
  assessmentWindowEnd: string; // LocalDateTime
  daysOverdue: number;
  
  // Assessment information
  assessmentId?: number;
  assessmentTitle?: string;
  assessmentAccessible: boolean;
  assessmentWindowStart?: string; // LocalDateTime
  
  // Progress status
  completed: boolean;
  assessmentScore?: number;
  completedAt?: string; // LocalDateTime
  
  // Multi-period information
  periodSequence?: number;
  totalPeriodsInSequence?: number;
  allPeriodsCompleted?: boolean;
  
  // Additional metadata
  scheduleSource: string;
  individualTimetableId?: number;
  notes?: string;
}

// ============================================================
// INCOMPLETE STATISTICS DTO
// ============================================================

export interface TrendData {
  previousPeriodIncomplete: number;
  currentPeriodIncomplete: number;
  change: number;
  changePercentage: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
}

export interface IncompleteStatisticsDto {
  // Date range for statistics
  startDate: string; // LocalDate
  endDate: string; // LocalDate
  
  // Overall statistics
  totalLessons: number;
  totalIncomplete: number;
  totalCompleted: number;
  incompletePercentage: number;
  completionRate: number;
  
  // Incomplete by reason
  incompleteByReason: Record<string, number>;
  
  // Incomplete by urgency level
  lowUrgency: number;
  mediumUrgency: number;
  highUrgency: number;
  criticalUrgency: number;
  
  // Multi-period statistics
  multiPeriodIncomplete: number;
  singlePeriodIncomplete: number;
  
  // Assessment-related statistics
  missedAssessmentDeadlines: number;
  noSubmissions: number;
  topicNotAssigned: number;
  
  // Subject breakdown
  affectedSubjectsCount: number;
  affectedStudentsCount: number;
  affectedWeeksCount: number;
  
  // Trend data
  trend?: TrendData;
}

// ============================================================
// INCOMPLETE REPORT DTO
// ============================================================

export interface SubjectIncompleteBreakdown {
  subjectId: number;
  subjectName: string;
  incompleteCount: number;
  totalLessons: number;
  incompletePercentage: number;
  reasonBreakdown: Record<string, number>;
}

export interface StudentIncompleteBreakdown {
  studentId: number;
  studentName: string;
  studentEmail: string;
  incompleteCount: number;
  totalLessons: number;
  incompletePercentage: number;
  reasonBreakdown: Record<string, number>;
  affectedSubjects: string[];
}

export interface WeekIncompleteBreakdown {
  weekNumber: number;
  weekStartDate: string; // LocalDate
  weekEndDate: string; // LocalDate
  incompleteCount: number;
  totalLessons: number;
  incompletePercentage: number;
}

export interface ReportFilters {
  studentId?: number;
  subjectId?: number;
  teacherId?: number;
  incompleteReason?: string;
  startDate?: string; // LocalDate
  endDate?: string; // LocalDate
  weekNumber?: number;
  scheduleSource?: string;
  minDaysOverdue?: number;
  urgencyLevel?: string;
}

export interface IncompleteReportDto {
  // Report metadata
  generatedAt: string; // LocalDateTime
  reportStartDate: string; // LocalDate
  reportEndDate: string; // LocalDate
  reportType: 'STUDENT' | 'TEACHER' | 'SUBJECT' | 'ADMIN';
  requestedById: number;
  requestedByName: string;
  
  // Summary statistics
  statistics: IncompleteStatisticsDto;
  
  // List of incomplete progress records
  incompleteRecords: IncompleteProgressDto[];
  
  // Breakdown by reason
  incompleteByReason: Record<string, number>;
  
  // Breakdown by subject
  incompleteBySubject: Record<string, SubjectIncompleteBreakdown>;
  
  // Breakdown by student
  incompleteByStudent: Record<number, StudentIncompleteBreakdown>;
  
  // Breakdown by week
  incompleteByWeek: Record<number, WeekIncompleteBreakdown>;
  
  // Most affected students/subjects
  mostAffectedStudents: StudentIncompleteBreakdown[];
  mostAffectedSubjects: SubjectIncompleteBreakdown[];
  
  // Filter criteria applied
  filters?: ReportFilters;
}

// ============================================================
// HELPER TYPES
// ============================================================

export type IncompleteReason =
  | 'MISSED_GRACE_PERIOD'
  | 'NO_SUBMISSION'
  | 'HOLIDAY_RESCHEDULE_FAILED'
  | 'TOPIC_NOT_ASSIGNED';

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface IncompleteReportRequest {
  reportType: 'STUDENT' | 'TEACHER' | 'SUBJECT' | 'ADMIN';
  startDate?: string;
  endDate?: string;
  studentId?: number;
  subjectId?: number;
  teacherId?: number;
  weekNumber?: number;
  incompleteReason?: IncompleteReason;
  urgencyLevel?: UrgencyLevel;
}

export interface BulkOperationResultDto {
  successCount: number;
  failedCount: number;
  failedIds: number[];
  message: string;
}