import axiosInstance from '../../../api/axios';
import type {
  Announcement,
  CreateAnnouncementRequest,
  SystemAlertRequest,
  AnnouncementPageResponse,
} from '../types/announcementTypes';

const BASE_URL = '/announcements';

export const announcementsApi = {
  createAnnouncement: async (request: CreateAnnouncementRequest): Promise<Announcement> => {
    const { data } = await axiosInstance.post<Announcement>(BASE_URL, request);
    return data;
  },

  publishAnnouncement: async (id: number): Promise<Announcement> => {
    const { data } = await axiosInstance.post<Announcement>(`${BASE_URL}/${id}/publish`);
    return data;
  },

  sendSystemAlert: async (request: SystemAlertRequest): Promise<Announcement> => {
    const { data } = await axiosInstance.post<Announcement>(`${BASE_URL}/system-alert`, request);
    return data;
  },

  getAllAnnouncements: async (page: number = 0, size: number = 10): Promise<AnnouncementPageResponse> => {
    const { data } = await axiosInstance.get<AnnouncementPageResponse>(`${BASE_URL}/admin`, {
      params: { page, size },
    });
    return data;
  },

  getPublishedAnnouncements: async (page: number = 0, size: number = 10): Promise<AnnouncementPageResponse> => {
    const { data } = await axiosInstance.get<AnnouncementPageResponse>(BASE_URL, {
      params: { page, size },
    });
    return data;
  },

  getActiveAnnouncements: async (): Promise<Announcement[]> => {
    const { data } = await axiosInstance.get<Announcement[]>(`${BASE_URL}/active`);
    return data;
  },

  getAnnouncementById: async (id: number): Promise<Announcement> => {
    const { data } = await axiosInstance.get<Announcement>(`${BASE_URL}/${id}`);
    return data;
  },

  updateAnnouncement: async (id: number, request: CreateAnnouncementRequest): Promise<Announcement> => {
    const { data } = await axiosInstance.put<Announcement>(`${BASE_URL}/${id}`, request);
    return data;
  },

  deleteAnnouncement: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${BASE_URL}/${id}`);
  },
};
