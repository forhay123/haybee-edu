/**
 * TypeScript types and interfaces for multi-period progress tracking
 */

import type { PeriodProgressDto, PeriodStatus } from './customAssessmentTypes';

// ============================================================
// MULTI-PERIOD SUBJECT OVERVIEW
// ============================================================

export interface MultiPeriodSubjectOverview {
  // Subject info
  subjectId: number;
  subjectName: string;
  
  // Overall statistics
  totalStudents: number;
  totalPeriods: number;
  completedPeriods: number;
  pendingAssessments: number;
  completionRate: number;
  
  // Student progress list
  students: StudentProgressSummary[];
  
  // Period breakdown
  periodBreakdown: PeriodBreakdown;
  
  // Urgent items
  urgentItems: UrgentItem[];
  
  // Date range
  fromDate: string;
  toDate: string;
}

export interface StudentProgressSummary {
  studentId: number;
  studentName: string;
  totalPeriods: number;
  completedPeriods: number;
  pendingAssessments: number;
  averageScore: number;
  periods: PeriodProgressDto[];
  nextScheduledDate?: string;
  currentStatus: string;
}

export interface PeriodBreakdown {
  period1: PeriodStats;
  period2: PeriodStats;
  period3: PeriodStats;
}

export interface PeriodStats {
  periodNumber: number;
  totalCount: number;
  completedCount: number;
  waitingForAssessment: number;
  locked: number;
  averageScore: number;
}

export interface UrgentItem {
  progressId: number;
  studentId: number;
  studentName: string;
  periodNumber: number;
  scheduledDate: string;
  urgencyType: UrgencyType;
  message: string;
  action: string;
}

export enum UrgencyType {
  ASSESSMENT_NEEDED_TODAY = 'ASSESSMENT_NEEDED_TODAY',
  ASSESSMENT_NEEDED_SOON = 'ASSESSMENT_NEEDED_SOON',
  PERIOD_OVERDUE = 'PERIOD_OVERDUE',
  STUDENT_STRUGGLING = 'STUDENT_STRUGGLING',
}

// ============================================================
// STUDENT PERIOD PROGRESS
// ============================================================

export interface StudentPeriodProgress {
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  periods: PeriodProgressDto[];
  overallProgress: number;
  averageScore: number;
  nextPeriod?: PeriodProgressDto;
  blockedPeriods: number;
}

// ============================================================
// SYSTEM OVERVIEW (ADMIN)
// ============================================================

export interface SystemOverview {
  // Overall statistics
  totalStudents: number;
  totalSubjects: number;
  totalMultiPeriodSubjects: number;
  totalPeriods: number;
  completedPeriods: number;
  pendingCustomAssessments: number;
  overallCompletionRate: number;
  
  // Subject breakdown
  subjectOverviews: MultiPeriodSubjectOverview[];
  
  // Performance metrics
  averageScoreAcrossPeriods: number;
  studentsOnTrack: number;
  studentsBehind: number;
  studentsExcelling: number;
  
  // Urgent items system-wide
  criticalItems: UrgentItem[];
  
  // Trends
  completionTrend: TrendData[];
  scoreTrend: TrendData[];
  
  // Date range
  fromDate: string;
  toDate: string;
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

// ============================================================
// PERIOD TIMELINE
// ============================================================

export interface PeriodTimeline {
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  periods: TimelineItem[];
  milestones: Milestone[];
}

export interface TimelineItem {
  periodNumber: number;
  status: PeriodStatus;
  scheduledDate: string;
  completedDate?: string;
  score?: number;
  daysToComplete?: number;
  isCustomAssessment: boolean;
  assessmentTitle?: string;
  blocked: boolean;
  blockingReason?: string;
}

export interface Milestone {
  date: string;
  type: 'PERIOD_COMPLETED' | 'CUSTOM_ASSESSMENT_CREATED' | 'SEQUENCE_COMPLETED';
  label: string;
  description: string;
  periodNumber?: number;
}

// ============================================================
// PERIOD DEPENDENCY
// ============================================================

export interface PeriodDependency {
  // Current period
  progressId: number;
  periodNumber: number;
  totalPeriodsInSequence: number;
  
  // Dependency info
  dependsOnPeriod?: number;
  dependsOnProgressId?: number;
  dependencyMet: boolean;
  status: DependencyStatus;
  
  // Blocking info
  blockingReason?: string;
  requirements: string[];
  
  // Previous period details
  previousPeriod?: PreviousPeriodDetails;
  
  // Next action
  nextAvailableAction: NextAction;
  
  // Scheduled info
  scheduledDate: string;
  assessmentWindowStart?: string;
  assessmentWindowEnd?: string;
  
  // Assessment info
  hasAssessment: boolean;
  requiresCustomAssessment: boolean;
  customAssessmentCreated: boolean;
  
  // Dependency chain
  dependencyChain: DependencyChainItem[];
}

export enum DependencyStatus {
  READY = 'READY',
  WAITING_PREVIOUS = 'WAITING_PREVIOUS',
  WAITING_ASSESSMENT = 'WAITING_ASSESSMENT',
  BLOCKED = 'BLOCKED',
  NOT_SCHEDULED = 'NOT_SCHEDULED',
}

export interface PreviousPeriodDetails {
  progressId: number;
  periodNumber: number;
  completed: boolean;
  completedAt?: string;
  score?: number;
  submissionId?: number;
  scheduledDate: string;
}

export interface NextAction {
  actionType: ActionType;
  message: string;
  buttonText: string;
  navigationUrl?: string;
  canProceed: boolean;
}

export enum ActionType {
  START_ASSESSMENT = 'START_ASSESSMENT',
  COMPLETE_PREVIOUS = 'COMPLETE_PREVIOUS',
  WAIT_FOR_TEACHER = 'WAIT_FOR_TEACHER',
  WAIT_FOR_SCHEDULE = 'WAIT_FOR_SCHEDULE',
  REVIEW_SUBMISSION = 'REVIEW_SUBMISSION',
  NO_ACTION = 'NO_ACTION',
}

export interface DependencyChainItem {
  progressId: number;
  periodNumber: number;
  completed: boolean;
  scheduledDate: string;
  status: string;
}

// ============================================================
// FILTERS AND SORTING
// ============================================================

export interface MultiPeriodFilters {
  subjectId?: number;
  status?: PeriodStatus;
  completionStatus?: 'COMPLETED' | 'IN_PROGRESS' | 'BLOCKED';
  dateRange?: {
    start: string;
    end: string;
  };
  studentSearch?: string;
}

export interface MultiPeriodSortOptions {
  field: 'studentName' | 'completionRate' | 'averageScore' | 'scheduledDate';
  direction: 'asc' | 'desc';
}

// ============================================================
// DASHBOARD WIDGETS
// ============================================================

export interface DashboardWidget {
  type: 'COMPLETION_RATE' | 'PENDING_ASSESSMENTS' | 'AVERAGE_SCORE' | 'URGENT_ITEMS';
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'UP' | 'DOWN' | 'STABLE';
  trendValue?: number;
  action?: {
    label: string;
    url: string;
  };
}

// ============================================================
// VISUALIZATION DATA
// ============================================================

export interface CompletionChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

export interface ScoreDistributionData {
  ranges: {
    label: string;
    min: number;
    max: number;
    count: number;
    percentage: number;
  }[];
}

export interface PeriodComparisonData {
  period1: {
    average: number;
    count: number;
    completionRate: number;
  };
  period2: {
    average: number;
    count: number;
    completionRate: number;
  };
  period3: {
    average: number;
    count: number;
    completionRate: number;
  };
}

// ============================================================
// EXPORT DATA
// ============================================================

export interface MultiPeriodExportData {
  exportType: 'CSV' | 'XLSX' | 'PDF';
  data: {
    students: StudentProgressSummary[];
    periodBreakdown: PeriodBreakdown;
    statistics: {
      totalStudents: number;
      completionRate: number;
      averageScore: number;
    };
  };
  filters: MultiPeriodFilters;
  generatedAt: string;
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

export interface MultiPeriodNotificationSettings {
  notifyOnCustomAssessmentNeeded: boolean;
  notifyOnPeriodCompleted: boolean;
  notifyOnStudentStruggling: boolean;
  notifyOnUrgentDeadlines: boolean;
  reminderDaysBefore: number;
}

// ============================================================
// BATCH OPERATIONS
// ============================================================

export interface BatchCreateCustomAssessments {
  pendingAssessments: number[]; // progressIds
  template?: {
    totalMarks: number;
    passingMarks: number;
    durationMinutes: number;
    includeIncorrectQuestions: boolean;
    focusOnWeakTopics: boolean;
  };
}

export interface BatchOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors: {
    progressId: number;
    reason: string;
  }[];
}

// ============================================================
// ANALYTICS
// ============================================================

export interface MultiPeriodAnalytics {
  subjectId: number;
  subjectName: string;
  
  // Performance trends
  averageScoreByPeriod: Record<number, number>;
  completionRateByPeriod: Record<number, number>;
  
  // Student categorization
  studentsExcelling: number;
  studentsOnTrack: number;
  studentsNeedingHelp: number;
  
  // Common weak areas
  commonWeakTopics: {
    topicName: string;
    studentCount: number;
    averageScore: number;
  }[];
  
  // Time analysis
  averageDaysBetweenPeriods: number;
  averageTimeToComplete: number;
  
  // Custom assessment effectiveness
  customAssessmentsCreated: number;
  customAssessmentImpact: {
    averageImprovement: number;
    studentsImproved: number;
  };
}

// ============================================================
// UI STATE
// ============================================================

export interface MultiPeriodViewState {
  selectedSubject?: number;
  selectedStudent?: number;
  selectedPeriod?: number;
  filters: MultiPeriodFilters;
  sortOptions: MultiPeriodSortOptions;
  viewMode: 'GRID' | 'LIST' | 'TIMELINE';
  expandedStudents: Set<number>;
  isLoading: boolean;
  error?: string;
}

// ============================================================
// HELPER TYPES
// ============================================================

export type PeriodColor = 'green' | 'blue' | 'orange' | 'red' | 'gray' | 'purple';

export interface PeriodDisplayConfig {
  status: PeriodStatus;
  color: PeriodColor;
  icon: string;
  label: string;
  canClick: boolean;
}
