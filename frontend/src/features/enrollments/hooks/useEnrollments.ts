import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enrollmentsApi, EnrollmentDto } from "../api/enrollmentsApi";
import { useAuth } from "../../auth/useAuth";

export const useEnrollments = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user has ADMIN role
  const isAdmin = user?.roles?.some(role => 
    role.toUpperCase() === "ADMIN" || role.toUpperCase() === "ROLE_ADMIN"
  );

  // Check if user has STUDENT role
  const isStudent = user?.roles?.some(role => 
    role.toUpperCase() === "STUDENT" || role.toUpperCase() === "ROLE_STUDENT"
  );

  // ✅ Only fetch all enrollments if user is ADMIN
  const allEnrollmentsQuery = useQuery<EnrollmentDto[], Error>({
    queryKey: ["allEnrollments"],
    queryFn: enrollmentsApi.getAll,
    enabled: !!isAdmin, // Only run if user is admin
    retry: false, // Don't retry on 403/500 errors
  });

  // ✅ Only fetch student's enrollments if user is STUDENT
  const myEnrollmentsQuery = useQuery<EnrollmentDto[], Error>({
    queryKey: ["myEnrollments"],
    queryFn: enrollmentsApi.getMyEnrollments,
    enabled: !!isStudent, // Only run if user is student
    retry: false, // Don't retry on 403/500 errors
  });

  // ✅ Create new enrollment (admin only)
  const createEnrollment = useMutation<EnrollmentDto, Error, Partial<EnrollmentDto>>({
    mutationFn: enrollmentsApi.createEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEnrollments"] });
      queryClient.invalidateQueries({ queryKey: ["myEnrollments"] });
    },
  });

  // ✅ Deactivate enrollment (admin only)
  const deactivateEnrollment = useMutation<void, Error, number>({
    mutationFn: enrollmentsApi.deactivateEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEnrollments"] });
      queryClient.invalidateQueries({ queryKey: ["myEnrollments"] });
    },
  });

  // ✅ Delete enrollment (admin only)
  const deleteEnrollment = useMutation<void, Error, number>({
    mutationFn: enrollmentsApi.deleteEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEnrollments"] });
      queryClient.invalidateQueries({ queryKey: ["myEnrollments"] });
    },
  });

  return { 
    allEnrollmentsQuery, 
    myEnrollmentsQuery, 
    createEnrollment, 
    deactivateEnrollment,
    deleteEnrollment,
    isAdmin,
    isStudent,
  };
};