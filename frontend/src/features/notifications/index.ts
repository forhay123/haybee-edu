// frontend/src/features/notifications/index.ts

/**
 * Centralized export file for notifications feature
 * Allows clean imports like: import { useNotifications, NotificationType } from '@/features/notifications'
 */

// Types
export * from './types/notificationTypes';

// API
export { notificationsApi } from './api/notificationsApi';

// Hooks
export {
  useRecentNotifications,
  useUnreadCount,
  useNotifications,
  useNotification,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  useNotificationActions,
  notificationKeys,
} from './hooks/useNotifications';

// Utils
export * from './utils/notificationUtils';

// Components
export { NotificationBell } from './components/NotificationBell';
export { NotificationDropdown } from './components/NotificationDropdown';
export { NotificationItem } from './components/NotificationItem';
export { NotificationIcon } from './components/NotificationIcon';

// Pages
export { NotificationPage } from './pages/NotificationPage';
export { NotificationDetailPage } from './pages/NotificationDetailPage';