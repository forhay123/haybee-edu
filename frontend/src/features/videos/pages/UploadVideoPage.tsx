// ✅ Updated with Publish Option
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Upload, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { YouTubeSettings } from '../components/YouTubeSettings';
import { RootState } from '@/store/store';
import toast from 'react-hot-toast';

import { 
  useTeacherSubjects,
  useGetSubjects 
} from '@/features/subjects/hooks/useSubjects';
import { useLessonTopics } from '@/features/lessons/hooks/useLessonTopics';
import { LessonTopicDto } from '@/features/lessons/types/lessonTopicTypes';

import { useUploadVideo } from '../hooks/useVideoUpload';
import { useYouTubeAuthStatus } from '../hooks/useYouTubeAuth';
import { YouTubeConnectButton } from '../components/YouTubeConnectButton';

type Step = 'youtube-check' | 'file-select' | 'metadata' | 'uploading' | 'complete';

interface UploadMetadata {
  title: string;
  description: string;
  subjectId: number | null;
  lessonTopicId: number | null;
  isAspirantMaterial: boolean;
  isPublic: boolean;
  published: boolean; // ✅ Added published field
}

const UploadVideoPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth?.user);
  const userRoles = user?.roles || [];
  const isTeacher = userRoles.includes('TEACHER');
  const isAdmin = userRoles.includes('ADMIN');

  const [step, setStep] = useState<Step>('youtube-check');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<UploadMetadata>({
    title: '',
    description: '',
    subjectId: null,
    lessonTopicId: null,
    isAspirantMaterial: false,
    isPublic: false,
    published: false, // ✅ Default to unpublished (draft)
  });

  const { data: authStatus, isLoading: isCheckingAuth, refetch: refetchAuthStatus } = useYouTubeAuthStatus();
  const { data: teacherSubjects, isLoading: isLoadingTeacherSubjects } = useTeacherSubjects({ enabled: true });
  const { data: allSubjects, isLoading: isLoadingAllSubjects } = useGetSubjects({ enabled: true });
  
  const { getAll: { data: lessonTopics, isLoading: isLoadingTopics } } = useLessonTopics(
    metadata.subjectId ? metadata.subjectId : undefined
  );

  const subjects = useMemo(() => {
    if (isAdmin) {
      return allSubjects || [];
    }
    return teacherSubjects || [];
  }, [isAdmin, teacherSubjects, allSubjects]);

  const { mutate: uploadVideo, uploadProgress, isPending: isUploading, reset } = useUploadVideo();

  useEffect(() => {
    if (step === 'youtube-check' && !isCheckingAuth && authStatus?.connected) {
      setStep('file-select');
    }
  }, [authStatus, isCheckingAuth, step]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMetadata((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      setStep('metadata');
    }
  };

  const handleMetadataChange = (field: keyof UploadMetadata, value: any) => {
    setMetadata(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'subjectId') {
        updated.lessonTopicId = null;
      }
      
      return updated;
    });
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    
    if (!metadata.title.trim()) {
      toast.error('Please enter a video title');
      return;
    }
    
    if (!metadata.subjectId) {
      toast.error('Please select a subject');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', metadata.title);
    formData.append('description', metadata.description);
    formData.append('subjectId', String(metadata.subjectId));
    if (metadata.lessonTopicId) {
      formData.append('lessonTopicId', String(metadata.lessonTopicId));
    }
    formData.append('isAspirantMaterial', String(metadata.isAspirantMaterial));
    formData.append('isPublic', String(metadata.isPublic));
    formData.append('published', String(metadata.published)); // ✅ Include published status

    setStep('uploading');
    uploadVideo(formData, {
      onSuccess: () => {
        setStep('complete');
      },
      onError: () => {
        setStep('metadata');
        toast.error('Upload failed. Please try again.');
      },
    });
  };

  const handleReset = () => {
    reset();
    setStep('youtube-check');
    setSelectedFile(null);
    setMetadata({
      title: '',
      description: '',
      subjectId: null,
      lessonTopicId: null,
      isAspirantMaterial: false,
      isPublic: false,
      published: false,
    });
    refetchAuthStatus();
  };

  const handleDisconnectAndReconnect = async () => {
    try {
      const response = await fetch('/videos/auth/disconnect', { method: 'DELETE' });
      if (response.ok) {
        toast.success('YouTube account disconnected. Please reconnect.');
        await refetchAuthStatus();
      }
    } catch (error) {
      toast.error('Failed to disconnect YouTube account');
      console.error(error);
    }
  };

  if (!isTeacher && !isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Access Denied</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            Only teachers and administrators can upload videos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/videos')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition"
          disabled={isUploading}
        >
          <ArrowLeft size={20} />
          <span>Back to Video Library</span>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upload Video</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Upload your video lesson to share with students
          </p>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-8">
            {['youtube-check', 'file-select', 'metadata', 'uploading', 'complete'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : ['uploading', 'complete'].includes(step) && idx < 3
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 4 && (
                  <div className={`w-16 h-1 ${
                    ['uploading', 'complete'].includes(step) && idx < 3 
                      ? 'bg-green-600' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: YouTube Check */}
          {step === 'youtube-check' && (
            <div className="space-y-6">
              {isCheckingAuth ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Checking YouTube connection...</p>
                </div>
              ) : authStatus?.connected ? (
                <div>
                  <YouTubeSettings />
                  <div className="mt-6 flex items-center justify-center space-x-2 text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <CheckCircle size={20} />
                    <span className="font-medium">Connected to {authStatus.channelName}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
                    Ready to upload! Click the button below to proceed.
                  </p>
                  <div className="mt-6 flex gap-4 justify-center">
                    <button
                      onClick={() => setStep('file-select')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Proceed to Upload
                    </button>
                    <button
                      onClick={handleDisconnectAndReconnect}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Reconnect Account
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <YouTubeSettings />
                  <div className="text-center py-8 mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <AlertCircle size={64} className="mx-auto text-yellow-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      YouTube Account Not Connected
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Videos will be uploaded to your YouTube channel. Connect your account to proceed.
                    </p>
                    <YouTubeConnectButton />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: File Selection */}
          {step === 'file-select' && (
            <div>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a video file
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Supported formats: MP4, MOV, AVI (Max 2GB)
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          )}

          {/* Step 3: Metadata */}
          {step === 'metadata' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Video Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => handleMetadataChange('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => handleMetadataChange('description', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Add a description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  {isLoadingTeacherSubjects || isLoadingAllSubjects ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading subjects...</div>
                  ) : (
                    <select
                      value={metadata.subjectId || ''}
                      onChange={(e) => handleMetadataChange('subjectId', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a subject</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} {subject.code && `(${subject.code})`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lesson Topic (Optional)
                  </label>
                  {!metadata.subjectId ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                      Select a subject first
                    </div>
                  ) : isLoadingTopics ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                      Loading topics...
                    </div>
                  ) : (
                    <select
                      value={metadata.lessonTopicId || ''}
                      onChange={(e) => handleMetadataChange('lessonTopicId', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No specific topic</option>
                      {lessonTopics?.map((topic: LessonTopicDto) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.topicTitle}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4">
                {/* ✅ NEW: Publish checkbox */}
                <label className="flex items-center space-x-3 cursor-pointer p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={metadata.published}
                    onChange={(e) => handleMetadataChange('published', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Publish immediately
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {metadata.published 
                        ? 'Video will be visible to students immediately after processing' 
                        : 'Video will be saved as draft (you can publish it later)'}
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={metadata.isAspirantMaterial}
                    onChange={(e) => handleMetadataChange('isAspirantMaterial', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Aspirant Material</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={metadata.isPublic}
                    onChange={(e) => handleMetadataChange('isPublic', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Make publicly accessible</span>
                </label>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  onClick={() => setStep('file-select')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!metadata.title || !metadata.subjectId || isUploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload Video'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Uploading */}
          {step === 'uploading' && (
            <div className="py-8">
              <div className="text-center mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Uploading to YouTube...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">Please don't close this window</p>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>

              {selectedFile && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle size={64} className="mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Upload Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Your video {metadata.published ? 'is now processing and will be published when ready' : 'has been saved as a draft'}.
              </p>
              {!metadata.published && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-6">
                  You can publish it from the video details page when ready.
                </p>
              )}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Upload Another
                </button>
                <button
                  onClick={() => navigate('/videos')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Go to Library
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadVideoPage;