import { useQuery } from "@tanstack/react-query";
import api from "../../../api/axios";

export interface StudentProfileDto {
  id: number;
  userId: number;
  fullName: string;
  studentType: string;
  classId?: number;
  className?: string;
  departmentId?: number;
  departmentName?: string;
  chosenLanguage?: string;
}

export interface TeacherProfileDto {
  id: number;
  userId: number;
  fullName: string;
  departmentId?: number;
  departmentName?: string;
  subjects?: string[];
}

export type UserProfileDto = StudentProfileDto | TeacherProfileDto | null;

const BASE_URL = "/profiles";

export const usersProfilesApi = {
  async getByUserId(userId: number): Promise<UserProfileDto> {
    try {
      const res = await api.get(`${BASE_URL}/user/${userId}`);
      return res.data || null;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },
};

// Hook
export const useUserProfile = (userId: number | null) => {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => usersProfilesApi.getByUserId(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};
