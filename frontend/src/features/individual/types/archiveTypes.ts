/**
 * Archive Types
 * SPRINT 9: Archiving & Historical Data
 */

// ============================================================
// TIMETABLE MANAGEMENT TYPES
// ============================================================

export interface TimetableDeleteRequest {
  // Timetable to delete
  timetableId: number;
  
  // Verification
  studentProfileId: number;
  
  // Confirmation
  confirmDeletion: boolean;
  
  // Optional reason
  deletionReason?: string;
  
  // Preservation flag
  preserveCompletedAssessments?: boolean;
}

export interface TimetableDeleteResponse {
  // Status
  success: boolean;
  message: string;
  
  // Deleted info
  deletedTimetableId: number;
  
  // Counts
  schedulesDeleted: number;
  incompleteProgressDeleted: number;
  completedAssessmentsPreserved: number;
  
  // Timestamp
  deletedAt: string; // Instant
  
  // Next steps
  canUploadNew: boolean;
}

// ============================================================
// TIMETABLE REPLACEMENT TYPES
// ============================================================

export interface ExistingTimetableInfo {
  id: number;
  filename: string;
  uploadedAt: string; // Instant
  processingStatus: string;
  totalPeriods: number;
  subjectsIdentified: number;
  deleteUrl: string;
}

export interface DeletionImpactInfo {
  currentSchedulesCount: number;
  futureSchedulesCount: number;
  completedAssessmentsCount: number;
  pendingAssessmentsCount: number;
  willPreserveCompletedAssessments: boolean;
  warningMessage: string;
}

export interface TimetableReplacementDto {
  // Upload status
  uploadAllowed: boolean;
  
  // Block reason
  blockReason?: string;
  
  // Existing timetable
  existingTimetable?: ExistingTimetableInfo;
  
  // Deletion requirement
  mustDeleteFirst: boolean;
  
  // Impact assessment
  deletionImpact?: DeletionImpactInfo;
}

// ============================================================
// TIMETABLE PROCESSING TYPES
// ============================================================

export interface TimetableEntryDto {
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectId?: number;
  confidence: number;
}

export interface IndividualTimetableDto {
  id: number;
  studentProfileId: number;
  studentName: string;
  
  // File metadata
  originalFilename: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  
  // Processing info
  processingStatus: string;
  processingError?: string;
  totalPeriodsExtracted: number;
  subjectsIdentified: number;
  confidenceScore: number;
  
  // Academic context
  termId: number;
  termName: string;
  academicYear: string;
  
  // Timestamps
  uploadedAt: string; // Instant
  processedAt?: string; // Instant
  createdAt: string; // Instant
  
  // Entries
  entries: TimetableEntryDto[];
  
  // Teacher matching
  matchingSubjectsForTeacher?: string[];
}

export interface ProcessingResultDto {
  itemsExtracted: number;
  itemsMapped: number;
  overallConfidence: number;
  warnings: string[];
  errors: string[];
}

export interface ProcessingStatusDto {
  documentId: number;
  documentType: 'TIMETABLE' | 'SCHEME';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
  progress: number;
  startedAt?: string; // Instant
  completedAt?: string; // Instant
  result?: ProcessingResultDto;
}

export interface ProcessingStatsDto {
  // Timetable stats
  totalTimetables: number;
  completedTimetables: number;
  processingTimetables: number;
  failedTimetables: number;
  
  // Scheme stats
  totalSchemes: number;
  completedSchemes: number;
  processingSchemes: number;
  failedSchemes: number;
}

// ============================================================
// INDIVIDUAL STUDENT OVERVIEW
// ============================================================

export interface IndividualSchemeDto {
  id: number;
  studentProfileId: number;
  subjectId: number;
  subjectName: string;
  
  // File metadata
  originalFilename: string;
  fileUrl: string;
  fileType: string;
  
  // Processing info
  processingStatus: string;
  processingError?: string;
  
  // Academic context
  termId: number;
  termName: string;
  
  // Timestamps
  uploadedAt: string; // Instant
  processedAt?: string; // Instant
}

export interface IndividualStudentOverviewDto {
  studentProfileId: number;
  totalTimetables: number;
  totalSchemes: number;
  timetables: IndividualTimetableDto[];
  schemes: IndividualSchemeDto[];
}

// ============================================================
// SUBJECT MAPPING TYPES
// ============================================================

export interface SubjectMappingUpdateRequest {
  timetableId: number;
  entryIndex: number;
  newSubjectId: number;
  reason?: string;
}

export interface SubjectMappingUpdateResponse {
  timetableId: number;
  entryIndex: number;
  oldSubjectId?: number;
  newSubjectId: number;
  message: string;
}

// ============================================================
// SYSTEM STATISTICS
// ============================================================

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

// ============================================================
// BULK OPERATIONS
// ============================================================

export interface BulkOperationResultDto {
  successCount: number;
  failedCount: number;
  failedIds: number[];
  message: string;
}

export interface BulkDeleteRequest {
  timetableIds: number[];
  confirmDeletion: boolean;
  preserveCompletedAssessments?: boolean;
}

export interface BulkReprocessRequest {
  timetableIds: number[];
  reprocessReason: string;
}

// ============================================================
// ARCHIVE SEARCH/FILTER TYPES
// ============================================================

export interface ArchiveSearchRequest {
  studentId?: number;
  subjectId?: number;
  termId?: number;
  weekNumber?: number;
  startDate?: string; // LocalDate
  endDate?: string; // LocalDate
  completionStatus?: 'COMPLETED' | 'INCOMPLETE' | 'ALL';
  scheduleSource?: 'INDIVIDUAL' | 'CLASS' | 'ALL';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface ArchivedScheduleDto {
  id: number;
  studentProfileId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  scheduledDate: string; // LocalDate
  weekNumber: number;
  periodNumber: number;
  completed: boolean;
  assessmentScore?: number;
  archivedAt: string; // LocalDateTime
  scheduleSource: string;
}

export interface ArchiveSearchResponse {
  archives: ArchivedScheduleDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}