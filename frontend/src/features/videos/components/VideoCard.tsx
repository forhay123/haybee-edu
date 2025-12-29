import React from 'react';
import { Play, Clock, Eye, Calendar, Edit, Trash2, Loader, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeleteVideo } from '../hooks/useVideoLessons';

interface VideoCardProps {
  video: {
    id: number;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    totalViews?: number;
    uploadDate?: string;
    teacherName?: string;
    status: 'DRAFT' | 'PROCESSING' | 'PUBLISHED' | 'PENDING' | 'FAILED';
    lastPositionSeconds?: number;
    completionPercentage?: number;
  };
  userRole: 'TEACHER' | 'STUDENT' | 'ADMIN';
  isOwner?: boolean;
}

const formatDuration = (seconds: number | undefined | null): string => {
  if (!seconds || isNaN(seconds) || seconds === 0) return 'Processing...';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VideoCard: React.FC<VideoCardProps> = ({ video, userRole, isOwner = false }) => {
  const navigate = useNavigate();
  const { mutate: deleteVideo, isPending: isDeleting } = useDeleteVideo();

  const handleClick = () => {
    if (video.status === 'PROCESSING' || video.status === 'PENDING') return;
    navigate(`/videos/${video.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/videos/${video.id}/edit`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
      deleteVideo(video.id);
    }
  };

  // ✅ NEW: Handle analytics click
  const handleAnalytics = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/videos/${video.id}/analytics`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = () => {
    const badges = {
      DRAFT: 'bg-gray-500 text-white',
      PROCESSING: 'bg-yellow-500 text-white',
      PENDING: 'bg-blue-500 text-white',
      PUBLISHED: 'bg-green-500 text-white',
      FAILED: 'bg-red-500 text-white',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badges[video.status]}`}>
        {video.status}
      </span>
    );
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105 ${
        video.status === 'PROCESSING' || video.status === 'PENDING' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
      }`}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
            <Play size={48} className="text-white opacity-70" />
          </div>
        )}

        {/* Processing Overlay */}
        {(video.status === 'PROCESSING' || video.status === 'PENDING') && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center">
            <Loader className="animate-spin text-white mb-2" size={32} />
            <span className="text-white text-sm font-medium">{video.status === 'PROCESSING' ? 'Processing...' : 'Pending...'}</span>
          </div>
        )}

        {/* Duration Badge */}
        {video.durationSeconds && video.status !== 'PROCESSING' && video.status !== 'PENDING' && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-semibold flex items-center space-x-1">
            <Clock size={12} />
            <span>{formatDuration(video.durationSeconds)}</span>
          </div>
        )}

        {/* Progress Bar (Students) */}
        {userRole === 'STUDENT' && video.completionPercentage !== undefined && video.completionPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${video.completionPercentage}%` }}
            />
          </div>
        )}

        {/* Play Icon Overlay */}
        {video.status === 'PUBLISHED' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
            <div className="bg-white rounded-full p-4">
              <Play size={32} className="text-blue-600" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-base line-clamp-2 mb-2">
          {video.title}
        </h3>

        {video.description && (
          <p className="text-sm text-gray-600 line-clamp-3 mb-3">
            {video.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center space-x-3">
            {video.totalViews !== undefined && (
              <div className="flex items-center space-x-1">
                <Eye size={14} />
                <span>{video.totalViews} views</span>
              </div>
            )}
            {video.uploadDate && (
              <div className="flex items-center space-x-1">
                <Calendar size={14} />
                <span>{formatDate(video.uploadDate)}</span>
              </div>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {video.teacherName && (
          <p className="text-xs text-gray-500 mb-3">By {video.teacherName}</p>
        )}

        {/* Action Buttons (Teachers) */}
        {(userRole === 'TEACHER' || userRole === 'ADMIN') && isOwner && (
          <div className="space-y-2 pt-3 border-t">
            {/* ✅ NEW: Analytics button (full width on top) */}
            {video.status === 'PUBLISHED' && (
              <button
                onClick={handleAnalytics}
                className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition"
                disabled={isDeleting}
              >
                <TrendingUp size={16} />
                <span className="text-sm font-medium">View Analytics</span>
              </button>
            )}

            {/* Edit and Delete buttons in a row */}
            <div className="flex space-x-2">
              <button
                onClick={handleEdit}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                disabled={isDeleting}
              >
                <Edit size={16} />
                <span className="text-sm font-medium">Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                <span className="text-sm font-medium">Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Continue Watching (Students) */}
        {userRole === 'STUDENT' && video.lastPositionSeconds && video.lastPositionSeconds > 0 && (
          <div className="pt-3 border-t">
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              <Play size={16} />
              <span className="text-sm font-medium">
                Continue from {formatDuration(video.lastPositionSeconds)}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};