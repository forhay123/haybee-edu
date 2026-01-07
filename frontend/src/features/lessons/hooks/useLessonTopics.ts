// src/features/lessons/hooks/useLessonTopics.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lessonTopicsApi } from "../api/lessonTopicsApi";
import { LessonTopicDto } from "../types/lessonTopicTypes";
import { LessonAIQuestionDto } from "../types/lessonAIQuestionsTypes";

export const useLessonTopics = (subjectId?: number) => {
  const queryClient = useQueryClient();

  const query = useQuery<LessonTopicDto[], Error>({
    queryKey: ["lesson-topics", subjectId],
    queryFn: () => lessonTopicsApi.getAll(subjectId),
  });

  const create = useMutation<LessonTopicDto, Error, FormData>({
    mutationFn: lessonTopicsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-topics"] });
    },
  });

  const update = useMutation<LessonTopicDto, Error, { id: number; data: FormData }>({
    mutationFn: ({ id, data }) => lessonTopicsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-topics"] });
    },
  });

  const remove = useMutation<void, Error, number>({
    mutationFn: (id) => lessonTopicsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-topics"] });
    },
  });

  return { getAll: query, create, update, remove, refetch: query.refetch };
};

// ✅ Hook for single lesson topic
export const useLessonTopic = (id: number) => {
  return useQuery<LessonTopicDto, Error>({
    queryKey: ["lesson-topic", id],
    queryFn: () => lessonTopicsApi.getById(id),
    enabled: !!id,
  });
};

/**
 * ✅ NEW: Hook for getting lessons for a student by profile ID
 * 
 * Works for ALL student types (SCHOOL, HOME, ASPIRANT, INDIVIDUAL)
 * 
 * Usage:
 * const { data: lessons, isLoading } = useStudentLessonsByProfileId(studentProfileId);
 */
/**
 * ✅ Fetch lessons for a student by their profile ID
 * Works for all student types (SCHOOL, HOME, ASPIRANT, INDIVIDUAL)
 */
export const useStudentLessonsByProfileId = (studentProfileId: number | undefined) => {
  return useQuery({
    queryKey: ["student-lessons", studentProfileId],
    queryFn: () => {
      if (!studentProfileId) {
        throw new Error("Student profile ID is required");
      }
      return lessonTopicsApi.getStudentLessonsByProfileId(studentProfileId);
    },
    enabled: !!studentProfileId, // Only run if we have a profile ID
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

/**
 * ✅ NEW: Hook for getting lessons for a student by profile ID and subject
 * 
 * Usage:
 * const { data: lessons } = useStudentLessonsBySubject(studentProfileId, subjectId);
 */
export const useStudentLessonsBySubject = (
  studentProfileId?: number,
  subjectId?: number
) => {
  return useQuery<LessonTopicDto[], Error>({
    queryKey: ["student-lessons-by-subject", studentProfileId, subjectId],
    queryFn: () =>
      lessonTopicsApi.getStudentLessonsBySubject(studentProfileId!, subjectId!),
    enabled: !!studentProfileId && !!subjectId,
  });
};

/**
 * @deprecated Use useStudentLessonsByProfileId instead
 * 
 * Old hook for backwards compatibility
 */
export const useStudentLessons = (
  subjectIds: number[],
  studentType: "SCHOOL" | "HOME" | "ASPIRANT" | "INDIVIDUAL"
) => {
  return useQuery<LessonTopicDto[], Error>({
    queryKey: ["student-lessons", subjectIds, studentType],
    queryFn: () => lessonTopicsApi.getStudentLessons(subjectIds, studentType),
    enabled: subjectIds.length > 0,
  });
};

// ✅ Hook for lesson questions
export const useLessonQuestions = (lessonTopicIds: number[]) => {
  return useQuery<LessonAIQuestionDto[], Error>({
    queryKey: ["lesson-questions", lessonTopicIds],
    queryFn: () => lessonTopicsApi.getQuestionsForLessons(lessonTopicIds),
    enabled: lessonTopicIds.length > 0,
  });
};