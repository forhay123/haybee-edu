// frontend/src/features/notifications/utils/notificationUtils.ts

import {
  NotificationType,
  NotificationPriority,
  type Notification,
} from '../types/notificationTypes';

/**
 * Icon mapping for notification types
 */
export const getNotificationIcon = (type: NotificationType): string => {
  const iconMap: Record<NotificationType, string> = {
    [NotificationType.ASSESSMENT_PUBLISHED]: 'FileText',
    [NotificationType.ASSESSMENT_DUE_SOON]: 'Clock',
    [NotificationType.GRADE_RELEASED]: 'Award',
    [NotificationType.SUBMISSION_RECEIVED]: 'CheckCircle', // ✅ Changed
    [NotificationType.ANNOUNCEMENT]: 'Megaphone',
    [NotificationType.LIVE_CLASS_SCHEDULED]: 'Calendar',
    [NotificationType.LIVE_CLASS_STARTING]: 'Video',
    [NotificationType.CHAT_MESSAGE]: 'MessageCircle',
    [NotificationType.SYSTEM_ALERT]: 'Bell',
  };

  return iconMap[type] || 'Bell';
};

/**
 * Color mapping for notification types (Tailwind classes)
 */
export const getNotificationColor = (type: NotificationType): string => {
  const colorMap: Record<NotificationType, string> = {
    [NotificationType.ASSESSMENT_PUBLISHED]: 'blue',
    [NotificationType.ASSESSMENT_DUE_SOON]: 'orange',
    [NotificationType.GRADE_RELEASED]: 'green',
    [NotificationType.SUBMISSION_RECEIVED]: 'purple', // ✅ Changed
    [NotificationType.ANNOUNCEMENT]: 'indigo',
    [NotificationType.LIVE_CLASS_SCHEDULED]: 'cyan',
    [NotificationType.LIVE_CLASS_STARTING]: 'red',
    [NotificationType.CHAT_MESSAGE]: 'blue',
    [NotificationType.SYSTEM_ALERT]: 'purple',
  };

  return colorMap[type] || 'gray';
};

/**
 * Get human-readable notification type label
 */
export const getNotificationTypeLabel = (type: NotificationType): string => {
  const labelMap: Record<NotificationType, string> = {
    [NotificationType.ASSESSMENT_PUBLISHED]: 'Assessment Published',
    [NotificationType.ASSESSMENT_DUE_SOON]: 'Assignment Due Soon',
    [NotificationType.GRADE_RELEASED]: 'Grade Released',
    [NotificationType.SUBMISSION_RECEIVED]: 'Submission Received', // ✅ Changed
    [NotificationType.ANNOUNCEMENT]: 'Announcement',
    [NotificationType.LIVE_CLASS_SCHEDULED]: 'Live Class Scheduled',
    [NotificationType.LIVE_CLASS_STARTING]: 'Live Class Starting',
    [NotificationType.CHAT_MESSAGE]: 'Chat Message',
    [NotificationType.SYSTEM_ALERT]: 'System Alert',
  };

  return labelMap[type] || 'Notification';
};

/**
 * Priority color mapping (Tailwind classes)
 */
export const getPriorityColor = (priority: NotificationPriority): string => {
  const colorMap: Record<NotificationPriority, string> = {
    [NotificationPriority.HIGH]: 'red',
    [NotificationPriority.MEDIUM]: 'orange',
    [NotificationPriority.LOW]: 'gray',
  };

  return colorMap[priority] || 'gray';
};

/**
 * Format relative time (e.g., "2 hours ago", "just now")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
};

/**
 * Format absolute time (e.g., "Nov 15, 2025 at 9:30 AM")
 */
export const formatAbsoluteTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Check if notification is recent (within last 24 hours)
 */
export const isRecentNotification = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  return diffInHours < 24;
};

/**
 * Check if notification is expired
 */
export const isExpiredNotification = (notification: Notification): boolean => {
  if (!notification.expiresAt) return false;
  const expiryDate = new Date(notification.expiresAt);
  return expiryDate < new Date();
};

/**
 * Sort notifications by priority and recency
 */
export const sortNotifications = (notifications: Notification[]): Notification[] => {
  return [...notifications].sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }

    const priorityOrder = {
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.LOW]: 1,
    };

    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

/**
 * Group notifications by date
 */
export const groupNotificationsByDate = (
  notifications: Notification[]
): Record<string, Notification[]> => {
  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  notifications.forEach((notification) => {
    const notificationDate = new Date(notification.createdAt);
    const notificationDay = new Date(
      notificationDate.getFullYear(),
      notificationDate.getMonth(),
      notificationDate.getDate()
    );

    if (notificationDay.getTime() === today.getTime()) {
      groups.Today.push(notification);
    } else if (notificationDay.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(notification);
    } else if (notificationDate >= weekAgo) {
      groups['This Week'].push(notification);
    } else {
      groups.Older.push(notification);
    }
  });

  Object.keys(groups).forEach((key) => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
};

/**
 * Truncate notification message for preview
 */
export const truncateMessage = (message: string, maxLength: number = 100): string => {
  if (message.length <= maxLength) return message;
  return `${message.substring(0, maxLength)}...`;
};