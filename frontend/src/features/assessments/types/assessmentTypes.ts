// ============================================================
// FILE: assessmentTypes.ts (UPDATED WITH WORKINGS SUPPORT)
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
  
  // Custom period assessment fields
  isCustomAssessment?: boolean;
  targetStudentId?: number;
  targetStudentName?: string;
  periodNumber?: number;
  parentAssessmentId?: number;
  parentAssessmentTitle?: string;
  customAssessmentCreatedAt?: string;
  customAssessmentCreatedBy?: number;
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
  
  // ✅ NEW: Step-by-step workings
  workings?: string | null;
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
  
  // ✅ NEW: Step-by-step workings
  workings?: string | null;
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
  
  // Custom period assessment fields
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
  
  // ✅ NEW: Step-by-step workings
  workings?: string | null;
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
  
  // ✅ NEW: Step-by-step workings
  workings?: string | null;
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

export interface AccessCheckResult {
  canAccess: boolean;
  reason?: string;
  windowStart?: string;
  windowEnd?: string;
  currentTime?: string;
  minutesUntilOpen?: number;
  minutesRemaining?: number;
  gracePeriodActive?: boolean;
  statusCode?: 'ALLOWED' | 'NOT_YET_OPEN' | 'EXPIRED' | 'ALREADY_SUBMITTED' | 'BLOCKED';
}

export const isAlreadySubmitted = (result: AccessCheckResult | undefined): boolean => {
  return result?.statusCode === 'ALREADY_SUBMITTED';
};

export type AssessmentAccessStatus =
  | 'allowed'
  | 'not-yet-open'
  | 'expired'
  | 'already-submitted'
  | 'blocked'
  | 'loading';

export const getAccessStatus = (
  result: AccessCheckResult | undefined
): AssessmentAccessStatus => {
  if (!result) return 'loading';
  
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
  
  if (result.canAccess) return 'allowed';
  if ((result.minutesUntilOpen ?? 0) > 0) return 'not-yet-open';
  if ((result.minutesRemaining ?? 0) <= 0) return 'expired';
  
  return 'blocked';
};

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

export interface IncompleteLessonInfo {
  id: number;
  lessonTopicId?: number;
  lessonTopicTitle: string;
  subjectId: number;
  subjectName: string;
  scheduledDate: string;
  periodNumber: number;
  incompleteReason: 'MISSED_GRACE_PERIOD' | 'LATE_SUBMISSION' | 'NO_SUBMISSION';
  lessonStartTime?: string;
  lessonEndTime?: string;
  graceEndTime?: string;
  autoMarkedIncompleteAt?: string;
  assessmentWindowStart?: string;
  assessmentWindowEnd?: string;
}

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
// HELPER FUNCTIONS FOR CUSTOM ASSESSMENTS
// ============================================================

export const isCustomAssessment = (assessment: Assessment): boolean => {
  return assessment.isCustomAssessment === true;
};

export const canAccessCustomAssessment = (
  assessment: Assessment,
  studentId: number
): boolean => {
  if (!isCustomAssessment(assessment)) {
    return true;
  }
  return assessment.targetStudentId === studentId;
};

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

export const isForPeriod = (assessment: Assessment, periodNumber: number): boolean => {
  return assessment.periodNumber === periodNumber;
};

export const getPeriodLabel = (periodNumber?: number): string => {
  if (!periodNumber) return 'Period 1';
  return `Period ${periodNumber}`;
};

// ============================================================
// ✅ NEW: WORKINGS HELPER FUNCTIONS
// ============================================================

/**
 * Check if a question has workings
 */
export const hasWorkings = (question: AssessmentQuestion | AssessmentAnswer): boolean => {
  return question.workings !== null && 
         question.workings !== undefined && 
         question.workings.trim() !== '';
};

/**
 * Format workings text for display (convert \n to <br/>)
 */
export const formatWorkings = (workings: string): string => {
  return workings.replace(/\n/g, '<br/>');
};

/**
 * Get workings lines as array
 */
export const getWorkingsLines = (workings: string): string[] => {
  return workings.split('\n').filter(line => line.trim() !== '');
};