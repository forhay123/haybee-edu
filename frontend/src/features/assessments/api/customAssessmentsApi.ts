/**
 * API functions for custom period assessments
 * Handles teacher-created assessments for Period 2/3 based on student performance
 */

import axios from "../../../api/axios";
import type {
  CustomAssessmentRequest,
  PendingAssessment,
  SubmissionAnalysis,
  CustomAssessmentDto,
  PeriodProgressDto,
} from "../types/customAssessmentTypes";

const BASE_URL = "/custom-period-assessments";

// ============================================================
// TEACHER - PENDING ASSESSMENTS
// ============================================================

/**
 * Get all pending custom assessments for a teacher
 * Returns periods waiting for custom assessment creation
 */
export const getPendingCustomAssessments = async (
  teacherId?: number
): Promise<PendingAssessment[]> => {
  const url = teacherId
    ? `${BASE_URL}/pending?teacherId=${teacherId}`
    : `${BASE_URL}/pending`;

  const response = await axios.get<PendingAssessment[]>(url);
  return response.data;
};

/**
 * Count pending custom assessments for a teacher
 */
export const countPendingCustomAssessments = async (
  teacherId?: number
): Promise<number> => {
  const url = teacherId
    ? `${BASE_URL}/count/pending?teacherId=${teacherId}`
    : `${BASE_URL}/count/pending`;

  const response = await axios.get<number>(url);
  return response.data;
};

/**
 * Get pending assessments by subject
 */
export const getPendingAssessmentsBySubject = async (
  teacherId: number,
  subjectId: number
): Promise<PendingAssessment[]> => {
  const response = await axios.get<PendingAssessment[]>(
    `${BASE_URL}/pending/subject/${subjectId}?teacherId=${teacherId}`
  );
  return response.data;
};

/**
 * Get urgent pending assessments (due soon)
 */
export const getUrgentPendingAssessments = async (
  teacherId: number,
  daysAhead: number = 3
): Promise<PendingAssessment[]> => {
  const response = await axios.get<PendingAssessment[]>(
    `${BASE_URL}/pending/urgent?teacherId=${teacherId}&daysAhead=${daysAhead}`
  );
  return response.data;
};

// ============================================================
// TEACHER - CREATE CUSTOM ASSESSMENT
// ============================================================

/**
 * Create a custom assessment for a student and period
 */
export const createCustomAssessment = async (
  request: CustomAssessmentRequest
): Promise<CustomAssessmentDto> => {
  const response = await axios.post<CustomAssessmentDto>(
    `${BASE_URL}/create`,
    request
  );
  return response.data;
};

/**
 * Update an existing custom assessment
 */
export const updateCustomAssessment = async (
  assessmentId: number,
  request: Partial<CustomAssessmentRequest>
): Promise<CustomAssessmentDto> => {
  const response = await axios.put<CustomAssessmentDto>(
    `${BASE_URL}/${assessmentId}`,
    request
  );
  return response.data;
};

/**
 * Delete a custom assessment (if no submissions yet)
 */
export const deleteCustomAssessment = async (
  assessmentId: number
): Promise<void> => {
  await axios.delete(`${BASE_URL}/${assessmentId}`);
};

// ============================================================
// TEACHER - GET CUSTOM ASSESSMENT
// ============================================================

/**
 * Get custom assessment for a student, subject, and period
 */
export const getCustomAssessment = async (
  studentId: number,
  subjectId: number,
  periodNumber: number
): Promise<CustomAssessmentDto | null> => {
  try {
    const response = await axios.get<CustomAssessmentDto>(
      `${BASE_URL}/student/${studentId}/subject/${subjectId}/period/${periodNumber}`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Get custom assessment by ID
 */
export const getCustomAssessmentById = async (
  assessmentId: number
): Promise<CustomAssessmentDto> => {
  const response = await axios.get<CustomAssessmentDto>(
    `${BASE_URL}/${assessmentId}`
  );
  return response.data;
};

/**
 * Check if custom assessment exists
 */
export const checkCustomAssessmentExists = async (
  studentId: number,
  subjectId: number,
  periodNumber: number
): Promise<boolean> => {
  try {
    await getCustomAssessment(studentId, subjectId, periodNumber);
    return true;
  } catch {
    return false;
  }
};

// ============================================================
// TEACHER - SUBMISSION ANALYSIS
// ============================================================

/**
 * Get detailed analysis of a previous period submission
 */
export const getPreviousSubmissionAnalysis = async (
  submissionId: number
): Promise<SubmissionAnalysis> => {
  const response = await axios.get<SubmissionAnalysis>(
    `/submission-analysis/${submissionId}/detailed`
  );
  return response.data;
};

/**
 * Get weak topics from a submission
 */
export const getWeakTopics = async (submissionId: number): Promise<any> => {
  const response = await axios.get(
    `/submission-analysis/${submissionId}/weak-topics`
  );
  return response.data;
};

/**
 * Get incorrect questions from a submission
 */
export const getIncorrectQuestions = async (
  submissionId: number
): Promise<any> => {
  const response = await axios.get(
    `/submission-analysis/${submissionId}/incorrect-questions`
  );
  return response.data;
};

/**
 * Get recommended questions for next assessment
 */
export const getRecommendedQuestions = async (
  submissionId: number
): Promise<any> => {
  const response = await axios.get(
    `/submission-analysis/${submissionId}/recommended-questions`
  );
  return response.data;
};

/**
 * Get submission summary (quick overview)
 */
export const getSubmissionSummary = async (
  submissionId: number
): Promise<any> => {
  const response = await axios.get(
    `/submission-analysis/${submissionId}/summary`
  );
  return response.data;
};

/**
 * Compare multiple submissions (for trend analysis)
 */
export const compareSubmissions = async (
  submissionIds: number[]
): Promise<any> => {
  const response = await axios.post(
    `/submission-analysis/compare`,
    { submissionIds }
  );
  return response.data;
};

// ============================================================
// STUDENT - VIEW CUSTOM ASSESSMENTS
// ============================================================

/**
 * Get all custom assessments for a student
 */
export const getMyCustomAssessments = async (): Promise<
  CustomAssessmentDto[]
> => {
  const response = await axios.get<CustomAssessmentDto[]>(
    `${BASE_URL}/my-custom-assessments`
  );
  return response.data;
};

/**
 * Get custom assessment status for student's current period
 */
export const getCustomAssessmentStatus = async (
  progressId: number
): Promise<PeriodProgressDto> => {
  const response = await axios.get<PeriodProgressDto>(
    `/progress/${progressId}/can-access`
  );
  return response.data;
};

// ============================================================
// ADMIN - CUSTOM ASSESSMENT OVERVIEW
// ============================================================

/**
 * Get all pending custom assessments across system (admin only)
 */
export const getAllPendingAssessments = async (): Promise<
  PendingAssessment[]
> => {
  const response = await axios.get<PendingAssessment[]>(
    `${BASE_URL}/admin/pending-all`
  );
  return response.data;
};

/**
 * Get custom assessment statistics
 */
export const getCustomAssessmentStats = async (): Promise<any> => {
  const response = await axios.get(
    `${BASE_URL}/admin/statistics`
  );
  return response.data;
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculate urgency level based on scheduled date
 */
export const calculateUrgencyLevel = (
  scheduledDate: string
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" => {
  const today = new Date();
  const scheduled = new Date(scheduledDate);
  const daysUntil = Math.ceil(
    (scheduled.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysUntil <= 0) return "CRITICAL";
  if (daysUntil <= 3) return "HIGH";
  if (daysUntil <= 7) return "MEDIUM";
  return "LOW";
};

/**
 * Format pending assessment for display
 */
export const formatPendingAssessment = (
  pending: PendingAssessment
): string => {
  return `${pending.studentName} - ${pending.subjectName} - Period ${pending.periodNumber}`;
};

/**
 * Get urgency color for UI
 */
export const getUrgencyColor = (level: string): string => {
  switch (level) {
    case "CRITICAL":
      return "red";
    case "HIGH":
      return "orange";
    case "MEDIUM":
      return "yellow";
    case "LOW":
      return "green";
    default:
      return "gray";
  }
};
