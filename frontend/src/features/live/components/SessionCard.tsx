// src/features/live/components/SessionCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveSessionDto } from '../api/sessionsApi';
import { useStartSession, useEndSession, useCancelSession } from '../hooks/useLiveSessions';
import { SessionStatusBadge } from './SessionStatusBadge';
import { JoinSessionButton } from './JoinSessionButton';
import toast from 'react-hot-toast';

interface SessionCardProps {
  session: LiveSessionDto;
  userRole: 'TEACHER' | 'STUDENT' | 'ADMIN' | 'PARENT' | undefined;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, userRole }) => {
  const navigate = useNavigate();
  const startMutation = useStartSession();
  const endMutation = useEndSession();
  const cancelMutation = useCancelSession();

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // ✅ FIXED: Start session and navigate to details
  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    try {
      await startMutation.mutateAsync(session.id);
      toast.success('Session started!');
      // Navigate to session details where teacher can join as host
      navigate(`/live-sessions/${session.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start session');
    }
  };

  const handleEnd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await endMutation.mutateAsync(session.id);
      toast.success('Session ended!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to end session');
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    
    try {
      await cancelMutation.mutateAsync(session.id);
      toast.success('Session cancelled');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel session');
    }
  };

  // ✅ For LIVE sessions, navigate to details where join button is
  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/live-sessions/${session.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/live-sessions/${session.id}/edit`);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/live-sessions/${session.id}`);
  };

  // ✅ Check if teacher can start (within 10 minutes of scheduled time)
  const now = new Date();
  const scheduledTime = new Date(session.scheduledStartTime);
  const timeUntilStart = scheduledTime.getTime() - now.getTime();
  const minutesUntilStart = Math.floor(timeUntilStart / 60000);
  const canStartEarly = minutesUntilStart <= 10;

  return (
    <div 
      className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 cursor-pointer"
      onClick={handleViewDetails}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{session.title}</h3>
        <SessionStatusBadge status={session.status} />
      </div>

      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{session.description}</p>

      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <span className="font-medium">Subject:</span> {session.subjectName}
        </div>
        <div>
          <span className="font-medium">Class:</span> {session.className}
        </div>
        <div>
          <span className="font-medium">Date/Time:</span> {formatTime(session.scheduledStartTime)}
        </div>
        <div>
          <span className="font-medium">Duration:</span> {session.scheduledDurationMinutes}m
        </div>
        <div>
          <span className="font-medium">Teacher:</span> {session.teacherName}
        </div>
        {session.attendanceCount !== undefined && (
          <div>
            <span className="font-medium">Participants:</span> {session.attendanceCount}/{session.maxParticipants}
          </div>
        )}
      </div>

      {/* Action buttons based on role and status */}
      <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {/* ===== TEACHER ACTIONS ===== */}
        {userRole === 'TEACHER' && (
          <>
            {session.status === 'SCHEDULED' && (
              <>
                <button 
                  onClick={handleStart}
                  disabled={startMutation.isPending || !canStartEarly}
                  className={`px-3 py-1 rounded text-sm transition ${
                    canStartEarly
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={!canStartEarly ? `Can start ${minutesUntilStart} minutes before scheduled time` : 'Start session'}
                >
                  {startMutation.isPending ? 'Starting...' : 'Start'}
                </button>
                <button 
                  onClick={handleEdit}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
                <button 
                  onClick={handleCancel}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                </button>
              </>
            )}
            {session.status === 'LIVE' && (
              <>
                <button 
                  onClick={handleJoin}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex-1"
                >
                  🎥 Join as Host
                </button>
                <button 
                  onClick={handleEnd}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  disabled={endMutation.isPending}
                >
                  {endMutation.isPending ? 'Ending...' : 'End'}
                </button>
              </>
            )}
            {(session.status === 'ENDED' || session.status === 'CANCELLED') && (
              <button 
                onClick={handleViewDetails}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
              >
                View Details
              </button>
            )}
          </>
        )}

        {/* ===== ADMIN ACTIONS ===== */}
        {userRole === 'ADMIN' && (
          <>
            {session.status === 'SCHEDULED' && (
              <>
                <button 
                  onClick={handleStart}
                  disabled={startMutation.isPending || !canStartEarly}
                  className={`px-3 py-1 rounded text-sm transition ${
                    canStartEarly
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={!canStartEarly ? `Can start ${minutesUntilStart} minutes before scheduled time` : 'Start session'}
                >
                  {startMutation.isPending ? 'Starting...' : 'Start'}
                </button>
                <button 
                  onClick={handleEdit}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
                <button 
                  onClick={handleCancel}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                </button>
              </>
            )}
            {session.status === 'LIVE' && (
              <button 
                onClick={handleJoin}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
              >
                🎥 Join Session
              </button>
            )}
            {(session.status === 'ENDED' || session.status === 'CANCELLED') && (
              <button 
                onClick={handleViewDetails}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
              >
                View Details
              </button>
            )}
          </>
        )}

        {/* ===== STUDENT ACTIONS ===== */}
        {userRole === 'STUDENT' && (
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            {session.status === 'LIVE' && <JoinSessionButton session={session} />}
            {session.status === 'SCHEDULED' && (
              <button 
                onClick={handleViewDetails}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
              >
                View Details
              </button>
            )}
          </div>
        )}

        {/* ===== PARENT ACTIONS ===== */}
        {userRole === 'PARENT' && (
          <button 
            onClick={handleViewDetails}
            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};