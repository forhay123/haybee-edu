import axios from "../../../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ----------------------------
// 📘 Types
// ----------------------------
export interface SessionDto {
  id?: number;
  name: string;
}

export interface SessionResponseDto extends SessionDto {
  id: number;
  name: string;
}

// ----------------------------
// ⚙️ Base URL
// ----------------------------
const BASE_URL = "/sessions";

// ----------------------------
// 📦 API Functions
// ----------------------------
export const sessionsApi = {
  async getAll(): Promise<SessionResponseDto[]> {
    const res = await axios.get(BASE_URL);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },

  async getById(id: number): Promise<SessionResponseDto> {
    const res = await axios.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  async create(data: SessionDto): Promise<SessionResponseDto> {
    const res = await axios.post(BASE_URL, data);
    return res.data;
  },

  async update(id: number, data: SessionDto): Promise<SessionResponseDto> {
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
export const useGetSessions = () =>
  useQuery({ 
    queryKey: ["sessions"], 
    queryFn: sessionsApi.getAll,
    staleTime: 10 * 60 * 1000, // 10 minutes - sessions don't change often
  });

export const useGetSession = (id: number) =>
  useQuery({
    queryKey: ["session", id],
    queryFn: () => sessionsApi.getById(id),
    enabled: !!id,
  });

export const useCreateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
};

export const useUpdateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SessionDto }) =>
      sessionsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
};

export const useDeleteSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
};