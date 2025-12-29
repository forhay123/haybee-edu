// src/features/live/pages/SessionDetailsPage.tsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionDetails, useStartSession, useEndSession, useCancelSession } from '../hooks/useLiveSessions';
import { SessionStatusBadge } from '../components/SessionStatusBadge';
import { JoinSessionButton } from '../components/JoinSessionButton';
import { DebugSessionInfo } from '../components/DebugSessionInfo';
import { Pencil, Trash2, ArrowLeft, Video, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const SessionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionId = id ? parseInt(id) : null;
  const [activeTab, setActiveTab] = useState<'details' | 'participants' | 'recording' | 'analytics'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: session, isLoading, refetch } = useSessionDetails(sessionId);
  const startSessionMutation = useStartSession();
  const endSessionMutation = useEndSession();
  const cancelSessionMutation = useCancelSession();

  // ✅ Force refresh session data every 5 seconds when LIVE
  React.useEffect(() => {
    if (session?.status === 'LIVE') {
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session?.status, refetch]);
  
  const user = useSelector((state: any) => state.auth?.user);
  const userRoles = user?.roles || [];
  const isTeacher = userRoles.includes('TEACHER');
  const isAdmin = userRoles.includes('ADMIN');
  const isStudent = userRoles.includes('STUDENT');
  
  // ✅ FIX: Parse userId to number if it's a string
  const userId = React.useMemo(() => {
    if (!user?.id) return null;
    const id = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
    console.log('🔍 User ID parsed:', { original: user.id, parsed: id, type: typeof id });
    return id;
  }, [user?.id]);

  const handleEdit = () => {
    navigate(`/live-sessions/${sessionId}/edit`);
  };

  const handleDelete = async () => {
    if (!sessionId) return;
    
    try {
      await cancelSessionMutation.mutateAsync(sessionId);
      setShowDeleteConfirm(false);
      toast.success('Session cancelled');
      navigate('/live-sessions');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel session');
    }
  };

  const handleStartSession = async () => {
    if (!sessionId) return;
    
    try {
      await startSessionMutation.mutateAsync(sessionId);
      toast.success('Session started! You can now join as host.');
      await refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    
    try {
      await endSessionMutation.mutateAsync(sessionId);
      toast.success('Session ended');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to end session');
    }
  };

  const handleJoinAsHost = () => {
    if (session?.startUrl) {
      window.open(session.startUrl, '_blank');
      toast.success('Opening Zoom as host...');
    } else {
      toast.error('Host URL not available');
    }
  };

  if (isLoading) return <div className="text-center py-8">Loading...</div>;
  if (!session) return <div className="text-center py-8">Session not found</div>;

  // ✅ FIXED: Compare numbers to numbers
  const isOwnSession = session.teacherId === userId;

  // ✅ DEBUG: Enhanced logging with types
  console.log('🔍 Session Ownership Check:', {
    sessionId: session.id,
    status: session.status,
    teacherId: session.teacherId,
    teacherIdType: typeof session.teacherId,
    userId: userId,
    userIdType: typeof userId,
    isOwnSession: isOwnSession,
    comparison: `${session.teacherId} === ${userId} = ${session.teacherId === userId}`,
    hasStartUrl: !!session.startUrl,
    hasJoinUrl: !!session.joinUrl,
    userRole: isTeacher ? 'TEACHER' : isAdmin ? 'ADMIN' : isStudent ? 'STUDENT' : 'UNKNOWN'
  });

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const canEdit = (isTeacher || isAdmin) && session.status === 'SCHEDULED';
  const canDelete = (isTeacher || isAdmin) && (session.status === 'SCHEDULED' || session.status === 'CANCELLED');

  // ✅ Check if teacher can start (within 10 minutes of scheduled time)
  const now = new Date();
  const scheduledTime = new Date(session.scheduledStartTime);
  const timeUntilStart = scheduledTime.getTime() - now.getTime();
  const minutesUntilStart = Math.floor(timeUntilStart / 60000);
  const canStartEarly = minutesUntilStart <= 10;

  return (
    <div className="space-y-6">
      {/* ⚠️ TEMPORARY: Debug Component */}
      {(isTeacher || isAdmin) && (
        <DebugSessionInfo session={session} userId={userId} />
      )}

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
        <button onClick={() => navigate('/live-sessions')} className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Live Classes
        </button>
      </nav>

      {/* Hero Section */}
      <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 dark:text-white">{session.title}</h1>
            <SessionStatusBadge status={session.status} />
          </div>

          {/* Action Buttons */}
          {(isTeacher || isAdmin) && isOwnSession && (
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Subject</p>
            <p className="font-bold dark:text-white">{session.subjectName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Teacher</p>
            <p className="font-bold dark:text-white">{session.teacherName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Date & Time</p>
            <p className="font-bold text-sm dark:text-white">{formatTime(session.scheduledStartTime)}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Duration</p>
            <p className="font-bold dark:text-white">{session.scheduledDurationMinutes} minutes</p>
          </div>
        </div>

        {/* ✅ FIXED: Session Control Buttons */}
        <div className="flex gap-2">
          {/* STUDENT: Join Button */}
          {isStudent && <JoinSessionButton session={session} />}

          {/* TEACHER/ADMIN: Session Controls */}
          {(isTeacher || isAdmin) && isOwnSession && (
            <>
              {/* SCHEDULED: Start Session Button */}
              {session.status === 'SCHEDULED' && (
                <button
                  onClick={handleStartSession}
                  disabled={startSessionMutation.isPending || !canStartEarly}
                  className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition ${
                    canStartEarly
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={!canStartEarly ? `Can start ${minutesUntilStart} minutes before scheduled time` : 'Start session'}
                >
                  <Video className="w-5 h-5" />
                  {startSessionMutation.isPending ? 'Starting...' : 'Start Session'}
                </button>
              )}

              {/* LIVE: Join as Host + End Session Buttons */}
              {session.status === 'LIVE' && (
                <>
                  <button
                    onClick={handleJoinAsHost}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition"
                  >
                    <Video className="w-5 h-5" />
                    Join as Host
                  </button>

                  <button
                    onClick={handleEndSession}
                    disabled={endSessionMutation.isPending}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 font-medium transition"
                  >
                    <X className="w-5 h-5" />
                    {endSessionMutation.isPending ? 'Ending...' : 'End Session'}
                  </button>
                </>
              )}

              {/* ENDED: Show Info */}
              {session.status === 'ENDED' && (
                <div className="bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-lg text-gray-700 dark:text-gray-300">
                  Session has ended
                </div>
              )}

              {/* CANCELLED: Show Info */}
              {session.status === 'CANCELLED' && (
                <div className="bg-red-100 dark:bg-red-900/30 px-6 py-3 rounded-lg text-red-700 dark:text-red-300">
                  Session was cancelled
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border rounded-lg overflow-hidden dark:border-gray-700">
        <div className="flex border-b dark:border-gray-700">
          {(['details', 'participants', 'recording', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 font-medium ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6 bg-white dark:bg-gray-800">
          {activeTab === 'details' && (
            <div>
              <p className="text-gray-700 dark:text-gray-300">{session.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium dark:text-white">Class</p>
                  <p className="text-gray-600 dark:text-gray-400">{session.className}</p>
                </div>
                <div>
                  <p className="font-medium dark:text-white">Max Participants</p>
                  <p className="text-gray-600 dark:text-gray-400">{session.maxParticipants}</p>
                </div>
                {session.lessonTopicTitle && (
                  <div>
                    <p className="font-medium dark:text-white">Lesson Topic</p>
                    <p className="text-gray-600 dark:text-gray-400">{session.lessonTopicTitle}</p>
                  </div>
                )}
                {session.actualStartTime && (
                  <div>
                    <p className="font-medium dark:text-white">Actual Start Time</p>
                    <p className="text-gray-600 dark:text-gray-400">{formatTime(session.actualStartTime)}</p>
                  </div>
                )}
                {session.actualEndTime && (
                  <div>
                    <p className="font-medium dark:text-white">Actual End Time</p>
                    <p className="text-gray-600 dark:text-gray-400">{formatTime(session.actualEndTime)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'participants' && (isTeacher || isAdmin) && (
            <div>
              <h3 className="font-bold mb-4 dark:text-white">Participants ({session.attendanceList?.length || 0})</h3>
              <div className="space-y-2">
                {session.attendanceList?.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No participants yet</p>
                ) : (
                  session.attendanceList?.map(participant => (
                    <div key={participant.id} className="flex justify-between p-2 border dark:border-gray-700 rounded">
                      <div>
                        <p className="font-medium dark:text-white">{participant.studentName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{participant.studentEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm dark:text-gray-300">Joined: {formatTime(participant.joinedAt)}</p>
                        {participant.durationMinutes && (
                          <p className="text-sm dark:text-gray-400">{participant.durationMinutes}m</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'recording' && (
            <div>
              <h3 className="font-bold mb-4 dark:text-white">Recordings</h3>
              {session.recordings && session.recordings.length > 0 ? (
                <div className="space-y-2">
                  {session.recordings.map(recording => (
                    <div key={recording.id} className="p-3 border dark:border-gray-700 rounded">
                      <p className="font-medium dark:text-white">{recording.fileType}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Duration: {Math.floor(recording.durationSeconds / 60)}m {recording.durationSeconds % 60}s
                      </p>
                      {recording.zoomDownloadUrl && (
                        <a 
                          href={recording.zoomDownloadUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                        >
                          Download Recording
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recordings available</p>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (isTeacher || isAdmin) && (
            <div>
              <h3 className="font-bold mb-4 dark:text-white">Analytics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border dark:border-gray-700 rounded p-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Attendance</p>
                  <p className="text-2xl font-bold dark:text-white">{session.attendanceList?.length || 0}</p>
                </div>
                <div className="border dark:border-gray-700 rounded p-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Status</p>
                  <p className="text-2xl font-bold dark:text-white">{session.status}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Cancel Session?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to cancel "{session.title}"? This will notify all students.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={cancelSessionMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {cancelSessionMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};