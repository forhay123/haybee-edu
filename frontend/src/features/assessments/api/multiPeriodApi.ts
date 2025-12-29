/**
 * API functions for multi-period progress tracking
 * ✅ FIXED: Removed /api prefix to match backend routes
 * ✅ FIXED: Handle ApiResponse wrapper from backend
 */

import axios from "../../../api/axios";
import type {
  MultiPeriodSubjectOverview,
  StudentPeriodProgress,
  SystemOverview,
} from "../types/multiPeriodTypes";
import type {
  PeriodProgressDto,
} from "../types/customAssessmentTypes";

// ✅ FIXED: No /api prefix - backend routes don't have it
const BASE_URL = "/individual/multi-period";

// ============================================================
// ⭐ NEW: API Response wrapper type (matches backend)
// ============================================================
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

// ============================================================
// TEACHER - MULTI-PERIOD OVERVIEW
// ============================================================

/**
 * Get teacher's overview of all multi-period subjects
 * Shows all students, their progress, and pending assessments
 * 
 * ✅ FIXED: Extract data from ApiResponse wrapper
 */
export const getTeacherMultiPeriodOverview = async (
  teacherId?: number
): Promise<any> => {
  const url = teacherId
    ? `${BASE_URL}/teacher/overview?teacherId=${teacherId}`
    : `${BASE_URL}/teacher/overview`;

  // ✅ Backend returns: ApiResponse<TeacherMultiPeriodOverview>
  const response = await axios.get<ApiResponse<any>>(url);
  
  // ✅ Extract the actual data from the wrapper
  return response.data.data || response.data;
};

/**
 * Get overview for a specific subject
 */
export const getTeacherSubjectOverview = async (
  subjectId: number,
  teacherId?: number
): Promise<MultiPeriodSubjectOverview> => {
  const url = teacherId
    ? `${BASE_URL}/teacher/subject/${subjectId}?teacherId=${teacherId}`
    : `${BASE_URL}/teacher/subject/${subjectId}`;

  const response = await axios.get<ApiResponse<MultiPeriodSubjectOverview>>(url);
  return response.data.data || response.data;
};

/**
 * Get all periods for a specific student in a subject
 * 
 * ✅ FIXED: Handle ApiResponse wrapper
 */
export const getStudentSubjectPeriods = async (
  studentId: number,
  subjectId: number
): Promise<PeriodProgressDto[]> => {
  const response = await axios.get<ApiResponse<any>>(
    `${BASE_URL}/teacher/students/${studentId}/subjects/${subjectId}/periods`
  );
  
  // ✅ Backend returns: ApiResponse<StudentSubjectPeriodsDto>
  // Extract periods array from the data
  const data = response.data.data || response.data;
  return data.periods || [];
};

/**
 * Get urgent items for teacher (assessments needed today/soon)
 */
export const getTeacherUrgentItems = async (
  teacherId?: number
): Promise<any[]> => {
  const url = teacherId
    ? `${BASE_URL}/teacher/urgent?teacherId=${teacherId}`
    : `${BASE_URL}/teacher/urgent`;

  const response = await axios.get<ApiResponse<any[]>>(url);
  return response.data.data || response.data;
};

// ============================================================
// STUDENT - MY PERIODS
// ============================================================

/**
 * Get all periods for a student in a specific subject
 */
export const getStudentMyPeriods = async (
  subjectId: number
): Promise<PeriodProgressDto[]> => {
  const response = await axios.get<ApiResponse<any>>(
    `${BASE_URL}/student/my-periods/${subjectId}`
  );
  
  const data = response.data.data || response.data;
  return data.periods || [];
};

/**
 * Get student's multi-period overview (all subjects)
 */
export const getStudentOverview = async (): Promise<StudentPeriodProgress[]> => {
  const response = await axios.get<ApiResponse<StudentPeriodProgress[]>>(
    `${BASE_URL}/student/overview`
  );
  return response.data.data || response.data;
};

/**
 * Get next accessible period for student
 */
export const getNextAccessiblePeriod = async (
  subjectId: number
): Promise<PeriodProgressDto | null> => {
  try {
    const response = await axios.get<ApiResponse<PeriodProgressDto>>(
      `${BASE_URL}/student/next-period/${subjectId}`
    );
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Get student's blocked periods (cannot access yet)
 */
export const getStudentBlockedPeriods = async (): Promise<
  PeriodProgressDto[]
> => {
  const response = await axios.get<ApiResponse<PeriodProgressDto[]>>(
    `${BASE_URL}/student/blocked-periods`
  );
  return response.data.data || response.data;
};

// ============================================================
// ADMIN - SYSTEM OVERVIEW
// ============================================================

/**
 * Get system-wide multi-period overview
 * Shows all subjects, completion rates, pending assessments
 */
export const getAdminSystemOverview = async (): Promise<SystemOverview> => {
  const response = await axios.get<ApiResponse<SystemOverview>>(
    `${BASE_URL}/admin/system-overview`
  );
  return response.data.data || response.data;
};

/**
 * Get all students with multi-period progress
 */
export const getAdminAllStudentProgress = async (): Promise<
  StudentPeriodProgress[]
> => {
  const response = await axios.get<ApiResponse<StudentPeriodProgress[]>>(
    `${BASE_URL}/admin/all-students-progress`
  );
  return response.data.data || response.data;
};

/**
 * Get progress for a specific student (admin view)
 */
export const getAdminStudentProgress = async (
  studentId: number
): Promise<StudentPeriodProgress> => {
  const response = await axios.get<ApiResponse<StudentPeriodProgress>>(
    `${BASE_URL}/admin/student/${studentId}/progress`
  );
  return response.data.data || response.data;
};

/**
 * Get multi-period statistics
 */
export const getMultiPeriodStatistics = async (): Promise<any> => {
  const response = await axios.get<ApiResponse<any>>(
    `${BASE_URL}/admin/statistics`
  );
  return response.data.data || response.data;
};

// ============================================================
// PERIOD DEPENDENCY CHECKS
// ============================================================

/**
 * Check if student can access a specific period
 */
export const checkPeriodAccess = async (
  progressId: number
): Promise<any> => {
  const response = await axios.get(
    `/progress/${progressId}/can-access`
  );
  // This endpoint might not use ApiResponse wrapper
  return response.data;
};

/**
 * Get dependency chain for a period
 */
export const getPeriodDependencyChain = async (
  progressId: number
): Promise<any> => {
  const response = await axios.get(
    `/progress/${progressId}/dependency-chain`
  );
  return response.data;
};

/**
 * Validate period sequence setup
 */
export const validatePeriodSequence = async (
  studentId: number,
  subjectId: number,
  topicId: number
): Promise<any> => {
  const response = await axios.get(
    `/progress/validate-sequence?studentId=${studentId}&subjectId=${subjectId}&topicId=${topicId}`
  );
  return response.data;
};

// ============================================================
// PROGRESS TRACKING
// ============================================================

/**
 * Get completion percentage for a student in a subject
 */
export const getSubjectCompletionPercentage = async (
  studentId: number,
  subjectId: number
): Promise<number> => {
  const response = await axios.get<ApiResponse<number>>(
    `${BASE_URL}/completion/${studentId}/${subjectId}`
  );
  return response.data.data || response.data;
};

/**
 * Get average score across all periods
 */
export const getAverageScoreAcrossPeriods = async (
  studentId: number,
  subjectId: number
): Promise<number> => {
  const response = await axios.get<ApiResponse<number>>(
    `${BASE_URL}/average-score/${studentId}/${subjectId}`
  );
  return response.data.data || response.data;
};

/**
 * Get period timeline for visualization
 */
export const getPeriodTimeline = async (
  studentId: number,
  subjectId: number
): Promise<any> => {
  const response = await axios.get<ApiResponse<any>>(
    `${BASE_URL}/timeline/${studentId}/${subjectId}`
  );
  return response.data.data || response.data;
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export const getPeriodStatusDisplay = (status: string): {
  label: string;
  color: string;
  icon: string;
} => {
  const statusMap: Record<
    string,
    { label: string; color: string; icon: string }
  > = {
    COMPLETED: { label: "Completed", color: "green", icon: "✓" },
    AVAILABLE: { label: "Available", color: "blue", icon: "▶" },
    WAITING_ASSESSMENT: { label: "Waiting for Assessment", color: "orange", icon: "⏳" },
    LOCKED: { label: "Locked", color: "gray", icon: "🔒" },
    SCHEDULED: { label: "Scheduled", color: "purple", icon: "📅" },
    WINDOW_CLOSED: { label: "Window Closed", color: "red", icon: "⏰" },
  };

  return statusMap[status] || {
    label: "Unknown",
    color: "gray",
    icon: "?",
  };
};

export const getDaysUntilScheduled = (scheduledDate: string): number => {
  const today = new Date();
  const scheduled = new Date(scheduledDate);
  return Math.ceil(
    (scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
};

export const formatPeriodLabel = (
  periodNumber: number,
  totalPeriods: number
): string => {
  return `Period ${periodNumber} of ${totalPeriods}`;
};

export const isPeriodActionable = (period: PeriodProgressDto): boolean => {
  return period.canAccess && period.status === "AVAILABLE" && !period.completedAt;
};

export const getNextActionText = (period: PeriodProgressDto): string => {
  if (period.completedAt) return "View Results";
  if (!period.canAccess) return period.blockingReason || "Not Available";
  if (period.status === "AVAILABLE") return "Start Assessment";
  if (period.status === "WAITING_ASSESSMENT") return "Waiting for Teacher";
  return "View Details";
};

export const calculateOverallProgress = (
  periods: PeriodProgressDto[]
): number => {
  if (periods.length === 0) return 0;
  const completed = periods.filter(p => p.completedAt).length;
  return Math.round((completed / periods.length) * 100);
};

export const groupPeriodsByStatus = (
  periods: PeriodProgressDto[]
): Record<string, PeriodProgressDto[]> => {
  return periods.reduce((acc, period) => {
    const status = period.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(period);
    return acc;
  }, {} as Record<string, PeriodProgressDto[]>);
};

export const sortPeriodsBySequence = (
  periods: PeriodProgressDto[]
): PeriodProgressDto[] => {
  return [...periods].sort(
    (a, b) => (a.periodNumber || 0) - (b.periodNumber || 0)
  );
};