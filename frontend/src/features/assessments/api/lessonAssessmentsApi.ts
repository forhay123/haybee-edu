import axiosInstance from '../../../api/axios';

const API_BASE = '/lesson-assessments';

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  type: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  totalMarks: number;
  passingMarks: number;
  durationMinutes?: number;
  autoGrade: boolean;
  published: boolean;
  questionCount: number;
  hasSubmitted: boolean;
  studentScore?: number;
  studentPassed?: boolean;
}

export interface AssessmentQuestion {
  id: number;
  assessmentId: number;
  questionText: string;
  questionType: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  marks: number;
  orderNumber: number;
  aiGenerated: boolean;
}

export interface AssessmentAnswer {
  id: number;
  questionId: number;
  questionText: string;
  questionType: string;
  studentAnswer: string;
  correctAnswer?: string;
  isCorrect: boolean;
  marksObtained: number;
  maxMarks: number;
  teacherFeedback?: string;
}

export interface LessonAssessmentSubmission {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  studentId: number;
  studentName: string;
  lessonTopicId?: number;
  submittedAt: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  graded: boolean;
  gradedAt?: string;
  answers: AssessmentAnswer[];
}

export interface LessonAssessmentSubmitRequest {
  assessmentId: number;
  answers: {
    questionId: number;
    studentAnswer: string;
  }[];
}

export interface AssessmentStatistics {
  totalAssessments: number;
  passedAssessments: number;
  failedAssessments: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

export const lessonAssessmentsApi = {
  // Get assessment for a lesson topic
  getAssessmentByLesson: async (
    lessonTopicId: number,
    studentProfileId?: number
  ): Promise<Assessment> => {
    const params = studentProfileId ? { studentProfileId } : {};
    const response = await axiosInstance.get<Assessment>(
      `${API_BASE}/lesson/${lessonTopicId}`,
      { params }
    );
    return response.data;
  },

  // Get assessment questions
  getQuestions: async (
    assessmentId: number,
    isTeacher: boolean = false
  ): Promise<AssessmentQuestion[]> => {
    const response = await axiosInstance.get<AssessmentQuestion[]>(
      `${API_BASE}/${assessmentId}/questions`,
      { params: { isTeacher } }
    );
    return response.data;
  },

  // Submit lesson assessment
  submitAssessment: async (
    request: LessonAssessmentSubmitRequest,
    studentProfileId: number
  ): Promise<LessonAssessmentSubmission> => {
    const response = await axiosInstance.post<LessonAssessmentSubmission>(
      `${API_BASE}/submit`,
      request,
      { params: { studentProfileId } }
    );
    return response.data;
  },

  // Check if assessment already submitted for a lesson
  checkSubmissionByLesson: async (
    lessonTopicId: number,
    studentProfileId: number
  ): Promise<LessonAssessmentSubmission | null> => {
    try {
      const response = await axiosInstance.get<LessonAssessmentSubmission>(
        `${API_BASE}/submission/${lessonTopicId}`,
        { params: { studentProfileId } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // ✅ NEW: Check if assessment already submitted by assessment ID (not lesson topic ID)
  // This is needed for custom assessments where multiple assessments exist for the same lesson topic
  checkSubmissionByAssessmentId: async (
    assessmentId: number,
    studentProfileId: number
  ): Promise<LessonAssessmentSubmission | null> => {
    try {
      const response = await axiosInstance.get<LessonAssessmentSubmission>(
        `${API_BASE}/assessment/${assessmentId}/submission`,
        { params: { studentProfileId } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No submission found
      }
      throw error;
    }
  },

  // Get assessment results by submission ID
  getResults: async (submissionId: number): Promise<LessonAssessmentSubmission> => {
    const response = await axiosInstance.get<LessonAssessmentSubmission>(
      `${API_BASE}/results/${submissionId}`
    );
    return response.data;
  },

  // Get student's lesson assessments
  getStudentAssessments: async (
    studentProfileId: number,
    subjectId?: number
  ): Promise<LessonAssessmentSubmission[]> => {
    const params = subjectId ? { subjectId } : {};
    const response = await axiosInstance.get<LessonAssessmentSubmission[]>(
      `${API_BASE}/student/${studentProfileId}`,
      { params }
    );
    return response.data;
  },

  // Get statistics
  getStatistics: async (
    studentProfileId: number,
    subjectId?: number
  ): Promise<AssessmentStatistics> => {
    const params = subjectId ? { subjectId } : {};
    const response = await axiosInstance.get<AssessmentStatistics>(
      `${API_BASE}/student/${studentProfileId}/stats`,
      { params }
    );
    return response.data;
  }
};