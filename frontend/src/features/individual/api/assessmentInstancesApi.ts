// frontend/src/features/individual/api/assessmentInstancesApi.ts

import axios from "../../../api/axios";

// ============================================================
// TYPES
// ============================================================

export interface AssessmentInstance {
  id: number;
  studentProfileId: number;
  lessonTopicId: number;
  lessonTopicTitle: string;
  subjectId: number;
  subjectName: string;
  scheduledDate: string;
  periodNumber: number;
  assessmentWindowStart: string;
  assessmentWindowEnd: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'INCOMPLETE';
  score?: number;
  maxScore?: number;
  grade?: string;
  completedAt?: string;
  autoMarkedIncompleteAt?: string;
  incompleteReason?: string;
  canStillComplete: boolean;
}

export interface DailyProgressDto {
  date: string;
  lessons: AssessmentInstance[];
}

export interface ProgressUpdateRequest {
  progressId: number;
  score: number;
  maxScore: number;
  notes?: string;
  completedAt?: string;
}

export interface ComprehensiveLessonsReport {
  studentId: number;
  studentName: string;
  fromDate?: string;
  toDate?: string;
  totalLessons: number;
  completedCount: number;
  missedCount: number;
  inProgressCount: number;
  scheduledCount: number;
  completionRate: number;
  lessons: AssessmentInstance[];
}

export interface IncompleteLessonsReport {
  studentId: number;
  studentName: string;
  totalIncomplete: number;
  incompleteByReason: Record<string, IncompleteLessonDto[]>;
  fromDate?: string;
  toDate?: string;
}

export interface IncompleteLessonDto {
  progressId: number;
  lessonTopicId?: number;
  lessonTopicTitle: string;
  subjectName: string;
  scheduledDate: string;
  periodNumber: number;
  incompleteReason: string;
  autoMarkedIncompleteAt?: string;
  assessmentWindowStart: string;
  assessmentWindowEnd: string;
  canStillComplete: boolean;
}

export interface LessonStats {
  totalLessons: number;
  completedLessons: number;
  missedLessons: number;
  inProgressLessons: number;
  scheduledLessons: number;
  completionRate: number;
  averageScore?: number;
  subjectBreakdown: SubjectStats[];
}

export interface SubjectStats {
  subjectId: number;
  subjectName: string;
  totalLessons: number;
  completedLessons: number;
  completionRate: number;
  averageScore?: number;
}

// ============================================================
// ASSESSMENT INSTANCES API
// ============================================================

export const assessmentInstancesApi = {
  // ============================================================
  // STUDENT ENDPOINTS
  // ============================================================

  /**
   * Get my daily plan (current authenticated student)
   * GET /api/progress/daily/me?date={date}
   */
  getMyDailyProgress: async (date?: string): Promise<DailyProgressDto> => {
    const params = date ? { date } : {};
    const res = await axios.get('/progress/daily/me', { params });
    return res.data;
  },

  /**
   * Mark lesson as complete (student)
   * POST /api/progress/complete
   */
  markLessonComplete: async (
    request: ProgressUpdateRequest
  ): Promise<AssessmentInstance> => {
    const res = await axios.post('/progress/complete', request);
    return res.data;
  },

  /**
   * Get my comprehensive lessons report
   * GET /api/progress/comprehensive/me
   */
  getMyComprehensiveLessons: async (
    fromDate?: string,
    toDate?: string,
    statusFilter?: string
  ): Promise<ComprehensiveLessonsReport> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (statusFilter) params.statusFilter = statusFilter;

    const res = await axios.get('/progress/comprehensive/me', { params });
    return res.data;
  },

  /**
   * Get my incomplete lessons
   * GET /api/progress/incomplete-lessons/me
   */
  getMyIncompleteLessons: async (
    fromDate?: string,
    toDate?: string
  ): Promise<IncompleteLessonsReport> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const res = await axios.get('/progress/incomplete-lessons/me', { params });
    return res.data;
  },

  /**
   * Get my urgent lessons
   * GET /api/progress/urgent/me
   */
  getMyUrgentLessons: async (): Promise<AssessmentInstance[]> => {
    const res = await axios.get('/progress/urgent/me');
    return res.data;
  },

  /**
   * Get my lesson statistics
   * GET /api/progress/stats/me
   */
  getMyStats: async (fromDate?: string, toDate?: string): Promise<LessonStats> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const res = await axios.get('/progress/stats/me', { params });
    return res.data;
  },

  /**
   * Sync incomplete lessons
   * POST /api/progress/sync-incomplete
   */
  syncIncompleteLessons: async (): Promise<{
    success: boolean;
    totalIncomplete: number;
    message: string;
  }> => {
    const res = await axios.post('/progress/sync-incomplete');
    return res.data;
  },

  /**
   * Get my progress history
   * GET /api/progress/history/me
   */
  getMyProgressHistory: async (
    from: string,
    to: string
  ): Promise<AssessmentInstance[]> => {
    const res = await axios.get('/progress/history/me', {
      params: { from, to },
    });
    return res.data;
  },

  // ============================================================
  // TEACHER ENDPOINTS
  // ============================================================

  /**
   * Teacher views comprehensive lessons for a specific student
   * GET /api/progress/lessons/teacher/students/{studentId}/comprehensive
   */
  getTeacherStudentLessons: async (
    studentId: number,
    fromDate?: string,
    toDate?: string,
    status?: string
  ): Promise<ComprehensiveLessonsReport> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (status) params.status = status;

    const res = await axios.get(
      `/progress/lessons/teacher/students/${studentId}/comprehensive`,
      { params }
    );
    return res.data;
  },

  /**
   * Teacher views statistics for a specific student
   * GET /api/progress/lessons/teacher/students/{studentId}/stats
   */
  getTeacherStudentStats: async (
    studentId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<LessonStats> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const res = await axios.get(
      `/progress/lessons/teacher/students/${studentId}/stats`,
      { params }
    );
    return res.data;
  },

  // ============================================================
  // ADMIN/TEACHER ENDPOINTS (ANY STUDENT)
  // ============================================================

  /**
   * Get comprehensive lessons for any student (Admin/Teacher)
   * GET /api/progress/students/{id}/comprehensive
   */
  getStudentComprehensiveLessons: async (
    studentId: number,
    fromDate?: string,
    toDate?: string,
    statusFilter?: string
  ): Promise<ComprehensiveLessonsReport> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (statusFilter) params.statusFilter = statusFilter;

    const res = await axios.get(`/progress/students/${studentId}/comprehensive`, {
      params,
    });
    return res.data;
  },

  /**
   * Get student's incomplete lessons (Admin/Teacher)
   * GET /api/progress/students/{id}/incomplete-lessons
   */
  getStudentIncompleteLessons: async (
    studentId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<IncompleteLessonsReport> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const res = await axios.get(
      `/progress/students/${studentId}/incomplete-lessons`,
      { params }
    );
    return res.data;
  },

  /**
   * Get student's urgent lessons (Admin/Teacher)
   * GET /api/progress/students/{id}/urgent
   */
  getStudentUrgentLessons: async (
    studentId: number
  ): Promise<AssessmentInstance[]> => {
    const res = await axios.get(`/progress/students/${studentId}/urgent`);
    return res.data;
  },

  /**
   * Get student's lessons grouped by subject (Admin/Teacher)
   * GET /api/progress/students/{id}/by-subject
   */
  getStudentLessonsBySubject: async (
    studentId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<Record<string, AssessmentInstance[]>> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const res = await axios.get(`/progress/students/${studentId}/by-subject`, {
      params,
    });
    return res.data;
  },

  /**
   * Get student statistics (Admin/Teacher)
   * GET /api/progress/students/{id}/stats
   */
  getStudentStats: async (
    studentId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<LessonStats> => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const res = await axios.get(`/progress/students/${studentId}/stats`, {
      params,
    });
    return res.data;
  },

  /**
   * Get daily progress for any student (Admin)
   * GET /api/progress/daily
   */
  getStudentDailyProgress: async (
    studentProfileId: number,
    date?: string
  ): Promise<DailyProgressDto> => {
    const params: Record<string, string | number> = { studentProfileId };
    if (date) params.date = date;

    const res = await axios.get('/progress/daily', { params });
    return res.data;
  },

  /**
   * Get progress history for any student (Admin)
   * GET /api/progress/history
   */
  getStudentProgressHistory: async (
    studentProfileId: number,
    from: string,
    to: string
  ): Promise<AssessmentInstance[]> => {
    const res = await axios.get('/progress/history', {
      params: { studentProfileId, from, to },
    });
    return res.data;
  },
};