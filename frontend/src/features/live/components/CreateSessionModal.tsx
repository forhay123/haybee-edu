import React, { useState } from 'react';
import { useCreateSession } from '../hooks/useLiveSessions';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedLessonId?: number;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  preSelectedLessonId,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: 0,
    lessonTopicId: preSelectedLessonId || 0,
    classId: 0,
    termId: 0,
    scheduledStartTime: '',
    scheduledDurationMinutes: 60,
    maxParticipants: 100,
  });

  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const createSessionMutation = useCreateSession();

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Id') || name.includes('Duration') || name.includes('Participants') 
        ? parseInt(value) 
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await createSessionMutation.mutateAsync(formData);
      setJoinUrl(response.data.joinUrl || `Meeting for ${response.data.title}`);
    } catch (error) {
      console.error('Failed to create session', error);
    }
  };

  const handleCopyUrl = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      alert('Join URL copied to clipboard!');
    }
  };

  if (joinUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">✅ Session Created!</h2>
          <p className="text-gray-600 mb-4">Your live session has been created successfully.</p>
          <div className="bg-gray-100 p-3 rounded mb-4">
            <p className="text-sm font-mono text-gray-700 break-all">{joinUrl}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyUrl}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Copy URL
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create Live Session</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};