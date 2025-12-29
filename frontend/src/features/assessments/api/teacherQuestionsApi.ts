import axiosInstance from '../../../api/axios';
import type { TeacherQuestion, CreateTeacherQuestionRequest } from '../types/assessmentTypes';

const API_BASE = '/teacher-questions';

export const teacherQuestionsApi = {
  // Create question
  createQuestion: async (request: CreateTeacherQuestionRequest): Promise<TeacherQuestion> => {
    if (!request.subjectId) {
      throw new Error('Subject ID is required to create a question');
    }
    
    const response = await axiosInstance.post<TeacherQuestion>(API_BASE, request);
    return response.data;
  },

  // Update question
  updateQuestion: async (
    id: number,
    request: CreateTeacherQuestionRequest
  ): Promise<TeacherQuestion> => {
    const response = await axiosInstance.put<TeacherQuestion>(`${API_BASE}/${id}`, request);
    return response.data;
  },

  // Delete question
  deleteQuestion: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${API_BASE}/${id}`);
  },

  // Get my questions
  getMyQuestions: async (): Promise<TeacherQuestion[]> => {
    const response = await axiosInstance.get<TeacherQuestion[]>(`${API_BASE}/my-questions`);
    return response.data;
  },

  // Get questions by subject
  getQuestionsBySubject: async (subjectId: number): Promise<TeacherQuestion[]> => {
    if (!subjectId) {
      throw new Error('Subject ID is required');
    }
    
    const response = await axiosInstance.get<TeacherQuestion[]>(
      `${API_BASE}/subject/${subjectId}`
    );
    return response.data;
  },

  // Get questions by lesson
  getQuestionsByLesson: async (lessonTopicId: number): Promise<TeacherQuestion[]> => {
    if (!lessonTopicId) {
      throw new Error('Lesson topic ID is required');
    }
    
    const response = await axiosInstance.get<TeacherQuestion[]>(
      `${API_BASE}/lesson/${lessonTopicId}`
    );
    return response.data;
  }
};