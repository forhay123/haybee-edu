// ===== src/api/videosApi.ts (COMPLETE FILE) =====
import axios from '@/api/axios';
import type { AxiosResponse } from 'axios';

const VIDEOS_BASE_URL = '/videos';

// ============== TYPES ==============
export interface VideoLessonDto {
  id: number;
  title: string;
  description: string;
  status: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  sessionRecordingId?: number;
  hasTranscript: boolean;
  hasChapters: boolean;
  hasQuiz: boolean;
  hasSummary: boolean;
  isAspirantMaterial: boolean;
  isPublic: boolean;
  isPremium: boolean;
  published: boolean;
  totalViews: number;
  averageCompletionRate?: number;
  uploadDate: string;
  processingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastPositionSeconds?: number;
  completionPercentage?: number;
  completed?: boolean;
}

export interface VideoDetailsDto extends VideoLessonDto {
  teacherEmail: string;
  transcript?: string;
  chapters?: VideoChapterDto[];
  lastWatchedAt?: string;
}

export interface VideoUpdateRequest {
  title?: string;
  description?: string;
  privacyStatus?: string;
  lessonTopicId?: number;
  isAspirantMaterial?: boolean;
  isPublic?: boolean;
  published?: boolean;
}

export interface VideoSearchRequest {
  query: string;
  subjectId?: number;
  studentType?: string;
}

export interface VideoChapterDto {
  id: number;
  chapterNumber: number;
  title: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  keyConcepts: string[];
  summary?: string;
}

export interface VideoWatchHistoryDto {
  id: number;
  videoLessonId: number;
  studentId: number;
  lastPositionSeconds: number;
  completionPercentage?: number;
  completed: boolean;
  watchStartedAt: string;
}

export interface GenerationResponse {
  status: 'queued' | 'success' | 'already_exists' | 'error';
  message: string;
  taskId?: string;
  videoId?: number;
  transcriptId?: number;
  chapterCount?: number;
}

// ============== GET REQUESTS ==============

export const getVideos = (params?: {
  subjectId?: number;
  status?: string;
  sortBy?: string;
  order?: string;
  limit?: number;
  offset?: number;
}) =>
  axios.get<VideoLessonDto[]>(`${VIDEOS_BASE_URL}`, { params });

export const getVideoDetails = (videoId: number) =>
  axios.get<VideoDetailsDto>(`${VIDEOS_BASE_URL}/${videoId}`);

export const getTeacherVideos = (params?: {
  subjectId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}) =>
  axios.get<VideoLessonDto[]>(`${VIDEOS_BASE_URL}/my-videos`, { params });

export const getStudentAvailableVideos = (params?: {
  subjectId?: number;
  studentType?: string;
  page?: number;
  pageSize?: number;
}) =>
  axios.get<VideoLessonDto[]>(`${VIDEOS_BASE_URL}/student/available`, { params });

export const getVideosForSubject = (
  subjectId: number,
  studentType: string = 'SCHOOL'
) =>
  axios.get<VideoLessonDto[]>(`${VIDEOS_BASE_URL}/subject/${subjectId}`, {
    params: { studentType },
  });

export const getVideosForTopic = (lessonTopicId: number) =>
  axios.get<VideoLessonDto[]>(`${VIDEOS_BASE_URL}/topic/${lessonTopicId}`);

export const getTranscript = (videoId: number) =>
  axios.get<string>(`${VIDEOS_BASE_URL}/${videoId}/transcript`);

export const getChapters = (videoId: number) =>
  axios.get<VideoChapterDto[]>(`${VIDEOS_BASE_URL}/${videoId}/chapters`);

export const getWatchHistory = (params?: {
  subjectId?: number;
  page?: number;
  pageSize?: number;
}) =>
  axios.get<VideoWatchHistoryDto[]>(`${VIDEOS_BASE_URL}/student/watch-history`, { params });

// ============== POST REQUESTS ==============

export const uploadVideo = (
  formData: FormData,
  onProgress?: (progress: number) => void
) =>
  axios.post<VideoLessonDto>(`${VIDEOS_BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) {
        const progress = Math.round((e.loaded * 100) / e.total);
        onProgress?.(progress);
      }
    },
  });

export const searchVideos = (
  query: string,
  params?: {
    subjectId?: number;
    studentType?: string;
    page?: number;
    pageSize?: number;
  }
) =>
  axios.post<VideoLessonDto[]>(`${VIDEOS_BASE_URL}/search`, { query }, { params });

export const linkVideoToTopic = (videoId: number, lessonTopicId: number) =>
  axios.post<VideoLessonDto>(
    `${VIDEOS_BASE_URL}/${videoId}/link-topic/${lessonTopicId}`
  );

export const generateChapters = (videoId: number) =>
  axios.post<GenerationResponse>(`${VIDEOS_BASE_URL}/${videoId}/chapters/generate`);

export const generateTranscript = (videoId: number) =>
  axios.post<GenerationResponse>(`${VIDEOS_BASE_URL}/${videoId}/transcript/generate`);

// ✅ FIXED: Enhanced with detailed logging
export const recordWatchProgress = (
  videoId: number,
  watchedSeconds: number,
  totalSeconds?: number,
  completed?: boolean
) => {
  const params = {
    watchedSeconds,
    totalSeconds,
    completed: completed ?? false,
  };
  
  console.log('📡 [API] POST /videos/:videoId/watch', {
    videoId,
    params,
    url: `${VIDEOS_BASE_URL}/${videoId}/watch`,
    fullUrl: `/videos/${videoId}/watch`,
  });

  return axios.post<VideoWatchHistoryDto>(
    `${VIDEOS_BASE_URL}/${videoId}/watch`, 
    {}, 
    { params }
  ).then(response => {
    console.log('✅ [API] Watch progress response:', response.data);
    return response;
  }).catch(error => {
    console.error('❌ [API] Watch progress error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      params: error.config?.params,
    });
    throw error;
  });
};

export const togglePublishVideo = (videoId: number) =>
  axios.post<VideoLessonDto>(`${VIDEOS_BASE_URL}/${videoId}/toggle-publish`);

// ============== PUT REQUESTS ==============

export const updateVideo = (videoId: number, data: VideoUpdateRequest) =>
  axios.put<VideoLessonDto>(`${VIDEOS_BASE_URL}/${videoId}`, data);

// ============== DELETE REQUESTS ==============

export const deleteVideo = (videoId: number) =>
  axios.delete<void>(`${VIDEOS_BASE_URL}/${videoId}`);

export const unlinkVideoFromTopic = (videoId: number) =>
  axios.delete<VideoLessonDto>(`${VIDEOS_BASE_URL}/${videoId}/unlink-topic`);

export const disconnectYouTubeAccount = () =>
  axios.delete<{ success: boolean; message: string }>(
    `${VIDEOS_BASE_URL}/auth/disconnect`
  );