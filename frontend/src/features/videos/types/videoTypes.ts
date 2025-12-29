// ===== src/features/videos/types/videoTypes.ts =====

export enum VideoStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

// ✅ Main video interface matching backend
export interface IVideo {
  id: number;
  title: string;
  description: string;
  status: VideoStatus | string;
  youtubeVideoId: string;
  youtubeUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  durationSeconds: number; // ✅ Changed from duration
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
  totalViews: number; // ✅ Changed from viewCount
  averageCompletionRate?: number;
  uploadDate: string; // ✅ Changed from uploadedAt
  processingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Student-specific fields
  lastPositionSeconds?: number;
  completionPercentage?: number;
  completed?: boolean;
}

// ✅ Extended interface for video details page
export interface IVideoDetails extends IVideo {
  teacherEmail: string;
  transcript?: string;
  chapters?: IChapter[];
  lastWatchedAt?: string;
}

export interface IChapter {
  id: number;
  chapterNumber: number;
  title: string;
  startTimeSeconds: number; // ✅ Changed from startTime
  endTimeSeconds: number; // ✅ Changed from endTime
  keyConcepts: string[];
  summary?: string;
}

export interface ITranscript {
  transcript: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
}

// ✅ Upload/Update related types
export interface VideoUpdateRequest {
  title?: string;
  description?: string;
  privacyStatus?: string;
  lessonTopicId?: number;
  isAspirantMaterial?: boolean;
  isPublic?: boolean;
}

export interface VideoSearchRequest {
  query: string;
  subjectId?: number;
  studentType?: string;
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