// src/features/lessons/api/lessonTopicsApi.ts
import axios from "../../../api/axios";
import { LessonTopicDto } from "../types/lessonTopicTypes";
import { LessonAIQuestionDto } from "../types/lessonAIQuestionsTypes";

const BASE_URL = "/lesson-topics";

export const lessonTopicsApi = {
  async getAll(subjectId?: number): Promise<LessonTopicDto[]> {
    const params = subjectId ? `?subjectId=${subjectId}` : "";
    const res = await axios.get(`${BASE_URL}${params}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * ✅ NEW: Get lessons for a student by their profile ID
   * 
   * Works for ALL student types:
   * - SCHOOL students
   * - HOME students
   * - ASPIRANT students
   * - INDIVIDUAL students (with their class)
   * 
   * Backend automatically handles:
   * - Getting student's class
   * - Getting class subjects
   * - Filtering by aspirant material flag if ASPIRANT
   */
  async getStudentLessonsByProfileId(studentProfileId: number): Promise<LessonTopicDto[]> {
    const res = await axios.get(`${BASE_URL}/by-student/${studentProfileId}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * ✅ UPDATED: Get lessons for a student filtered by subject
   * 
   * Now also uses studentProfileId for consistency
   */
  async getStudentLessonsBySubject(
    studentProfileId: number,
    subjectId: number
  ): Promise<LessonTopicDto[]> {
    const res = await axios.get(
      `${BASE_URL}/by-student/${studentProfileId}/subject/${subjectId}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * @deprecated Use getStudentLessonsByProfileId instead
   * 
   * Old method for backwards compatibility
   * This method required subjectIds array and studentType string
   */
  async getStudentLessons(
    subjectIds: number[],
    studentType: "SCHOOL" | "HOME" | "ASPIRANT" | "INDIVIDUAL"
  ): Promise<LessonTopicDto[]> {
    if (!subjectIds || subjectIds.length === 0) {
      return [];
    }

    const params = new URLSearchParams();
    subjectIds.forEach(id => params.append("subjectIds", String(id)));
    params.append("studentType", studentType);

    const res = await axios.get(`${BASE_URL}/student?${params.toString()}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getQuestionsForLessons(lessonTopicIds: number[]): Promise<LessonAIQuestionDto[]> {
    if (!lessonTopicIds || lessonTopicIds.length === 0) {
      return [];
    }

    const params = new URLSearchParams();
    lessonTopicIds.forEach(id => params.append("lessonTopicIds", String(id)));

    const res = await axios.get(`${BASE_URL}/questions?${params.toString()}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getById(id: number): Promise<LessonTopicDto> {
    const res = await axios.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  async create(formData: FormData): Promise<LessonTopicDto> {
    const res = await axios.post(BASE_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async update(id: number, formData: FormData): Promise<LessonTopicDto> {
    const res = await axios.put(`${BASE_URL}/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await axios.delete(`${BASE_URL}/${id}`);
  },

  async regenerateAI(id: number): Promise<void> {
    await axios.post(`${BASE_URL}/${id}/regenerate-ai`);
  },

  async getAIStatus(id: number): Promise<any> {
    const res = await axios.get(`${BASE_URL}/${id}/ai-status`);
    return res.data;
  },
};