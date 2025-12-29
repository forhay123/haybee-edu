// src/features/live/components/StartSessionButton.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, X } from 'lucide-react';
import { useStartSession, useEndSession } from '../hooks/useLiveSessions';
import { LiveSessionDto } from '../types/liveSession.types';

interface StartSessionButtonProps {
  session: LiveSessionDto;
  variant?: 'default' | 'compact';
}

export const StartSessionButton: React.FC<StartSessionButtonProps> = ({ 
  session, 
  variant = 'default' 
}) => {
  const navigate = useNavigate();
  const startSessionMutation = useStartSession();
  const endSessionMutation = useEndSession();

  const handleStartSession = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to details if in a list
    
    try {
      await startSessionMutation.mutateAsync(session.id);
      // After starting, navigate to session details where teacher can join as host
      navigate(`/live-sessions/${session.id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleEndSession = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await endSessionMutation.mutateAsync(session.id);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const handleJoinAsHost = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(session.startUrl, '_blank');
  };

  const now = new Date();
  const scheduledTime = new Date(session.scheduledStartTime);
  const timeUntilStart = scheduledTime.getTime() - now.getTime();
  const minutesUntilStart = Math.floor(timeUntilStart / 60000);

  // SCHEDULED Status
  if (session.status === 'SCHEDULED') {
    // Can start up to 10 minutes before scheduled time
    const canStartEarly = minutesUntilStart <= 10;

    if (variant === 'compact') {
      return (
        <button
          onClick={handleStartSession}
          disabled={startSessionMutation.isPending || !canStartEarly}
          className={`px-3 py-1.5 rounded-lg font-medium text-sm transition flex items-center gap-1 ${
            canStartEarly
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!canStartEarly ? `Can start ${minutesUntilStart} minutes before` : 'Start session'}
        >
          <Video className="w-4 h-4" />
          {startSessionMutation.isPending ? 'Starting...' : 'Start'}
        </button>
      );
    }

    return (
      <button
        onClick={handleStartSession}
        disabled={startSessionMutation.isPending || !canStartEarly}
        className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
          canStartEarly
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title={!canStartEarly ? `Available ${minutesUntilStart} minutes before scheduled time` : 'Start session'}
      >
        <Video className="w-5 h-5" />
        {startSessionMutation.isPending ? 'Starting Session...' : 'Start Session'}
      </button>
    );
  }

  // LIVE Status
  if (session.status === 'LIVE') {
    if (variant === 'compact') {
      return (
        <div className="flex gap-2">
          <button
            onClick={handleJoinAsHost}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1 text-sm font-medium"
          >
            <Video className="w-4 h-4" />
            Join
          </button>
          <button
            onClick={handleEndSession}
            disabled={endSessionMutation.isPending}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1 text-sm font-medium"
          >
            <X className="w-4 h-4" />
            End
          </button>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <button
          onClick={handleJoinAsHost}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium"
        >
          <Video className="w-5 h-5" />
          Join as Host
        </button>
        <button
          onClick={handleEndSession}
          disabled={endSessionMutation.isPending}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2 font-medium"
        >
          <X className="w-5 h-5" />
          {endSessionMutation.isPending ? 'Ending...' : 'End Session'}
        </button>
      </div>
    );
  }

  // ENDED or CANCELLED Status
  return null;
};