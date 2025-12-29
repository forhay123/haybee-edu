import axios from "../../../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ClassDto {
  id?: number;
  name: string;
  level: string;
  studentType?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
}

export interface ClassResponseDto extends ClassDto {
  id: number;
  department?: {
    id: number;
    name: string;
    code?: string;
  };
}

const BASE_URL = "/classes";

export const classesApi = {
  async getAll(): Promise<ClassDto[]> {
    const res = await axios.get(BASE_URL);
    return Array.isArray(res.data) ? res.data : [];
  },

  // ✅ Get teacher's assigned classes
  async getTeacherClasses(): Promise<ClassDto[]> {
    const res = await axios.get(`${BASE_URL}/teacher/my-classes`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getById(id: number): Promise<ClassDto> {
    const res = await axios.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  async getByStudentType(studentType: string): Promise<ClassDto[]> {
    const res = await axios.get(`${BASE_URL}/type/${studentType}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async create(data: ClassDto): Promise<ClassDto> {
    const res = await axios.post(BASE_URL, data);
    return res.data;
  },

  async update(id: number, data: ClassDto): Promise<ClassDto> {
    const res = await axios.put(`${BASE_URL}/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await axios.delete(`${BASE_URL}/${id}`);
  },
};

// React Query Hooks
export const useGetClasses = () =>
  useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

// ✅ Hook for teacher's classes
export const useGetTeacherClasses = () =>
  useQuery({
    queryKey: ["teacher-classes"],
    queryFn: classesApi.getTeacherClasses,
  });

export const useGetClass = (id: number) =>
  useQuery({
    queryKey: ["class", id],
    queryFn: () => classesApi.getById(id),
    enabled: !!id,
  });

export const useGetClassesByType = (studentType: string | undefined) =>
  useQuery({
    queryKey: ["classes", studentType],
    queryFn: () => classesApi.getByStudentType(studentType!),
    enabled: !!studentType,
  });

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClassDto }) =>
      classesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => classesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
};