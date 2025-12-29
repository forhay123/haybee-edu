import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useRoleAwareSessions } from '../hooks/useLiveSessions';
import { SessionStatus } from '../api/sessionsApi';

export const UpcomingSessionsWidget: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.roles?.[0];

  // Use role-aware hook - automatically handles ADMIN/TEACHER/STUDENT
  const { data: sessions = [], isLoading } = useRoleAwareSessions({
    status: 'SCHEDULED',
  });

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-bold mb-4">📅 Upcoming Live Classes</h3>
        <div className="text-center py-4 text-gray-500">Loading...</div>
      </div>
    );
  }

  // Filter to only show upcoming scheduled sessions
  const upcomingSessions = sessions
    .filter(s => s.status === SessionStatus.SCHEDULED)
    .filter(s => new Date(s.scheduledStartTime) > new Date())
    .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime())
    .slice(0, 3);

  const handleJoin = (sessionId: number) => {
    navigate(`/live-sessions/${sessionId}`);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">📅 Upcoming Live Classes</h3>
        {userRole === 'ADMIN' && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            Admin View
          </span>
        )}
      </div>

      {upcomingSessions.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">
            {userRole === 'ADMIN' 
              ? 'No upcoming sessions from any teacher'
              : 'No upcoming sessions'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingSessions.map(session => (
            <div 
              key={session.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition cursor-pointer"
              onClick={() => handleJoin(session.id)}
            >
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-900">{session.title}</p>
                <p className="text-xs text-gray-600">{session.subjectName}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(session.scheduledStartTime)}
                </p>
                {userRole === 'ADMIN' && (
                  <p className="text-xs text-purple-600 mt-1">
                    👤 {session.teacherName}
                  </p>
                )}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoin(session.id);
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/live-sessions')}
        className="text-blue-600 text-sm mt-4 inline-block hover:underline w-full text-center"
      >
        View All Sessions →
      </button>
    </div>
  );
};