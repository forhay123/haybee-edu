import { useState } from 'react';
import { announcementsApi } from '../api/announcementsApi';
import type {
  Announcement,
  CreateAnnouncementRequest,
  SystemAlertRequest,
} from '../types/announcementTypes';

export const useAnnouncements = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAnnouncement = async (request: CreateAnnouncementRequest): Promise<Announcement | null> => {
    setLoading(true);
    setError(null);
    try {
      const announcement = await announcementsApi.createAnnouncement(request);
      return announcement;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create announcement';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const publishAnnouncement = async (id: number): Promise<Announcement | null> => {
    setLoading(true);
    setError(null);
    try {
      const announcement = await announcementsApi.publishAnnouncement(id);
      return announcement;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to publish announcement';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendSystemAlert = async (request: SystemAlertRequest): Promise<Announcement | null> => {
    setLoading(true);
    setError(null);
    try {
      const alert = await announcementsApi.sendSystemAlert(request);
      return alert;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to send system alert';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAnnouncement = async (id: number, request: CreateAnnouncementRequest): Promise<Announcement | null> => {
    setLoading(true);
    setError(null);
    try {
      const announcement = await announcementsApi.updateAnnouncement(id, request);
      return announcement;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update announcement';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAnnouncement = async (id: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await announcementsApi.deleteAnnouncement(id);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete announcement';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createAnnouncement,
    publishAnnouncement,
    sendSystemAlert,
    updateAnnouncement,
    deleteAnnouncement,
  };
};