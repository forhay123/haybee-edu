// ============================================================
// API - src/features/teacherProfiles/api/teacherProfilesApi.ts
// ============================================================
import api from "../../../api/axios";

export interface TeacherProfile {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  departmentId: number;
  departmentName: string;
  specialization: string; // Keep for backward compatibility, or change to subjectIds: number[]
  subjectIds?: number[]; // Array of subject IDs the teacher can teach
  assignedClassIds?: number[];
}

export interface CreateTeacherProfileRequest {
  userId: number;
  departmentId: number;
  subjectIds: number[]; // Changed from specialization string to array of subject IDs
}

export interface UpdateTeacherProfileRequest {
  departmentId?: number;
  subjectIds?: number[]; // Changed from specialization string to array of subject IDs
}

/**
 * Fetch all teacher profiles
 */
export const fetchTeacherProfiles = async (): Promise<TeacherProfile[]> => {
  const response = await api.get("/teachers");
  return response.data;
};

/**
 * Fetch teacher profile by user ID
 */
export const fetchTeacherProfileByUserId = async (userId: number): Promise<TeacherProfile> => {
  const response = await api.get(`/teachers/${userId}`);
  return response.data;
};

/**
 * Create a new teacher profile
 */
export const createTeacherProfile = async (
  data: CreateTeacherProfileRequest
): Promise<TeacherProfile> => {
  const response = await api.post("/teachers", data);
  return response.data;
};

/**
 * Update teacher profile
 */
export const updateTeacherProfile = async (
  teacherId: number,
  data: UpdateTeacherProfileRequest
): Promise<TeacherProfile> => {
  const response = await api.put(`/teachers/${teacherId}`, data);
  return response.data;
};

/**
 * Delete teacher profile
 */
export const deleteTeacherProfile = async (teacherId: number): Promise<void> => {
  await api.delete(`/teachers/${teacherId}`);
};

/**
 * Assign teacher to classes
 */
export const assignTeacherToClasses = async (
  teacherId: number,
  classIds: number[]
): Promise<void> => {
  await api.post(`/teachers/${teacherId}/assign-classes`, { classIds });
};