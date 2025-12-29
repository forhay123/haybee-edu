import axios from "../../../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// ----------------------------
// 📘 Types
// ----------------------------
export interface TermDto {
  id?: number;
  name: string;
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  isActive?: boolean;
  weekCount?: number;
}

export interface TermResponseDto extends TermDto {
  id: number;
  isActive: boolean;
  weekCount: number;
  sessionId?: number;
  sessionName?: string;
}

// ✅ NEW: Current term with calculated week
export interface CurrentTermWithWeekDto extends TermResponseDto {
  currentWeek: number; // Calculated current week number
}

// ----------------------------
// ⚙️ Base URL
// ----------------------------
const BASE_URL = "/terms";

// ----------------------------
// 📦 API Functions
// ----------------------------
export const termsApi = {
  /**
   * Get all terms
   */
  async getAll(): Promise<TermResponseDto[]> {
    const res = await axios.get(BASE_URL);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },

  /**
   * Get the currently active term
   */
  async getActive(): Promise<TermResponseDto> {
    const res = await axios.get(`${BASE_URL}/active`);
    return res.data;
  },

  /**
   * ✅ NEW: Get current term WITH calculated current week
   * This is what AI Questions page should use
   */
  async getCurrentWithWeek(): Promise<CurrentTermWithWeekDto> {
    const res = await axios.get(`${BASE_URL}/current`);
    return res.data;
  },

  /**
   * Get term by ID
   */
  async getById(id: number): Promise<TermResponseDto> {
    const res = await axios.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  /**
   * Create a new term
   */
  async create(data: TermDto): Promise<TermResponseDto> {
    const res = await axios.post(BASE_URL, data);
    return res.data;
  },

  /**
   * Update an existing term
   */
  async update(id: number, data: TermDto): Promise<TermResponseDto> {
    const res = await axios.put(`${BASE_URL}/${id}`, data);
    return res.data;
  },

  /**
   * Set a term as active
   */
  async setActive(id: number): Promise<TermResponseDto> {
    const res = await axios.post(`${BASE_URL}/${id}/activate`);
    return res.data;
  },

  /**
   * Delete a term
   */
  async delete(id: number): Promise<void> {
    await axios.delete(`${BASE_URL}/${id}`);
  },
};

// ----------------------------
// 🧠 React Query Hooks
// ----------------------------

/**
 * Get all terms
 */
export const useGetTerms = () =>
  useQuery({
    queryKey: ["terms"],
    queryFn: termsApi.getAll,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

/**
 * Get the active term
 */
export const useGetActiveTerm = () =>
  useQuery({
    queryKey: ["terms", "active"],
    queryFn: termsApi.getActive,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

/**
 * ✅ NEW: Get current term WITH calculated week
 * Use this for AI Questions to determine current week
 */
export const useGetCurrentTermWithWeek = () =>
  useQuery({
    queryKey: ["terms", "current-with-week"],
    queryFn: termsApi.getCurrentWithWeek,
    staleTime: 5 * 60 * 1000, // 5 minutes (shorter cache for week accuracy)
    retry: 1,
  });

/**
 * Get term by ID
 */
export const useGetTermById = (id: number) =>
  useQuery({
    queryKey: ["terms", id],
    queryFn: () => termsApi.getById(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!id,
  });

/**
 * Create a term
 */
export const useCreateTerm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: termsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      toast.success("✅ Term created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create term");
    },
  });
};

/**
 * Update a term
 */
export const useUpdateTerm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TermDto }) =>
      termsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      toast.success("✅ Term updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update term");
    },
  });
};

/**
 * Set a term as active
 */
export const useSetActiveTerm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: termsApi.setActive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      qc.invalidateQueries({ queryKey: ["terms", "active"] });
      qc.invalidateQueries({ queryKey: ["terms", "current-with-week"] });
      toast.success("✅ Term activated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to activate term");
    },
  });
};

/**
 * Delete a term
 */
export const useDeleteTerm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: termsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      qc.invalidateQueries({ queryKey: ["terms", "active"] });
      qc.invalidateQueries({ queryKey: ["terms", "current-with-week"] });
      toast.success("✅ Term deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete term");
    },
  });
};