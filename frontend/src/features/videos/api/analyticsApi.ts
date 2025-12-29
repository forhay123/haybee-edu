// ===== src/api/analyticsApi.ts =====
import axios from '@/api/axios';

const BASE_URL = '/video-analytics';

// ===== Analytics DTOs =====
export interface TeacherAnalyticsOverview {
  totalVideos: number;
  publishedVideos: number;
  processingVideos: number;
  totalViews: number;
  totalWatchTimeHours: number;
  averageCompletionRate: number;
  uniqueStudents: number;
  completedViews: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface VideoStatistics {
  videoId: number;
  title: string;
  totalViews: number;
  uniqueViewers: number;
  completedViews: number;
  averageCompletionRate: number;
  totalWatchTimeHours: number;
  averageWatchTimeMinutes: number;
  durationMinutes: number;
  uploadDate: string;
}

export interface VideoWatchData {
  videoId: number;
  completionDistribution: {
    '0-25%': number;
    '25-50%': number;
    '50-75%': number;
    '75-100%': number;
  };
  recentWatches: Array<{
    studentName: string;
    watchedAt: string;
    completionPercentage: number;
    completed: boolean;
  }>;
  totalSessions: number;
}

export interface SubjectEngagement {
  subjectId: number;
  subjectName: string;
  totalVideos: number;
  publishedVideos: number;
  totalViews: number;
  uniqueStudents: number;
  averageCompletionRate: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface TopVideo {
  videoId: number;
  title: string;
  subjectName: string;
  views: number;
  averageCompletionRate: number;
  uploadDate: string;
  youtubeUrl: string;
}

export interface StudentProgress {
  totalWatched: number;
  completedVideos: number;
  inProgressVideos: number;
  averageCompletionRate: number;
  subjectId: string | number;
}

export interface StudentWatchTime {
  totalWatchTimeHours: number;
  totalSessions: number;
  uniqueVideosWatched: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface CompletedVideo {
  videoId: number;
  title: string;
  subjectName: string;
  completedAt: string;
  watchTimeMinutes: number;
}

export interface RecommendedVideo {
  videoId: number;
  title: string;
  subjectName: string;
  views?: number;
  reason: string;
}

export interface PlatformStats {
  totalVideos: number;
  publishedVideos: number;
  processingVideos: number;
  totalViews: number;
  uniqueTeachers: number;
  videosUploadedInRange: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface TeacherRanking {
  teacherId: number;
  teacherName: string;
  videoCount: number;
  totalViews: number;
}


export interface AnalyticsStatus {
  totalVideos: number;
  videosWithAnalytics: number;
  videosNeedingRefresh: number;
  lastRefreshTime: string;
  healthStatus: 'HEALTHY' | 'WARNING';
  message: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// ===== TEACHER ANALYTICS =====

/**
 * ✅ GET /video-analytics/teacher/overview
 * Get overall video analytics for teacher
 */
export const getTeacherAnalytics = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  // ✅ Ensure dates are properly formatted
  const formattedParams = {
    startDate: formatDateParam(params?.startDate),
    endDate: formatDateParam(params?.endDate),
  };
  
  console.log('📡 Fetching teacher analytics with params:', formattedParams);
  
  return axios.get<TeacherAnalyticsOverview>(`${BASE_URL}/teacher/overview`, { 
    params: formattedParams 
  });
};

export const getVideoStatistics = (videoId: number) => {
  console.log('📡 Fetching video statistics for:', videoId);
  return axios.get<VideoStatistics>(`${BASE_URL}/video/${videoId}/stats`);
};

export const getVideoWatchData = (videoId: number) => {
  console.log('📡 Fetching video watch data for:', videoId);
  return axios.get<VideoWatchData>(`${BASE_URL}/video/${videoId}/watch-data`);
};
/**
 * ✅ GET /video-analytics/subject/{subjectId}/engagement
 * Get engagement metrics for a subject
 */
export const getSubjectEngagement = (
  subjectId: number,
  params?: {
    startDate?: string;
    endDate?: string;
  }
) =>
  axios.get<SubjectEngagement>(`${BASE_URL}/subject/${subjectId}/engagement`, { params });

/**
 * ✅ GET /video-analytics/top-videos
 * Get top performing videos
 */
export const getTopVideos = (params?: {
  limit?: number;
  sortBy?: 'views' | 'completion_rate' | 'recent';
}) =>
  axios.get<TopVideo[]>(`${BASE_URL}/top-videos`, { params });

// ===== STUDENT ANALYTICS =====

/**
 * ✅ GET /video-analytics/student/progress
 * Get video learning progress for student
 */
export const getStudentProgress = (params?: {
  subjectId?: number;
}) => {
  console.log('📡 Fetching student progress with params:', params);
  return axios.get<StudentProgress>(`${BASE_URL}/student/progress`, { params });
};

export const getStudentWatchTime = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const formattedParams = {
    startDate: formatDateParam(params?.startDate),
    endDate: formatDateParam(params?.endDate),
  };
  
  console.log('📡 Fetching student watch time with params:', formattedParams);
  return axios.get<StudentWatchTime>(`${BASE_URL}/student/watch-time`, { 
    params: formattedParams 
  });
};

export const getCompletedVideos = (params?: {
  subjectId?: number;
}) => {
  console.log('📡 Fetching completed videos with params:', params);
  return axios.get<CompletedVideo[]>(`${BASE_URL}/student/completed-videos`, { params });
};
/**
 * ✅ GET /video-analytics/recommendations/{studentId}
 * Get recommended videos based on watch history
 */
export const getRecommendations = (studentId: number, params?: {
  limit?: number;
}) =>
  axios.get<RecommendedVideo[]>(`${BASE_URL}/recommendations/${studentId}`, { params });

// ===== ADMIN ANALYTICS =====

/**
 * ✅ GET /video-analytics/admin/platform-stats
 * Get platform-wide video statistics
 */
export const getPlatformStats = (params?: {
  startDate?: string;
  endDate?: string;
}) =>
  axios.get<PlatformStats>(`${BASE_URL}/admin/platform-stats`, { params });

/**
 * ✅ GET /video-analytics/admin/teacher-rankings
 * Get teacher rankings by video engagement
 */
export const getTeacherRankings = (params?: {
  limit?: number;
  startDate?: string;
  endDate?: string;
}) =>
  axios.get<TeacherRanking[]>(`${BASE_URL}/admin/teacher-rankings`, { params });

// ===== EXPORT ENDPOINTS =====

/**
 * ✅ GET /video-analytics/video/{videoId}/export
 * Export video analytics as CSV
 */
export const exportVideoAnalytics = (videoId: number) =>
  axios.get<Blob>(`${BASE_URL}/video/${videoId}/export`, {
    responseType: 'blob',
  });

/**
 * ✅ GET /video-analytics/teacher/export
 * Export all teacher video analytics as CSV
 */
export const exportTeacherAnalytics = (params?: {
  startDate?: string;
  endDate?: string;
}) =>
  axios.get<Blob>(`${BASE_URL}/teacher/export`, {
    params,
    responseType: 'blob',
  });

/**
 * ✅ POST /video-analytics/admin/refresh-analytics
 * Manually trigger analytics refresh for all videos
 */
export const refreshAnalytics = () =>
  axios.post<RefreshResponse>(`${BASE_URL}/admin/refresh-analytics`);

/**
 * ✅ GET /video-analytics/admin/analytics-status
 * Get analytics system status and health check
 */
export const getAnalyticsStatus = () =>
  axios.get<AnalyticsStatus>(`${BASE_URL}/admin/analytics-status`);

/**
 * ✅ Helper to format dates consistently as yyyy-MM-dd
 */
const formatDateParam = (date: string | Date | undefined): string | undefined => {
  if (!date) return undefined;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return undefined;
  }
  
  // Format as yyyy-MM-dd
  return dateObj.toISOString().split('T')[0];
};