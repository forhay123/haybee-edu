import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { notificationsApi } from '../api/notificationsApi';
import type {
  Notification,
  UnreadCountResponse,
} from '../types/notificationTypes';

/**
 * Query keys for notifications
 * Centralized to prevent typos and enable easy invalidation
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (page: number, size: number) =>
    [...notificationKeys.lists(), { page, size }] as const,
  recent: () => [...notificationKeys.all, 'recent'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  detail: (id: number) => [...notificationKeys.all, 'detail', id] as const,
};

/**
 * ✅ NEW: WebSocket connection manager for notifications
 */
const useNotificationWebSocket = (enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const wsClientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<StompSubscription[]>([]);

  const getToken = useCallback(() => {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }, []);

  const getUserId = useCallback(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId || payload.id;
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
    return null;
  }, [getToken]);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Silently fail if blocked
    } catch (error) {
      // Sound not available
    }
  }, []);

  const showBrowserNotification = useCallback((notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: `notification-${notification.id}`, // Prevent duplicates
        });
      } catch (error) {
        console.log('Browser notification failed');
      }
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    const token = getToken();
    const userId = getUserId();
    
    if (!token || !userId || !enabled) {
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
    const wsUrl = `${baseUrl}/ws-chat`;

    console.log('🔔 Connecting to Notification WebSocket');

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('✅ Notification WebSocket connected');
        
        // Clear old subscriptions
        subscriptionsRef.current.forEach(sub => sub.unsubscribe());
        subscriptionsRef.current = [];

        // Subscribe to new notifications
        const newNotifSub = client.subscribe(
          `/topic/notifications.user.${userId}`,
          (message) => {
            try {
              const notification: Notification = JSON.parse(message.body);
              console.log('🔔 New notification received:', notification);
              
              // Update React Query cache - add to recent notifications
              queryClient.setQueryData<Notification[]>(
                notificationKeys.recent(),
                (old = []) => [notification, ...old.slice(0, 9)]
              );
              
              // Invalidate to refresh other queries
              queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
              
              // Play sound and show browser notification
              playNotificationSound();
              showBrowserNotification(notification);
            } catch (error) {
              console.error('❌ Error parsing notification:', error);
            }
          }
        );

        // Subscribe to notification updates (marked as read)
        const updateSub = client.subscribe(
          `/topic/notifications.user.${userId}.update`,
          (message) => {
            try {
              const updatedNotification: Notification = JSON.parse(message.body);
              console.log('🔄 Notification updated:', updatedNotification);
              
              // Update in cache
              queryClient.setQueryData<Notification[]>(
                notificationKeys.recent(),
                (old = []) => old.map(n => 
                  n.id === updatedNotification.id ? updatedNotification : n
                )
              );
              
              queryClient.setQueryData(
                notificationKeys.detail(updatedNotification.id),
                updatedNotification
              );
            } catch (error) {
              console.error('❌ Error parsing notification update:', error);
            }
          }
        );

        // Subscribe to notification deletions
        const deleteSub = client.subscribe(
          `/topic/notifications.user.${userId}.delete`,
          (message) => {
            try {
              const deletedId: number = JSON.parse(message.body);
              console.log('🗑️ Notification deleted:', deletedId);
              
              // Remove from cache
              queryClient.setQueryData<Notification[]>(
                notificationKeys.recent(),
                (old = []) => old.filter(n => n.id !== deletedId)
              );
              
              queryClient.removeQueries({ 
                queryKey: notificationKeys.detail(deletedId) 
              });
              
              // Invalidate lists
              queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            } catch (error) {
              console.error('❌ Error parsing notification deletion:', error);
            }
          }
        );

        // Subscribe to unread count updates
        const countSub = client.subscribe(
          `/topic/notifications.user.${userId}.count`,
          (message) => {
            try {
              const count: number = JSON.parse(message.body);
              console.log('🔢 Unread count updated:', count);
              
              // Update unread count in cache
              queryClient.setQueryData<UnreadCountResponse>(
                notificationKeys.unreadCount(),
                (old) => ({ count, userId: old?.userId || Number(userId) })
              );
            } catch (error) {
              console.error('❌ Error parsing unread count:', error);
            }
          }
        );

        subscriptionsRef.current = [newNotifSub, updateSub, deleteSub, countSub];
        console.log('✅ Subscribed to notification topics for user', userId);
      },

      onStompError: (frame) => {
        console.error('❌ Notification WebSocket error:', frame.headers['message']);
      },

      onWebSocketClose: () => {
        console.warn('⚠️ Notification WebSocket closed');
      },
    });

    client.activate();
    wsClientRef.current = client;
  }, [getToken, getUserId, enabled, queryClient, playNotificationSound, showBrowserNotification]);

  useEffect(() => {
    if (enabled) {
      connectWebSocket();
    }

    return () => {
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      wsClientRef.current?.deactivate();
    };
  }, [enabled, connectWebSocket]);
};

/**
 * Hook for fetching recent notifications (for dropdown)
 * ✅ ENHANCED: Now with WebSocket real-time updates
 * Polls every 60 seconds as fallback (reduced from 30s since WebSocket handles real-time)
 */
export const useRecentNotifications = (enableWebSocket: boolean = true) => {
  useNotificationWebSocket(enableWebSocket);
  
  return useQuery({
    queryKey: notificationKeys.recent(),
    queryFn: notificationsApi.getRecentNotifications,
    staleTime: 60000, // ✅ Increased since WebSocket handles real-time
    refetchInterval: 60000, // ✅ Fallback polling (less frequent now)
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook for fetching unread notification count
 * ✅ ENHANCED: Now with WebSocket real-time updates
 */
export const useUnreadCount = (enableWebSocket: boolean = true) => {
  useNotificationWebSocket(enableWebSocket);
  
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsApi.getUnreadCount,
    staleTime: 60000, // ✅ Increased since WebSocket handles real-time
    refetchInterval: 60000, // ✅ Fallback polling
    refetchOnWindowFocus: true,
    select: (data: UnreadCountResponse) => data.count,
  });
};

/**
 * Hook for fetching paginated notifications (for full page view)
 */
export const useNotifications = (page: number = 0, size: number = 10) => {
  return useQuery({
    queryKey: notificationKeys.list(page, size),
    queryFn: () => notificationsApi.getNotifications(page, size),
    staleTime: 10000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook for fetching a single notification
 */
export const useNotification = (id: number) => {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationsApi.getNotificationById(id),
    enabled: !!id,
  });
};

/**
 * Hook for marking a notification as read
 * ✅ Note: Backend broadcasts update via WebSocket automatically
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: (updatedNotification: Notification) => {
      // Optimistic update - WebSocket will confirm
      queryClient.setQueryData(
        notificationKeys.detail(updatedNotification.id),
        updatedNotification
      );

      queryClient.invalidateQueries({ queryKey: notificationKeys.recent() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
};

/**
 * Hook for marking all notifications as read
 * ✅ Note: Backend broadcasts count update via WebSocket automatically
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

/**
 * Hook for deleting a notification
 * ✅ Note: Backend broadcasts deletion via WebSocket automatically
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationsApi.deleteNotification(id),
    onSuccess: (_, deletedId) => {
      // Optimistic update - WebSocket will confirm
      queryClient.removeQueries({ queryKey: notificationKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.recent() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
};

/**
 * Hook for deleting all notifications
 */
export const useDeleteAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.deleteAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

/**
 * Combined hook that returns all notification operations
 */
export const useNotificationActions = () => {
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAllNotifications = useDeleteAllNotifications();

  return {
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
    deleteAllNotifications: deleteAllNotifications.mutate,
    isLoading:
      markAsRead.isPending ||
      markAllAsRead.isPending ||
      deleteNotification.isPending ||
      deleteAllNotifications.isPending,
  };
};

/**
 * ✅ NEW: Request browser notification permission
 */
export const useRequestNotificationPermission = () => {
  return useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);
};