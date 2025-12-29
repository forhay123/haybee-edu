/**
 * Analytics and Reporting Types
 * SPRINT 12: Reporting & Analytics
 */

// ============================================================
// SUBJECT PROGRESS DTO
// ============================================================

export interface TopicProgress {
  topicId: number;
  topicTitle: string;
  weekNumber: number;
  scheduledDate: string; // LocalDate
  totalPeriods: number;
  completedPeriods: number;
  fullyCompleted: boolean;
  averageScore?: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'INCOMPLETE';
  incompleteReason?: string;
}

export interface WeeklySubjectProgress {
  weekNumber: number;
  weekStartDate: string; // LocalDate
  weekEndDate: string; // LocalDate
  lessonsScheduled: number;
  lessonsCompleted: number;
  lessonsIncomplete: number;
  completionRate: number;
  averageScore?: number;
  status: string;
}

export interface ClassComparison {
  classAverageScore: number;
  classCompletionRate: number;
  scoreDifference: number;
  completionRateDifference: number;
  performanceLevel: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  classRank: number;
  totalStudents: number;
}

export interface SubjectProgressDto {
  // Subject information
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  teacherId: number;
  
  // Student information
  studentId: number;
  studentName: string;
  studentEmail: string;
  
  // Time period
  startDate: string; // LocalDate
  endDate: string; // LocalDate
  periodDescription: string;
  
  // Overall statistics
  totalLessonsScheduled: number;
  completedLessons: number;
  incompleteLessons: number;
  pendingLessons: number;
  completionRate: number;
  
  // Assessment statistics
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  missedAssessments: number;
  averageScore?: number;
  highestScore?: number;
  lowestScore?: number;
  currentGrade: string;
  
  // Topic-wise breakdown
  topicProgress: TopicProgress[];
  
  // Weekly breakdown
  weeklyBreakdown: WeeklySubjectProgress[];
  
  // Performance trends
  performanceTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'INSUFFICIENT_DATA';
  trendPercentage: number;
  
  // Multi-period topic statistics
  multiPeriodTopics: number;
  multiPeriodTopicsCompleted: number;
  multiPeriodTopicsInProgress: number;
  multiPeriodCompletionRate: number;
  
  // Time tracking
  totalScheduledHours: number;
  completedHours: number;
  timeEfficiency: number;
  
  // Incomplete breakdown
  incompleteByReason: Record<string, number>;
  
  // Attendance and engagement
  attendanceRate: number;
  consecutiveLessonsCompleted: number;
  longestCompletionStreak: number;
  lastLessonDate?: string; // LocalDate
  nextLessonDate?: string; // LocalDate
  
  // Comparison with class average
  classComparison?: ClassComparison;
  
  // Areas of strength and improvement
  strengths: string[];
  areasForImprovement: string[];
  
  // Predictions
  projectedGrade?: string;
  projectedFinalScore?: number;
  onTrackForSuccess: boolean;
  
  // Alerts and warnings
  alerts: string[];
}

// ============================================================
// TEACHER SUBJECT PERFORMANCE DTO
// ============================================================

export interface StudentPerformanceSummary {
  studentId: number;
  studentName: string;
  className: string;
  lessonsCompleted: number;
  lessonsIncomplete: number;
  completionRate: number;
  averageScore?: number;
  currentGrade: string;
  performanceLevel: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'AT_RISK';
  needsAttention: boolean;
}

export interface TopicPerformanceAnalysis {
  topicId: number;
  topicTitle: string;
  weekNumber: number;
  studentsAssigned: number;
  studentsCompleted: number;
  studentsIncomplete: number;
  completionRate: number;
  averageScore?: number;
  difficultyLevel: 'EASY' | 'MODERATE' | 'CHALLENGING';
  isMultiPeriod: boolean;
}

export interface WeeklyPerformanceTrend {
  weekNumber: number;
  weekStartDate: string; // LocalDate
  weekEndDate: string; // LocalDate
  studentsActive: number;
  lessonsCompleted: number;
  lessonsIncomplete: number;
  completionRate: number;
  averageScore?: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

export interface SchoolComparison {
  schoolAverageScore: number;
  schoolCompletionRate: number;
  scoreDifference: number;
  completionRateDifference: number;
  performanceLevel: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
}

export interface TeacherSubjectPerformanceDto {
  // Teacher information
  teacherId: number;
  teacherName: string;
  teacherEmail: string;
  
  // Subject information
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  
  // Time period
  startDate: string; // LocalDate
  endDate: string; // LocalDate
  weekNumber?: number;
  periodDescription: string;
  
  // Student statistics
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  studentsAtRisk: number;
  
  // Overall performance
  totalLessonsScheduled: number;
  totalLessonsCompleted: number;
  totalLessonsIncomplete: number;
  overallCompletionRate: number;
  classAverageScore?: number;
  highestStudentAverage?: number;
  lowestStudentAverage?: number;
  
  // Assessment statistics
  totalAssessmentsGiven: number;
  totalAssessmentsCompleted: number;
  totalAssessmentsMissed: number;
  assessmentCompletionRate: number;
  
  // Student performance breakdown
  studentPerformances: StudentPerformanceSummary[];
  
  // Topic-wise analysis
  topicAnalysis: TopicPerformanceAnalysis[];
  
  // Weekly trends
  weeklyTrends: WeeklyPerformanceTrend[];
  
  // Grade distribution
  gradeDistribution: Record<string, number>;
  
  // Incomplete reasons breakdown
  incompleteReasons: Record<string, number>;
  
  // Multi-period topic statistics
  totalMultiPeriodTopics: number;
  completedMultiPeriodTopics: number;
  multiPeriodCompletionRate: number;
  
  // Teaching effectiveness metrics
  studentEngagementRate: number;
  contentCompletionRate: number;
  assessmentSuccessRate: number;
  
  // Comparison with school average
  schoolComparison?: SchoolComparison;
  
  // Insights and recommendations
  insights: string[];
  recommendations: string[];
  
  // Alerts and concerns
  alerts: string[];
}

// ============================================================
// WEEKLY PROGRESS DTO
// ============================================================

export interface SubjectWeeklyProgress {
  subjectId: number;
  subjectName: string;
  totalLessons: number;
  completedLessons: number;
  incompleteLessons: number;
  averageScore?: number;
  completionRate: number;
}

export interface DailyProgress {
  date: string; // LocalDate
  dayOfWeek: string;
  scheduledLessons: number;
  completedLessons: number;
  incompleteLessons: number;
  completionRate: number;
}

export interface WeekComparison {
  previousWeekNumber: number;
  completionRateChange: number;
  averageScoreChange?: number;
  completedLessonsChange: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

export interface WeeklyProgressDto {
  // Week information
  weekNumber: number;
  weekStartDate: string; // LocalDate
  weekEndDate: string; // LocalDate
  termName: string;
  
  // Student information
  studentId: number;
  studentName: string;
  studentEmail: string;
  
  // Overall statistics
  totalScheduledLessons: number;
  completedLessons: number;
  incompleteLessons: number;
  pendingLessons: number;
  completionRate: number;
  
  // Assessment statistics
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  missedAssessments: number;
  averageScore?: number;
  highestScore?: number;
  lowestScore?: number;
  
  // Subject-wise breakdown
  subjectProgress: Record<string, SubjectWeeklyProgress>;
  
  // Daily breakdown
  dailyProgress: DailyProgress[];
  
  // Multi-period topic tracking
  multiPeriodTopicsStarted: number;
  multiPeriodTopicsCompleted: number;
  multiPeriodTopicsPending: number;
  
  // Incomplete breakdown
  incompleteByReason: Record<string, number>;
  
  // Time tracking
  totalScheduledHours: number;
  completedHours: number;
  
  // Performance indicators
  performanceLevel: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_IMPROVEMENT';
  attendanceRate: number;
  assessmentCompletionRate: number;
  
  // Comparison with previous week
  comparison?: WeekComparison;
  
  // Flags and alerts
  hasIncompletes: boolean;
  hasMissedDeadlines: boolean;
  needsAttention: boolean;
  alerts: string[];
}

// ============================================================
// TERM COMPLETION DTO
// ============================================================

export interface SubjectCompletion {
  subjectId: number;
  subjectName: string;
  totalLessons: number;
  completedLessons: number;
  incompleteLessons: number;
  completionRate: number;
  averageScore?: number;
  grade: string;
  onTrack: boolean;
}

export interface WeekSummary {
  weekNumber: number;
  weekStartDate: string; // LocalDate
  weekEndDate: string; // LocalDate
  lessonsCompleted: number;
  lessonsIncomplete: number;
  weeklyAverageScore?: number;
  completionRate: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
}

export interface MonthlyBreakdown {
  month: string;
  year: number;
  totalLessons: number;
  completedLessons: number;
  incompleteLessons: number;
  completionRate: number;
  averageScore?: number;
}

export interface Milestone {
  title: string;
  description: string;
  achievedDate: string; // LocalDate
  category: 'COMPLETION' | 'PERFORMANCE' | 'CONSISTENCY';
}

export interface ProjectedCompletion {
  projectedCompletionRate: number;
  projectedAverageScore?: number;
  estimatedIncompleteLessons: number;
  likelyToMeetGoals: boolean;
  recommendation: string;
}

export interface TermGoalsComparison {
  targetCompletionRate: number;
  actualCompletionRate: number;
  completionRateDifference: number;
  targetAverageScore?: number;
  actualAverageScore?: number;
  scoreDifference?: number;
  metCompletionGoal: boolean;
  metScoreGoal: boolean;
}

export interface TermCompletionDto {
  // Term information
  termId: number;
  termName: string;
  termStartDate: string; // LocalDate
  termEndDate: string; // LocalDate
  totalWeeks: number;
  completedWeeks: number;
  remainingWeeks: number;
  isActive: boolean;
  
  // Student information
  studentId: number;
  studentName: string;
  studentEmail: string;
  
  // Overall completion statistics
  totalScheduledLessons: number;
  completedLessons: number;
  incompleteLessons: number;
  pendingLessons: number;
  overallCompletionRate: number;
  progressPercentage: number;
  
  // Assessment statistics
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  missedAssessments: number;
  termAverageScore?: number;
  highestScore?: number;
  lowestScore?: number;
  
  // Subject-wise completion
  subjectCompletion: Record<string, SubjectCompletion>;
  
  // Weekly progress summary
  weeklyProgress: WeekSummary[];
  
  // Monthly breakdown
  monthlyBreakdown: MonthlyBreakdown[];
  
  // Performance metrics
  overallGrade: string;
  performanceLevel: string;
  attendanceRate: number;
  assessmentCompletionRate: number;
  timeEfficiency: number;
  
  // Incomplete analysis
  totalIncomplete: number;
  incompleteByReason: Record<string, number>;
  incompleteBySubject: Record<string, number>;
  
  // Milestones and achievements
  milestones: Milestone[];
  achievements: string[];
  
  // Areas needing improvement
  areasForImprovement: string[];
  
  // Predictions and projections
  projection?: ProjectedCompletion;
  
  // Comparison with term goals
  goalsComparison?: TermGoalsComparison;
}

// ============================================================
// SYSTEM DASHBOARD DTO
// ============================================================

export interface MissingTopicAlert {
  subjectId: number;
  subjectName: string;
  weekNumber: number;
  studentsAffected: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detectedAt: string; // LocalDateTime
}

export interface ConflictAlert {
  studentId: number;
  studentName: string;
  conflictType: string;
  conflictDate: string; // LocalDate
  description: string;
  resolved: boolean;
  detectedAt: string; // LocalDateTime
}

export interface SubjectStatistics {
  subjectId: number;
  subjectName: string;
  studentsEnrolled: number;
  lessonsScheduled: number;
  lessonsCompleted: number;
  completionRate: number;
  averageScore?: number;
  missingTopics: number;
}

export interface WeeklySystemTrend {
  weekNumber: number;
  weekStartDate: string; // LocalDate
  weekEndDate: string; // LocalDate
  activeStudents: number;
  schedulesGenerated: number;
  schedulesCompleted: number;
  completionRate: number;
  averageScore?: number;
  trend: string;
}

export interface SystemHealth {
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  systemUptime: number;
  criticalIssues: number;
  warnings: number;
  lastHealthCheck: string; // LocalDateTime
  healthIndicators: string[];
}

export interface SystemAlert {
  alertType: 'ERROR' | 'WARNING' | 'INFO';
  category: 'MISSING_TOPICS' | 'CONFLICTS' | 'GENERATION' | 'PERFORMANCE';
  message: string;
  description: string;
  timestamp: string; // LocalDateTime
  acknowledged: boolean;
  severity: string;
}

export interface RecentActivity {
  activityType: string;
  description: string;
  performedBy: string;
  timestamp: string; // LocalDateTime
  icon: string;
}

export interface SystemDashboardDto {
  // Report metadata
  generatedAt: string; // LocalDateTime
  reportDate: string; // LocalDate
  reportPeriod: string;
  
  // Term information
  termId: number;
  termName: string;
  currentWeekNumber: number;
  totalWeeks: number;
  termProgress: number;
  
  // Student statistics
  totalIndividualStudents: number;
  activeIndividualStudents: number;
  inactiveIndividualStudents: number;
  studentsWithTimetables: number;
  studentsWithoutTimetables: number;
  
  // Schedule statistics
  totalSchedulesGenerated: number;
  schedulesThisWeek: number;
  schedulesCompleted: number;
  schedulesIncomplete: number;
  schedulesPending: number;
  overallCompletionRate: number;
  
  // Assessment statistics
  totalAssessments: number;
  assessmentsCompleted: number;
  assessmentsPending: number;
  assessmentsMissed: number;
  assessmentCompletionRate: number;
  systemAverageScore?: number;
  
  // Multi-period statistics
  totalMultiPeriodTopics: number;
  completedMultiPeriodTopics: number;
  inProgressMultiPeriodTopics: number;
  multiPeriodCompletionRate: number;
  
  // Missing topics
  totalMissingTopics: number;
  studentsAffectedByMissingTopics: number;
  missingTopicAlerts: MissingTopicAlert[];
  
  // Schedule conflicts
  totalConflicts: number;
  resolvedConflicts: number;
  unresolvedConflicts: number;
  conflictAlerts: ConflictAlert[];
  
  // Archival statistics
  schedulesArchivedThisWeek: number;
  progressRecordsArchived: number;
  totalArchivedRecords: number;
  
  // Weekly generation statistics
  lastGenerationTime?: string; // LocalDateTime
  nextGenerationTime?: string; // LocalDateTime
  lastGenerationSuccessful: boolean;
  lastGenerationError?: string;
  studentsinLastGeneration: number;
  schedulesInLastGeneration: number;
  
  // Subject-wise breakdown
  subjectStatistics: SubjectStatistics[];
  
  // Weekly trends
  weeklyTrends: WeeklySystemTrend[];
  
  // Performance distribution
  gradeDistribution: Record<string, number>;
  performanceLevelDistribution: Record<string, number>;
  
  // Incomplete reasons
  incompleteReasons: Record<string, number>;
  
  // System health indicators
  systemHealth?: SystemHealth;
  
  // Alerts and warnings
  systemAlerts: SystemAlert[];
  
  // Recent activities
  recentActivities: RecentActivity[];
}