import React, { useState, useEffect } from 'react';
import { announcementsApi } from '../api/announcementsApi';
import { AnnouncementList } from '../components/AnnouncementList';
import type { Announcement } from '../types/announcementTypes';

export const AnnouncementsViewPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      if (activeOnly) {
        const data = await announcementsApi.getActiveAnnouncements();
        setAnnouncements(data);
      } else {
        const response = await announcementsApi.getPublishedAnnouncements(0, 20);
        setAnnouncements(response.content);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [activeOnly]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Announcements</h1>
        <p className="text-gray-600">View all active announcements</p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => setActiveOnly(true)}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeOnly
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active Only
        </button>
        <button
          onClick={() => setActiveOnly(false)}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            !activeOnly
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Published
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading announcements...</p>
        </div>
      ) : (
        <AnnouncementList
          announcements={announcements}
          showActions={false}
          emptyMessage="No announcements available"
        />
      )}
    </div>
  );
};
