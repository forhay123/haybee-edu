import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as teacherApi from "../api/teacherProfilesApi";

export const useTeacherProfiles = () => {
  const queryClient = useQueryClient();

  // Fetch all teachers
  const {
    data: teachers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teachers"],
    queryFn: teacherApi.fetchTeacherProfiles,
  });

  // Create teacher
  const createMutation = useMutation({
    mutationFn: teacherApi.createTeacherProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });

  // Update teacher
  const updateMutation = useMutation({
    mutationFn: ({ teacherId, data }: { teacherId: number; data: teacherApi.UpdateTeacherProfileRequest }) =>
      teacherApi.updateTeacherProfile(teacherId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });

  // Delete teacher
  const deleteMutation = useMutation({
    mutationFn: teacherApi.deleteTeacherProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });

  // Assign classes
  const assignClassesMutation = useMutation({
    mutationFn: ({ teacherId, classIds }: { teacherId: number; classIds: number[] }) =>
      teacherApi.assignTeacherToClasses(teacherId, classIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });

  return {
    teachers,
    isLoading,
    error,
    createTeacher: createMutation.mutateAsync,
    updateTeacher: updateMutation.mutateAsync,
    deleteTeacher: deleteMutation.mutateAsync,
    assignClasses: assignClassesMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Fetch single teacher by user ID
export const useTeacherProfile = (userId: number) => {
  return useQuery({
    queryKey: ["teacher", userId],
    queryFn: () => teacherApi.fetchTeacherProfileByUserId(userId),
    enabled: !!userId,
  });
};