import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as videosApi from '../api/youtubeApi';

// ✅ Upload video to YouTube
export const useUploadVideo = () => {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      videosApi.uploadVideo(formData, (progress) => {
        setUploadProgress(progress);
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['my-videos'] });
      setUploadProgress(100);
      toast.success('Video uploaded successfully! Processing in progress...');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Upload failed'
      );
      setUploadProgress(0);
    },
  });

  return {
    ...mutation,
    uploadProgress,
    reset: () => {
      mutation.reset();
      setUploadProgress(0);
    },
  };
};

// ✅ Get video processing status (with polling)
export const useProcessingStatus = (videoId: number | null, pollInterval?: number) => {
  return useQuery({
    queryKey: ['processing-status', videoId],
    queryFn: () => 
      videosApi.getProcessingStatus(videoId!).then(res => res.data),
    enabled: !!videoId,
    refetchInterval: pollInterval || 5000, // Poll every 5 seconds by default
    retry: 3,
  });
};

// ✅ Get video transcript
export const useTranscript = (videoId: number | null) => {
  return useQuery({
    queryKey: ['transcript', videoId],
    queryFn: () => 
      videosApi.getTranscript(videoId!).then(res => res.data),
    enabled: !!videoId,
    retry: 2,
  });
};

// ✅ Get video chapters
export const useChapters = (videoId: number | null) => {
  return useQuery({
    queryKey: ['chapters', videoId],
    queryFn: () => 
      videosApi.getChapters(videoId!).then(res => res.data),
    enabled: !!videoId,
    retry: 2,
  });
};

// ✅ Get my videos (teacher's uploaded videos)
export const useMyVideos = () => {
  return useQuery({
    queryKey: ['my-videos'],
    queryFn: () => videosApi.getMyVideos().then(res => res.data),
    retry: 2,
  });
};

// ✅ Get video details
export const useVideoDetails = (videoId: number | null) => {
  return useQuery({
    queryKey: ['video-details', videoId],
    queryFn: () => 
      videosApi.getVideoDetails(videoId!).then(res => res.data),
    enabled: !!videoId,
    retry: 2,
  });
};

// ✅ Update video metadata
export const useUpdateVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ videoId, data }: { videoId: number; data: any }) =>
      videosApi.updateVideo(videoId, data),
    onSuccess: (response, { videoId }) => {
      queryClient.invalidateQueries({ queryKey: ['video-details', videoId] });
      queryClient.invalidateQueries({ queryKey: ['my-videos'] });
      toast.success('Video updated successfully!');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to update video'
      );
    },
  });
};

// ✅ Delete video
export const useDeleteVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (videoId: number) =>
      videosApi.deleteVideo(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-videos'] });
      toast.success('Video deleted successfully');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to delete video'
      );
    },
  });
};

// ✅ Get videos for subject
export const useVideosForSubject = (
  subjectId: number | null,
  studentType: string = 'SCHOOL'
) => {
  return useQuery({
    queryKey: ['videos-by-subject', subjectId, studentType],
    queryFn: () =>
      videosApi.getVideosForSubject(subjectId!, studentType).then(res => res.data),
    enabled: !!subjectId,
    retry: 2,
  });
};

// ✅ Link video to lesson topic
export const useLinkVideoToTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ videoId, lessonTopicId }: { videoId: number; lessonTopicId: number }) =>
      videosApi.linkVideoToTopic(videoId, lessonTopicId),
    onSuccess: (response, { videoId }) => {
      queryClient.invalidateQueries({ queryKey: ['video-details', videoId] });
      queryClient.invalidateQueries({ queryKey: ['my-videos'] });
      toast.success('Video linked to lesson topic!');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to link video to topic'
      );
    },
  });
};