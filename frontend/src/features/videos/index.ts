// ===== src/features/videos/index.ts =====
// ✅ Barrel export file for video feature module

// Components - Named exports
export { VideoCard } from "./components/VideoCard";
export { VideoPlayer } from "./components/VideoPlayer";
export { VideoTranscript } from "./components/VideoTranscript";
export { VideoChapters } from "./components/VideoChapters";
export { VideoQuiz } from "./components/VideoQuiz";
export { ProcessingIndicator } from "./components/ProcessingIndicator";
export { YouTubeConnectButton } from "./components/YouTubeConnectButton";
export { UploadVideoModal } from "./components/UploadVideoModal";
export { default as VideoLibrary } from "./components/VideoLibrary";

// Pages - Default exports imported as named
export { default as VideoLibraryPage } from "./pages/VideoLibraryPage";
export { default as VideoDetailsPage } from "./pages/VideoDetailsPage";
export { default as VideoAnalyticsPage } from "./pages/VideoAnalyticsPage";
export { default as UploadVideoPage } from "./pages/UploadVideoPage";
export { default as TeacherAnalyticsOverviewPage } from "./pages/TeacherAnalyticsOverviewPage";
export { default as AdminAnalyticsDashboard } from "./pages/AdminAnalyticsDashboard";
export { VideoTranscriptPage } from "./pages/VideoTranscriptPage"; // ✅ Teacher transcript page
export { TeacherVideoDetailPage } from "./pages/TeacherVideoDetailPage"; // ✅ Teacher detail page
export { StudentVideoDetailPage } from "./pages/StudentVideoDetailPage"; // ✅ NEW - Student detail page
export { StudentVideoTranscriptPage } from "./pages/StudentVideoTranscriptPage"; // ✅ NEW - Student transcript page

// Hooks - Named exports (re-export all from hook files)
export * from "./hooks/useVideoLessons";
export * from "./hooks/useVideoUpload";
export * from "./hooks/useYouTubeAuth";
export * from "./hooks/useVideoAnalytics";

// Types - Named exports (re-export all from type files)
export type * from "./types/videoTypes";
export type * from "./types/uploadTypes";
export type * from "./types/analyticsTypes";

// API Functions - Named exports (re-export all from API files)
export * from "./api/videosApi";
export * from "./api/youtubeApi";
export * from "./api/analyticsApi";