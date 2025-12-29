// ===== src/features/videos/types/analyticsTypes.ts =====

/**
 * Watch event for real-time tracking
 */
export interface IWatchEvent {
  videoId: number;
  studentId: number;
  position: number;
  duration: number;
  completed: boolean;
  timestamp: Date;
}

/**
 * Video analytics overview
 */
export interface IVideoAnalytics {
  videoId: number;
  totalViews: number;
  uniqueViewers: number;
  completedViews: number;
  completionRate: number;
  averageWatchPercentage: number;
  totalWatchTimeSeconds: number;
  totalWatchTimeHours: number;
  averageWatchTimeMinutes: number;
  uniqueStudents: number;
}

/**
 * Student engagement metrics
 */
export interface IEngagementMetric {
  studentId: number;
  studentName: string;
  watchTime: number;
  completionPercentage: number;
  completed: boolean;
  lastWatchedAt: string;
  quizScore?: number;
}

/**
 * Teacher analytics overview
 */
export interface ITeacherAnalyticsOverview {
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

/**
 * Video watch data (completion distribution, recent watches)
 */
export interface IVideoWatchData {
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

/**
 * Subject engagement metrics
 */
export interface ISubjectEngagement {
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

/**
 * Top performing video
 */
export interface ITopVideo {
  videoId: number;
  title: string;
  subjectName: string;
  views: number;
  averageCompletionRate: number;
  uploadDate: string;
  youtubeUrl: string;
}

/**
 * Student progress overview
 */
export interface IStudentProgress {
  totalWatched: number;
  completedVideos: number;
  inProgressVideos: number;
  averageCompletionRate: number;
  subjectId: string | number;
}

/**
 * Platform-wide statistics
 */
export interface IPlatformStats {
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

/**
 * Teacher ranking
 */
export interface ITeacherRanking {
  teacherId: number;
  teacherName: string;
  videoCount: number;
  totalViews: number;
}

/**
 * Analytics system status (admin)
 */
export interface IAnalyticsStatus {
  totalVideos: number;
  videosWithAnalytics: number;
  videosNeedingRefresh: number;
  lastRefreshTime: string;
  healthStatus: 'HEALTHY' | 'WARNING';
  message: string;
}

/**
 * Analytics refresh response (admin)
 */
export interface IRefreshResponse {
  success: boolean;
  message: string;
  timestamp: string;
}