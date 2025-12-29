// frontend/src/features/notifications/components/NotificationItem.tsx

import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Notification } from '../types/notificationTypes';
import { NotificationIcon } from './NotificationIcon';
import {
  formatRelativeTime,
  truncateMessage,
} from '../utils/notificationUtils';
import { useMarkAsRead, useDeleteNotification } from '../hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClose,
}) => {
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();

  const handleClick = () => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // Navigate to notification detail page
    navigate(`/notifications/${notification.id}`);

    // Close dropdown
    onClose?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click event from bubbling
    deleteNotification.mutate(notification.id);
  };

  // Determine if notification is read (check both isRead and read fields)
  const isRead = notification.isRead || notification.read;

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-start gap-3 p-3 rounded-lg cursor-pointer
        transition-all duration-200 hover:bg-gray-50
        ${!isRead ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}
      `}
    >
      {/* Icon with dimmed appearance for read notifications */}
      <div className={isRead ? 'opacity-50' : ''}>
        <NotificationIcon type={notification.type} size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h4 className={`text-sm mb-1 ${isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
          {notification.title}
        </h4>

        {/* Message */}
        <p className={`text-sm mb-1 ${isRead ? 'text-gray-500' : 'text-gray-600'}`}>
          {truncateMessage(notification.message, 80)}
        </p>

        {/* Timestamp */}
        <p className="text-xs text-gray-500">
          {formatRelativeTime(notification.createdAt)}
          {isRead && notification.readAt && (
            <span className="ml-2 text-gray-400">• Read</span>
          )}
        </p>
      </div>

      {/* Unread indicator & Delete button */}
      <div className="flex items-start gap-2">
        {/* Unread dot - only show if unread */}
        {!isRead && (
          <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 flex-shrink-0" />
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-600 transition-colors p-1 flex-shrink-0"
          aria-label="Delete notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};