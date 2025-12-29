import React from 'react';
import type { Announcement } from '../types/announcementTypes';

interface AnnouncementCardProps {
  announcement: Announcement;
  onPublish?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onPublish,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    NORMAL: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-red-100 text-red-800',
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[announcement.priority]}`}>
              {announcement.priority}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
              {announcement.targetAudience.replace(/_/g, ' ')}
            </span>
            {!announcement.published && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                DRAFT
              </span>
            )}
            {announcement.expired && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                EXPIRED
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-gray-700 mb-4">{announcement.message}</p>

      <div className="text-sm text-gray-500 space-y-1">
        <p>Created by: {announcement.createdByUserName}</p>
        <p>Created: {formatDate(announcement.createdAt)}</p>
        {announcement.publishedAt && <p>Published: {formatDate(announcement.publishedAt)}</p>}
        {announcement.expiresAt && <p>Expires: {formatDate(announcement.expiresAt)}</p>}
      </div>

      {showActions && (
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
          {!announcement.published && onPublish && (
            <button
              onClick={() => onPublish(announcement.id)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Publish
            </button>
          )}
          {!announcement.published && onEdit && (
            <button
              onClick={() => onEdit(announcement.id)}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(announcement.id)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};