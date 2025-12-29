import { useQuery } from "@tanstack/react-query";
import axios from "../../../api/axios";

// ----------------------------
// 📘 Types
// ----------------------------
export interface StudentDto {
  id: number;
  fullName: string;
  email: string;
  roles?: string[];
  studentType?: "SCHOOL" | "HOME" | "ASPIRANT";
  className?: string;
  departmentName?: string;
}

export interface ClassDto {
  id: number;
  name: string;
  level: string;
  studentType: string;
  departmentId?: number;
  departmentName?: string;
}

export interface DepartmentDto {
  id: number;
  name: string;
  code: string;
  description?: string;
}

// ----------------------------
// ⚙️ API Functions
// ----------------------------
const usersUrl = "/users";
const classesUrl = "/classes";
const departmentsUrl = "/departments";

export const dropdownsApi = {
  getStudents: async (): Promise<StudentDto[]> => {
    const res = await axios.get(usersUrl);
    return Array.isArray(res.data) 
      ? res.data.filter((u: any) => u.roles?.includes("STUDENT")) 
      : [];
  },

  getClasses: async (): Promise<ClassDto[]> => {
    const res = await axios.get(classesUrl);
    return Array.isArray(res.data) ? res.data : [];
  },

  // ✅ FIXED: This should work with backend endpoint /classes/type/{studentType}
  getClassesByType: async (studentType: string): Promise<ClassDto[]> => {
    const res = await axios.get(`${classesUrl}/type/${studentType}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  getDepartments: async (): Promise<DepartmentDto[]> => {
    const res = await axios.get(departmentsUrl);
    return Array.isArray(res.data) ? res.data : [];
  },
};

export const useDropdowns = () => {
  const studentsQuery = useQuery<StudentDto[], Error>({
    queryKey: ["students"],
    queryFn: dropdownsApi.getStudents,
  });

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["classes"],
    queryFn: dropdownsApi.getClasses,
  });

  const departmentsQuery = useQuery<DepartmentDto[], Error>({
    queryKey: ["departments"],
    queryFn: dropdownsApi.getDepartments,
  });

  return { studentsQuery, classesQuery, departmentsQuery };
};

// ✅ Hook to get classes filtered by student type
export const useClassesByType = (studentType: string | undefined) => {
  return useQuery<ClassDto[], Error>({
    queryKey: ["classes", studentType],
    queryFn: () => dropdownsApi.getClassesByType(studentType!),
    enabled: !!studentType,
    // ✅ Add retry and error handling
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};