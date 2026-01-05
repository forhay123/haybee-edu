import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/api/axios";
import { StudentHealthData } from "../../types/individualTypes";

/**
 * Fetch health check data for a single student
 */
export const useStudentHealth = (studentId: number | null) => {
  return useQuery({
    queryKey: ["student-health", studentId],
    queryFn: async (): Promise<StudentHealthData> => {
      if (!studentId) {
        throw new Error("Student ID is required");
      }
      
      const response = await axiosInstance.get(
        `/admin/maintenance/progress/student/${studentId}/health`
      );
      return response.data;
    },
    enabled: !!studentId,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
};

/**
 * Batch hook for multiple students
 */
export const useMultipleStudentHealth = (studentIds: number[]) => {
  return useQuery({
    queryKey: ["multiple-student-health", studentIds],
    queryFn: async () => {
      const promises = studentIds.map((id) =>
        axiosInstance.get(`/admin/maintenance/progress/student/${id}/health`)
      );
      
      const results = await Promise.all(promises);
      
      // Create a map of studentId -> health data
      const healthMap: Record<number, StudentHealthData> = {};
      results.forEach((response, index) => {
        healthMap[studentIds[index]] = response.data;
      });
      
      return healthMap;
    },
    enabled: studentIds.length > 0,
    staleTime: 30000,
    retry: 1,
  });
};