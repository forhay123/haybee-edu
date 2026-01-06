// frontend/src/features/individual/types/individualTypes.ts

/**
 * Processing status for uploaded files
 */
export type ProcessingStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED';

/**
 * File types supported for uploads
 */
export type FileType = 
  | 'PDF' 
  | 'EXCEL' 
  | 'WORD' 
  | 'IMAGE' 
  | 'UNKNOWN';

/**
 * Timetable upload request
 */
export interface TimetableUploadRequest {
  studentProfileId: number;
  termId?: number;
  classId?: number;
  academicYear?: string;
  uploadType?: string;
}

/**
 * Timetable upload response
 */
export interface TimetableUploadResponse {
  timetableId: number;
  filename: string;
  fileUrl: string;
  processingStatus: ProcessingStatus;
  uploadedAt: string;
  message: string;
}

/**
 * Scheme of work upload request
 */
export interface SchemeUploadRequest {
  studentProfileId: number;
  subjectId: number;
  termId?: number;
  academicYear?: string;
}

/**
 * Scheme upload response
 */
export interface SchemeUploadResponse {
  schemeId: number;
  filename: string;
  fileUrl: string;
  subjectId: number;
  subjectName: string;
  processingStatus: ProcessingStatus;
  uploadedAt: string;
  message: string;
}

/**
 * Individual student timetable
 */
export interface IndividualTimetableDto {
  id: number;
  studentProfileId: number;
  studentName: string;
  originalFilename: string;
  fileUrl: string;
  fileType: FileType;
  fileSizeBytes: number;
  processingStatus: ProcessingStatus;
  processingError?: string;
  totalPeriodsExtracted?: number;
  subjectsIdentified?: number;
  confidenceScore?: number;
  termId?: number;
  termName?: string;
  academicYear?: string;
  uploadedAt: string;
  processedAt?: string;
  createdAt: string;
  entries?: TimetableEntryDto[];
}

/**
 * Individual scheme of work
 */
export interface IndividualSchemeDto {
  id: number;
  studentProfileId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  originalFilename: string;
  fileUrl: string;
  fileType: FileType;
  fileSizeBytes: number;
  processingStatus: ProcessingStatus;
  processingError?: string;
  totalTopicsExtracted?: number;
  weeksCovered?: number;
  confidenceScore?: number;
  termId?: number;
  termName?: string;
  academicYear?: string;
  uploadedAt: string;
  processedAt?: string;
  createdAt: string;
}

/**
 * Individual lesson topic
 */
export interface IndividualLessonTopicDto {
  id: number;
  studentProfileId: number;
  studentName: string;
  schemeId: number;
  subjectId: number;
  subjectName: string;
  topicTitle: string;
  description?: string;
  weekNumber: number;
  mappedSubjectId?: number;
  mappedSubjectName?: string;
  mappingConfidence?: number;
  fileName?: string;
  fileUrl?: string;
  termId?: number;
  termName?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Timetable entry (extracted from timetable)
 */
export interface TimetableEntryDto {
  id: number;
  timetableId: number;
  dayOfWeek: string;
  periodNumber: number;
  subjectName: string;
  subjectId?: number;
  subjectCode?: string;
  startTime?: string;
  endTime?: string;
  mappingConfidence?: number;
  room?: string;
  teacher?: string;
}

/**
 * Daily schedule for INDIVIDUAL student
 */
export interface IndividualDailyScheduleDto {
  id: number;                  // DailySchedule ID
  progressId?: number;
  studentProfileId: number;
  scheduledDate: string;
  periodNumber: number;
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  startTime?: string;
  endTime?: string;
  completed: boolean;
  scheduleSource: 'INDIVIDUAL';
  individualTimetableId: number;
  // ✅ NEW: Assessment window timing fields
  assessmentWindowStart?: string;  // ISO datetime string
  assessmentWindowEnd?: string;    // ISO datetime string
  gracePeriodEnd?: string;         // ISO datetime string
  
  // ✅ NEW: Separate access controls
  lessonContentAccessible?: boolean;  // Always true - view lessons anytime
  assessmentAccessible?: boolean; 
}

/**
 * Student overview (all uploads and stats)
 */
export interface IndividualStudentOverview {
  studentProfileId: number;
  totalTimetables: number;
  totalSchemes: number;
  timetables: IndividualTimetableDto[];
  schemes: IndividualSchemeDto[];
}

/**
 * File upload progress
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload error
 */
export interface UploadError {
  message: string;
  details?: string;
}

/**
 * Subject option for dropdowns
 */
export interface SubjectOption {
  id: number;
  name: string;
  code?: string;
}

/**
 * Term option for dropdowns
 */
export interface TermOption {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Time window for INDIVIDUAL students
 */
export interface TimeWindow {
  dayOfWeek: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

// ============================================================
// MANUAL SUBJECT SELECTION TYPES
// ADD THIS SECTION TO THE END OF:
// frontend/src/features/individual/types/individualTypes.ts
// ============================================================

/**
 * Request to create manual timetable from selected subjects
 */
export interface ManualTimetableCreationRequest {
  studentProfileId: number;
  subjectIds: number[];
  academicYear?: string;
}

/**
 * Response after creating manual timetable
 */
export interface ManualTimetableCreationResponse {
  success: boolean;
  timetableId: number;
  schedulesCreated: number;
  message: string;
  weekStart?: string;
  weekEnd?: string;
}

/**
 * Subject option for manual selection
 * Extends the existing SubjectOption with additional metadata
 */
export interface ManualSubjectOption extends SubjectOption {
  description?: string;
  classNames?: string[]; // Which classes this subject belongs to
  departmentName?: string;
  isCore?: boolean; // Is it a core/compulsory subject
}

/**
 * Validation result for subject selection
 */
export interface SubjectSelectionValidation {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Configuration for manual timetable generation
 */
export interface ManualTimetableConfig {
  minSubjects: number;  // Default: 4
  maxSubjects: number;  // Default: 10
  defaultAcademicYear: string;
  allowDuplicates: boolean;
}

/**
 * Default configuration for manual subject selection
 */
export const DEFAULT_MANUAL_CONFIG: ManualTimetableConfig = {
  minSubjects: 4,
  maxSubjects: 10,
  defaultAcademicYear: '2024/2025',
  allowDuplicates: false,
};

/**
 * Default time windows for INDIVIDUAL students
 * Mon-Fri: 4pm-6pm
 * Sat: 12pm-3pm
 * Sun: Rest day
 */
export const INDIVIDUAL_TIME_WINDOWS: TimeWindow[] = [
  { dayOfWeek: 'MONDAY', startTime: '16:00', endTime: '18:00' },
  { dayOfWeek: 'TUESDAY', startTime: '16:00', endTime: '18:00' },
  { dayOfWeek: 'WEDNESDAY', startTime: '16:00', endTime: '18:00' },
  { dayOfWeek: 'THURSDAY', startTime: '16:00', endTime: '18:00' },
  { dayOfWeek: 'FRIDAY', startTime: '16:00', endTime: '18:00' },
  { dayOfWeek: 'SATURDAY', startTime: '12:00', endTime: '15:00' },
  // Sunday: Rest day (no entries)
];

/**
 * Helper to check if a time is within INDIVIDUAL student learning hours
 */
export function isWithinLearningHours(dayOfWeek: string, time: string): boolean {
  const window = INDIVIDUAL_TIME_WINDOWS.find(w => w.dayOfWeek === dayOfWeek.toUpperCase());
  if (!window) return false;
  
  return time >= window.startTime && time <= window.endTime;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ProcessingStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get confidence score color
 */
export function getConfidenceColor(score?: number): string {
  if (!score) return 'text-gray-500';
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.7) return 'text-yellow-600';
  return 'text-red-600';
}

// ============================================================
// ADMIN TYPES
// ============================================================

/**
 * System-wide statistics for timetable uploads
 */
export interface TimetableSystemStatsDto {
  totalTimetables: number;
  pendingTimetables: number;
  processingTimetables: number;
  completedTimetables: number;
  failedTimetables: number;
  averageProcessingTimeSeconds: number;
  successRatePercentage: number;
  uniqueStudentsCount: number;
}

/**
 * Result of bulk operations
 */
export interface BulkOperationResultDto {
  successCount: number;
  failedCount: number;
  failedIds: number[];
  message?: string;
}

/**
 * Subject mapping update request
 */
export interface SubjectMappingUpdateRequest {
  timetableId: number;
  entryIndex: number;
  newSubjectId: number;
  reason?: string;
}

/**
 * Subject mapping update response
 */
export interface SubjectMappingUpdateResponse {
  timetableId: number;
  entryIndex: number;
  oldSubjectId: number;
  newSubjectId: number;
  message: string;
}

// ============================================================
// FILTER/SEARCH TYPES
// ============================================================

/**
 * Timetable filter options for admin
 */
export interface TimetableFilterOptions {
  status?: ProcessingStatus;
  studentId?: number;
  dateFrom?: string;
  dateTo?: string;
  minConfidence?: number;
  hasErrors?: boolean;
}

/**
 * Sort options for timetable list
 */
export type TimetableSortField = 
  | 'uploadedAt' 
  | 'processedAt' 
  | 'studentName' 
  | 'status' 
  | 'confidenceScore';

export type SortDirection = 'asc' | 'desc';

export interface TimetableSortOptions {
  field: TimetableSortField;
  direction: SortDirection;
}

// ============================================================
// TEACHER TYPES
// ============================================================

/**
 * Student summary for teacher view
 */
export interface TeacherStudentSummary {
  studentProfileId: number;
  studentName: string;
  hasTimetable: boolean;
  latestTimetableStatus?: ProcessingStatus;
  lastUploadedAt?: string;
  totalUploads: number;
}

/**
 * Teacher dashboard stats
 */
export interface TeacherDashboardStats {
  totalAssignedStudents: number;
  studentsWithTimetables: number;
  studentsWithoutTimetables: number;
  totalTimetablesUploaded: number;
  processingTimetables: number;
  failedTimetables: number;
}


// ============================================================
// STUDENT HEALTH & MAINTENANCE TYPES
// ============================================================


/**
 * Student health check data for maintenance operations
 */
export interface StudentHealthData {
  success: boolean;
  studentId: number;
  orphanedProgress: number;
  schedulesWithoutProgress: number;
  schedulesWithoutLessonTopics: number;
  missingAssessments: number;
  missingWindows: number;
  needsRepair: boolean;
  isHealthy: boolean;
  totalIssues: number;
  
  // ✅ NEW: Schedule generation status fields
  schedulesNeedGeneration: boolean;  // True if student needs schedules generated
  hasSchedules: boolean;              // True if student has existing schedules
  totalSchedules?: number;            // Total number of schedules for this student
  scheduleGenerationReason?: string;  // Why schedules need generation (e.g., "No schedules found", "Timetable updated")
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Format processing time for display
 */
export function formatProcessingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Get status badge props (color, icon, text)
 */
export function getStatusBadgeProps(status: ProcessingStatus) {
  switch (status) {
    case 'PENDING':
      return {
        color: 'yellow',
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-800',
        borderClass: 'border-yellow-200',
        text: 'Pending',
        icon: '⏳',
      };
    case 'PROCESSING':
      return {
        color: 'blue',
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-800',
        borderClass: 'border-blue-200',
        text: 'Processing',
        icon: '🔄',
        animate: true,
      };
    case 'COMPLETED':
      return {
        color: 'green',
        bgClass: 'bg-green-100',
        textClass: 'text-green-800',
        borderClass: 'border-green-200',
        text: 'Completed',
        icon: '✅',
      };
    case 'FAILED':
      return {
        color: 'red',
        bgClass: 'bg-red-100',
        textClass: 'text-red-800',
        borderClass: 'border-red-200',
        text: 'Failed',
        icon: '❌',
      };
    default:
      return {
        color: 'gray',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-800',
        borderClass: 'border-gray-200',
        text: 'Unknown',
        icon: '❓',
      };
  }
}

/**
 * Calculate success rate percentage
 */
export function calculateSuccessRate(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Format confidence score for display
 */
export function formatConfidenceScore(score?: number): string {
  if (!score) return 'N/A';
  return `${Math.round(score * 100)}%`;
}

/**
 * Get confidence color class
 */
export function getConfidenceColorClass(score?: number): string {
  if (!score) return 'text-gray-500';
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.7) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Check if timetable needs attention (failed or low confidence)
 */
export function needsAttention(timetable: IndividualTimetableDto): boolean {
  if (timetable.processingStatus === 'FAILED') return true;
  if (
    timetable.confidenceScore &&
    timetable.confidenceScore.valueOf() < 0.7
  ) {
    return true;
  }
  return false;
}

/**
 * Group timetables by student
 */
export function groupTimetablesByStudent(
  timetables: IndividualTimetableDto[]
): Map<number, IndividualTimetableDto[]> {
  const grouped = new Map<number, IndividualTimetableDto[]>();
  
  timetables.forEach((timetable) => {
    const studentId = timetable.studentProfileId;
    if (!grouped.has(studentId)) {
      grouped.set(studentId, []);
    }
    grouped.get(studentId)!.push(timetable);
  });
  
  return grouped;
}

/**
 * Filter timetables by search query
 */
export function filterTimetablesBySearch(
  timetables: IndividualTimetableDto[],
  searchQuery: string
): IndividualTimetableDto[] {
  if (!searchQuery.trim()) return timetables;
  
  const query = searchQuery.toLowerCase();
  return timetables.filter(
    (t) =>
      t.studentName.toLowerCase().includes(query) ||
      t.originalFilename.toLowerCase().includes(query) ||
      t.processingStatus.toLowerCase().includes(query)
  );
}

/**
 * Sort timetables
 */
export function sortTimetables(
  timetables: IndividualTimetableDto[],
  options: TimetableSortOptions
): IndividualTimetableDto[] {
  const { field, direction } = options;
  const sorted = [...timetables];
  
  sorted.sort((a, b) => {
    let aVal: any;
    let bVal: any;
    
    switch (field) {
      case 'uploadedAt':
        aVal = new Date(a.uploadedAt).getTime();
        bVal = new Date(b.uploadedAt).getTime();
        break;
      case 'processedAt':
        aVal = a.processedAt ? new Date(a.processedAt).getTime() : 0;
        bVal = b.processedAt ? new Date(b.processedAt).getTime() : 0;
        break;
      case 'studentName':
        aVal = a.studentName.toLowerCase();
        bVal = b.studentName.toLowerCase();
        break;
      case 'status':
        aVal = a.processingStatus;
        bVal = b.processingStatus;
        break;
      case 'confidenceScore':
        aVal = a.confidenceScore?.valueOf() || 0;
        bVal = b.confidenceScore?.valueOf() || 0;
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}
