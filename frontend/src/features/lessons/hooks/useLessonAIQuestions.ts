// src/features/lessons/hooks/useLessonAIQuestions.ts
import { useQuery } from "@tanstack/react-query";
import { lessonAIQuestionsApi } from "../api/lessonAIQuestionsApi";
import { LessonAIQuestionDto } from "../types/lessonAIQuestionsTypes";

export const useLessonAIQuestions = (subjectIds: number[]) => {
  return useQuery<LessonAIQuestionDto[], Error>({
    queryKey: ["ai-questions", subjectIds],
    queryFn: () => lessonAIQuestionsApi.getBySubjectIds(subjectIds),
    enabled: subjectIds.length > 0,
  });
};
