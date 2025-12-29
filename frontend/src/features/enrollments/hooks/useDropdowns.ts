import { useQuery } from "@tanstack/react-query";
import { dropdownsApi, StudentDto, ClassDto, SessionDto } from "../api/dropdownsApi";

/**
 * Custom React Query hook that fetches dropdown data for:
 * - Students (from /student-profiles)
 * - Classes (from /classes)
 * - Sessions (from /sessions)
 */
export const useDropdowns = () => {
  const studentsQuery = useQuery<StudentDto[], Error>({
    queryKey: ["students"],
    queryFn: dropdownsApi.getStudents,
  });

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["classes"],
    queryFn: dropdownsApi.getClasses,
  });

  const sessionsQuery = useQuery<SessionDto[], Error>({
    queryKey: ["sessions"],
    queryFn: dropdownsApi.getSessions,
  });

  return { studentsQuery, classesQuery, sessionsQuery };
};

/**
 * ✅ Hook to get classes filtered by student type
 */
export const useClassesByType = (studentType?: string) => {
  return useQuery<ClassDto[], Error>({
    queryKey: ["classes", studentType],
    queryFn: () => dropdownsApi.getClassesByType(studentType!),
    enabled: !!studentType,
  });
};