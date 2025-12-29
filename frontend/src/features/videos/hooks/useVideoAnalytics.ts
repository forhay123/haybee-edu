// ===== src/features/videos/hooks/useVideoAnalytics.ts =====
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import * as analyticsApi from '../api/analyticsApi';

// ===== TEACHER ANALYTICS HOOKS =====

/**
 * Get teacher's overall video analytics
 */
export const useTeacherAnalytics = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: ['teacher-analytics', params],
    queryFn: async () => {
      try {
        console.log('🔍 useTeacherAnalytics called with:', params);
        const res = await analyticsApi.getTeacherAnalytics(params);
        console.log('✅ Teacher analytics response:', res.data);
        return res.data;
      } catch (error: any) {
        console.error('❌ Teacher analytics error:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useVideoStatistics = (videoId: number | null) => {
  return useQuery({
    queryKey: ['video-statistics', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required');
      
      try {
        console.log('🔍 useVideoStatistics called for:', videoId);
        const res = await analyticsApi.getVideoStatistics(videoId);
        console.log('✅ Video statistics response:', res.data);
        return res.data;
      } catch (error: any) {
        console.error('❌ Video statistics error:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    enabled: !!videoId,
    retry: 2,
  });
};


/**
 * Get watch data for a video (completion rates, recent watches)
 */
export const useVideoWatchData = (videoId: number | null) => {
  return useQuery({
    queryKey: ['video-watch-data', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('Video ID is required');
      const res = await analyticsApi.getVideoWatchData(videoId);
      return res.data;
    },
    enabled: !!videoId,
  });
};

/**
 * Get engagement metrics for a subject
 */
export const useSubjectEngagement = (
  subjectId: number | null,
  params?: {
    startDate?: string;
    endDate?: string;
  }
) => {
  return useQuery({
    queryKey: ['subject-engagement', subjectId, params],
    queryFn: async () => {
      if (!subjectId) throw new Error('Subject ID is required');
      const res = await analyticsApi.getSubjectEngagement(subjectId, params);
      return res.data;
    },
    enabled: !!subjectId,
  });
};

/**
 * Get top performing videos
 */
export const useTopVideos = (params?: {
  limit?: number;
  sortBy?: 'views' | 'completion_rate' | 'recent';
}) => {
  return useQuery({
    queryKey: ['top-videos', params],
    queryFn: async () => {
      const res = await analyticsApi.getTopVideos(params);
      return res.data;
    },
  });
};

// ===== STUDENT ANALYTICS HOOKS =====

/**
 * Get student's learning progress
 */
export const useStudentProgress = (params?: {
  subjectId?: number;
}) => {
  return useQuery({
    queryKey: ['student-progress', params],
    queryFn: async () => {
      try {
        console.log('🔍 useStudentProgress called with:', params);
        const res = await analyticsApi.getStudentProgress(params);
        console.log('✅ Student progress response:', res.data);
        return res.data;
      } catch (error: any) {
        console.error('❌ Student progress error:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    retry: 2,
  });
};

export const useStudentWatchTime = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: ['student-watch-time', params],
    queryFn: async () => {
      try {
        console.log('🔍 useStudentWatchTime called with:', params);
        const res = await analyticsApi.getStudentWatchTime(params);
        console.log('✅ Student watch time response:', res.data);
        return res.data;
      } catch (error: any) {
        console.error('❌ Student watch time error:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    retry: 2,
  });
};

export const useCompletedVideos = (params?: {
  subjectId?: number;
}) => {
  return useQuery({
    queryKey: ['completed-videos', params],
    queryFn: async () => {
      try {
        console.log('🔍 useCompletedVideos called with:', params);
        const res = await analyticsApi.getCompletedVideos(params);
        console.log('✅ Completed videos response:', res.data);
        return res.data;
      } catch (error: any) {
        console.error('❌ Completed videos error:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    retry: 2,
  });
};
/**
 * Get recommended videos based on watch history
 */
export const useRecommendations = (studentId: number | null, params?: {
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['recommendations', studentId, params],
    queryFn: async () => {
      if (!studentId) throw new Error('Student ID is required');
      const res = await analyticsApi.getRecommendations(studentId, params);
      return res.data;
    },
    enabled: !!studentId,
  });
};

// ===== ADMIN ANALYTICS HOOKS =====

/**
 * Get platform-wide statistics
 */
export const usePlatformStats = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: ['platform-stats', params],
    queryFn: async () => {
      const res = await analyticsApi.getPlatformStats(params);
      return res.data;
    },
  });
};

/**
 * Get teacher rankings by video engagement
 */
export const useTeacherRankings = (params?: {
  limit?: number;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: ['teacher-rankings', params],
    queryFn: async () => {
      const res = await analyticsApi.getTeacherRankings(params);
      return res.data;
    },
  });
};

/**
 * ✅ Get analytics system health status (ADMIN ONLY)
 */
export const useAnalyticsStatus = () => {
  return useQuery({
    queryKey: ['analytics-status'],
    queryFn: async () => {
      const res = await analyticsApi.getAnalyticsStatus();
      return res.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

/**
 * ✅ Manually trigger analytics refresh (ADMIN ONLY)
 */
export const useRefreshAnalytics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await analyticsApi.refreshAnalytics();
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Analytics refreshed successfully!');
        // Invalidate all analytics queries to refetch with new data
        queryClient.invalidateQueries({ queryKey: ['teacher-analytics'] });
        queryClient.invalidateQueries({ queryKey: ['video-statistics'] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        queryClient.invalidateQueries({ queryKey: ['analytics-status'] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
      } else {
        toast.error(data.message || 'Failed to refresh analytics');
      }
    },
    onError: (error: AxiosError<any>) => {
      toast.error(error.response?.data?.message || 'Failed to refresh analytics');
    },
  });
};

// ===== EXPORT HELPERS =====

/**
 * Helper function to export video analytics as CSV
 */
export const useExportVideoAnalytics = () => {
  return (videoId: number) => {
    return analyticsApi.exportVideoAnalytics(videoId).then(res => {
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_${videoId}_analytics.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };
};

/**
 * Helper function to export teacher analytics as CSV
 */
export const useExportTeacherAnalytics = () => {
  return (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    return analyticsApi.exportTeacherAnalytics(params).then(res => {
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teacher_video_analytics.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };
};

// ===== LEGACY COMPATIBILITY (Optional - Remove if not needed) =====

/**
 * @deprecated Use useVideoStatistics instead
 */
export const useVideoAnalytics = (videoId: number | null) => {
  console.warn('useVideoAnalytics is deprecated. Use useVideoStatistics instead.');
  return useVideoStatistics(videoId);
};

/**
 * @deprecated Use useStudentProgress and useCompletedVideos instead
 */
export const useWatchHistory = (studentId: number | null, limit?: number) => {
  console.warn('useWatchHistory is deprecated. Use useCompletedVideos instead.');
  return useQuery({
    queryKey: ['watch-history-legacy', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('Student ID is required');
      const res = await analyticsApi.getCompletedVideos();
      return res.data;
    },
    enabled: !!studentId,
  });
};