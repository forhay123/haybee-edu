// frontend/src/features/individual/api/incompleteTrackingApi.ts

import axios from "../../../api/axios";

// ============================================================
// TYPES
// ============================================================

export interface IncompleteProgressDto {
  progressId: number;
  studentProfileId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId?: number;
  lessonTopicTitle: string;
  scheduledDate: string;
  periodNumber: number;
  weekNumber: number;
  incompleteReason: string;
  autoMarkedIncompleteAt?: string;
  assessmentWindowStart: string;
  assessmentWindowEnd: string;
  canStillComplete: boolean;
}

export interface IncompleteStatisticsDto {
  totalIncomplete: number;
  byReason: Record<string, number>;
  bySubject: Record<string, number>;
  byWeek: Record<number, number>;
  averageIncompletePerStudent?: number;
  mostCommonReason?: string;
  mostAffectedSubject?: string;
  criticalCount: number; // High priority incomplete
  startDate: string;
  endDate: string;
}

export interface IncompleteReportDto {
  studentId?: number;
  studentName?: string;
  subjectId?: number;
  subjectName?: string;
  reportType: "STUDENT" | "SUBJECT" | "SYSTEM";
  startDate: string;
  endDate: string;
  totalIncomplete: number;
  incompleteLessons: IncompleteProgressDto[];
  statistics: IncompleteStatisticsDto;
  recommendations: string[];
  generatedAt: string;
}

// ============================================================
// INCOMPLETE TRACKING API
// ============================================================

export const incompleteTrackingApi = {
  // ============================================================
  // STUDENT ENDPOINTS
  // ============================================================

  /**
   * Get all incomplete lessons for a student
   * GET /api/individual/incomplete/student/{studentId}
   */
  getIncompleteForStudent: async (
    studentId: number
  ): Promise<IncompleteProgressDto[]> => {
    const res = await axios.get(`/individual/incomplete/student/${studentId}`);
    return res.data;
  },

  /**
   * Get incomplete lessons for a student in date range
   * GET /api/individual/incomplete/student/{studentId}/range
   */
  getIncompleteForStudentInRange: async (
    studentId: number,
    startDate: string,
    endDate: string
  ): Promise<IncompleteProgressDto[]> => {
    const res = await axios.get(
      `/individual/incomplete/student/${studentId}/range`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  /**
   * Get incomplete count for a student
   * GET /api/individual/incomplete/student/{studentId}/count
   */
  getIncompleteCount: async (studentId: number): Promise<number> => {
    const res = await axios.get(
      `/individual/incomplete/student/${studentId}/count`
    );
    return res.data;
  },

  /**
   * Get incomplete statistics for a student
   * GET /api/individual/incomplete/student/{studentId}/statistics
   */
  getStudentStatistics: async (
    studentId: number,
    startDate: string,
    endDate: string
  ): Promise<IncompleteStatisticsDto> => {
    const res = await axios.get(
      `/individual/incomplete/student/${studentId}/statistics`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  /**
   * Generate incomplete report for a student
   * GET /api/individual/incomplete/student/{studentId}/report
   */
  generateStudentReport: async (
    studentId: number,
    startDate: string,
    endDate: string
  ): Promise<IncompleteReportDto> => {
    const res = await axios.get(
      `/individual/incomplete/student/${studentId}/report`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  /**
   * Get incomplete lessons by reason for a student
   * GET /api/individual/incomplete/student/{studentId}/by-reason
   */
  getIncompleteByReason: async (
    studentId: number,
    reason: string
  ): Promise<IncompleteProgressDto[]> => {
    const res = await axios.get(
      `/individual/incomplete/student/${studentId}/by-reason`,
      {
        params: { reason },
      }
    );
    return res.data;
  },

  // ============================================================
  // SUBJECT ENDPOINTS (TEACHER)
  // ============================================================

  /**
   * Get incomplete lessons for a subject
   * GET /api/individual/incomplete/subject/{subjectId}
   */
  getIncompleteBySubject: async (
    subjectId: number,
    startDate: string,
    endDate: string
  ): Promise<IncompleteProgressDto[]> => {
    const res = await axios.get(`/individual/incomplete/subject/${subjectId}`, {
      params: { startDate, endDate },
    });
    return res.data;
  },

  /**
   * Get incomplete statistics for a subject
   * GET /api/individual/incomplete/subject/{subjectId}/statistics
   */
  getSubjectStatistics: async (
    subjectId: number,
    startDate: string,
    endDate: string
  ): Promise<IncompleteStatisticsDto> => {
    const res = await axios.get(
      `/individual/incomplete/subject/${subjectId}/statistics`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  /**
   * Generate incomplete report for a subject
   * GET /api/individual/incomplete/subject/{subjectId}/report
   */
  generateSubjectReport: async (
    subjectId: number,
    startDate: string,
    endDate: string
  ): Promise<IncompleteReportDto> => {
    const res = await axios.get(
      `/individual/incomplete/subject/${subjectId}/report`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  // ============================================================
  // SYSTEM ENDPOINTS (ADMIN)
  // ============================================================

  /**
   * Get system-wide incomplete statistics
   * GET /api/individual/incomplete/system/statistics
   */
  getSystemStatistics: async (
    startDate: string,
    endDate: string
  ): Promise<IncompleteStatisticsDto> => {
    const res = await axios.get("/individual/incomplete/system/statistics", {
      params: { startDate, endDate },
    });
    return res.data;
  },

  /**
   * Generate system-wide incomplete report
   * GET /api/individual/incomplete/system/report
   */
  generateSystemReport: async (
    startDate: string,
    endDate: string
  ): Promise<IncompleteReportDto> => {
    const res = await axios.get("/individual/incomplete/system/report", {
      params: { startDate, endDate },
    });
    return res.data;
  },

  // ============================================================
  // CONVENIENCE ENDPOINTS
  // ============================================================

  /**
   * Get incomplete for student in current term
   * GET /api/individual/incomplete/current-term/student/{studentId}
   */
  getIncompleteForCurrentTerm: async (
    studentId: number
  ): Promise<IncompleteProgressDto[]> => {
    const res = await axios.get(
      `/individual/incomplete/current-term/student/${studentId}`
    );
    return res.data;
  },

  /**
   * Get incomplete for student in current week
   * GET /api/individual/incomplete/current-week/student/{studentId}
   */
  getIncompleteForCurrentWeek: async (
    studentId: number
  ): Promise<IncompleteProgressDto[]> => {
    const res = await axios.get(
      `/individual/incomplete/current-week/student/${studentId}`
    );
    return res.data;
  },

  /**
   * Get incomplete for student in last 30 days
   * GET /api/individual/incomplete/last-month/student/{studentId}
   */
  getIncompleteLastMonth: async (
    studentId: number
  ): Promise<IncompleteReportDto> => {
    const res = await axios.get(
      `/individual/incomplete/last-month/student/${studentId}`
    );
    return res.data;
  },

  /**
   * Export student report as CSV (Future)
   * GET /api/individual/incomplete/student/{studentId}/report/export
   */
  exportStudentReportCsv: async (
    studentId: number,
    startDate: string,
    endDate: string
  ): Promise<string> => {
    const res = await axios.get(
      `/individual/incomplete/student/${studentId}/report/export`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Get incomplete for current month
   */
  getIncompleteForCurrentMonth: async (
    studentId: number
  ): Promise<IncompleteProgressDto[]> => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = firstDay.toISOString().split("T")[0];
    const endDate = lastDay.toISOString().split("T")[0];

    return incompleteTrackingApi.getIncompleteForStudentInRange(
      studentId,
      startDate,
      endDate
    );
  },

  /**
   * Get high priority incomplete (critical)
   */
  getHighPriorityIncomplete: async (
    studentId: number
  ): Promise<IncompleteProgressDto[]> => {
    const incomplete = await incompleteTrackingApi.getIncompleteForStudent(
      studentId
    );

    // Filter for critical reasons
    return incomplete.filter(
      (item) =>
        item.incompleteReason === "ABSENT" ||
        item.incompleteReason === "NO_ASSESSMENT" ||
        item.incompleteReason === "SYSTEM_ERROR"
    );
  },

  /**
   * Get incomplete grouped by reason
   */
  getIncompleteGroupedByReason: async (
    studentId: number
  ): Promise<Record<string, IncompleteProgressDto[]>> => {
    const incomplete = await incompleteTrackingApi.getIncompleteForStudent(
      studentId
    );

    const grouped: Record<string, IncompleteProgressDto[]> = {};

    incomplete.forEach((item) => {
      const reason = item.incompleteReason || "UNKNOWN";
      if (!grouped[reason]) {
        grouped[reason] = [];
      }
      grouped[reason].push(item);
    });

    return grouped;
  },

  /**
   * Get incomplete grouped by subject
   */
  getIncompleteGroupedBySubject: async (
    studentId: number
  ): Promise<Record<string, IncompleteProgressDto[]>> => {
    const incomplete = await incompleteTrackingApi.getIncompleteForStudent(
      studentId
    );

    const grouped: Record<string, IncompleteProgressDto[]> = {};

    incomplete.forEach((item) => {
      const subject = item.subjectName || "Unknown Subject";
      if (!grouped[subject]) {
        grouped[subject] = [];
      }
      grouped[subject].push(item);
    });

    return grouped;
  },

  /**
   * Get incomplete percentage for student
   */
  getIncompletePercentage: async (
    studentId: number,
    startDate: string,
    endDate: string
  ): Promise<number> => {
    const stats = await incompleteTrackingApi.getStudentStatistics(
      studentId,
      startDate,
      endDate
    );

    // Assuming we need to calculate total scheduled vs incomplete
    // This might need adjustment based on your actual data structure
    return stats.totalIncomplete > 0 ? stats.totalIncomplete : 0;
  },
};