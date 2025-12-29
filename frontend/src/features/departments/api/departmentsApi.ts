import axios from "../../../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ----------------------------
// 📘 Types
// ----------------------------
export interface DepartmentDto {
  id?: number;
  name: string;
  code: string;
  description?: string;
}

export interface DepartmentResponseDto extends DepartmentDto {
  id: number;
  name: string;
  code: string;
  description: string;
}

// ----------------------------
// ⚙️ Base URL
// ----------------------------
const BASE_URL = "/departments";

// ----------------------------
// 📦 API Functions
// ----------------------------
export const departmentsApi = {
  async getAll(): Promise<DepartmentResponseDto[]> {
    const res = await axios.get(BASE_URL);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },

  async getById(id: number): Promise<DepartmentResponseDto> {
    const res = await axios.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  async create(data: DepartmentDto): Promise<DepartmentResponseDto> {
    const res = await axios.post(BASE_URL, data);
    return res.data;
  },

  async update(id: number, data: DepartmentDto): Promise<DepartmentResponseDto> {
    const res = await axios.put(`${BASE_URL}/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await axios.delete(`${BASE_URL}/${id}`);
  },
};

// ----------------------------
// 🧠 React Query Hooks
// ----------------------------
export const useGetDepartments = () =>
  useQuery({ 
    queryKey: ["departments"], 
    queryFn: departmentsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useGetDepartment = (id: number) =>
  useQuery({
    queryKey: ["department", id],
    queryFn: () => departmentsApi.getById(id),
    enabled: !!id,
  });

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
};

export const useUpdateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DepartmentDto }) =>
      departmentsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: departmentsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
};