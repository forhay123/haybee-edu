import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../../api/axios';

export interface WeeklyScheduleDto {
  id?: number;
  classId: number;
  className?: string;
  subjectId: number;
  subjectName?: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  weekNumber: number;
  dayOfWeek: string;
  periodNumber: number;
  startTime?: string;
  endTime?: string;
  priority?: number;
  weight?: number;
  teacherId?: number;
  teacherName?: string;
  studentType?: string;        // ✅ NEW: 'SCHOOL' | 'HOME' | 'ASPIRANT'
  studentTypeName?: string;    // ✅ NEW: Display name
}

export interface ClassOption {
  id: number;
  name: string;
}

export interface SubjectOption {
  id: number;
  name: string;
}

export interface LessonTopicOption {
  id: number;
  topicTitle: string;
  title?: string;
  weekNumber?: number;
}

const weeklySchedulesApi = {
  getAll: async (): Promise<WeeklyScheduleDto[]> => {
    const response = await axiosInstance.get('/weekly-schedules');
    return response.data;
  },

  getByClass: async (classId: number): Promise<WeeklyScheduleDto[]> => {
    const response = await axiosInstance.get(`/weekly-schedules/class/${classId}`);
    return response.data;
  },

  create: async (data: WeeklyScheduleDto): Promise<WeeklyScheduleDto> => {
    const response = await axiosInstance.post('/weekly-schedules', data);
    return response.data;
  },

  update: async (id: number, data: WeeklyScheduleDto): Promise<WeeklyScheduleDto> => {
    const response = await axiosInstance.put(`/weekly-schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/weekly-schedules/${id}`);
  },

  regenerate: async (id: number): Promise<string> => {
    const response = await axiosInstance.post(`/weekly-schedules/${id}/regenerate`);
    return response.data;
  },

  getClasses: async (): Promise<ClassOption[]> => {
    const response = await axiosInstance.get('/classes');
    return response.data;
  },

  getTeacherClasses: async (): Promise<ClassOption[]> => {
    const response = await axiosInstance.get('/classes/teacher/my-classes');
    return response.data;
  },

  getSubjects: async (): Promise<SubjectOption[]> => {
    const response = await axiosInstance.get('/subjects');
    return response.data;
  },

  getTeacherSubjects: async (): Promise<SubjectOption[]> => {
    const response = await axiosInstance.get('/subjects/teacher/my-subjects');
    return response.data;
  },

  getSubjectsByClass: async (classId: number): Promise<SubjectOption[]> => {
    const response = await axiosInstance.get(`/subjects/class/${classId}`);
    return response.data;
  },

  getLessonTopics: async (subjectId: number): Promise<LessonTopicOption[]> => {
    const response = await axiosInstance.get(`/subjects/${subjectId}/lesson-topics`);
    return response.data;
  },
};

export const weeklyScheduleKeys = {
  all: ['weeklySchedules'] as const,
  list: () => [...weeklyScheduleKeys.all, 'list'] as const,
  byClass: (classId: number) => [...weeklyScheduleKeys.all, 'class', classId] as const,
  classes: () => ['classes'] as const,
  teacherClasses: () => ['classes', 'teacher'] as const,
  subjects: () => ['subjects'] as const,
  teacherSubjects: () => ['subjects', 'teacher'] as const,
  subjectsByClass: (classId: number) => ['subjects', 'class', classId] as const,
  lessonTopics: (subjectId: number) => ['lessonTopics', subjectId] as const,
};

export const useWeeklySchedules = () => {
  return useQuery({
    queryKey: weeklyScheduleKeys.list(),
    queryFn: () => weeklySchedulesApi.getAll(),
    staleTime: 300000,
  });
};

export const useWeeklySchedulesByClass = (classId: number) => {
  return useQuery({
    queryKey: weeklyScheduleKeys.byClass(classId),
    queryFn: () => weeklySchedulesApi.getByClass(classId),
    enabled: !!classId && classId > 0,
    staleTime: 300000,
  });
};

export const useClasses = () => {
  return useQuery({
    queryKey: weeklyScheduleKeys.classes(),
    queryFn: () => weeklySchedulesApi.getClasses(),
    staleTime: 600000,
  });
};

export const useTeacherClasses = () => {
  return useQuery({
    queryKey: weeklyScheduleKeys.teacherClasses(),
    queryFn: () => weeklySchedulesApi.getTeacherClasses(),
    staleTime: 600000,
  });
};

export const useSubjects = () => {
  return useQuery({
    queryKey: weeklyScheduleKeys.subjects(),
    queryFn: () => weeklySchedulesApi.getSubjects(),
    staleTime: 600000,
  });
};

export const useTeacherSubjects = () => {
  return useQuery({
    queryKey: weeklyScheduleKeys.teacherSubjects(),
    queryFn: () => weeklySchedulesApi.getTeacherSubjects(),
    staleTime: 600000,
  });
};

export const useSubjectsByClass = (classId: number) => {
  return useQuery({
    queryKey: weeklyScheduleKeys.subjectsByClass(classId),
    queryFn: () => weeklySchedulesApi.getSubjectsByClass(classId),
    enabled: !!classId && classId > 0,
    staleTime: 600000,
  });
};

export const useLessonTopics = (subjectId: number) => {
  return useQuery({
    queryKey: weeklyScheduleKeys.lessonTopics(subjectId),
    queryFn: () => weeklySchedulesApi.getLessonTopics(subjectId),
    enabled: !!subjectId && subjectId > 0,
    staleTime: 600000,
  });
};

export const useCreateWeeklySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WeeklyScheduleDto) => weeklySchedulesApi.create(data),
    
    onSuccess: () => {
      toast.success('Weekly schedule created and daily schedules auto-generated! 🎉');
      queryClient.invalidateQueries({ queryKey: weeklyScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
    
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to create weekly schedule';
      toast.error(message);
      console.error('Weekly schedule creation error:', error);
    },
  });
};

export const useUpdateWeeklySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WeeklyScheduleDto }) => 
      weeklySchedulesApi.update(id, data),
    
    onSuccess: () => {
      toast.success('Weekly schedule updated successfully');
      queryClient.invalidateQueries({ queryKey: weeklyScheduleKeys.all });
    },
    
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to update weekly schedule';
      toast.error(message);
      console.error('Weekly schedule update error:', error);
    },
  });
};

export const useDeleteWeeklySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => weeklySchedulesApi.delete(id),
    
    onSuccess: () => {
      toast.success('Weekly schedule deleted successfully');
      queryClient.invalidateQueries({ queryKey: weeklyScheduleKeys.all });
    },
    
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to delete weekly schedule';
      toast.error(message);
      console.error('Weekly schedule deletion error:', error);
    },
  });
};

export const useRegenerateSchedules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => weeklySchedulesApi.regenerate(id),
    
    onSuccess: () => {
      toast.success('Daily schedules regenerated successfully! 🔄');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
    
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to regenerate schedules';
      toast.error(message);
      console.error('Schedule regeneration error:', error);
    },
  });
};