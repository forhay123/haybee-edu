// frontend/src/features/announcements/types/announcementTypes.ts

import { NotificationPriority } from '../../notifications/types/notificationTypes';

/**
 * Target audience for announcements
 */
export enum TargetAudience {
  ALL_USERS = 'ALL_USERS',
  ALL_STUDENTS = 'ALL_STUDENTS',
  ALL_TEACHERS = 'ALL_TEACHERS',
  SPECIFIC_CLASSES = 'SPECIFIC_CLASSES',
  SPECIFIC_USERS = 'SPECIFIC_USERS',
}

/**
 * Announcement interface
 */
export interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: NotificationPriority;
  targetAudience: TargetAudience;
  targetClassIds?: number[];
  targetUserIds?: number[];
  actionUrl?: string;
  expiresAt?: string;
  published: boolean;
  publishedAt?: string;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  updatedAt?: string;
  expired: boolean;
}

/**
 * Create announcement request
 */
export interface CreateAnnouncementRequest {
  title: string;
  message: string;
  priority: NotificationPriority;
  targetAudience: TargetAudience;
  targetClassIds?: number[];
  targetUserIds?: number[];
  actionUrl?: string;
  expiresAt?: string;
  publishImmediately: boolean;
}

/**
 * System alert request
 */
export interface SystemAlertRequest {
  title: string;
  message: string;
  actionUrl?: string;
  expiresAt?: string;
}

/**
 * Paginated announcement response
 */
export interface AnnouncementPageResponse {
  content: Announcement[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}