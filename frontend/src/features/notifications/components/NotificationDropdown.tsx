// frontend/src/features/notifications/components/NotificationDropdown.tsx

import { CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationItem } from './NotificationItem';
import {
  useRecentNotifications,
  useMarkAllAsRead,
  useDeleteAllNotifications,
} from '../hooks/useNotifications';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onClose,
}) => {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useRecentNotifications();
  const markAllAsRead = useMarkAllAsRead();
  const deleteAll = useDeleteAllNotifications();

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      deleteAll.mutate();
    }
  };

  const handleViewAll = () => {
    navigate('/notifications');
    onClose();
  };

  if (isLoading) {
    return (
      <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        
        {hasNotifications && (
          <div className="flex items-center gap-2">
            {/* Mark all as read */}
            <button
              onClick={handleMarkAllAsRead}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={18} />
            </button>

            {/* Delete all */}
            <button
              onClick={handleDeleteAll}
              className="text-gray-400 hover:text-red-600 text-sm font-medium transition-colors"
              title="Delete all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {!hasNotifications ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">No notifications</p>
            <p className="text-gray-500 text-sm text-center">
              You're all caught up! Check back later for new updates.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasNotifications && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleViewAll}
            className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors py-2"
          >
            View all notifications
            <ExternalLink size={14} />
          </button>
        </div>
      )}
    </div>
  );
};