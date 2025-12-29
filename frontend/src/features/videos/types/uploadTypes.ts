// ===== src/features/videos/types/uploadTypes.ts =====
export enum UploadStep {
  YOUTUBE_CHECK = 'youtube-check',
  FILE_SELECT = 'file-select',
  METADATA = 'metadata',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
}

export interface IUploadState {
  step: UploadStep;
  file?: File;
  progress: number;
  metadata?: {
    title: string;
    description?: string;
    subjectId: number;
    lessonTopicId?: number;
    isAspirantMaterial: boolean;
    isPublic: boolean;
  };
  error?: string;
  videoId?: number;
}