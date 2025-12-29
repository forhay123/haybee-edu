// src/features/assessments/api/gradingApi.ts

import axiosInstance from '../../../api/axios';
import type { AssessmentSubmission, AssessmentAnswer } from '../types/assessmentTypes';

const API_BASE = '/assessments';

export interface GradeAnswerRequest {
  answerId: number;
  marksObtained: number;
  teacherFeedback?: string;
}

export interface GradeSubmissionRequest {
  submissionId: number;
  grades: GradeAnswerRequest[];
}

export interface PendingSubmission extends AssessmentSubmission {
  pendingAnswersCount: number;
}

// ✅ NEW: Grading statistics interface
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

export const gradingApi = {
  // ✅ NEW: Get grading statistics for dashboard
  getGradingStats: async (): Promise<GradingStats> => {
    const response = await axiosInstance.get<GradingStats>(
      `${API_BASE}/grading-stats`
    );
    return response.data;
  },

  // Get all pending submissions for a teacher
  getPendingSubmissions: async (): Promise<PendingSubmission[]> => {
    const response = await axiosInstance.get<PendingSubmission[]>(
      `${API_BASE}/pending-grading`
    );
    return response.data;
  },

  // Get pending submissions for a specific assessment
  getPendingSubmissionsByAssessment: async (
    assessmentId: number
  ): Promise<PendingSubmission[]> => {
    const response = await axiosInstance.get<PendingSubmission[]>(
      `${API_BASE}/${assessmentId}/pending-grading`
    );
    return response.data;
  },

  // Get detailed submission for grading
  getSubmissionForGrading: async (submissionId: number): Promise<AssessmentSubmission> => {
    const response = await axiosInstance.get<AssessmentSubmission>(
      `${API_BASE}/submissions/${submissionId}/grade`
    );
    return response.data;
  },

  // Grade a single answer
  gradeAnswer: async (request: GradeAnswerRequest): Promise<AssessmentAnswer> => {
    const response = await axiosInstance.post<AssessmentAnswer>(
      `${API_BASE}/answers/${request.answerId}/grade`,
      {
        marksObtained: request.marksObtained,
        teacherFeedback: request.teacherFeedback
      }
    );
    return response.data;
  },

  // Grade entire submission
  gradeSubmission: async (request: GradeSubmissionRequest): Promise<AssessmentSubmission> => {
    const response = await axiosInstance.post<AssessmentSubmission>(
      `${API_BASE}/submissions/${request.submissionId}/grade`,
      { grades: request.grades }
    );
    return response.data;
  }
};