// frontend/src/features/notifications/api/notificationsApi.ts

import axios from '../../../api/axios'; // Your existing axios instance
import type {
  Notification,
  NotificationPageResponse,
  UnreadCountResponse,
  MarkAllAsReadResponse,
  DeleteResponse,
  NotificationFilters,
} from '../types/notificationTypes';

const BASE_URL = '/notifications';

/**
 * Notification API client
 * All endpoints follow REST conventions and return Promises
 */
export const notificationsApi = {
  /**
   * Get paginated notifications for the authenticated user
   * @param page Page number (0-indexed)
   * @param size Page size (default: 10)
   * @returns Paginated notification response
   */
  getNotifications: async (
    page: number = 0,
    size: number = 10
  ): Promise<NotificationPageResponse> => {
    const response = await axios.get<NotificationPageResponse>(BASE_URL, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Get recent notifications (for dropdown preview)
   * Returns up to 10 most recent notifications
   * @returns Array of recent notifications
   */
  getRecentNotifications: async (): Promise<Notification[]> => {
    const response = await axios.get<Notification[]>(`${BASE_URL}/recent`);
    return response.data;
  },

  /**
   * Get unread notification count
   * @returns Unread count with user ID
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await axios.get<UnreadCountResponse>(
      `${BASE_URL}/unread-count`
    );
    return response.data;
  },

  /**
   * Get a single notification by ID
   * @param id Notification ID
   * @returns Notification details
   */
  getNotificationById: async (id: number): Promise<Notification> => {
    const response = await axios.get<Notification>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Mark a notification as read
   * @param id Notification ID
   * @returns Updated notification
   */
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await axios.patch<Notification>(`${BASE_URL}/${id}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   * @returns Number of notifications marked as read
   */
  markAllAsRead: async (): Promise<MarkAllAsReadResponse> => {
    const response = await axios.post<MarkAllAsReadResponse>(
      `${BASE_URL}/read-all`
    );
    return response.data;
  },

  /**
   * Delete a notification
   * @param id Notification ID
   * @returns Success message
   */
  deleteNotification: async (id: number): Promise<DeleteResponse> => {
    const response = await axios.delete<DeleteResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Delete all notifications for the user
   * @returns Success message
   */
  deleteAllNotifications: async (): Promise<DeleteResponse> => {
    const response = await axios.delete<DeleteResponse>(`${BASE_URL}/all`);
    return response.data;
  },

  /**
   * Get notifications by type (with pagination)
   * @param type Notification type
   * @param page Page number
   * @param size Page size
   * @returns Paginated notification response
   */
  getNotificationsByType: async (
    type: string,
    page: number = 0,
    size: number = 10
  ): Promise<NotificationPageResponse> => {
    const response = await axios.get<NotificationPageResponse>(
      `${BASE_URL}/type/${type}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  },
};

export default notificationsApi;