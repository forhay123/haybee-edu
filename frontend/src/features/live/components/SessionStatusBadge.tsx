import React from 'react';
import { SessionStatus } from '../types/sessionTypes';

interface Props {
  status: SessionStatus;
}

export const SessionStatusBadge: React.FC<Props> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case SessionStatus.SCHEDULED:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case SessionStatus.LIVE:
        return 'bg-red-100 text-red-800 border-red-300 animate-pulse';
      case SessionStatus.ENDED:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case SessionStatus.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case SessionStatus.SCHEDULED:
        return 'Scheduled';
      case SessionStatus.LIVE:
        return '🔴 LIVE';
      case SessionStatus.ENDED:
        return 'Ended';
      case SessionStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusStyles()}`}
    >
      {getStatusText()}
    </span>
  );
};