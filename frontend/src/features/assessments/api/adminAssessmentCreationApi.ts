// frontend/src/features/assessments/api/adminAssessmentCreationApi.ts

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
// ADMIN ASSESSMENT CREATION API
// ============================================================

export const adminAssessmentCreationApi = {
  /**
   * Get statistics about missing assessments
   * GET /api/v1/admin/assessments/missing-assessments-stats
   */
  getMissingAssessmentsStats: async (): Promise<MissingAssessmentsStats> => {
    const res = await axios.get("/admin/assessments/missing-assessments-stats");
    return res.data;
  },

  /**
   * Create assessment for a specific lesson topic
   * POST /api/v1/admin/assessments/create-for-lesson/{lessonTopicId}
   */
  createAssessmentForLesson: async (
    lessonTopicId: number
  ): Promise<CreateAssessmentResponse> => {
    const res = await axios.post(
      `/admin/assessments/create-for-lesson/${lessonTopicId}`
    );
    return res.data;
  },

  /**
   * Create assessments for ALL topics with missing assessments
   * POST /api/v1/admin/assessments/create-all-missing
   */
  createAllMissingAssessments: async (): Promise<CreateAllMissingResponse> => {
    const res = await axios.post("/admin/assessments/create-all-missing");
    return res.data;
  },

  /**
   * Batch create assessments for multiple topics
   * Convenience method that calls createAssessmentForLesson multiple times
   */
  createMultipleAssessments: async (
    lessonTopicIds: number[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{
    successful: CreateAssessmentResponse[];
    failed: Array<{ lessonTopicId: number; error: string }>;
  }> => {
    const successful: CreateAssessmentResponse[] = [];
    const failed: Array<{ lessonTopicId: number; error: string }> = [];

    for (let i = 0; i < lessonTopicIds.length; i++) {
      const topicId = lessonTopicIds[i];
      
      try {
        const result = await adminAssessmentCreationApi.createAssessmentForLesson(
          topicId
        );
        successful.push(result);
      } catch (error: any) {
        failed.push({
          lessonTopicId: topicId,
          error: error.response?.data?.message || error.message || "Unknown error",
        });
      }

      if (onProgress) {
        onProgress(i + 1, lessonTopicIds.length);
      }
    }

    return { successful, failed };
  },
};