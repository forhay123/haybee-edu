// ===== src/features/live/components/JoinSessionButton.tsx =====
import React, { useState, useEffect } from 'react';
import { useMarkAttendance } from '../hooks/useLiveSessions';
import { LiveSessionDto, SessionStatus } from '../api/sessionsApi';
import { Button } from '@/components/buttons/Button';

interface Props {
  session: LiveSessionDto;
}

export const JoinSessionButton: React.FC<Props> = ({ session }) => {
  const [timeUntilStart, setTimeUntilStart] = useState<string | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const markAttendanceMutation = useMarkAttendance();

  useEffect(() => {
    const updateTimeUntilStart = () => {
      const now = new Date();
      const startTime = new Date(session.scheduledStartTime);
      const diff = startTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCanJoin(session.status === SessionStatus.LIVE);
        setTimeUntilStart(null);
      } else {
        const minutes = Math.ceil(diff / 1000 / 60);
        setCanJoin(minutes <= 5 && session.status === SessionStatus.SCHEDULED);
        setTimeUntilStart(`Starts in ${minutes}m`);
      }
    };

    updateTimeUntilStart();
    const interval = setInterval(updateTimeUntilStart, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [session]);

  const handleJoin = () => {
    if (!session.joinUrl) {
      console.error('No join URL available');
      return;
    }

    // ✅ CRITICAL iOS FIX: Open Zoom IMMEDIATELY before async operation
    // Detect iOS/Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // Open Zoom synchronously to maintain user gesture
    if (isIOS || isSafari) {
      // iOS: Use direct navigation for better compatibility
      window.location.href = session.joinUrl;
    } else {
      // Android/Desktop: Try window.open with fallback
      const newWindow = window.open(session.joinUrl, '_blank');
      
      // If popup was blocked, fallback to direct navigation
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = session.joinUrl;
      }
    }

    // ✅ Mark attendance AFTER opening Zoom (non-blocking)
    // This runs in the background and won't affect the Zoom launch
    markAttendanceMutation.mutateAsync(session.id).catch(err => {
      console.error('Failed to mark attendance:', err);
      // Don't show error to user since they've already joined
    });
  };

  if (session.status === SessionStatus.ENDED || session.status === SessionStatus.CANCELLED) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        label={canJoin ? '🎥 Join Live Class' : '🎥 Not Started Yet'}
        onClick={handleJoin}
        variant={canJoin ? 'primary' : 'secondary'}
        disabled={!canJoin}
      />
      {timeUntilStart && <span className="text-sm text-gray-500">{timeUntilStart}</span>}
    </div>
  );
};