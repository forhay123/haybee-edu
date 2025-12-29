// frontend/src/features/notifications/types/notificationTypes.ts

/**
 * Notification type enum - matches backend NotificationType.java
 */
export enum NotificationType {
  ASSESSMENT_PUBLISHED = 'ASSESSMENT_PUBLISHED',
  ASSESSMENT_DUE_SOON = 'ASSESSMENT_DUE_SOON',
  GRADE_RELEASED = 'GRADE_RELEASED',
  SUBMISSION_RECEIVED = 'SUBMISSION_RECEIVED', // ✅ Changed to match database
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  LIVE_CLASS_SCHEDULED = 'LIVE_CLASS_SCHEDULED',
  LIVE_CLASS_STARTING = 'LIVE_CLASS_STARTING',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

/**
 * Notification priority enum - matches backend NotificationPriority.java
 */
export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Main Notification interface - matches backend NotificationDTO.java
 */
export interface Notification {
  id: number;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  relatedEntityId?: number;
  relatedEntityType?: string;
  isRead: boolean;
  createdAt: string; // ISO 8601 format
  readAt?: string; // ISO 8601 format
  expiresAt?: string; // ISO 8601 format
  read: boolean; // Backend also returns this field
}

/**
 * Paginated notification response - matches backend NotificationPageDTO.java
 */
export interface NotificationPageResponse {
  notifications: Notification[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Unread count response - matches backend UnreadCountDTO.java
 */
export interface UnreadCountResponse {
  count: number;
  userId: number;
}

/**
 * Mark all as read response
 */
export interface MarkAllAsReadResponse {
  count: number;
  message: string;
}

/**
 * Delete response
 */
export interface DeleteResponse {
  message: string;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  unreadCount: number;
  totalLast30Days: number;
}

/**
 * Notification filter options
 */
export interface NotificationFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  isRead?: boolean;
  page?: number;
  size?: number;
}

/**
 * Notification action - for click handling
 */
export interface NotificationAction {
  id: number;
  actionUrl?: string;
  relatedEntityId?: number;
  relatedEntityType?: string;
}