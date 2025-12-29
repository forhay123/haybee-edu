// ============================================
// adminAssessmentsApi.ts (CORRECTED FULL VERSION)
// Location: frontend/src/features/assessments/api/adminAssessmentsApi.ts
// ============================================

import axiosInstance from '../../../api/axios';
import type {
  AssessmentSubmission,
  Assessment,
  PendingSubmission
} from '../types/assessmentTypes';

const API_BASE = '/admin/assessments';


// ============================================
// Interfaces
// ============================================

export interface AdminAssessmentStats {
  totalAssessments: number;
  totalSubmissions: number;
  pendingGrading: number;
  averageScore: number;
  passRate: number;

  subjectBreakdown: {
    subjectId: number;
    subjectName: string;
    assessmentCount: number;
    submissionCount: number;
    averageScore: number;
    passRate: number;
  }[];

  recentActivity: {
    type: 'submission' | 'graded' | 'created';
    studentName?: string;
    teacherName?: string;
    assessmentTitle: string;
    timestamp: string;
    score?: number;
  }[];
}

export interface AdminSubmissionFilter {
  subjectId?: number;
  studentId?: number;
  graded?: boolean;
  passed?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminAssessmentFilter {
  subjectId?: number;
  type?: string;
  published?: boolean;
  teacherId?: number;
}

export interface SystemOverview {
  totalStudents: number;
  totalTeachers: number;
  totalAssessments: number;
  averagePerformance: number;
  recentActivity: any[];
}

export interface ClassPerformance {
  classId: number;
  className: string;
  averageScore: number;
  totalStudents: number;
  assessmentCount: number;
}

// ============================================
// API OBJECT (NO DUPLICATION)
// ============================================

export const adminAssessmentsApi = {

  // =========================================
  // 🔹 Overview stats (Admin Overview Page)
  // =========================================
  getOverviewStats: async (): Promise<AdminAssessmentStats> => {
    const response = await axiosInstance.get<AdminAssessmentStats>(
      `${API_BASE}/stats/overview`
    );
    return response.data;
  },

  // =========================================
  // 🔹 System Overview (NEW)
  // =========================================
  getSystemOverview: async (): Promise<SystemOverview> => {
    const response = await axiosInstance.get<SystemOverview>(
      `${API_BASE}/system-overview`
    );
    return response.data;
  },

  // =========================================
  // 🔹 Students Overview
  // =========================================
  getStudentsOverview: async (): Promise<{
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    performanceBands: {
      excellent: number;
      good: number;
      average: number;
      poor: number;
    };
    recentStudents: {
      id: number;
      name: string;
      className: string;
      lastActive: string;
    }[];
  }> => {
    const response = await axiosInstance.get(
      `${API_BASE}/students/overview`
    );
    return response.data;
  },

  // =========================================
  // 🔹 Subjects Overview
  // =========================================
  getSubjectsOverview: async (): Promise<{
    totalSubjects: number;
    subjectStats: {
      subjectId: number;
      subjectName: string;
      totalAssessments: number;
      totalSubmissions: number;
      averageScore: number;
    }[];
  }> => {
    const response = await axiosInstance.get(
      `${API_BASE}/subjects/overview`
    );
    return response.data;
  },

  // =========================================
  // 🔹 Dashboard Summary
  // =========================================
  getDashboardSummary: async (): Promise<{
    totalAssessments: number;
    totalStudents: number;
    totalSubjects: number;
    pendingGrading: number;
    averageScore: number;
    passRate: number;

    recentActivity: {
      type: string;
      title: string;
      timestamp: string;
      meta?: Record<string, any>;
    }[];
  }> => {
    const response = await axiosInstance.get(
      `${API_BASE}/stats/dashboard`
    );
    return response.data;
  },

  // =========================================
  // 📚 All Assessments
  // =========================================
  getAllAssessments: async (
    filter?: AdminAssessmentFilter
  ): Promise<Assessment[]> => {
    const response = await axiosInstance.get<Assessment[]>(
      `${API_BASE}/all`,
      { params: filter }
    );
    return response.data;
  },

  // =========================================
  // 📝 All Submissions
  // =========================================
  getAllSubmissions: async (
    filter?: AdminSubmissionFilter
  ): Promise<AssessmentSubmission[]> => {
    const response = await axiosInstance.get<AssessmentSubmission[]>(
      `${API_BASE}/submissions/all`,
      { params: filter }
    );
    return response.data;
  },

  // =========================================
  // ⏳ All Pending for Grading
  // =========================================
  getAllPendingGrading: async (): Promise<PendingSubmission[]> => {
    const response = await axiosInstance.get<PendingSubmission[]>(
      `${API_BASE}/pending-grading/all`
    );
    return response.data;
  },

  // =========================================
  // 🎯 Class Performance (NEW)
  // =========================================
  getClassPerformance: async (classId: number): Promise<ClassPerformance> => {
    const response = await axiosInstance.get<ClassPerformance>(
      `${API_BASE}/class/${classId}/performance`
    );
    return response.data;
  },

  // =========================================
  // 🎓 Student Performance
  // =========================================
  getStudentPerformance: async (
    studentId: number
  ): Promise<{
    student: {
      id: number;
      name: string;
    };
    submissions: AssessmentSubmission[];
    stats: {
      totalAssessments: number;
      passed: number;
      failed: number;
      averageScore: number;
      subjectPerformance: {
        subjectId: number;
        subjectName: string;
        averageScore: number;
        passRate: number;
      }[];
    };
  }> => {
    const response = await axiosInstance.get(
      `${API_BASE}/student/${studentId}/performance`
    );
    return response.data;
  },

  // =========================================
  // 👨‍🏫 Teacher Analytics
  // =========================================
  getTeacherAnalytics: async (
    teacherId: number
  ): Promise<{
    teacher: {
      id: number;
      name: string;
    };
    assessments: Assessment[];
    stats: {
      totalAssessments: number;
      totalSubmissions: number;
      pendingGrading: number;
      averageStudentScore: number;
    };
  }> => {
    const response = await axiosInstance.get(
      `${API_BASE}/teacher/${teacherId}/analytics`
    );
    return response.data;
  },

  // =========================================
  // 📘 Subject Breakdown
  // =========================================
  getSubjectBreakdown: async (
    subjectId: number
  ): Promise<{
    subject: {
      id: number;
      name: string;
    };
    assessments: Assessment[];
    submissions: AssessmentSubmission[];
    stats: {
      totalAssessments: number;
      totalSubmissions: number;
      averageScore: number;
      passRate: number;
      topPerformers: {
        studentId: number;
        studentName: string;
        averageScore: number;
      }[];
      strugglingStudents: {
        studentId: number;
        studentName: string;
        averageScore: number;
      }[];
    };
  }> => {
    const response = await axiosInstance.get(
      `${API_BASE}/subject/${subjectId}/breakdown`
    );
    return response.data;
  },

  // =========================================
  // 📤 Export Assessment Data
  // =========================================
  exportAssessmentData: async (
    format: 'csv' | 'excel',
    filter?: AdminSubmissionFilter
  ): Promise<Blob> => {
    const response = await axiosInstance.get(
      `${API_BASE}/export/${format}`,
      {
        params: filter,
        responseType: 'blob'
      }
    );
    return response.data;
  }
};
