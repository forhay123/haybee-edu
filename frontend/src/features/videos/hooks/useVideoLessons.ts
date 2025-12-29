import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import * as videosApi from '../api/videosApi';

export const useVideos = (
  params?: Parameters<typeof videosApi.getVideos>[0]
) => {
  return useQuery({
    queryKey: ['videos', params],
    queryFn: async () => {
      console.log('📡 Fetching videos with params:', params);
      const res = await videosApi.getVideos(params);
      console.log('✅ Videos fetched:', res.data);
      return res.data;
    },
  });
};

export const useVideoDetails = (id: number | null) => {
  return useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      if (!id) throw new Error('Video ID is required');
      console.log('📡 Fetching video details for ID:', id);
      const res = await videosApi.getVideoDetails(id);
      console.log('✅ Video details fetched:', res.data);
      return res.data;
    },
    enabled: !!id && id > 0,
    retry: 1,
  });
};

export const useUpdateVideo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      id, 
      data, 
    }: { 
      id: number; 
      data: any;
    }) => {
      const res = await videosApi.updateVideo(id, data);
      return res.data;
    },
    onSuccess: (updatedVideo) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['video', updatedVideo.id] });
      queryClient.invalidateQueries({ queryKey: ['my-videos'] });
      toast.success('Video updated successfully!');
    },
    onError: (error: AxiosError<any>) => {
      toast.error(error.response?.data?.message || 'Failed to update video');
    },
  });
};

export const useDeleteVideo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await videosApi.deleteVideo(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['video', deletedId] });
      queryClient.invalidateQueries({ queryKey: ['my-videos'] });
      toast.success('Video deleted successfully!');
    },
    onError: (error: AxiosError<any>) => {
      toast.error(error.response?.data?.message || 'Failed to delete video');
    },
  });
};

export const useTogglePublishVideo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (videoId: number) => {
      console.log('🔄 Toggling publish for video:', videoId);
      const res = await videosApi.togglePublishVideo(videoId);
      console.log('✅ Server response:', res.data);
      return res.data;
    },
    onMutate: async (videoId) => {
      await queryClient.cancelQueries({ queryKey: ['video', videoId] });
      const previousVideo = queryClient.getQueryData(['video', videoId]);
      queryClient.setQueryData(['video', videoId], (old: any) => {
        if (!old) return old;
        return { ...old, published: !old.published };
      });
      return { previousVideo, videoId };
    },
    onSuccess: (video) => {
      console.log('✅ Success! New published state:', video.published);
      queryClient.setQueryData(['video', video.id], video);
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['my-videos'] });
      toast.success(
        video.published 
          ? '✅ Video published! Students can now see it.' 
          : '📝 Video unpublished. Hidden from students.'
      );
    },
    onError: (error: AxiosError<any>, videoId, context) => {
      console.error('❌ Toggle failed:', error);
      if (context?.previousVideo) {
        queryClient.setQueryData(['video', context.videoId], context.previousVideo);
      }
      toast.error(error.response?.data?.message || 'Failed to toggle publish status');
    },
  });
};

export const useLinkVideoToTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      videoId, 
      lessonTopicId, 
    }: { 
      videoId: number; 
      lessonTopicId: number;
    }) => {
      const res = await videosApi.linkVideoToTopic(videoId, lessonTopicId);
      return res.data;
    },
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: ['video', video.id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video linked to lesson topic!');
    },
    onError: (error: AxiosError<any>) => {
      toast.error(error.response?.data?.message || 'Failed to link video to topic');
    },
  });
};

export const useUnlinkVideoFromTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (videoId: number) => {
      const res = await videosApi.unlinkVideoFromTopic(videoId);
      return res.data;
    },
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: ['video', video.id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video unlinked from lesson topic!');
    },
    onError: (error: AxiosError<any>) => {
      toast.error(error.response?.data?.message || 'Failed to unlink video');
    },
  });
};

export const useVideosForSubject = (subjectId: number | null) => {
  return useQuery({
    queryKey: ['videos-subject', subjectId],
    queryFn: async () => {
      const res = await videosApi.getVideosForSubject(subjectId!);
      return res.data;
    },
    enabled: !!subjectId,
  });
};

export const useVideosForTopic = (topicId: number | null) => {
  return useQuery({
    queryKey: ['videos-topic', topicId],
    queryFn: async () => {
      const res = await videosApi.getVideosForTopic(topicId!);
      return res.data;
    },
    enabled: !!topicId,
  });
};

export const useTeacherVideos = (
  params?: Parameters<typeof videosApi.getTeacherVideos>[0]
) => {
  return useQuery({
    queryKey: ['my-videos', params],
    queryFn: async () => {
      const res = await videosApi.getTeacherVideos(params);
      return res.data;
    },
  });
};

export const useStudentAvailableVideos = (
  params?: Parameters<typeof videosApi.getStudentAvailableVideos>[0]
) => {
  return useQuery({
    queryKey: ['student-available-videos', params],
    queryFn: async () => {
      const res = await videosApi.getStudentAvailableVideos(params);
      return res.data;
    },
  });
};

export const useVideoTranscript = (videoId: number | null) => {
  return useQuery({
    queryKey: ['video-transcript', videoId],
    queryFn: async () => {
      const res = await videosApi.getTranscript(videoId!);
      return res.data;
    },
    enabled: !!videoId,
  });
};

export const useVideoChapters = (videoId: number | null) => {
  return useQuery({
    queryKey: ['video-chapters', videoId],
    queryFn: async () => {
      const res = await videosApi.getChapters(videoId!);
      return res.data;
    },
    enabled: !!videoId,
  });
};

export const useGenerateTranscript = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (videoId: number) => {
      const res = await videosApi.generateTranscript(videoId);
      return res.data;
    },
    onSuccess: (_, videoId) => {
      queryClient.invalidateQueries({ queryKey: ['video-transcript', videoId] });
      toast.success('Transcript generation started! Check back soon.');
    },
    onError: (error: AxiosError<any>) => {
      toast.error(error.response?.data?.message || 'Failed to generate transcript');
    },
  });
};

export const useGenerateChapters = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (videoId: number) => {
      const res = await videosApi.generateChapters(videoId);
      return res.data;
    },
    onSuccess: (_, videoId) => {
      queryClient.invalidateQueries({ queryKey: ['video-chapters', videoId] });
      toast.success('Chapter generation started! Check back soon.');
    },
    onError: (error: AxiosError<any>) => {
      toast.error(error.response?.data?.message || 'Failed to generate chapters');
    },
  });
};

// ✅ FIXED: Enhanced with detailed logging and error handling
export const useRecordWatchProgress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      videoId,
      watchedSeconds,
      totalSeconds,
      completed,
    }: {
      videoId: number;
      watchedSeconds: number;
      totalSeconds?: number;
      completed?: boolean;
    }) => {
      console.log('🔵 [MUTATION] Recording watch progress:', {
        videoId,
        watchedSeconds,
        totalSeconds,
        completed,
        timestamp: new Date().toISOString(),
      });

      try {
        const res = await videosApi.recordWatchProgress(
          videoId,
          watchedSeconds,
          totalSeconds,
          completed
        );
        
        console.log('✅ [MUTATION] Watch progress API response:', res.data);
        return res.data;
      } catch (error: any) {
        console.error('❌ [MUTATION] Watch progress API error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            params: error.config?.params,
          }
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('✅ [SUCCESS] Watch progress saved:', {
        videoId: variables.videoId,
        historyId: data.id,
        position: data.lastPositionSeconds,
        completed: data.completed,
        completionPercentage: data.completionPercentage,
      });
      
      // Invalidate queries to refresh video data
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['video', variables.videoId] });
      queryClient.invalidateQueries({ queryKey: ['watch-history'] });
    },
    onError: (error: AxiosError<any>, variables) => {
      console.error('❌ [ERROR] Failed to record watch progress:', {
        videoId: variables.videoId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // Show error to user only for authentication issues
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to watch this video.');
      }
      // Don't show toast for other errors - fail silently for better UX
    },
    onMutate: (variables) => {
      console.log('🔄 [MUTATE] Starting watch progress mutation:', variables);
    },
  });
};

export const useWatchHistory = (
  params?: Parameters<typeof videosApi.getWatchHistory>[0]
) => {
  return useQuery({
    queryKey: ['watch-history', params],
    queryFn: async () => {
      const res = await videosApi.getWatchHistory(params);
      return res.data;
    },
  });
};

export const useSearchVideos = (
  query: string | null,
  params?: Parameters<typeof videosApi.searchVideos>[1]
) => {
  return useQuery({
    queryKey: ['videos-search', query, params],
    queryFn: async () => {
      const res = await videosApi.searchVideos(query!, params);
      return res.data;
    },
    enabled: !!query,
  });
};