// This is a reusable component that can be embedded in other pages
import React from 'react';
import { Link } from 'react-router-dom';
import { Video, Clock, Eye } from 'lucide-react';
import type { VideoLessonDto } from '../api/videosApi';

interface VideoLibraryProps {
  videos: VideoLessonDto[];
  isLoading?: boolean;
  emptyMessage?: string;
  viewMode?: 'grid' | 'list';
  showTeacherName?: boolean;
}

// ✅ Helper function
const formatDuration = (seconds: number | undefined | null): string => {
  if (!seconds || isNaN(seconds) || seconds === 0) {
    return "Processing...";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const VideoLibrary: React.FC<VideoLibraryProps> = ({
  videos,
  isLoading = false,
  emptyMessage = 'No videos available',
  viewMode = 'grid',
  showTeacherName = true,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <p className="text-gray-600 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
      {videos.map((video) => (
        <Link
          key={video.id}
          to={`/videos/${video.id}`}
          className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl hover:border-purple-300 transition overflow-hidden"
        >
          {/* Thumbnail */}
          <div className="relative aspect-video bg-gradient-to-br from-purple-100 to-pink-100">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <Video className="w-16 h-16 text-purple-400" />
              </div>
            )}
            
            {/* ✅ FIXED: Duration Badge */}
            <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(video.durationSeconds)}
            </div>

            {/* ✅ FIXED: Status Badge */}
            {video.status !== "PUBLISHED" && (
              <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                {video.status}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
              {video.title}
            </h3>
            
            {video.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {video.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium text-purple-600">
                {video.subjectName}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {video.totalViews || 0}
                </span>
              </div>
            </div>

            {showTeacherName && video.teacherName && (
              <div className="mt-2 text-xs text-gray-500">
                {video.teacherName}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default VideoLibrary;