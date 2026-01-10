// src/features/assessments/api/gradebookReportApi.ts

import axiosInstance from '../../../api/axios';
import {
  GradebookReportDto,
  SubjectGradebookDto,
  AssessmentWeights,
} from '../types/gradebookTypes';

const API_BASE = '/gradebook';

/**
 * 📊 Gradebook Report API
 * Handles all API calls for weighted grade reports
 */
export const gradebookReportApi = {
  /**
   * ✅ Get full gradebook report for logged-in student
   * GET /api/v1/gradebook/report
   */
  getMyGradebookReport: async (): Promise<GradebookReportDto> => {
    const response = await axiosInstance.get<GradebookReportDto>(
      `${API_BASE}/report`
    );
    return response.data;
  },

  /**
   * ✅ Get gradebook report for ONE subject
   * GET /api/v1/gradebook/report/subject/{subjectId}
   */
  getSubjectGradebook: async (
    subjectId: number
  ): Promise<SubjectGradebookDto> => {
    const response = await axiosInstance.get<SubjectGradebookDto>(
      `${API_BASE}/report/subject/${subjectId}`
    );
    return response.data;
  },

  /**
   * ✅ Get assessment weights (publicly accessible)
   * GET /api/v1/gradebook/weights
   * 
   * Returns:
   * {
   *   "QUIZ": 20,
   *   "CLASSWORK": 10,
   *   "TEST1": 10,
   *   "TEST2": 10,
   *   "ASSIGNMENT": 10,
   *   "EXAM": 40
   * }
   */
  getAssessmentWeights: async (): Promise<AssessmentWeights> => {
    const response = await axiosInstance.get<AssessmentWeights>(
      `${API_BASE}/weights`
    );
    return response.data;
  },

  /**
   * ✅ Admin/Teacher: Get gradebook report for any student
   * GET /api/v1/gradebook/admin/student/{studentId}/report
   */
  getStudentGradebookReport: async (
    studentId: number
  ): Promise<GradebookReportDto> => {
    const response = await axiosInstance.get<GradebookReportDto>(
      `${API_BASE}/admin/student/${studentId}/report`
    );
    return response.data;
  },

  /**
   * ✅ Admin/Teacher: Get subject gradebook for any student
   * GET /api/v1/gradebook/admin/student/{studentId}/subject/{subjectId}
   */
  getStudentSubjectGradebook: async (
    studentId: number,
    subjectId: number
  ): Promise<SubjectGradebookDto> => {
    const response = await axiosInstance.get<SubjectGradebookDto>(
      `${API_BASE}/admin/student/${studentId}/subject/${subjectId}`
    );
    return response.data;
  },
};