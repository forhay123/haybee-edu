import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi } from '../api/assessmentsApi';
import type {
  CreateAssessmentRequest,
  SubmitAssessmentRequest
} from '../types/assessmentTypes';

export const assessmentKeys = {
  all: ['assessments'] as const,
  teacher: () => [...assessmentKeys.all, 'teacher'] as const,
  student: (studentId: number) => [...assessmentKeys.all, 'student', studentId] as const,
  teacherBySubject: (subjectId: number) => [...assessmentKeys.all, 'teacher', 'subject', subjectId] as const,
  detail: (id: number) => [...assessmentKeys.all, 'detail', id] as const,
  bySubject: (subjectId: number) => [...assessmentKeys.all, 'subject', subjectId] as const,
  questions: (assessmentId: number) => [...assessmentKeys.all, 'questions', assessmentId] as const,
  submission: (assessmentId: number, studentId: number) => 
    [...assessmentKeys.all, 'submission', assessmentId, studentId] as const,
  submissions: (assessmentId: number) => [...assessmentKeys.all, 'submissions', assessmentId] as const,
  submissionCounts: () => [...assessmentKeys.all, 'submissionCounts'] as const // ✅ NEW
};

// ✅ NEW: Get submission counts for all teacher assessments
export const useTeacherSubmissionCounts = () => {
  return useQuery({
    queryKey: assessmentKeys.submissionCounts(),
    queryFn: async () => {
      try {
        // This would be a new API endpoint that returns submission counts
        // For now, we'll use the existing data
        const assessments = await assessmentsApi.getTeacherAssessments();
        const counts: Record<number, number> = {};
        
        // Fetch submission counts for each assessment
        await Promise.all(
          assessments.map(async (assessment) => {
            try {
              const submissions = await assessmentsApi.getAssessmentSubmissions(assessment.id);
              // Count ungraded submissions
              counts[assessment.id] = submissions.filter(s => !s.graded).length;
            } catch (error) {
              counts[assessment.id] = 0;
            }
          })
        );
        
        return counts;
      } catch (error) {
        console.error('Error fetching submission counts:', error);
        return {};
      }
    },
    refetchInterval: 30000 // ✅ Refresh every 30 seconds to catch new submissions
  });
};

export const useTeacherAssessments = () => {
  return useQuery({
    queryKey: assessmentKeys.teacher(),
    queryFn: () => assessmentsApi.getTeacherAssessments()
  });
};

export const useStudentAssessments = (studentProfileId: number) => {
  return useQuery({
    queryKey: assessmentKeys.student(studentProfileId),
    queryFn: () => assessmentsApi.getStudentAssessments(studentProfileId),
    enabled: !!studentProfileId
  });
};

export const useTeacherAssessmentsBySubject = (subjectId: number) => {
  return useQuery({
    queryKey: assessmentKeys.teacherBySubject(subjectId),
    queryFn: () => assessmentsApi.getTeacherAssessmentsBySubject(subjectId),
    enabled: !!subjectId
  });
};

export const useAssessment = (id: number, studentProfileId?: number) => {
  return useQuery({
    queryKey: assessmentKeys.detail(id),
    queryFn: () => assessmentsApi.getAssessment(id, studentProfileId),
    enabled: !!id
  });
};

export const useAssessmentsBySubject = (subjectId: number, studentProfileId?: number) => {
  return useQuery({
    queryKey: assessmentKeys.bySubject(subjectId),
    queryFn: () => assessmentsApi.getAssessmentsBySubject(subjectId, studentProfileId),
    enabled: !!subjectId
  });
};

export const useAssessmentQuestions = (assessmentId: number, isTeacher: boolean = false) => {
  return useQuery({
    queryKey: assessmentKeys.questions(assessmentId),
    queryFn: () => assessmentsApi.getAssessmentQuestions(assessmentId, isTeacher),
    enabled: !!assessmentId
  });
};

export const useSubmission = (assessmentId: number, studentProfileId: number) => {
  return useQuery({
    queryKey: assessmentKeys.submission(assessmentId, studentProfileId),
    queryFn: () => assessmentsApi.getSubmission(assessmentId, studentProfileId),
    enabled: !!assessmentId && !!studentProfileId,
    retry: false
  });
};

export const useAssessmentSubmissions = (assessmentId: number) => {
  return useQuery({
    queryKey: assessmentKeys.submissions(assessmentId),
    queryFn: () => assessmentsApi.getAssessmentSubmissions(assessmentId),
    enabled: !!assessmentId
  });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateAssessmentRequest) => 
      assessmentsApi.createAssessment(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      queryClient.invalidateQueries({ 
        queryKey: assessmentKeys.bySubject(data.subjectId) 
      });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.teacher() });
    }
  });
};

export const useUpdateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: CreateAssessmentRequest }) => 
      assessmentsApi.updateAssessment(id, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.teacher() });
    }
  });
};

export const useDeleteAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => assessmentsApi.deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.teacher() });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.submissionCounts() }); // ✅ NEW
    }
  });
};

export const useTogglePublish = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => assessmentsApi.togglePublish(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.teacher() });
    }
  });
};

export const useSubmitAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, studentProfileId }: { 
      request: SubmitAssessmentRequest; 
      studentProfileId: number 
    }) => assessmentsApi.submitAssessment(request, studentProfileId),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: assessmentKeys.submission(data.assessmentId, data.studentId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: assessmentKeys.submissions(data.assessmentId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: assessmentKeys.detail(data.assessmentId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: assessmentKeys.submissionCounts() // ✅ NEW: Refresh submission counts
      });
      // Invalidate progress queries
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['lessonTopic'] });
      queryClient.invalidateQueries({ queryKey: ['daily-progress'] });
      // ✅ NEW: Invalidate notifications (teacher will see new notification)
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};