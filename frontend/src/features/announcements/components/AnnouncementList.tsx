import React from 'react';
import { AnnouncementCard } from './AnnouncementCard';
import type { Announcement } from '../types/announcementTypes';

interface AnnouncementListProps {
  announcements: Announcement[];
  onPublish?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  onPublish,
  onEdit,
  onDelete,
  showActions = true,
  emptyMessage = 'No announcements found',
}) => {
  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onPublish={onPublish}
          onEdit={onEdit}
          onDelete={onDelete}
          showActions={showActions}
        />
      ))}
    </div>
  );
};