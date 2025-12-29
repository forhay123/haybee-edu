import axios from "../../../api/axios";

// 🔹 DTOs that match your backend data structures
export interface StudentDto {
  id: number;
  fullName: string;
  userId?: number;
  studentType?: "SCHOOL" | "HOME" | "ASPIRANT" | "INDIVIDUAL";
  className?: string;
  departmentName?: string;
}

export interface ClassDto {
  id: number;
  name: string;
  level?: string;
  studentType?: string;
  departmentId?: number;
}

export interface SessionDto {
  id: number;
  name: string;
  active?: boolean;
}

export const dropdownsApi = {
  /** 🧍 Fetch all student profiles (ADMIN only) */
  getStudents: async (): Promise<StudentDto[]> => {
    const res = await axios.get(`/student-profiles`);
    // the controller returns List<StudentProfileDto>
    return Array.isArray(res.data) ? res.data : [];
  },

  /** 🏫 Fetch all classes */
  getClasses: async (): Promise<ClassDto[]> => {
    const res = await axios.get(`/classes`);
    return Array.isArray(res.data) ? res.data : [];
  },

  /** 🏫 Fetch classes by student type */
  getClassesByType: async (studentType: string): Promise<ClassDto[]> => {
    const res = await axios.get(`/classes/type/${studentType}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  /** 📆 Fetch all sessions */
  getSessions: async (): Promise<SessionDto[]> => {
    const res = await axios.get(`/sessions`);
    return Array.isArray(res.data) ? res.data : [];
  },
};