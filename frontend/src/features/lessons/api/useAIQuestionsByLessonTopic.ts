// src/features/lessons/hooks/useAIQuestionsByLessonTopic.ts
import { useQuery } from "@tanstack/react-query";
import { lessonAIQuestionsApi } from "../api/lessonAIQuestionsApi";
import { LessonAIQuestionDto } from "../types/lessonAIQuestionsTypes";

/**
 * Hook to fetch AI-generated questions for a specific lesson topic
 * Used in Create Assessment page to allow teachers to select specific AI questions
 * 
 * @param lessonTopicId - The ID of the lesson topic
 * @returns Query result with AI questions array
 */
export const useAIQuestionsByLessonTopic = (lessonTopicId: number | undefined) => {
  return useQuery<LessonAIQuestionDto[], Error>({
    queryKey: ["ai-questions-by-lesson", lessonTopicId],
    queryFn: () => {
      if (!lessonTopicId) {
        throw new Error("Lesson topic ID is required");
      }
      return lessonAIQuestionsApi.getByLessonTopicId(lessonTopicId);
    },
    enabled: !!lessonTopicId, // Only fetch when we have a lesson topic ID
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};