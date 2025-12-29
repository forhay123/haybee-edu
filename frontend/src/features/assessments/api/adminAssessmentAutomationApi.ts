// frontend/src/features/assessments/api/adminAssessmentAutomationApi.ts

import axios from "../../../api/axios";

// ============================================================
// TYPES
// ============================================================

export interface MissingAssessmentTopic {
  lessonTopicId: number;
  topicTitle: string;
  subjectName: string;
  subjectId: number;
  questionCount: number;
  totalMarks: number;
}

export interface MissingAssessmentsStats {
  missingCount: number;
  topics: MissingAssessmentTopic[];
}

export interface CreatedAssessmentDetail {
  assessmentId: number;
  lessonTopicId: number;
  topicTitle: string;
  subjectName: string;
  questionsAdded: number;
  totalMarks: number;
}

export interface CreateAssessmentResponse {
  success: boolean;
  message: string;
  lessonTopicId: number;
  created: boolean;
  assessment?: CreatedAssessmentDetail;
  error?: string;
}

export interface CreateAllMissingResponse {
  success: boolean;
  assessmentsCreated: number;
  totalTopics: number;
  skipped: number;
  details: CreatedAssessmentDetail[];
  error?: string;
}

// ============================================================
// API FUNCTIONS
// ============================================================

export const adminAssessmentAutomationApi = {
  /**
   * Get statistics about missing assessments
   * GET /api/v1/admin/assessments/missing-assessments-stats
   */
  getMissingAssessmentsStats: async (): Promise<MissingAssessmentsStats> => {
    const response = await axios.get('/admin/assessments/missing-assessments-stats');
    return response.data;
  },

  /**
   * Create assessment for a specific lesson topic
   * POST /api/v1/admin/assessments/create-for-lesson/{lessonTopicId}
   */
  createAssessmentForLesson: async (
    lessonTopicId: number
  ): Promise<CreateAssessmentResponse> => {
    const response = await axios.post(
      `/admin/assessments/create-for-lesson/${lessonTopicId}`
    );
    return response.data;
  },

  /**
   * Create assessments for ALL topics with missing assessments
   * POST /api/v1/admin/assessments/create-all-missing
   */
  createAllMissingAssessments: async (): Promise<CreateAllMissingResponse> => {
    const response = await axios.post('/admin/assessments/create-all-missing');
    return response.data;
  },

  /**
   * Bulk create assessments for selected topics
   */
  bulkCreateAssessments: async (
    lessonTopicIds: number[]
  ): Promise<CreateAllMissingResponse> => {
    const results: CreatedAssessmentDetail[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const topicId of lessonTopicIds) {
      try {
        const response = await adminAssessmentAutomationApi.createAssessmentForLesson(topicId);
        if (response.success && response.created && response.assessment) {
          results.push(response.assessment);
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        console.error(`Failed to create assessment for topic ${topicId}:`, error);
      }
    }

    return {
      success: successCount > 0,
      assessmentsCreated: successCount,
      totalTopics: lessonTopicIds.length,
      skipped: failCount,
      details: results,
    };
  },
};