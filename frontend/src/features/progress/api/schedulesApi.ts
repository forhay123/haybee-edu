// src/features/progress/api/schedulesApi.ts

import axiosInstance from '../../../api/axios';

export interface ScheduleCreateRequest {
  studentId: number;
  subjectId: number;
  lessonTopicId: number;
  scheduledDate: string; // yyyy-MM-dd
  periodNumber: number;
  priority?: number; // 1-4
  weight?: number; // default 1
}

export interface ScheduleDto {
  id: number;
  subjectId: number;
  subjectName: string;
  lessonTopicId: number;
  lessonTitle: string;
  scheduledDate: string;
  periodNumber: number;
  priority?: number;
  weight?: number;
  createdAt: string;
  subjects?: { id: number; name: string }[];
}

export interface SubjectOption {
  id: number;
  name: string;
  code?: string;
  level?: string;
  grade?: string;
}

export interface LessonTopicOption {
  id: number;
  topicTitle: string;
  title?: string;
  subjectId: number;
  subjectName?: string;
  description?: string;
  weekNumber?: number;
  isAspirantMaterial?: boolean;
}

export interface ClassOption {
  id: number;
  name: string;
}

export const schedulesApi = {
  createSchedule: async (request: ScheduleCreateRequest): Promise<ScheduleDto> => {
    const response = await axiosInstance.post('/schedules', request);
    return response.data;
  },

  getAllSchedules: async (fromDate?: string, toDate?: string): Promise<ScheduleDto[]> => {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    const response = await axiosInstance.get('/schedules', { params });
    return response.data;
  },

  deleteSchedule: async (scheduleId: number): Promise<void> => {
    await axiosInstance.delete(`/schedules/${scheduleId}`);
  },

  getSubjects: async (): Promise<SubjectOption[]> => {
    const response = await axiosInstance.get('/subjects');
    return response.data;
  },

  getLessonTopics: async (subjectId: number): Promise<LessonTopicOption[]> => {
    const response = await axiosInstance.get(`/subjects/${subjectId}/lesson-topics`);
    return response.data.map((lt: any) => ({
      id: lt.id,
      topicTitle: lt.topicTitle,
      title: lt.topicTitle,
      subjectId: lt.subjectId,
      subjectName: lt.subjectName,
      description: lt.description,
      weekNumber: lt.weekNumber,
      isAspirantMaterial: lt.isAspirantMaterial || false,
    }));
  },

  getClasses: async (): Promise<ClassOption[]> => {
    const response = await axiosInstance.get('/classes'); // adjust endpoint if different
    return response.data;
  },
};

export default schedulesApi;
