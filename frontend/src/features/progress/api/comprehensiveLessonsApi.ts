// src/features/progress/api/comprehensiveLessonsApi.ts

import axiosInstance from '../../../api/axios';

export interface ComprehensiveLessonDto {
  // Identification
  progressId: number;
  lessonTopicId: number;
  lessonTopicTitle: string;
  subjectId: number;
  subjectName: string;
  studentId?: number;
  studentName?: string;
  
  // Scheduling
  scheduledDate: string;
  periodNumber: number;
  dayOfWeek: string;
  
  // Status & Completion
  status: 'COMPLETED' | 'MISSED' | 'IN_PROGRESS' | 'SCHEDULED';
  completed: boolean;
  completedAt?: string;
  incompleteReason?: string;
  autoMarkedIncompleteAt?: string;
  
  // Assessment
  assessmentId?: number;
  assessmentTitle?: string;
  assessmentWindowStart?: string;
  assessmentWindowEnd?: string;
  hasActiveAssessment: boolean;
  assessmentOverdue: boolean;
  
  // Progress tracking
  priority?: number;
  canStillComplete: boolean;
  daysSinceScheduled: number;
  isOverdue: boolean;
  requiresImmediateAction: boolean;
}

export interface ComprehensiveLessonsReport {
  studentId?: number;
  studentName?: string;
  fromDate?: string;
  toDate?: string;
  dateRangeDays?: number;
  totalLessons: number;
  completedCount: number;
  missedCount: number;
  inProgressCount: number;
  scheduledCount: number;
  completionRate: number;
  missedRate: number;
  onTrackRate: number;
  isOnTrack: boolean;
  isAtRisk: boolean;
  lessonsByStatus: {
    COMPLETED?: ComprehensiveLessonDto[];
    MISSED?: ComprehensiveLessonDto[];
    IN_PROGRESS?: ComprehensiveLessonDto[];
    SCHEDULED?: ComprehensiveLessonDto[];
  };
  allLessons: ComprehensiveLessonDto[];
  urgentLessons?: ComprehensiveLessonDto[];
}

// Teacher/Admin specific filters
export interface TeacherLessonFilters {
  fromDate?: string;
  toDate?: string;
  statusFilter?: string;
  subjectId?: number;
  classId?: number;
  studentId?: number;
}

export const comprehensiveLessonsApi = {
  // ========== STUDENT ENDPOINTS ==========
  
  /**
   * ✅ Get authenticated student's comprehensive lessons
   * Route: /progress/lessons/comprehensive (from ComprehensiveLessonsController)
   */
  getMyComprehensiveLessons: async (
    fromDate?: string,
    toDate?: string,
    statusFilter?: string
  ): Promise<ComprehensiveLessonsReport> => {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (statusFilter) params.status = statusFilter;
    
    const response = await axiosInstance.get('/progress/lessons/comprehensive', { params });
    return response.data;
  },

  /**
   * ✅ Get authenticated student's urgent lessons
   * Route: /progress/lessons/urgent (from ComprehensiveLessonsController)
   */
  getMyUrgentLessons: async (): Promise<ComprehensiveLessonDto[]> => {
    const response = await axiosInstance.get('/progress/lessons/urgent');
    return response.data;
  },

  /**
   * ✅ Get authenticated student's statistics
   * Route: /progress/lessons/stats (from ComprehensiveLessonsController)
   */
  getMyStats: async (
    fromDate?: string,
    toDate?: string
  ): Promise<{
    totalLessons: number;
    completedCount: number;
    missedCount: number;
    inProgressCount: number;
    scheduledCount: number;
    completionRate: number;
    isOnTrack: boolean;
    isAtRisk: boolean;
    urgentLessonsCount: number;
  }> => {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    
    const response = await axiosInstance.get('/progress/lessons/stats', { params });
    return response.data;
  },

  // ========== ADMIN VIEWING SPECIFIC STUDENT ==========
  
  /**
   * Get comprehensive lessons report for a specific student (admin)
   * Route: /progress/students/{studentId}/comprehensive (from LessonProgressController)
   */
  getComprehensiveLessons: async (
    studentId: number,
    fromDate?: string,
    toDate?: string,
    statusFilter?: string
  ): Promise<ComprehensiveLessonsReport> => {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (statusFilter) params.statusFilter = statusFilter;
    
    const response = await axiosInstance.get(
      `/progress/students/${studentId}/comprehensive`,
      { params }
    );
    return response.data;
  },

  /**
   * Get urgent lessons for a student
   * Route: /progress/students/{studentId}/urgent (from LessonProgressController)
   */
  getUrgentLessons: async (studentId: number): Promise<ComprehensiveLessonDto[]> => {
    const response = await axiosInstance.get(`/progress/students/${studentId}/urgent`);
    return response.data;
  },

  /**
   * Get status statistics for a student
   * Route: /progress/students/{studentId}/stats (from LessonProgressController)
   */
  getStatusStats: async (
    studentId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<{
    totalLessons: number;
    completedCount: number;
    missedCount: number;
    inProgressCount: number;
    scheduledCount: number;
    completionRate: number;
    isOnTrack: boolean;
    isAtRisk: boolean;
    urgentLessonsCount: number;
  }> => {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    
    const response = await axiosInstance.get(
      `/progress/students/${studentId}/stats`,
      { params }
    );
    return response.data;
  },

  // ========== TEACHER VIEWING SPECIFIC STUDENT ==========
  
  /**
   * ✅ NEW: Get lessons for a specific student (only subjects the teacher teaches)
   * Route: /progress/lessons/teacher/students/{studentId}/comprehensive
   */
  getTeacherStudentLessons: async (
    studentId: number,
    fromDate?: string,
    toDate?: string,
    statusFilter?: string
  ): Promise<ComprehensiveLessonsReport> => {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (statusFilter) params.status = statusFilter;
    
    const response = await axiosInstance.get(
      `/progress/lessons/teacher/students/${studentId}/comprehensive`,
      { params }
    );
    return response.data;
  },

  /**
   * ✅ NEW: Get stats for a specific student (only subjects the teacher teaches)
   * Route: /progress/lessons/teacher/students/{studentId}/stats
   */
  getTeacherStudentStats: async (
    studentId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<{
    totalLessons: number;
    completedCount: number;
    missedCount: number;
    inProgressCount: number;
    scheduledCount: number;
    completionRate: number;
    isOnTrack: boolean;
    isAtRisk: boolean;
    urgentLessonsCount: number;
  }> => {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    
    const response = await axiosInstance.get(
      `/progress/lessons/teacher/students/${studentId}/stats`,
      { params }
    );
    return response.data;
  },

  // ========== TEACHER ENDPOINTS (ALL STUDENTS) ==========
  
  /**
   * ✅ Get all lessons for teacher's subjects (filtered by class/subject/student)
   * Route: /progress/lessons/teacher/comprehensive (from ComprehensiveLessonsController)
   */
  getTeacherLessons: async (
    filters: TeacherLessonFilters
  ): Promise<ComprehensiveLessonDto[]> => {
    const params: any = {};
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.statusFilter) params.status = filters.statusFilter;
    if (filters.subjectId) params.subjectId = filters.subjectId;
    if (filters.classId) params.classId = filters.classId;
    if (filters.studentId) params.studentId = filters.studentId;
    
    const response = await axiosInstance.get('/progress/lessons/teacher/comprehensive', { params });
    return response.data;
  },

  /**
   * ✅ Get aggregated stats for teacher's subjects
   * Route: /progress/lessons/teacher/stats (from ComprehensiveLessonsController)
   */
  getTeacherStats: async (
    filters: TeacherLessonFilters
  ): Promise<{
    totalLessons: number;
    completedCount: number;
    missedCount: number;
    inProgressCount: number;
    scheduledCount: number;
    completionRate: number;
    missedRate: number;
    totalStudents: number;
    studentsAtRisk: number;
    bySubject: Record<string, {
      totalLessons: number;
      completionRate: number;
    }>;
    byClass: Record<string, {
      totalLessons: number;
      completionRate: number;
    }>;
  }> => {
    const params: any = {};
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.subjectId) params.subjectId = filters.subjectId;
    if (filters.classId) params.classId = filters.classId;
    
    const response = await axiosInstance.get('/progress/lessons/teacher/stats', { params });
    return response.data;
  },

  // ========== ADMIN ENDPOINTS (ALL STUDENTS) ==========
  
  /**
   * ✅ Get all lessons across all students (admin only)
   * Route: /progress/lessons/admin/comprehensive (from ComprehensiveLessonsController)
   */
  getAdminLessons: async (
    filters: TeacherLessonFilters
  ): Promise<ComprehensiveLessonDto[]> => {
    const params: any = {};
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.statusFilter) params.status = filters.statusFilter;
    if (filters.subjectId) params.subjectId = filters.subjectId;
    if (filters.classId) params.classId = filters.classId;
    if (filters.studentId) params.studentId = filters.studentId;
    
    const response = await axiosInstance.get('/progress/lessons/admin/comprehensive', { params });
    return response.data;
  },

  /**
   * ✅ Get aggregated stats for all students (admin only)
   * Route: /progress/lessons/admin/stats (from ComprehensiveLessonsController)
   */
  getAdminStats: async (
    filters: TeacherLessonFilters
  ): Promise<{
    totalLessons: number;
    completedCount: number;
    missedCount: number;
    inProgressCount: number;
    scheduledCount: number;
    completionRate: number;
    missedRate: number;
    totalStudents: number;
    studentsAtRisk: number;
    totalTeachers: number;
    totalSubjects: number;
    bySubject: Record<string, { totalLessons: number; completionRate: number; }>;
    byClass: Record<string, { totalLessons: number; completionRate: number; }>;
    byTeacher?: Record<string, { totalLessons: number; completionRate: number; }>;
  }> => {
    const params: any = {};
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.subjectId) params.subjectId = filters.subjectId;
    if (filters.classId) params.classId = filters.classId;
    
    const response = await axiosInstance.get('/progress/lessons/admin/stats', { params });
    return response.data;
  },

  /**
   * Get lessons grouped by subject
   * Route: /progress/students/{studentId}/by-subject (from LessonProgressController)
   */
  getLessonsBySubject: async (
    studentId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<Record<string, ComprehensiveLessonDto[]>> => {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    
    const response = await axiosInstance.get(
      `/progress/students/${studentId}/by-subject`,
      { params }
    );
    return response.data;
  },
};

export default comprehensiveLessonsApi;