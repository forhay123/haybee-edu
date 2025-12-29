import axiosInstance from '../../../api/axios';
import type {
  Assessment,
  AssessmentQuestion,
  AssessmentSubmission,
  CreateAssessmentRequest,
  SubmitAssessmentRequest
} from '../types/assessmentTypes';
import type { PeriodProgressDto } from '../types/customAssessmentTypes';

const API_BASE = '/assessments';

export const assessmentsApi = {
  // ========================================
  // TEACHER ENDPOINTS
  // ========================================
  
  // ✅ Get all assessments created by teacher
  getTeacherAssessments: async (): Promise<Assessment[]> => {
    const response = await axiosInstance.get<Assessment[]>(`${API_BASE}/teacher/my-assessments`);
    return response.data;
  },

  // ✅ Get teacher's assessments by subject
  getTeacherAssessmentsBySubject: async (subjectId: number): Promise<Assessment[]> => {
    const response = await axiosInstance.get<Assessment[]>(
      `${API_BASE}/teacher/subject/${subjectId}`
    );
    return response.data;
  },

  // Create assessment
  createAssessment: async (request: CreateAssessmentRequest): Promise<Assessment> => {
    const response = await axiosInstance.post<Assessment>(API_BASE, request);
    return response.data;
  },

  // Update assessment
  updateAssessment: async (id: number, request: CreateAssessmentRequest): Promise<Assessment> => {
    const response = await axiosInstance.put<Assessment>(`${API_BASE}/${id}`, request);
    return response.data;
  },

  // Delete assessment
  deleteAssessment: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${API_BASE}/${id}`);
  },

  // Publish/unpublish assessment
  togglePublish: async (id: number): Promise<Assessment> => {
    const response = await axiosInstance.patch<Assessment>(`${API_BASE}/${id}/toggle-publish`);
    return response.data;
  },

  // ========================================
  // STUDENT ENDPOINTS
  // ========================================

  // ✅ NEW: Get all assessments available to student
  getStudentAssessments: async (studentProfileId: number): Promise<Assessment[]> => {
    const response = await axiosInstance.get<Assessment[]>(
      `${API_BASE}/student/my-assessments`,
      { params: { studentProfileId } }
    );
    return response.data;
  },

  // ✅ UPDATED: Get my student assessments (filtered for custom assessments)
  getMyStudentAssessments: async (subjectId: number): Promise<Assessment[]> => {
    const response = await axiosInstance.get<Assessment[]>(
      `${API_BASE}/student/my-assessments/subject/${subjectId}`
    );
    return response.data;
  },

  // Get assessment by ID
  getAssessment: async (id: number, studentProfileId?: number): Promise<Assessment> => {
    const response = await axiosInstance.get<Assessment>(`${API_BASE}/${id}`, {
      params: { studentProfileId }
    });
    return response.data;
  },

  // ✅ UPDATED: Get assessments by subject with custom assessment filtering
  getAssessmentsBySubject: async (
    subjectId: number,
    studentProfileId?: number
  ): Promise<Assessment[]> => {
    const response = await axiosInstance.get<Assessment[]>(
      `${API_BASE}/subject/${subjectId}`,
      { params: { studentProfileId } }
    );
    return response.data;
  },

  // Get assessment questions
  getAssessmentQuestions: async (
    assessmentId: number,
    isTeacher: boolean = false
  ): Promise<AssessmentQuestion[]> => {
    const response = await axiosInstance.get<AssessmentQuestion[]>(
      `${API_BASE}/${assessmentId}/questions`,
      { params: { isTeacher } }
    );
    return response.data;
  },

  // Submit assessment
  submitAssessment: async (
    request: SubmitAssessmentRequest,
    studentProfileId: number
  ): Promise<AssessmentSubmission> => {
    const response = await axiosInstance.post<AssessmentSubmission>(
      `${API_BASE}/submit`,
      request,
      { params: { studentProfileId } }
    );
    return response.data;
  },

  // Get student submission
  getSubmission: async (
    assessmentId: number,
    studentProfileId: number
  ): Promise<AssessmentSubmission> => {
    const response = await axiosInstance.get<AssessmentSubmission>(
      `${API_BASE}/${assessmentId}/submission`,
      { params: { studentProfileId } }
    );
    return response.data;
  },

  // Get all submissions for an assessment (teacher view)
  getAssessmentSubmissions: async (assessmentId: number): Promise<AssessmentSubmission[]> => {
    const response = await axiosInstance.get<AssessmentSubmission[]>(
      `${API_BASE}/${assessmentId}/submissions`
    );
    return response.data;
  },

  // ========================================
  // ✅ NEW: MULTI-PERIOD / CUSTOM ASSESSMENT ENDPOINTS
  // ========================================

  /**
   * Check if student can access a specific period's assessment
   * Returns detailed access information including blocking reasons
   */
  checkPeriodAccess: async (progressId: number): Promise<PeriodProgressDto> => {
    const response = await axiosInstance.get<PeriodProgressDto>(
      `/progress/${progressId}/can-access`
    );
    return response.data;
  },

  /**
   * Check if assessment is accessible to student
   * Validates custom assessment permissions before allowing access
   */
  checkAssessmentAccess: async (
    assessmentId: number,
    studentId?: number
  ): Promise<{
    canAccess: boolean;
    reason?: string;
    isCustomAssessment: boolean;
    targetStudentId?: number;
  }> => {
    const url = studentId
      ? `${API_BASE}/${assessmentId}/access?studentId=${studentId}`
      : `${API_BASE}/${assessmentId}/access`;
    
    const response = await axiosInstance.get(url);
    return response.data;
  },

  /**
   * Batch check assessment access for multiple assessments
   * Efficiently checks access for many assessments at once
   */
  batchCheckAssessmentAccess: async (
    assessmentIds: number[],
    studentId?: number
  ): Promise<Record<number, boolean>> => {
    const response = await axiosInstance.post(`${API_BASE}/batch-access-check`, {
      assessmentIds,
      studentId,
    });
    return response.data;
  },

  /**
   * Get assessment with access validation
   * Returns assessment only if student has permission to view it
   */
  getAssessmentWithAccessCheck: async (
    assessmentId: number
  ): Promise<Assessment> => {
    const response = await axiosInstance.get<Assessment>(
      `${API_BASE}/${assessmentId}/with-access-check`
    );
    return response.data;
  },

  /**
   * Get assessment questions with access validation
   * Returns questions only if student has permission to view them
   */
  getAssessmentQuestionsWithAccessCheck: async (
    assessmentId: number
  ): Promise<AssessmentQuestion[]> => {
    const response = await axiosInstance.get<AssessmentQuestion[]>(
      `${API_BASE}/${assessmentId}/questions/with-access-check`
    );
    return response.data;
  },
};

// ========================================
// ✅ UTILITY FUNCTIONS
// ========================================

/**
 * Check if assessment is a custom assessment
 */
export const isCustomAssessment = (assessment: Assessment): boolean => {
  return assessment.isCustomAssessment === true;
};

/**
 * Check if student can access custom assessment
 */
export const canAccessCustomAssessment = (
  assessment: Assessment,
  studentId: number
): boolean => {
  if (!isCustomAssessment(assessment)) {
    return true; // Regular assessments are accessible to all
  }
  return assessment.targetStudentId === studentId;
};

/**
 * Filter assessments for student view
 * Removes custom assessments not assigned to the student
 */
export const filterAssessmentsForStudent = (
  assessments: Assessment[],
  studentId: number
): Assessment[] => {
  return assessments.filter((assessment) => {
    if (!isCustomAssessment(assessment)) {
      return true; // Include all regular assessments
    }
    return assessment.targetStudentId === studentId;
  });
};

/**
 * Group assessments by period number
 */
export const groupAssessmentsByPeriod = (
  assessments: Assessment[]
): Record<number, Assessment[]> => {
  return assessments.reduce((acc, assessment) => {
    const period = assessment.periodNumber || 1;
    if (!acc[period]) {
      acc[period] = [];
    }
    acc[period].push(assessment);
    return acc;
  }, {} as Record<number, Assessment[]>);
};

/**
 * Get custom assessments only
 */
export const getCustomAssessmentsOnly = (assessments: Assessment[]): Assessment[] => {
  return assessments.filter(isCustomAssessment);
};

/**
 * Get regular (non-custom) assessments only
 */
export const getRegularAssessmentsOnly = (assessments: Assessment[]): Assessment[] => {
  return assessments.filter((a) => !isCustomAssessment(a));
};
