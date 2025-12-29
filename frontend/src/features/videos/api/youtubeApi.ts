// ===== src/api/youtubeApi.ts =====
import axios from '@/api/axios';

// ✅ OAuth endpoints use /oauth base (OAuthCallbackController)
const OAUTH_BASE_URL = '/oauth';

// ✅ Video endpoints use /videos base (VideoLessonController)
const VIDEOS_BASE_URL = '/videos';

export interface YouTubeAuthStatusDto {
  connected: boolean;
  channelId?: string;
  channelName?: string;
  profileImageUrl?: string;
  expired?: boolean;
  connectedAt?: string;
  expiresAt?: string;
}

export interface YouTubeAuthUrlDto {
  authUrl: string;
  connected?: boolean;
  channelName?: string;
}

/**
 * ✅ GET /oauth/youtube/auth/status
 * Check if YouTube is connected
 * From: OAuthCallbackController.getYouTubeAuthStatus()
 */
export const getYouTubeAuthStatus = () =>
  axios.get<Record<string, any>>(`${OAUTH_BASE_URL}/youtube/auth/status`);

/**
 * ✅ GET /oauth/youtube/auth/initiate
 * Get OAuth authorization URL
 * From: OAuthCallbackController.initiateYouTubeAuth()
 */
export const getYouTubeAuthUrl = () =>
  axios.get<Record<string, any>>(`${OAUTH_BASE_URL}/youtube/auth/initiate`);

/**
 * ✅ POST /oauth/youtube/exchange?code=...&state=...
 * Exchange OAuth code for tokens (query parameters, not body)
 * From: OAuthCallbackController.exchangeYouTubeCode()
 * 
 * ⚠️ IMPORTANT: Params must be in query string, not request body!
 */
export const exchangeOAuthCode = (code: string, state: string) =>
  axios.post(
    `${OAUTH_BASE_URL}/youtube/exchange`,
    {}, // Empty body
    {
      params: { code, state } // ✅ Query parameters
    }
  );

/**
 * ✅ DELETE /oauth/youtube/auth/disconnect
 * Disconnect YouTube account
 * From: OAuthCallbackController.disconnectYouTube()
 */
export const disconnectYouTube = () =>
  axios.delete<Record<string, any>>(
    `${OAUTH_BASE_URL}/youtube/auth/disconnect`
  );

/**
 * ✅ POST /videos/upload
 * Upload video to YouTube
 * From: YouTubeTestController.uploadVideo()
 */
export const uploadVideo = (
  formData: FormData,
  onProgress?: (progress: number) => void
) =>
  axios.post(`${VIDEOS_BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) {
        const progress = Math.round((e.loaded * 100) / e.total);
        onProgress?.(progress);
      }
    },
  });

/**
 * ✅ GET /videos/my-videos
 * Get teacher's uploaded videos
 * From: YouTubeTestController.getMyVideos()
 */
export const getMyVideos = () =>
  axios.get(`${VIDEOS_BASE_URL}/my-videos`);

/**
 * ✅ GET /videos/{videoId}
 * Get video details
 * From: YouTubeTestController.getVideoDetails()
 */
export const getVideoDetails = (videoId: number) =>
  axios.get(`${VIDEOS_BASE_URL}/${videoId}`);

/**
 * ✅ PUT /videos/{videoId}
 * Update video metadata
 * From: YouTubeTestController.updateVideo()
 */
export const updateVideo = (videoId: number, data: any) =>
  axios.put(`${VIDEOS_BASE_URL}/${videoId}`, data);

/**
 * ✅ DELETE /videos/{videoId}
 * Delete video
 * From: YouTubeTestController.deleteVideo()
 */
export const deleteVideo = (videoId: number) =>
  axios.delete(`${VIDEOS_BASE_URL}/${videoId}`);

/**
 * ✅ GET /videos/subject/{subjectId}
 * Get videos for a subject
 * From: YouTubeTestController.getVideosForSubject()
 */
export const getVideosForSubject = (
  subjectId: number,
  studentType: string = 'SCHOOL'
) =>
  axios.get(`${VIDEOS_BASE_URL}/subject/${subjectId}`, {
    params: { studentType },
  });

/**
 * ✅ POST /videos/{videoId}/link-topic?lessonTopicId=...
 * Link video to lesson topic
 * From: YouTubeTestController.linkToTopic()
 */
export const linkVideoToTopic = (videoId: number, lessonTopicId: number) =>
  axios.post(`${VIDEOS_BASE_URL}/${videoId}/link-topic`, {}, {
    params: { lessonTopicId }
  });

/**
 * ✅ GET /videos/{videoId}/processing-status
 * Get video processing status
 */
export const getProcessingStatus = (videoId: number) =>
  axios.get(`${VIDEOS_BASE_URL}/${videoId}/processing-status`);

/**
 * ✅ GET /videos/{videoId}/transcript
 * Get video transcript
 */
export const getTranscript = (videoId: number) =>
  axios.get(`${VIDEOS_BASE_URL}/${videoId}/transcript`);

/**
 * ✅ GET /videos/{videoId}/chapters
 * Get video chapters
 */
export const getChapters = (videoId: number) =>
  axios.get(`${VIDEOS_BASE_URL}/${videoId}/chapters`);