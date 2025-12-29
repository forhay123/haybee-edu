import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherQuestionsApi } from '../api/teacherQuestionsApi';
import type { CreateTeacherQuestionRequest } from '../types/assessmentTypes';

export const questionKeys = {
  all: ['teacher-questions'] as const,
  myQuestions: () => [...questionKeys.all, 'my'] as const,
  bySubject: (subjectId: number) => [...questionKeys.all, 'subject', subjectId] as const,
  byLesson: (lessonTopicId: number) => [...questionKeys.all, 'lesson', lessonTopicId] as const
};

// Get my questions
export const useMyQuestions = () => {
  return useQuery({
    queryKey: questionKeys.myQuestions(),
    queryFn: () => teacherQuestionsApi.getMyQuestions()
  });
};

// Get questions by subject
export const useQuestionsBySubject = (subjectId: number) => {
  return useQuery({
    queryKey: questionKeys.bySubject(subjectId),
    queryFn: () => teacherQuestionsApi.getQuestionsBySubject(subjectId),
    enabled: !!subjectId && subjectId > 0
  });
};

// Get questions by lesson
export const useQuestionsByLesson = (lessonTopicId: number) => {
  return useQuery({
    queryKey: questionKeys.byLesson(lessonTopicId),
    queryFn: () => teacherQuestionsApi.getQuestionsByLesson(lessonTopicId),
    enabled: !!lessonTopicId && lessonTopicId > 0
  });
};

// Create question
export const useCreateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTeacherQuestionRequest) =>
      teacherQuestionsApi.createQuestion(request),
    onSuccess: (data) => {
      // Invalidate all question queries
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      
      // Specifically invalidate the subject's questions
      if (data.subjectId) {
        queryClient.invalidateQueries({ 
          queryKey: questionKeys.bySubject(data.subjectId) 
        });
      }
      
      // If linked to a lesson, invalidate that too
      if (data.lessonTopicId) {
        queryClient.invalidateQueries({ 
          queryKey: questionKeys.byLesson(data.lessonTopicId) 
        });
      }
    }
  });
};

// Update question
export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: CreateTeacherQuestionRequest }) =>
      teacherQuestionsApi.updateQuestion(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
    }
  });
};

// Delete question
export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teacherQuestionsApi.deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
    }
  });
};