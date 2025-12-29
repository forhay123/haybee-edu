// src/features/subjects/hooks/useSubjects.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectsApi, SubjectDto } from "../api/subjectsApi";

// -----------------------
// ADMIN - Get all subjects
// -----------------------
export const useGetSubjects = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ["subjects"],
    queryFn: subjectsApi.getAll,
    enabled: options?.enabled ?? false,   // ❗ default FALSE
  });

// -----------------------
// Get subject by ID
// -----------------------
export const useGetSubject = (id: number) =>
  useQuery({
    queryKey: ["subject", id],
    queryFn: () => subjectsApi.getById(id),
    enabled: !!id,
  });

// -----------------------
// TEACHER - Assigned subjects
// -----------------------
export const useTeacherSubjects = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: subjectsApi.getTeacherSubjects,
    enabled: options?.enabled ?? false,  // ❗ default FALSE
  });

// -----------------------
// STUDENT - Class subjects (SCHOOL/HOME)
// -----------------------
export const useGetStudentSubjects = (
  classId: number | null,
  departmentId: number | null,
  studentType: "SCHOOL" | "HOME" | "ASPIRANT" | null,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: ["student-subjects", classId, departmentId, studentType],
    queryFn: () =>
      subjectsApi.getStudentSubjects(
        classId!,
        departmentId,
        studentType as "SCHOOL" | "HOME" | "ASPIRANT"
      ),
    enabled:
      !!classId &&
      !!studentType &&
      studentType !== "ASPIRANT" &&
      (options?.enabled ?? false),
  });

// -----------------------
// STUDENT - Aspirant enrolled subjects
// -----------------------
export const useGetEnrolledSubjects = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ["enrolled-subjects"],
    queryFn: subjectsApi.getEnrolledSubjects,
    enabled: options?.enabled ?? false,
  });

// -----------------------
// (Optional) aspirant available subjects
// -----------------------
export const useGetAspirantAvailableSubjects = (
  departmentId: number | null,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: ["aspirant-available-subjects", departmentId],
    queryFn: () => subjectsApi.getAspirantAvailableSubjects(departmentId),
    enabled: options?.enabled ?? false,
  });

// -----------------------
// Mutations
// -----------------------
export const useCreateSubject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
};

export const useUpdateSubject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubjectDto }) =>
      subjectsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
};

export const useDeleteSubject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subjectsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
};
