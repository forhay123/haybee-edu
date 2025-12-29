// ✅ CORRECTED: lessonAIQuestionsApi.ts - Fetches lesson TOPIC details

import api from "../../../api/axios";
import { LessonAIQuestionDto } from "../types/lessonAIQuestionsTypes";

const BASE_URL = "/ai-questions";

export const lessonAIQuestionsApi = {
  // Fetch AI questions by subject IDs
  getBySubjectIds: async (subjectIds: number[]): Promise<LessonAIQuestionDto[]> => {
    const params = new URLSearchParams();
    subjectIds.forEach(id => params.append("subjectIds", id.toString()));

    const res = await api.get(`${BASE_URL}`, { params });
    return res.data;
  },

  // Fetch AI questions by lesson topic ID
  getByLessonTopicId: async (lessonTopicId: number): Promise<LessonAIQuestionDto[]> => {
    const res = await api.get(`${BASE_URL}/lesson-topic/${lessonTopicId}`);
    return res.data;
  },
};