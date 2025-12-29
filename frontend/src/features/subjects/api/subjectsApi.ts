import axios from "../../../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SubjectDto {
  id?: number;
  name: string;
  code?: string;
  level?: string;
  grade?: string;
  compulsory?: boolean;
  departmentId?: number | null;
  classId?: number | null;
}

export interface SubjectResponseDto extends SubjectDto {
  id: number;
  name: string;
  code: string;
  level: string;
  grade: string;
  compulsory: boolean;
  departmentId: number | null;
  classId: number | null;
}

const BASE_URL = "/subjects";

function logRequest(label: string, url: string, data?: any) {
  console.log(`📡 API CALL: ${label}`);
  console.log(`URL: ${url}`);
  if (data !== undefined) console.log(`Payload:`, data);
}

function logResponse(label: string, response: any) {
  console.log(`✅ API RESPONSE: ${label}`, response);

  if (Array.isArray(response) && response.length === 0) {
    console.warn(`⚠️ Warning: ${label} returned an empty list`);
  }
}

function logError(label: string, error: any) {
  console.error(`❌ API ERROR: ${label}`, error?.response?.data || error);
}

export const subjectsApi = {
  async getAll(): Promise<SubjectResponseDto[]> {
    const url = BASE_URL;
    logRequest("getAllSubjects", url);

    try {
      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      logResponse("getAllSubjects", data);
      return data;
    } catch (e) {
      logError("getAllSubjects", e);
      throw e;
    }
  },

  async getById(id: number): Promise<SubjectResponseDto> {
    const url = `${BASE_URL}/${id}`;
    logRequest("getById", url);

    try {
      const res = await axios.get(url);
      logResponse("getById", res.data);
      return res.data;
    } catch (e) {
      logError("getById", e);
      throw e;
    }
  },

  // ✅ NEW: Get teacher's assigned subjects
  async getTeacherSubjects(): Promise<SubjectResponseDto[]> {
    const url = `${BASE_URL}/teacher/my-subjects`;
    logRequest("getTeacherSubjects", url);

    try {
      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      logResponse("getTeacherSubjects", data);
      return data;
    } catch (e) {
      logError("getTeacherSubjects", e);
      throw e;
    }
  },

  async create(data: SubjectDto): Promise<SubjectResponseDto> {
    const url = BASE_URL;
    logRequest("createSubject", url, data);

    try {
      const res = await axios.post(url, data);
      logResponse("createSubject", res.data);
      return res.data;
    } catch (e) {
      logError("createSubject", e);
      throw e;
    }
  },

  async update(id: number, data: SubjectDto): Promise<SubjectResponseDto> {
    const url = `${BASE_URL}/${id}`;
    logRequest("updateSubject", url, data);

    try {
      const res = await axios.put(url, data);
      logResponse("updateSubject", res.data);
      return res.data;
    } catch (e) {
      logError("updateSubject", e);
      throw e;
    }
  },

  async delete(id: number): Promise<void> {
    const url = `${BASE_URL}/${id}`;
    logRequest("deleteSubject", url);

    try {
      await axios.delete(url);
      console.log(`🗑️ deleteSubject SUCCESS for ID ${id}`);
    } catch (e) {
      logError("deleteSubject", e);
      throw e;
    }
  },

  async getStudentSubjects(
    classId: number,
    departmentId: number | null,
    studentType: "SCHOOL" | "HOME" | "ASPIRANT"
  ): Promise<SubjectResponseDto[]> {
    const params = new URLSearchParams({
      classId: String(classId),
      studentType,
    });

    if (departmentId) params.append("departmentId", String(departmentId));

    const url = `${BASE_URL}/students?${params.toString()}`;
    logRequest("getStudentSubjects", url);

    try {
      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      logResponse("getStudentSubjects", data);
      return data;
    } catch (e) {
      logError("getStudentSubjects", e);
      throw e;
    }
  },

  async getAspirantAvailableSubjects(departmentId: number | null) {
    const params = departmentId ? `?departmentId=${departmentId}` : "";
    const url = `${BASE_URL}/aspirant/available${params}`;
    logRequest("getAspirantAvailableSubjects", url);

    try {
      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      logResponse("getAspirantAvailableSubjects", data);
      return data;
    } catch (e) {
      logError("getAspirantAvailableSubjects", e);
      throw e;
    }
  },

  async getEnrolledSubjects(): Promise<SubjectResponseDto[]> {
    const url = `${BASE_URL}/enrolled`;
    logRequest("getEnrolledSubjects", url);

    try {
      const res = await axios.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      logResponse("getEnrolledSubjects", data);
      return data;
    } catch (e) {
      logError("getEnrolledSubjects", e);
      throw e;
    }
  },

  async enrollInSubjects(subjectIds: number[]): Promise<void> {
    const url = `${BASE_URL}/enroll`;
    logRequest("enrollInSubjects", url, subjectIds);

    try {
      await axios.post(url, subjectIds);
      console.log("✅ enrollInSubjects SUCCESS");
    } catch (e) {
      logError("enrollInSubjects", e);
      throw e;
    }
  },
};

// HOOKS
export const useGetSubjects = () =>
  useQuery({ queryKey: ["subjects"], queryFn: subjectsApi.getAll });

export const useGetSubject = (id: number) =>
  useQuery({
    queryKey: ["subject", id],
    queryFn: () => subjectsApi.getById(id),
    enabled: !!id,
  });

// ✅ NEW: Hook for teacher's subjects
export const useGetTeacherSubjects = () =>
  useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: subjectsApi.getTeacherSubjects,
  });

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

export const useGetStudentSubjects = (
  classId: number,
  departmentId: number | null,
  studentType: "SCHOOL" | "HOME" | "ASPIRANT"
) =>
  useQuery({
    queryKey: ["student-subjects", classId, departmentId, studentType],
    queryFn: () => subjectsApi.getStudentSubjects(classId, departmentId, studentType),
    enabled: !!classId && !!studentType && studentType !== "ASPIRANT",
  });

export const useGetAspirantAvailableSubjects = (departmentId: number | null) =>
  useQuery({
    queryKey: ["aspirant-available-subjects", departmentId],
    queryFn: () => subjectsApi.getAspirantAvailableSubjects(departmentId),
  });

export const useGetEnrolledSubjects = () =>
  useQuery({
    queryKey: ["enrolled-subjects"],
    queryFn: subjectsApi.getEnrolledSubjects,
  });

export const useEnrollInSubjects = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subjectsApi.enrollInSubjects,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrolled-subjects"] });
      qc.invalidateQueries({ queryKey: ["student-subjects"] });
    },
  });
};