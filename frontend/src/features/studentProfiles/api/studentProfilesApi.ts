import axios from "../../../api/axios";

export interface StudentProfileDto {
  id?: number;
  userId: number;
  fullName?: string;
  studentType: "SCHOOL" | "HOME" | "ASPIRANT" | "INDIVIDUAL";
  classId?: number | null;
  className?: string;
  departmentId?: number | null;
  departmentName?: string;
  // For ASPIRANT enrolled subjects
  subjectIds?: number[];
  subjectNames?: string[];
  chosenLanguage?: string;
}

const BASE_URL = "/student-profiles";

export const studentProfilesApi = {
  getAll: async (): Promise<StudentProfileDto[]> => {
    const res = await axios.get(BASE_URL);
    return Array.isArray(res.data) ? res.data : [];
  },

  getByUserId: async (userId: number): Promise<StudentProfileDto> => {
    const res = await axios.get(`${BASE_URL}/user/${userId}`);
    return res.data;
  },

  getMe: async (): Promise<StudentProfileDto> => {
    const res = await axios.get(`${BASE_URL}/me`);
    return res.data;
  },

  create: async (data: StudentProfileDto): Promise<StudentProfileDto> => {
    const res = await axios.post(BASE_URL, data);
    return res.data;
  },

  update: async (id: number, data: Partial<StudentProfileDto>): Promise<StudentProfileDto> => {
    const res = await axios.put(`${BASE_URL}/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await axios.delete(`${BASE_URL}/${id}`);
  },
};