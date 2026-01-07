import api from "../../../api/axios";
import { useQuery } from "@tanstack/react-query";

// ----------------------------
// 📘 Types
// ----------------------------
export interface UserDto {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  enabled: boolean;
  phone?: string;
  userType?: string;
  studentType?: string;
  preferredClass?: string;      // ✅ NEW
  preferredDepartment?: string; // ✅ NEW
}

export interface StudentDto {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  studentType?: string;
  classId?: number | null;
  className?: string;
  departmentId?: number | null;
  departmentName?: string;
  subjectIds?: number[];
  subjectNames?: string[];
  chosenLanguage?: string;
  preferredClass?: string;      // ✅ NEW - from registration
  preferredDepartment?: string; // ✅ NEW - from registration
}

export interface CreateUserDto {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  userType?: string;
  studentType?: string;
  preferredClass?: string;      // ✅ NEW
  preferredDepartment?: string; // ✅ NEW
  roles?: string[];
}

export interface UpdateUserDto {
  email?: string;
  fullName?: string;
  password?: string;
  phone?: string;
  userType?: string;
  studentType?: string;
  preferredClass?: string;      // ✅ NEW
  preferredDepartment?: string; // ✅ NEW
  roles?: string[];
}

export interface RoleDto {
  id: number;
  name: string;
  description?: string;
}

// ----------------------------
// ⚙️ API Functions
// ----------------------------
const BASE_URL = "/users";

export const usersApi = {
  getAll: async (): Promise<UserDto[]> => {
    const res = await api.get(BASE_URL);
    return Array.isArray(res.data) ? res.data : [];
  },

  getById: async (id: number): Promise<UserDto> => {
    const res = await api.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  getCurrentUser: async (): Promise<UserDto> => {
    const res = await api.get(`${BASE_URL}/me`);
    return res.data;
  },

  create: async (data: CreateUserDto): Promise<UserDto> => {
    const res = await api.post(BASE_URL, data);
    return res.data;
  },

  update: async (id: number, data: UpdateUserDto): Promise<UserDto> => {
    const res = await api.put(`${BASE_URL}/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE_URL}/${id}`);
  },

  assignRole: async (userId: number, role: string): Promise<void> => {
    await api.put(`${BASE_URL}/${userId}/roles`, null, { params: { role } });
  },

  removeRole: async (userId: number, role: string): Promise<void> => {
    await api.delete(`${BASE_URL}/${userId}/roles`, { params: { role } });
  },

  getRoles: async (id: number): Promise<string[]> => {
    const res = await api.get(`${BASE_URL}/${id}/roles`);
    return Array.isArray(res.data) ? res.data : [];
  },

  getAllRoles: async (): Promise<RoleDto[]> => {
    const res = await api.get("/roles");
    return Array.isArray(res.data) ? res.data : [];
  },

  // ✅ TEACHER ENDPOINTS
  getTeacherStudents: async (): Promise<StudentDto[]> => {
    const res = await api.get(`${BASE_URL}/teacher/students`);
    return Array.isArray(res.data) ? res.data : [];
  },

  getStudentsByClass: async (classId: number): Promise<StudentDto[]> => {
    const res = await api.get(`${BASE_URL}/teacher/classes/${classId}/students`);
    return Array.isArray(res.data) ? res.data : [];
  },
};

// ----------------------------
// 🪝 React Query Hooks
// ----------------------------

export const useGetCurrentUser = () => {
  return useQuery<UserDto, Error>({
    queryKey: ["current-user"],
    queryFn: usersApi.getCurrentUser,
  });
};

export const useGetUsers = () => {
  return useQuery<UserDto[], Error>({
    queryKey: ["users"],
    queryFn: usersApi.getAll,
  });
};

export const useGetUser = (id: number) => {
  return useQuery<UserDto, Error>({
    queryKey: ["user", id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
};

// ✅ Teacher-specific hooks
export const useTeacherStudents = () => {
  return useQuery<StudentDto[], Error>({
    queryKey: ["teacher-students"],
    queryFn: usersApi.getTeacherStudents,
  });
};

export const useStudentsByClass = (classId: number | null) => {
  return useQuery<StudentDto[], Error>({
    queryKey: ["teacher-students", classId],
    queryFn: () => usersApi.getStudentsByClass(classId!),
    enabled: !!classId,
  });
};