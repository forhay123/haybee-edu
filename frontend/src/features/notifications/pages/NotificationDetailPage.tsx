// frontend/src/features/notifications/pages/NotificationDetailPage.tsx

import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  ExternalLink, 
  Trash2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { NotificationIcon } from '../components/NotificationIcon';
import {
  useNotification,
  useMarkAsRead,
  useDeleteNotification,
} from '../hooks/useNotifications';

import {
  formatAbsoluteTime,
  getNotificationTypeLabel,
} from '../utils/notificationUtils';

export const NotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notificationId = Number(id);

  const { data: notification, isLoading, error } = useNotification(notificationId);
  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();

  // Prevent double firing in Strict Mode
  const hasMarkedRef = useRef(false);

  /** ✅ Mark as READ once when page opens */
  useEffect(() => {
    if (!notificationId) return;
    if (hasMarkedRef.current) return;

    hasMarkedRef.current = true;
    markAsRead.mutate(notificationId);
  }, [notificationId, markAsRead]);

  const handleGoBack = () => {
    navigate('/notifications');
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      deleteNotification.mutate(notificationId, {
        onSuccess: () => navigate('/notifications'),
      });
    }
  };

  const handleActionClick = () => {
    if (notification?.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  /** ---------------------------------------------------
   *  LOADING / ERROR STATES
   *  --------------------------------------------------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Notification Not Found
          </h2>
          <p className="text-red-700 mb-4">
            This notification may have been deleted or you don't have access to it.
          </p>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Notifications
          </button>
        </div>
      </div>
    );
  }

  /** ---------------------------------------------------
   *  MAIN RENDER
   *  --------------------------------------------------- */
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Back to Notifications
        </button>
      </div>

      {/* Notification Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">

              {/* Icon */}
              <NotificationIcon type={notification.type} size={24} />

              <div className="flex-1">
                {/* Title + Delete */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {notification.title}
                  </h1>

                  <button
                    onClick={handleDelete}
                    className="text-gray-400 hover:text-red-600 transition-colors p-2"
                    title="Delete notification"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Type + Read Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {getNotificationTypeLabel(notification.type)}
                  </span>

                  {(notification.isRead || notification.read) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <CheckCircle size={14} />
                      Read
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>{formatAbsoluteTime(notification.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="p-6">
          <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </p>

          {/* Action Button */}
          {notification.actionUrl && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleActionClick}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                View Related Content
                <ExternalLink size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {(notification.relatedEntityType || notification.expiresAt) && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {notification.relatedEntityType && (
                <div>
                  <span className="font-semibold text-gray-700">Related to:</span>
                  <span className="ml-2 text-gray-600">
                    {notification.relatedEntityType} #{notification.relatedEntityId}
                  </span>
                </div>
              )}

              {notification.expiresAt && (
                <div>
                  <span className="font-semibold text-gray-700">Expires:</span>
                  <span className="ml-2 text-gray-600">
                    {formatAbsoluteTime(notification.expiresAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Read Timestamp */}
      {notification.readAt && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Read on {formatAbsoluteTime(notification.readAt)}
        </div>
      )}
    </div>
  );
};
