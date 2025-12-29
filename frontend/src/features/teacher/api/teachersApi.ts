import axios from "../../../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface TeacherProfileDto {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  departmentId?: number | null;
  departmentName?: string | null;
  specialization?: string;
  subjectIds?: number[];
  assignedClassIds?: number[];
}

const BASE_URL = "/teachers";

export const teachersApi = {
  async getAll(): Promise<TeacherProfileDto[]> {
    const res = await axios.get(BASE_URL);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getByUserId(userId: number): Promise<TeacherProfileDto> {
    const res = await axios.get(`${BASE_URL}/user/${userId}`);
    return res.data;
  },

  async create(data: Partial<TeacherProfileDto>): Promise<TeacherProfileDto> {
    const res = await axios.post(BASE_URL, data);
    return res.data;
  },

  async update(id: number, data: Partial<TeacherProfileDto>): Promise<TeacherProfileDto> {
    const res = await axios.put(`${BASE_URL}/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await axios.delete(`${BASE_URL}/${id}`);
  },

  async assignClasses(id: number, classIds: number[]): Promise<void> {
    await axios.post(`${BASE_URL}/${id}/assign-classes`, classIds);
  },
};

// React Query Hooks
export const useGetTeachers = () =>
  useQuery({
    queryKey: ["teachers"],
    queryFn: teachersApi.getAll,
  });

export const useGetTeacherProfile = (userId: number | undefined) =>
  useQuery({
    queryKey: ["teacher-profile", userId],
    queryFn: () => teachersApi.getByUserId(userId!),
    enabled: !!userId,
  });

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teachersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TeacherProfileDto> }) =>
      teachersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teachersApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teachers"] }),
  });
};