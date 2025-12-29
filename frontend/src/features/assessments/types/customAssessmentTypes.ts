/**
 * TypeScript types and interfaces for custom period assessments
 */

// ============================================================
// CUSTOM ASSESSMENT REQUEST
// ============================================================

export interface CustomAssessmentRequest {
  studentProfileId: number;
  subjectId: number;
  lessonTopicId?: number;
  periodNumber: number; // 2 or 3
  title: string;
  description?: string;
  questionIds?: number[];
  totalMarks: number;
  passingMarks?: number;
  durationMinutes?: number;
  dueDate?: string; // ISO date string
  scheduledDate?: string; // ISO date string
  parentAssessmentId?: number;
  previousSubmissionId?: number;
  teacherNotes?: string;
  includeIncorrectQuestions?: boolean;
  focusOnWeakTopics?: boolean;
}

// ============================================================
// CUSTOM ASSESSMENT DTO
// ============================================================

export interface CustomAssessmentDto {
  id: number;
  title: string;
  description?: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  periodNumber: number;
  totalMarks: number;
  passingMarks?: number;
  durationMinutes?: number;
  dueDate?: string;
  scheduledDate?: string;
  
  // Custom assessment specific
  isCustomAssessment: boolean;
  targetStudentId: number;
  targetStudentName: string;
  parentAssessmentId?: number;
  parentAssessmentTitle?: string;
  customAssessmentCreatedAt: string;
  customAssessmentCreatedBy: number;
  customAssessmentCreatedByName: string;
  
  // Question details
  questionCount: number;
  
  // Submission info (if student has submitted)
  hasSubmitted?: boolean;
  submissionId?: number;
  studentScore?: number;
  studentPassed?: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  published: boolean;
  autoGrade: boolean;
}

// ============================================================
// PENDING ASSESSMENT
// ============================================================

export interface PendingAssessment {
  progressId: number;
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  topicId?: number;
  topicName?: string;
  periodNumber: number;
  totalPeriods: number;
  scheduledDate: string;
  
  // Previous period info
  previousPeriodProgressId?: number;
  previousSubmissionId?: number;
  previousScore?: number;
  previousCompletedAt?: string;
  
  // Urgency
  canCreateNow: boolean;
  blockingReason?: string;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  daysUntilScheduled: number;
  
  // Suggested focus areas
  suggestedFocusAreas?: SuggestedFocusArea;
}

export interface SuggestedFocusArea {
  topicName: string;
  previousScore: number;
  questionsWrong: number;
  recommendedFocus: string;
}

// ============================================================
// PERIOD PROGRESS DTO
// ============================================================

export interface PeriodProgressDto {
  progressId: number;
  periodNumber: number;
  totalPeriodsInSequence: number;
  
  // Status
  status: PeriodStatus;
  statusMessage?: string;
  
  // ✅ ADDED: Incomplete reason (for missed assessments)
  incompleteReason?: string;
  
  // Assessment info
  assessmentId?: number;
  assessmentTitle?: string;
  isCustomAssessment: boolean;
  
  // Submission info
  submissionId?: number;
  score?: number;
  completedAt?: string;
  
  // ✅ ADDED: isCompleted property (computed from completedAt)
  isCompleted?: boolean;
  
  // Timing
  scheduledDate: string;
  assessmentWindowStart?: string;
  assessmentWindowEnd?: string;
  gracePeriodEnd?: string;
  
  // Access control
  canAccess: boolean;
  blockingReason?: string;
  blockType?: AccessBlockType;
  
  // Dependencies
  previousPeriodProgressId?: number;
  previousPeriodCompleted: boolean;
  
  // Custom assessment status
  requiresCustomAssessment: boolean;
  customAssessmentCreated: boolean;
  customAssessmentCreatedAt?: string;
  customAssessmentCreatedBy?: string;
  
  // Accessibility
  isAccessible: boolean;
  isWindowOpen: boolean;
  minutesUntilWindowOpens?: number;
  minutesUntilWindowCloses?: number;
}

// ✅ ADDED: Helper function to compute isCompleted
export const isPeriodCompleted = (period: PeriodProgressDto): boolean => {
  return !!period.completedAt || period.isCompleted === true;
};

// ✅ UPDATED: Added MISSED status
export enum PeriodStatus {
  COMPLETED = 'COMPLETED',
  AVAILABLE = 'AVAILABLE',
  WAITING_ASSESSMENT = 'WAITING_ASSESSMENT',
  LOCKED = 'LOCKED',
  SCHEDULED = 'SCHEDULED',
  WINDOW_CLOSED = 'WINDOW_CLOSED',
  MISSED = 'MISSED', // ← ADDED THIS!
}

export enum AccessBlockType {
  NONE = 'NONE',
  PREVIOUS_INCOMPLETE = 'PREVIOUS_INCOMPLETE',
  WAITING_TEACHER = 'WAITING_TEACHER',
  WINDOW_NOT_OPEN = 'WINDOW_NOT_OPEN',
  WINDOW_CLOSED = 'WINDOW_CLOSED',
  NO_ASSESSMENT = 'NO_ASSESSMENT',
}

// ============================================================
// SUBMISSION ANALYSIS
// ============================================================

export interface SubmissionAnalysis {
  submissionId: number;
  assessmentId: number;
  assessmentTitle: string;
  submittedAt: string;
  
  studentId: number;
  studentName: string;
  
  // Overall metrics
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  scorePercentage: number;
  totalScore: number;
  maxScore: number;
  
  // Topic breakdown
  topicPerformance: TopicPerformance[];
  difficultyPerformance: Record<string, DifficultyPerformance>;
  
  // Areas of concern
  weakTopics: string[];
  strongTopics: string[];
  
  // Question details
  questionBreakdown: QuestionPerformance[];
  questionsGroupedByTopic: Record<string, QuestionPerformance[]>;
  
  // Time analysis
  timeAnalysis?: TimeAnalysis;
  
  // Recommendations
  recommendedFocusAreas: RecommendedFocusArea[];
  
  // Comparison
  classComparison?: ClassComparison;
}

export interface TopicPerformance {
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  successRate: number;
  isWeakArea: boolean;
  incorrectQuestionIds: number[];
}

export interface DifficultyPerformance {
  difficultyLevel: string;
  totalQuestions: number;
  correctAnswers: number;
  successRate: number;
}

export interface QuestionPerformance {
  questionId: number;
  questionText: string;
  topic: string;
  difficulty: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  timeSpentSeconds?: number;
}

export interface TimeAnalysis {
  totalTimeSpentSeconds: number;
  averageTimePerQuestionSeconds: number;
  longestQuestionTimeSeconds: number;
  shortestQuestionTimeSeconds: number;
  timePerQuestion: QuestionTimeDetail[];
}

export interface QuestionTimeDetail {
  questionId: number;
  questionText: string;
  timeSpentSeconds: number;
  wasCorrect: boolean;
  topic: string;
}

export interface RecommendedFocusArea {
  topicName: string;
  reason: string;
  suggestedQuestionCount: number;
  difficulty: string;
  priority: number; // 1 = highest
}

export interface ClassComparison {
  classAverageScore: number;
  studentScore: number;
  performanceLevel: 'Above Average' | 'Average' | 'Below Average';
  studentRank?: number;
  totalStudents?: number;
}

// ============================================================
// CUSTOM ASSESSMENT BUILDER STATE
// ============================================================

export interface CustomAssessmentBuilderState {
  // Step 1: Student and Context
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  periodNumber: number;
  previousSubmissionId?: number;
  
  // Step 2: Analysis
  submissionAnalysis?: SubmissionAnalysis;
  selectedWeakTopics: string[];
  selectedIncorrectQuestions: number[];
  
  // Step 3: Assessment Details
  title: string;
  description: string;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  scheduledDate?: string;
  dueDate?: string;
  
  // Step 4: Questions
  selectedQuestionIds: number[];
  includeIncorrectQuestions: boolean;
  focusOnWeakTopics: boolean;
  
  // Step 5: Review
  teacherNotes: string;
  
  // UI State
  currentStep: number;
  isLoading: boolean;
  error?: string;
  validationErrors: Record<string, string>;
}

// ============================================================
// UI HELPERS
// ============================================================

export interface PeriodBadgeProps {
  periodNumber: number;
  status: PeriodStatus;
  isCustom: boolean;
}

export interface UrgencyBadgeProps {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  daysUntil: number;
}

export interface ProgressIndicatorProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

// ============================================================
// API RESPONSE WRAPPERS
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// ============================================================
// FILTER AND SORT OPTIONS
// ============================================================

export interface PendingAssessmentFilters {
  subjectId?: number;
  urgencyLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  periodNumber?: number;
  daysAhead?: number;
}

export interface PendingAssessmentSortOptions {
  field: 'scheduledDate' | 'studentName' | 'urgencyLevel' | 'periodNumber';
  direction: 'asc' | 'desc';
}

// ============================================================
// FORM VALIDATION
// ============================================================

export interface CustomAssessmentValidation {
  isValid: boolean;
  errors: {
    title?: string;
    totalMarks?: string;
    passingMarks?: string;
    durationMinutes?: string;
    questionIds?: string;
    general?: string;
  };
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export interface CustomAssessmentNotification {
  type: 'CUSTOM_ASSESSMENT_NEEDED' | 'CUSTOM_ASSESSMENT_CREATED';
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  periodNumber: number;
  scheduledDate: string;
  progressId: number;
  assessmentId?: number;
}