// frontend/src/features/individual/api/analyticsApi.ts

import axios from "../../../api/axios";

// ============================================================
// TYPES
// ============================================================

export interface TeacherSubjectPerformanceDto {
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  startDate: string;
  endDate: string;
  totalStudents: number;
  studentsAtRisk: number;
  overallCompletionRate: number;
  overallAverageScore: number;
  studentPerformances: StudentPerformanceSummary[];
  topicPerformances: TopicPerformanceSummary[];
  atRiskStudents: StudentPerformanceSummary[];
  recommendations: string[];
  generatedAt: string;
}

export interface StudentPerformanceSummary {
  studentId: number;
  studentName: string;
  className?: string;
  completionRate: number;
  averageScore: number;
  totalLessons: number;
  completedLessons: number;
  incompleteLessons: number;
  grade: string;
  performanceLevel: string; // "EXCELLENT", "GOOD", "AVERAGE", "POOR"
  isAtRisk: boolean;
  concerns: string[];
}

export interface TopicPerformanceSummary {
  lessonTopicId: number;
  topicTitle: string;
  weekNumber: number;
  totalAssessments: number;
  completedAssessments: number;
  averageScore: number;
  completionRate: number;
  studentsStruggling: number;
}

export interface SystemDashboardDto {
  generatedAt: string;
  termName: string;
  currentWeekNumber: number;
  totalIndividualStudents: number;
  schedulesThisWeek: number;
  overallCompletionRate: number;
  assessmentCompletionRate: number;
  systemAverageScore: number;
  totalMissingTopics: number;
  unresolvedConflicts: number;
  lastGenerationSuccessful: boolean;
  systemHealth: SystemHealth;
  weeklyTrends: WeeklySystemTrend[];
  subjectBreakdown: SubjectBreakdown[];
  recentActivity: RecentActivity[];
  systemAlerts: SystemAlert[];
  highPriorityAlerts: SystemAlert[];
  missingTopicAlerts: MissingTopicAlert[];
  conflictAlerts: ConflictAlert[];
}

export interface SystemHealth {
  overallStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  criticalIssues: number;
  warnings: number;
  healthIndicators: string[];
}

export interface WeeklySystemTrend {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  schedulesGenerated: number;
  completionRate: number;
  averageScore: number;
  missingTopics: number;
}

export interface SubjectBreakdown {
  subjectId: number;
  subjectName: string;
  totalStudents: number;
  averageCompletionRate: number;
  averageScore: number;
}

export interface RecentActivity {
  activityType: string;
  description: string;
  timestamp: string;
  userId?: number;
  userName?: string;
}

export interface SystemAlert {
  alertId: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface MissingTopicAlert {
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  weekNumber: number;
  scheduledDate: string;
  periodNumber: number;
}

export interface ConflictAlert {
  conflictId: number;
  studentId: number;
  studentName: string;
  conflictType: string;
  severity: string;
  description: string;
}

export interface AtRiskStudentsDto {
  subjectId: number;
  subjectName: string;
  totalStudents: number;
  atRiskCount: number;
  atRiskStudents: StudentPerformanceSummary[];
  recommendations: string[];
}

export interface SystemHealthDto {
  overallStatus: string;
  criticalIssues: number;
  warnings: number;
  totalMissingTopics: number;
  unresolvedConflicts: number;
  completionRate: number;
  lastGenerationSuccessful: boolean;
  healthIndicators: string[];
}

export interface AlertsDto {
  totalAlerts: number;
  highPriorityAlerts: SystemAlert[];
  missingTopicAlerts: MissingTopicAlert[];
  conflictAlerts: ConflictAlert[];
}

export interface WeeklyTrendsDto {
  currentWeek: number;
  weeklyTrends: WeeklySystemTrend[];
  overallTrend: "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA";
}

// ============================================================
// ANALYTICS API
// ============================================================

export const analyticsApi = {
  // ============================================================
  // TEACHER ENDPOINTS
  // ============================================================

  /**
   * Get teacher's subject performance report
   * GET /api/individual/analytics/teacher/{teacherId}/subject/{subjectId}
   */
  getTeacherSubjectReport: async (
    teacherId: number,
    subjectId: number,
    startDate?: string,
    endDate?: string
  ): Promise<TeacherSubjectPerformanceDto> => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await axios.get(
      `/individual/analytics/teacher/${teacherId}/subject/${subjectId}`,
      { params }
    );
    return res.data;
  },

  /**
   * Get current week teacher report
   * GET /api/individual/analytics/teacher/{teacherId}/subject/{subjectId}/current-week
   */
  getCurrentWeekTeacherReport: async (
    teacherId: number,
    subjectId: number
  ): Promise<TeacherSubjectPerformanceDto> => {
    const res = await axios.get(
      `/individual/analytics/teacher/${teacherId}/subject/${subjectId}/current-week`
    );
    return res.data;
  },

  /**
   * Get at-risk students for a teacher's subject
   * GET /api/individual/analytics/teacher/{teacherId}/subject/{subjectId}/at-risk
   */
  getAtRiskStudents: async (
    teacherId: number,
    subjectId: number,
    startDate?: string,
    endDate?: string
  ): Promise<AtRiskStudentsDto> => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await axios.get(
      `/individual/analytics/teacher/${teacherId}/subject/${subjectId}/at-risk`,
      { params }
    );
    return res.data;
  },

  // ============================================================
  // ADMIN ENDPOINTS
  // ============================================================

  /**
   * Get system dashboard (Admin only)
   * GET /api/individual/analytics/admin/dashboard
   */
  getSystemDashboard: async (): Promise<SystemDashboardDto> => {
    const res = await axios.get("/individual/analytics/admin/dashboard");
    return res.data;
  },

  /**
   * Get system health status
   * GET /api/individual/analytics/admin/health
   */
  getSystemHealth: async (): Promise<SystemHealthDto> => {
    const res = await axios.get("/individual/analytics/admin/health");
    return res.data;
  },

  /**
   * Get high-priority alerts
   * GET /api/individual/analytics/admin/alerts
   */
  getHighPriorityAlerts: async (): Promise<AlertsDto> => {
    const res = await axios.get("/individual/analytics/admin/alerts");
    return res.data;
  },

  /**
   * Export system dashboard as CSV
   * GET /api/individual/analytics/admin/dashboard/export
   */
  exportSystemDashboard: async (): Promise<string> => {
    const res = await axios.get("/individual/analytics/admin/dashboard/export");
    return res.data;
  },

  /**
   * Get weekly trends (last 4 weeks)
   * GET /api/individual/analytics/admin/trends/weekly
   */
  getWeeklyTrends: async (): Promise<WeeklyTrendsDto> => {
    const res = await axios.get("/individual/analytics/admin/trends/weekly");
    return res.data;
  },

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Get teacher report for current month
   */
  getTeacherMonthlyReport: async (
    teacherId: number,
    subjectId: number
  ): Promise<TeacherSubjectPerformanceDto> => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = firstDay.toISOString().split("T")[0];
    const endDate = lastDay.toISOString().split("T")[0];

    return analyticsApi.getTeacherSubjectReport(
      teacherId,
      subjectId,
      startDate,
      endDate
    );
  },

  /**
   * Get teacher report for current term
   */
  getTeacherTermReport: async (
    teacherId: number,
    subjectId: number
  ): Promise<TeacherSubjectPerformanceDto> => {
    // Assuming term is ~3 months
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    const startDateStr = startDate.toISOString().split("T")[0];

    return analyticsApi.getTeacherSubjectReport(
      teacherId,
      subjectId,
      startDateStr,
      endDate
    );
  },

  /**
   * Get critical alerts only
   */
  getCriticalAlerts: async (): Promise<SystemAlert[]> => {
    const alerts = await analyticsApi.getHighPriorityAlerts();
    return alerts.highPriorityAlerts.filter(
      (alert) => alert.severity === "HIGH"
    );
  },

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts: async (): Promise<SystemAlert[]> => {
    const alerts = await analyticsApi.getHighPriorityAlerts();
    return alerts.highPriorityAlerts.filter((alert) => !alert.acknowledged);
  },

  /**
   * Check if system is healthy
   */
  isSystemHealthy: async (): Promise<boolean> => {
    const health = await analyticsApi.getSystemHealth();
    return health.overallStatus === "HEALTHY";
  },

  /**
   * Get dashboard summary (key metrics only)
   */
  getDashboardSummary: async (): Promise<{
    totalStudents: number;
    schedulesThisWeek: number;
    completionRate: number;
    averageScore: number;
    systemStatus: string;
    criticalIssues: number;
  }> => {
    const dashboard = await analyticsApi.getSystemDashboard();

    return {
      totalStudents: dashboard.totalIndividualStudents,
      schedulesThisWeek: dashboard.schedulesThisWeek,
      completionRate: dashboard.overallCompletionRate,
      averageScore: dashboard.systemAverageScore,
      systemStatus: dashboard.systemHealth.overallStatus,
      criticalIssues: dashboard.systemHealth.criticalIssues,
    };
  },

  /**
   * Get performance comparison for multiple teachers
   */
  compareTeacherPerformance: async (
    teacherSubjects: Array<{ teacherId: number; subjectId: number }>,
    startDate?: string,
    endDate?: string
  ): Promise<TeacherSubjectPerformanceDto[]> => {
    const reports = await Promise.all(
      teacherSubjects.map(({ teacherId, subjectId }) =>
        analyticsApi.getTeacherSubjectReport(
          teacherId,
          subjectId,
          startDate,
          endDate
        )
      )
    );

    return reports;
  },

  /**
   * Get subjects with low completion rates
   */
  getUnderperformingSubjects: async (): Promise<SubjectBreakdown[]> => {
    const dashboard = await analyticsApi.getSystemDashboard();

    return dashboard.subjectBreakdown
      .filter((subject) => subject.averageCompletionRate < 70)
      .sort((a, b) => a.averageCompletionRate - b.averageCompletionRate);
  },

  /**
   * Get recent critical activities
   */
  getRecentCriticalActivities: async (): Promise<RecentActivity[]> => {
    const dashboard = await analyticsApi.getSystemDashboard();

    return dashboard.recentActivity.filter(
      (activity) =>
        activity.activityType === "CONFLICT" ||
        activity.activityType === "ERROR" ||
        activity.activityType === "MISSING_TOPIC"
    );
  },

  /**
   * Download dashboard as CSV file
   */
  downloadDashboardCSV: async (): Promise<Blob> => {
    const csvContent = await analyticsApi.exportSystemDashboard();
    return new Blob([csvContent], { type: "text/csv" });
  },

  /**
   * Get trend direction
   */
  getTrendDirection: async (): Promise<
    "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA"
  > => {
    const trends = await analyticsApi.getWeeklyTrends();
    return trends.overallTrend;
  },
};