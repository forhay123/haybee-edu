// ============================================================
// FILE: assessmentTypes.ts (UPDATED WITH CUSTOM ASSESSMENT SUPPORT)
// Location: frontend/src/features/assessments/types/assessmentTypes.ts
// ============================================================

// Assessment Types
export enum AssessmentType {
  LESSON_TOPIC_ASSESSMENT = 'LESSON_TOPIC_ASSESSMENT',
  QUIZ = 'QUIZ',
  CLASSWORK = 'CLASSWORK',
  TEST1 = 'TEST1',
  TEST2 = 'TEST2',
  ASSIGNMENT = 'ASSIGNMENT',
  EXAM = 'EXAM'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY'
}

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  type: AssessmentType;
  subjectId: number;
  subjectName?: string;
  termId?: number;
  termName?: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  createdById?: number;
  createdByName?: string;
  totalMarks: number;
  passingMarks: number;
  durationMinutes?: number;
  autoGrade: boolean;
  published: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  hasSubmitted?: boolean;
  submissionId?: number;
  studentScore?: number;
  studentPassed?: boolean;
  
  // ============================================================
  // ⭐ NEW: CUSTOM PERIOD ASSESSMENT FIELDS
  // ============================================================
  
  /**
   * TRUE if this is a teacher-created custom assessment for a specific student
   */
  isCustomAssessment?: boolean;
  
  /**
   * ID of the student this custom assessment is targeted to
   * NULL for regular assessments available to all students
   */
  targetStudentId?: number;
  
  /**
   * Name of the target student (for display purposes)
   */
  targetStudentName?: string;
  
  /**
   * Which period this assessment is for (1, 2, 3, etc.)
   * Only used for custom period assessments
   */
  periodNumber?: number;
  
  /**
   * ID of the base assessment this was derived from
   * Usually links to the Period 1 assessment
   */
  parentAssessmentId?: number;
  
  /**
   * Title of the parent assessment
   */
  parentAssessmentTitle?: string;
  
  /**
   * When the custom assessment was created
   */
  customAssessmentCreatedAt?: string;
  
  /**
   * User ID of the teacher who created the custom assessment
   */
  customAssessmentCreatedBy?: number;
  
  /**
   * Name of the teacher who created it
   */
  customAssessmentCreatedByName?: string;
}

export interface AssessmentQuestion {
  id: number;
  assessmentId: number;
  questionText: string;
  questionType: QuestionType;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  marks: number;
  orderNumber: number;
  aiGenerated: boolean;
}

export interface AssessmentAnswer {
  id?: number;
  questionId: number;
  questionText?: string;
  questionType?: QuestionType;
  studentAnswer: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  marksObtained?: number | null;
  maxMarks?: number;
  teacherFeedback?: string;
}

export interface AssessmentSubmission {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  studentId: number;
  studentName: string;
  submittedAt: string;
  score?: number;
  totalMarks: number;
  percentage?: number;
  passed?: boolean;
  graded: boolean;
  gradedAt?: string;
  answers: AssessmentAnswer[];
}

export interface CreateAssessmentRequest {
  title: string;
  description?: string;
  type: AssessmentType;
  subjectId: number;
  termId?: number;
  lessonTopicId?: number;
  totalMarks?: number;
  passingMarks?: number;
  durationMinutes?: number;
  autoGrade?: boolean;
  published?: boolean;
  dueDate?: string;
  numberOfAIQuestions?: number;
  teacherQuestionIds?: number[];
  mixAIAndTeacherQuestions?: boolean;
  
  // ⭐ NEW: Custom period assessment fields
  isCustomPeriodAssessment?: boolean;
  targetStudentProfileId?: number;
  periodNumber?: number;
  parentAssessmentId?: number;
}

export interface SubmitAssessmentRequest {
  assessmentId: number;
  answers: {
    questionId: number;
    studentAnswer: string;
  }[];
}

export interface TeacherQuestion {
  id: number;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  questionText: string;
  questionType: QuestionType;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: string;
  difficultyLevel?: string;
  createdAt: string;
}

export interface CreateTeacherQuestionRequest {
  subjectId: number;
  lessonTopicId?: number;
  questionText: string;
  questionType: QuestionType;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: string;
  difficultyLevel?: string;
}

// ============================================================
// GRADING TYPES
// ============================================================

export interface PendingSubmission {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  studentId: number;
  studentName: string;
  subjectId?: number;
  subjectName?: string;
  teacherId?: number;
  teacherName?: string;
  submittedAt: string;
  score?: number;
  totalMarks: number;
  percentage?: number;
  passed?: boolean;
  graded: boolean;
  gradedAt?: string;
  pendingAnswersCount: number;
}

export interface GradeAnswerRequest {
  answerId: number;
  marksObtained: number;
  teacherFeedback?: string;
}

export interface GradeSubmissionRequest {
  submissionId: number;
  grades: GradeAnswerRequest[];
}

export interface GradingStats {
  totalPendingSubmissions: number;
  totalPendingAnswers: number;
  uniqueStudents: number;
  recentSubmissions: {
    id: number;
    assessmentTitle: string;
    studentName: string;
    submittedAt: string;
    pendingAnswersCount: number;
  }[];
}

// ============================================================
// ACCESS CONTROL TYPES
// ============================================================

/**
 * Access check result from backend
 * Matches backend AccessCheckResult DTO exactly
 */
export interface AccessCheckResult {
  canAccess: boolean;
  reason?: string;
  windowStart?: string; // ISO datetime string
  windowEnd?: string; // ISO datetime string
  currentTime?: string; // ISO datetime string
  minutesUntilOpen?: number;
  minutesRemaining?: number;
  gracePeriodActive?: boolean;
  statusCode?: 'ALLOWED' | 'NOT_YET_OPEN' | 'EXPIRED' | 'ALREADY_SUBMITTED' | 'BLOCKED';
}

/**
 * Computed property to check if already submitted
 * For backward compatibility with existing code that checks alreadySubmitted
 */
export const isAlreadySubmitted = (result: AccessCheckResult | undefined): boolean => {
  return result?.statusCode === 'ALREADY_SUBMITTED';
};

/**
 * Status variants for UI display
 */
export type AssessmentAccessStatus =
  | 'allowed'
  | 'not-yet-open'
  | 'expired'
  | 'already-submitted'
  | 'blocked'
  | 'loading';

/**
 * Helper to determine status from AccessCheckResult
 */
export const getAccessStatus = (
  result: AccessCheckResult | undefined
): AssessmentAccessStatus => {
  if (!result) return 'loading';
  
  // Use statusCode if available (preferred)
  if (result.statusCode) {
    switch (result.statusCode) {
      case 'ALLOWED':
        return 'allowed';
      case 'NOT_YET_OPEN':
        return 'not-yet-open';
      case 'EXPIRED':
        return 'expired';
      case 'ALREADY_SUBMITTED':
        return 'already-submitted';
      case 'BLOCKED':
        return 'blocked';
    }
  }
  
  // Fallback logic if statusCode not present
  if (result.canAccess) return 'allowed';
  if ((result.minutesUntilOpen ?? 0) > 0) return 'not-yet-open';
  if ((result.minutesRemaining ?? 0) <= 0) return 'expired';
  
  return 'blocked';
};

/**
 * Helper to get color class based on status
 */
export const getStatusColor = (status: AssessmentAccessStatus): string => {
  switch (status) {
    case 'allowed':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'not-yet-open':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'expired':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'already-submitted':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'blocked':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-400 bg-gray-50 border-gray-200';
  }
};

/**
 * Helper to get icon based on status
 */
export const getStatusIcon = (status: AssessmentAccessStatus): string => {
  switch (status) {
    case 'allowed':
      return '✓';
    case 'not-yet-open':
      return '🕐';
    case 'expired':
      return '⏰';
    case 'already-submitted':
      return '✓';
    case 'blocked':
      return '🔒';
    default:
      return '...';
  }
};

// ============================================================
// VALIDATION TYPES
// ============================================================

/**
 * Schedule validation result
 * Used in: WeeklyScheduleForm, useScheduleValidation hook
 */
export interface ValidationResult {
  canCreate: boolean;
  reason: string | string[];  
  questionCount: number;
  aiQuestions: number;
  teacherQuestions: number;
  subjectName: string;
  lessonTopicTitle: string;
  errors?: string[];
  suggested_fixes?: string[];
}

// ============================================================
// INCOMPLETE LESSONS TYPES
// ============================================================

/**
 * Single incomplete lesson info
 */
export interface IncompleteLessonInfo {
  id: number;
  lessonTopicId?: number;
  lessonTopicTitle: string;
  subjectId: number;
  subjectName: string;
  scheduledDate: string; // ISO date YYYY-MM-DD
  periodNumber: number;
  incompleteReason: 'MISSED_GRACE_PERIOD' | 'LATE_SUBMISSION' | 'NO_SUBMISSION';
  lessonStartTime?: string; // HH:mm
  lessonEndTime?: string; // HH:mm
  graceEndTime?: string; // HH:mm
  autoMarkedIncompleteAt?: string; // ISO datetime
  assessmentWindowStart?: string; // ISO datetime
  assessmentWindowEnd?: string; // ISO datetime
}

/**
 * Complete report of incomplete lessons grouped by reason
 */
export interface IncompleteLessonsReport {
  studentId: number;
  studentName?: string;
  totalIncomplete: number;
  groupedByReason: {
    MISSED_GRACE_PERIOD: IncompleteLessonInfo[];
    LATE_SUBMISSION: IncompleteLessonInfo[];
    NO_SUBMISSION: IncompleteLessonInfo[];
  };
  fromDate?: string;
  toDate?: string;
}

// ============================================================
// LESSON PROGRESS TYPES
// ============================================================

export interface LessonProgressDto {
  id: number;
  lessonId: number;
  lessonTitle: string;
  subjectName: string;
  topicName: string;
  scheduledDate: string;
  periodNumber: number;
  completed: boolean;
  completedAt?: string;
  priority?: number;
  weight?: number;
  assessmentId?: number;
}

// ============================================================
// ⭐ NEW: HELPER FUNCTIONS FOR CUSTOM ASSESSMENTS
// ============================================================

/**
 * Check if assessment is a custom assessment
 */
export const isCustomAssessment = (assessment: Assessment): boolean => {
  return assessment.isCustomAssessment === true;
};

/**
 * Check if student can access custom assessment
 */
export const canAccessCustomAssessment = (
  assessment: Assessment,
  studentId: number
): boolean => {
  if (!isCustomAssessment(assessment)) {
    return true; // Regular assessments are accessible to all
  }
  return assessment.targetStudentId === studentId;
};

/**
 * Get assessment display name with period info
 */
export const getAssessmentDisplayName = (assessment: Assessment): string => {
  if (!isCustomAssessment(assessment)) {
    return assessment.title;
  }
  
  let name = assessment.title;
  if (assessment.periodNumber) {
    name += ` - Period ${assessment.periodNumber}`;
  }
  if (assessment.targetStudentName) {
    name += ` (Custom for ${assessment.targetStudentName})`;
  }
  return name;
};

/**
 * Check if assessment is for a specific period
 */
export const isForPeriod = (assessment: Assessment, periodNumber: number): boolean => {
  return assessment.periodNumber === periodNumber;
};

/**
 * Get period label
 */
export const getPeriodLabel = (periodNumber?: number): string => {
  if (!periodNumber) return 'Period 1';
  return `Period ${periodNumber}`;
};
