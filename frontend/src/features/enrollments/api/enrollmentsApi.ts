import axios from "../../../api/axios";

// ✅ Enrollment Data Transfer Object
export interface EnrollmentDto {
  id: number;
  studentProfileId: number;
  studentName?: string;
  studentType?: "SCHOOL" | "HOME" | "ASPIRANT" | "INDIVIDUAL";
  classEntityId: number;
  className?: string;
  sessionId: number;
  sessionName?: string;
  active: boolean;
  enrolledOn?: string;
}

// ✅ Base path (appended to axios baseURL, which already has /api/v1)
const BASE_URL = "/enrollments";

export const enrollmentsApi = {
  /** 🔹 Get all enrollments (admin only) */
  getAll: async (): Promise<EnrollmentDto[]> => {
    const res = await axios.get<EnrollmentDto[]>(BASE_URL);
    return res.data;
  },

  /** 🔹 Get all enrollments by a specific student (admin use) */
  getAllByStudent: async (studentId: number): Promise<EnrollmentDto[]> => {
    const res = await axios.get<EnrollmentDto[]>(`${BASE_URL}/student/${studentId}`);
    return res.data;
  },

  /** 🔹 Get currently authenticated student's enrollments */
  getMyEnrollments: async (): Promise<EnrollmentDto[]> => {
    const res = await axios.get<EnrollmentDto[]>(`${BASE_URL}/student/me`);
    return res.data;
  },

  /** 🔹 Create a new enrollment (admin only) */
  createEnrollment: async (data: Partial<EnrollmentDto>): Promise<EnrollmentDto> => {
    const res = await axios.post<EnrollmentDto>(BASE_URL, data);
    return res.data;
  },

  /** 🔹 Deactivate an enrollment (admin only) */
  deactivateEnrollment: async (id: number): Promise<void> => {
    await axios.put(`${BASE_URL}/${id}/deactivate`);
  },

  /** 🔹 Delete an enrollment (admin only) */
  deleteEnrollment: async (id: number): Promise<void> => {
    await axios.delete(`${BASE_URL}/${id}`);
  },
};