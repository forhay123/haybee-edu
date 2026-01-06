// frontend/src/features/individual/api/individualApi.ts

import axios from "../../../api/axios";
import {
  TimetableUploadRequest,
  TimetableUploadResponse,
  SchemeUploadRequest,
  SchemeUploadResponse,
  IndividualTimetableDto,
  IndividualSchemeDto,
  IndividualLessonTopicDto,
  IndividualStudentOverview,
  IndividualDailyScheduleDto,
  TimetableSystemStatsDto,
  BulkOperationResultDto,
  ManualTimetableCreationRequest,
  ManualTimetableCreationResponse,
  SubjectOption,  // ← ADDED
} from "../types/individualTypes";

const BASE_URL = "/individual";

// ============================================================
// STUDENT & ADMIN: TIMETABLE API
// ============================================================

/**
 * Timetable API (Student + Admin upload/view)
 */
export const timetableApi = {
  /**
   * ✅ UPDATED: Upload timetable file with uploadType support
   */
  upload: async (
    file: File,
    request: TimetableUploadRequest & { uploadType?: "file" | "camera" }, // ✅ Add uploadType
    onProgress?: (percentage: number) => void
  ): Promise<TimetableUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentProfileId", request.studentProfileId.toString());
    
    // ✅ Include classId if provided
    if (request.classId) {
      formData.append("classId", request.classId.toString());
    }
    
    // ✅ Include uploadType (default to "file")
    formData.append("uploadType", request.uploadType || "file");
    
    if (request.termId) {
      formData.append("termId", request.termId.toString());
    }
    if (request.academicYear) {
      formData.append("academicYear", request.academicYear);
    }

    const res = await axios.post(
      `${BASE_URL}/timetable/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentage);
          }
        },
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Convenience method for camera uploads
   */
  uploadFromCamera: async (
    file: File,
    studentProfileId: number,
    classId: number,
    onProgress?: (percentage: number) => void
  ): Promise<TimetableUploadResponse> => {
    return timetableApi.upload(
      file,
      {
        studentProfileId,
        classId,
        academicYear: "2024/2025",
        uploadType: "camera", // ✅ Explicitly set as camera
      },
      onProgress
    );
  },
  /**
   * Get timetable by ID
   */
  getById: async (id: number): Promise<IndividualTimetableDto> => {
    const res = await axios.get(`${BASE_URL}/timetable/${id}`);
    return res.data;
  },

  /**
   * Get all timetables for a student
   */
  getByStudent: async (
    studentProfileId: number
  ): Promise<IndividualTimetableDto[]> => {
    const res = await axios.get(
      `${BASE_URL}/timetable/student/${studentProfileId}`
    );
    return res.data;
  },

  /**
   * Get latest timetable for a student
   */
  getLatest: async (
    studentProfileId: number
  ): Promise<IndividualTimetableDto | null> => {
    try {
      const res = await axios.get(
        `${BASE_URL}/timetable/student/${studentProfileId}/latest`
      );
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Delete timetable
   */
  delete: async (id: number): Promise<void> => {
    await axios.delete(`${BASE_URL}/timetable/${id}`);
  },

  /**
   * Get timetable entries
   */
  getEntries: async (id: number): Promise<any[]> => {
    const res = await axios.get(`${BASE_URL}/timetable/${id}/entries`);
    return res.data;
  },
};

// ============================================================
// ADMIN ONLY: SYSTEM-WIDE TIMETABLE OPERATIONS
// ============================================================

/**
 * Admin Timetable API (System-wide operations)
 */
export const adminTimetableApi = {
  /**
   * Get all timetables across all students
   */
  getAllTimetables: async (): Promise<IndividualTimetableDto[]> => {
    const res = await axios.get(`${BASE_URL}/timetable/admin/all`);
    return res.data;
  },

  /**
   * Get timetables filtered by processing status
   */
  getTimetablesByStatus: async (
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  ): Promise<IndividualTimetableDto[]> => {
    const res = await axios.get(`${BASE_URL}/timetable/admin/filter`, {
      params: { status },
    });
    return res.data;
  },

  /**
   * Get system-wide statistics
   */
  getSystemStats: async (): Promise<TimetableSystemStatsDto> => {
    const res = await axios.get(`${BASE_URL}/timetable/admin/stats`);
    return res.data;
  },

  /**
   * Bulk delete timetables
   */
  bulkDelete: async (timetableIds: number[]): Promise<BulkOperationResultDto> => {
    const res = await axios.delete(`${BASE_URL}/timetable/admin/bulk`, {
      data: timetableIds,
    });
    return res.data;
  },

  /**
   * Reprocess a failed timetable
   */
  reprocessTimetable: async (timetableId: number): Promise<void> => {
    await axios.post(`${BASE_URL}/timetable/admin/${timetableId}/reprocess`);
  },

  /**
   * Update subject mapping for a timetable entry
   */
  updateSubjectMapping: async (
    timetableId: number,
    entryIndex: number,
    subjectId: number
  ): Promise<void> => {
    await axios.put(
      `${BASE_URL}/timetable/admin/${timetableId}/mapping`,
      null,
      {
        params: { entryIndex, subjectId },
      }
    );
  },
};

// ============================================================
// TEACHER ONLY: ASSIGNED STUDENTS TIMETABLES
// ============================================================

/**
 * Teacher Timetable API (Assigned students only)
 */
export const teacherTimetableApi = {
  /**
   * Get timetables for all assigned students
   */
  getMyStudentsTimetables: async (): Promise<IndividualTimetableDto[]> => {
    const res = await axios.get(`${BASE_URL}/timetable/teacher/my-students`);
    return res.data;
  },

  /**
   * Get timetable for a specific assigned student
   */
  getStudentTimetable: async (
    studentProfileId: number
  ): Promise<IndividualTimetableDto | null> => {
    try {
      const res = await axios.get(
        `${BASE_URL}/timetable/teacher/student/${studentProfileId}`
      );
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

// ============================================================
// SCHEME API (Existing)
// ============================================================

/**
 * Scheme API
 */
export const schemeApi = {
  /**
   * Upload scheme file
   */
  upload: async (
    file: File,
    request: SchemeUploadRequest,
    onProgress?: (percentage: number) => void
  ): Promise<SchemeUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentProfileId", request.studentProfileId.toString());
    formData.append("subjectId", request.subjectId.toString());
    
    if (request.termId) {
      formData.append("termId", request.termId.toString());
    }
    if (request.academicYear) {
      formData.append("academicYear", request.academicYear);
    }

    const res = await axios.post(
      `${BASE_URL}/scheme/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentage);
          }
        },
      }
    );
    return res.data;
  },

  /**
   * Get scheme by ID
   */
  getById: async (id: number): Promise<IndividualSchemeDto> => {
    const res = await axios.get(`${BASE_URL}/scheme/${id}`);
    return res.data;
  },

  /**
   * Get all schemes for a student
   */
  getByStudent: async (
    studentProfileId: number
  ): Promise<IndividualSchemeDto[]> => {
    const res = await axios.get(
      `${BASE_URL}/scheme/student/${studentProfileId}`
    );
    return res.data;
  },

  /**
   * Get schemes for a student and subject
   */
  getByStudentAndSubject: async (
    studentProfileId: number,
    subjectId: number
  ): Promise<IndividualSchemeDto[]> => {
    const res = await axios.get(
      `${BASE_URL}/scheme/student/${studentProfileId}/subject/${subjectId}`
    );
    return res.data;
  },

  /**
   * Get latest scheme for a student and subject
   */
  getLatest: async (
    studentProfileId: number,
    subjectId: number
  ): Promise<IndividualSchemeDto | null> => {
    try {
      const res = await axios.get(
        `${BASE_URL}/scheme/student/${studentProfileId}/subject/${subjectId}/latest`
      );
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Delete scheme
   */
  delete: async (id: number): Promise<void> => {
    await axios.delete(`${BASE_URL}/scheme/${id}`);
  },
};



/**
 * Manual Subject Selection API
 * For students who want to choose subjects instead of uploading timetable
 */
export const manualSubjectApi = {
  /**
   * Get available subjects for a student based on their class/department
   * 
   * @param studentProfileId - Student's profile ID
   * @param classId - Optional class ID override
   * @returns List of subjects available for selection
   */
  getAvailableSubjects: async (
    studentProfileId: number,
    classId?: number
  ): Promise<SubjectOption[]> => {
    const res = await axios.get(
      `${BASE_URL}/manual-selection/student/${studentProfileId}/available-subjects`,
      {
        params: classId ? { classId } : undefined
      }
    );
    return res.data;
  },

  /**
   * Create a manual timetable from selected subjects
   * Generates virtual timetable and weekly schedules
   * 
   * @param request - Contains studentProfileId and selected subject IDs
   * @returns Response with created timetable and schedule info
   */
  createManualTimetable: async (
    request: ManualTimetableCreationRequest
  ): Promise<ManualTimetableCreationResponse> => {
    const res = await axios.post(
      `${BASE_URL}/manual-selection/create`,
      request
    );
    return res.data;
  },
};


// ============================================================
// STUDENT OVERVIEW API
// ============================================================

/**
 * Student Overview API
 */
export const studentApi = {
  /**
   * Get overview of all uploads and stats
   */
  getOverview: async (
    studentProfileId: number
  ): Promise<IndividualStudentOverview> => {
    const res = await axios.get(
      `${BASE_URL}/student/${studentProfileId}/overview`
    );
    return res.data;
  },
};

// ============================================================
// LESSON TOPICS API
// ============================================================

/**
 * Lesson Topics API (for INDIVIDUAL students)
 */
export const lessonTopicApi = {
  /**
   * Get all lesson topics for a student
   */
  getByStudent: async (
    studentProfileId: number
  ): Promise<IndividualLessonTopicDto[]> => {
    const res = await axios.get(
      `/lesson-topics/individual/student/${studentProfileId}`
    );
    return res.data;
  },

  /**
   * Get lesson topics for a student and subject
   */
  getByStudentAndSubject: async (
    studentProfileId: number,
    subjectId: number
  ): Promise<IndividualLessonTopicDto[]> => {
    const res = await axios.get(
      `/lesson-topics/individual/student/${studentProfileId}/subject/${subjectId}`
    );
    return res.data;
  },
};

// ============================================================
// SCHEDULE API
// ============================================================

/**
 * Schedule API (for INDIVIDUAL students)
 */
export const scheduleApi = {
  /**
   * Get daily schedule for a specific date
   */
  getByDate: async (
    studentProfileId: number,
    date: string // ISO date format (YYYY-MM-DD)
  ): Promise<IndividualDailyScheduleDto[]> => {
    const res = await axios.get(
      `/daily-schedules/individual/student/${studentProfileId}`,
      {
        params: { date },
      }
    );
    return res.data;
  },

  /**
   * Get schedules for a date range
   */
  getByDateRange: async (
    studentProfileId: number,
    startDate: string,
    endDate: string
  ): Promise<IndividualDailyScheduleDto[]> => {
    const res = await axios.get(
      `/daily-schedules/individual/student/${studentProfileId}/range`,
      {
        params: { startDate, endDate },
      }
    );
    return res.data;
  },
};