import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentProfilesApi, StudentProfileDto } from "../api/studentProfilesApi";

export const useStudentProfiles = () => {
  const queryClient = useQueryClient();

  const studentProfilesQuery = useQuery<StudentProfileDto[], Error>({
    queryKey: ["studentProfiles"],
    queryFn: () => studentProfilesApi.getAll(),
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const createStudentProfile = useMutation({
    mutationFn: (data: StudentProfileDto) => studentProfilesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfiles"] });
    },
  });

  const updateStudentProfile = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StudentProfileDto> }) =>
      studentProfilesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfiles"] });
    },
  });

  const deleteStudentProfile = useMutation({
    mutationFn: (id: number) => studentProfilesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfiles"] });
    },
  });

  return {
    studentProfilesQuery,
    createStudentProfile,
    updateStudentProfile,
    deleteStudentProfile,
  };
};

/** ✅ Hook to fetch single student profile */
export const useStudentProfile = (userId?: number) =>
  useQuery<StudentProfileDto, Error>({
    queryKey: ["studentProfile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      
      try {
        return await studentProfilesApi.getByUserId(userId);
      } catch (error: any) {
        if (error?.response?.status === 403 || error?.response?.status === 500) {
          const allProfiles = await studentProfilesApi.getAll();
          const userProfile = allProfiles.find(p => p.userId === userId);
          if (!userProfile) {
            throw new Error("Profile not found");
          }
          return userProfile;
        }
        throw error;
      }
    },
    enabled: !!userId,
    retry: false,
  });

/** ✅ Hook to get current user's profile using /me endpoint */
export const useMyProfile = (options?: { enabled?: boolean }) =>
  useQuery<StudentProfileDto, Error>({
    queryKey: ["myProfile"],
    queryFn: () => studentProfilesApi.getMe(),
    retry: false,
    enabled: options?.enabled ?? true, // ✅ Allow disabling the query
  });