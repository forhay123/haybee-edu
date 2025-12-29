// frontend/src/features/notifications/pages/NotificationPage.tsx

import { useState } from 'react';
import { CheckCheck, Trash2, ChevronLeft, ChevronRight, Bell, Filter } from 'lucide-react';
import { NotificationItem } from '../components/NotificationItem';
import {
  useNotifications,
  useMarkAllAsRead,
  useDeleteAllNotifications,
} from '../hooks/useNotifications';

export const NotificationPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const { data, isLoading } = useNotifications(page, 15);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Filter notifications based on selected filter
  const filteredNotifications = data?.notifications?.filter((notification) => {
    const isRead = notification.isRead || notification.read;
    if (filter === 'unread') return !isRead;
    if (filter === 'read') return isRead;
    return true; // 'all'
  }) || [];

  const hasNotifications = filteredNotifications.length > 0;
  const unreadCount = data?.notifications?.filter(n => !n.isRead && !n.read).length || 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {data?.notifications && data.notifications.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={unreadCount === 0 ? 'No unread notifications' : 'Mark all as read'}
            >
              <CheckCheck size={18} />
              Mark all as read
            </button>

            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              <Trash2 size={18} />
              Delete all
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      {data?.notifications && data.notifications.length > 0 && (
        <div className="mb-6 flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({data.notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'unread'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === 'read'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Read ({data.notifications.length - unreadCount})
          </button>
        </div>
      )}

      {/* Notification List */}
      {!hasNotifications ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-lg">
          <Bell size={64} className="text-gray-400 mb-4" />
          <p className="text-xl font-semibold text-gray-600 mb-2">
            {filter === 'all' 
              ? 'No notifications yet'
              : filter === 'unread'
              ? 'No unread notifications'
              : 'No read notifications'}
          </p>
          <p className="text-gray-500">
            {filter === 'all'
              ? "You're all caught up! New notifications will appear here."
              : filter === 'unread'
              ? "You're all caught up! Check back later for new updates."
              : "You haven't read any notifications yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!data.hasPrevious}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {data.currentPage + 1} of {data.totalPages}
              </span>

              <button
                onClick={() => setPage(page + 1)}
                disabled={!data.hasNext}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};