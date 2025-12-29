import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lessonAssessmentsApi, LessonAssessmentSubmitRequest } from '../api/lessonAssessmentsApi';
import { useMyProfile } from '../../studentProfiles/hooks/useStudentProfiles';

export const lessonAssessmentKeys = {
  all: ['lesson-assessments'] as const,
  byLesson: (lessonTopicId: number, studentProfileId?: number) => 
    [...lessonAssessmentKeys.all, 'lesson', lessonTopicId, studentProfileId] as const,
  questions: (assessmentId: number) => 
    [...lessonAssessmentKeys.all, 'questions', assessmentId] as const,
  submission: (lessonTopicId: number, studentProfileId: number) => 
    [...lessonAssessmentKeys.all, 'submission', lessonTopicId, studentProfileId] as const,
  // ✅ NEW: Key for submission by assessment ID
  submissionByAssessment: (assessmentId: number, studentProfileId: number) => 
    [...lessonAssessmentKeys.all, 'submission-by-assessment', assessmentId, studentProfileId] as const,
  results: (submissionId: number) => 
    [...lessonAssessmentKeys.all, 'results', submissionId] as const,
  studentAssessments: (studentProfileId: number, subjectId?: number) => 
    [...lessonAssessmentKeys.all, 'student', studentProfileId, subjectId] as const,
  statistics: (studentProfileId: number, subjectId?: number) => 
    [...lessonAssessmentKeys.all, 'statistics', studentProfileId, subjectId] as const,
};

// Get assessment for a lesson topic
export const useAssessmentByLesson = (lessonTopicId: number, studentProfileId?: number) => {
  return useQuery({
    queryKey: lessonAssessmentKeys.byLesson(lessonTopicId, studentProfileId),
    queryFn: () => lessonAssessmentsApi.getAssessmentByLesson(lessonTopicId, studentProfileId),
    enabled: !!lessonTopicId,
  });
};

// Get assessment questions
export const useAssessmentQuestions = (assessmentId: number, isTeacher: boolean = false) => {
  return useQuery({
    queryKey: lessonAssessmentKeys.questions(assessmentId),
    queryFn: () => lessonAssessmentsApi.getQuestions(assessmentId, isTeacher),
    enabled: !!assessmentId,
  });
};

// Check if assessment already submitted (by lesson topic)
export const useCheckSubmission = (lessonTopicId: number, studentProfileId?: number) => {
  return useQuery({
    queryKey: lessonAssessmentKeys.submission(lessonTopicId, studentProfileId || 0),
    queryFn: () => {
      if (!studentProfileId) {
        throw new Error('Student profile ID is required');
      }
      return lessonAssessmentsApi.checkSubmissionByLesson(lessonTopicId, studentProfileId);
    },
    enabled: !!lessonTopicId && !!studentProfileId,
    retry: false,
  });
};

// ✅ FIXED: Check if assessment already submitted (by assessment ID)
// This correctly uses the new API method that queries by assessment ID
export const useCheckSubmissionByAssessment = (assessmentId: number, studentProfileId?: number) => {
  return useQuery({
    queryKey: lessonAssessmentKeys.submissionByAssessment(assessmentId, studentProfileId || 0),
    queryFn: async () => {
      if (!studentProfileId) {
        throw new Error('Student profile ID is required');
      }
      // ✅ FIXED: Now calling the correct method that uses assessment ID
      return lessonAssessmentsApi.checkSubmissionByAssessmentId(assessmentId, studentProfileId);
    },
    enabled: !!assessmentId && !!studentProfileId,
    retry: false,
  });
};

// Get assessment results
export const useAssessmentResults = (submissionId: number) => {
  return useQuery({
    queryKey: lessonAssessmentKeys.results(submissionId),
    queryFn: () => lessonAssessmentsApi.getResults(submissionId),
    enabled: !!submissionId,
  });
};

// Get student's assessments
export const useStudentAssessments = (studentProfileId?: number, subjectId?: number) => {
  return useQuery({
    queryKey: lessonAssessmentKeys.studentAssessments(studentProfileId || 0, subjectId),
    queryFn: () => {
      if (!studentProfileId) {
        throw new Error('Student profile ID is required');
      }
      return lessonAssessmentsApi.getStudentAssessments(studentProfileId, subjectId);
    },
    enabled: !!studentProfileId,
  });
};

// Get assessment statistics
export const useAssessmentStatistics = (studentProfileId?: number, subjectId?: number) => {
  return useQuery({
    queryKey: lessonAssessmentKeys.statistics(studentProfileId || 0, subjectId),
    queryFn: () => {
      if (!studentProfileId) {
        throw new Error('Student profile ID is required');
      }
      return lessonAssessmentsApi.getStatistics(studentProfileId, subjectId);
    },
    enabled: !!studentProfileId,
  });
};

// Submit lesson assessment
export const useSubmitLessonAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      request, 
      studentProfileId 
    }: { 
      request: LessonAssessmentSubmitRequest; 
      studentProfileId: number 
    }) => lessonAssessmentsApi.submitAssessment(request, studentProfileId),
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: lessonAssessmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lessonTopic'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['daily-progress'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
    },
  });
};

// ✅ NEW: Submit assessment by ID (for custom assessments)
export const useSubmitAssessmentById = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      request, 
      studentProfileId 
    }: { 
      request: LessonAssessmentSubmitRequest; 
      studentProfileId: number 
    }) => lessonAssessmentsApi.submitAssessment(request, studentProfileId),
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: lessonAssessmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['daily-progress'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['teacherMultiPeriodOverview'] });
    },
  });
};

// Helper hook to get current student profile ID for use in components
export const useCurrentStudentProfileId = () => {
  const { data: profile, isLoading } = useMyProfile();
  
  return {
    studentProfileId: profile?.id,
    isLoading,
  };
};