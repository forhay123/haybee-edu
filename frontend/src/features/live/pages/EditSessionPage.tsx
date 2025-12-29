// src/features/live/pages/EditSessionPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useSessionDetails, useUpdateSession } from '../hooks/useLiveSessions';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

// Import hooks for dynamic data
import { 
  useTeacherSubjects,
  useGetSubjects 
} from '@/features/subjects/hooks/useSubjects';
import { useGetClasses } from '@/features/classes/api/classesApi';
import { useGetTerms } from '@/features/terms/api/termsApi';
import { useLessonTopics } from '@/features/lessons/hooks/useLessonTopics';
import { LessonTopicDto } from '@/features/lessons/types/lessonTopicTypes';

interface SessionFormData {
  title: string;
  description: string;
  scheduledStartTime: string;
  scheduledDurationMinutes: number;
  maxParticipants: number;
}

export const EditSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionId = id ? parseInt(id) : null;

  const user = useSelector((state: RootState) => state.auth?.user);
  const userRoles = user?.roles || [];
  const isTeacher = userRoles.includes('TEACHER');
  const isAdmin = userRoles.includes('ADMIN');

  const { data: session, isLoading: isLoadingSession } = useSessionDetails(sessionId);
  const updateSessionMutation = useUpdateSession();

  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    description: '',
    scheduledStartTime: '',
    scheduledDurationMinutes: 60,
    maxParticipants: 100,
  });

  // Load session data into form when it arrives
  useEffect(() => {
    if (session) {
      // Convert ISO string to datetime-local format
      const localDateTime = session.scheduledStartTime 
        ? new Date(session.scheduledStartTime).toISOString().slice(0, 16)
        : '';

      setFormData({
        title: session.title || '',
        description: session.description || '',
        scheduledStartTime: localDateTime,
        scheduledDurationMinutes: session.scheduledDurationMinutes || 60,
        maxParticipants: session.maxParticipants || 100,
      });
    }
  }, [session]);

  const handleChange = (field: keyof SessionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId) {
      toast.error('Invalid session ID');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a session title');
      return;
    }

    if (!formData.scheduledStartTime) {
      toast.error('Please select date and time');
      return;
    }

    // Check if time is in the future (only if session hasn't started)
    if (session?.status === 'SCHEDULED') {
      if (new Date(formData.scheduledStartTime) <= new Date()) {
        toast.error('Scheduled time must be in the future');
        return;
      }
    }

    try {
      // Convert datetime-local to ISO string
      const startTime = new Date(formData.scheduledStartTime).toISOString();
      
      await updateSessionMutation.mutateAsync({
        id: sessionId,
        data: {
          ...formData,
          scheduledStartTime: startTime,
        },
      });
      
      toast.success('Session updated successfully!');
      navigate(`/live-sessions/${sessionId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update session');
    }
  };

  const handleCancel = () => {
    navigate(`/live-sessions/${sessionId}`);
  };

  if (!isTeacher && !isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Access Denied</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            Only teachers and administrators can edit live sessions.
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Session not found</p>
        </div>
      </div>
    );
  }

  // Prevent editing if session is live or ended
  if (session.status === 'LIVE' || session.status === 'ENDED') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-600 font-medium">Cannot Edit Session</p>
          <p className="text-yellow-500 text-sm mt-1">
            This session is {session.status.toLowerCase()} and cannot be edited.
          </p>
          <button
            onClick={() => navigate(`/live-sessions/${sessionId}`)}
            className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Session Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Session</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Update session details for "{session.title}"
          </p>
        </div>
      </div>

      {/* Session Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Subject</p>
            <p className="font-medium text-gray-900 dark:text-white">{session.subjectName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Class</p>
            <p className="font-medium text-gray-900 dark:text-white">{session.className}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Status</p>
            <p className="font-medium text-gray-900 dark:text-white">{session.status}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Teacher</p>
            <p className="font-medium text-gray-900 dark:text-white">{session.teacherName}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
        
        {/* Title */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Introduction to Algebra"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What will students learn in this session?"
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Date & Time */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.scheduledStartTime}
            onChange={(e) => handleChange('scheduledStartTime', e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            When should the session start?
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duration <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.scheduledDurationMinutes}
            onChange={(e) => handleChange('scheduledDurationMinutes', Number(e.target.value))}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>120 minutes</option>
          </select>
        </div>

        {/* Max Participants */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Participants
          </label>
          <input
            type="number"
            value={formData.maxParticipants}
            onChange={(e) => handleChange('maxParticipants', Number(e.target.value))}
            min={1}
            max={500}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Maximum number of students who can join
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateSessionMutation.isPending}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {updateSessionMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};