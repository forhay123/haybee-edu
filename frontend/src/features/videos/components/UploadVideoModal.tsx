import React, { useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Youtube } from 'lucide-react';
import { useUploadVideo } from '../hooks/useVideoUpload';
import { useYouTubeAuthStatus } from '../hooks/useYouTubeAuth';
import { YouTubeConnectButton } from '../components/YouTubeConnectButton';

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'youtube-check' | 'file-select' | 'metadata' | 'uploading' | 'complete';

export const UploadVideoModal: React.FC<UploadVideoModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>('youtube-check');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    subjectId: '',
    lessonTopicId: '',
    isAspirantMaterial: false,
    isPublic: false,
    privacyStatus: 'unlisted',
  });

  const { data: authStatus } = useYouTubeAuthStatus();
  const { mutate: uploadVideo, uploadProgress, isPending, isSuccess, reset } = useUploadVideo();

  // Auto-advance from YouTube check
  React.useEffect(() => {
    if (step === 'youtube-check' && authStatus?.connected) {
      setStep('file-select');
    }
  }, [step, authStatus]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMetadata((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      setStep('metadata');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setMetadata((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      setStep('metadata');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', metadata.title);
    formData.append('description', metadata.description);
    formData.append('subjectId', metadata.subjectId);
    if (metadata.lessonTopicId) formData.append('lessonTopicId', metadata.lessonTopicId);
    formData.append('isAspirantMaterial', String(metadata.isAspirantMaterial));
    formData.append('isPublic', String(metadata.isPublic));
    formData.append('privacyStatus', metadata.privacyStatus);

    setStep('uploading');
    uploadVideo(formData, {
      onSuccess: () => {
        setStep('complete');
      },
    });
  };

  const handleClose = () => {
    reset();
    setStep('youtube-check');
    setSelectedFile(null);
    setMetadata({
      title: '',
      description: '',
      subjectId: '',
      lessonTopicId: '',
      isAspirantMaterial: false,
      isPublic: false,
      privacyStatus: 'unlisted',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Upload Video</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={isPending}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: YouTube Check */}
          {step === 'youtube-check' && (
            <div className="text-center py-8">
              <Youtube size={64} className="mx-auto text-red-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Connect Your YouTube Account
              </h3>
              <p className="text-gray-600 mb-6">
                Videos will be uploaded to your YouTube channel for hosting
              </p>
              {authStatus?.connected ? (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <CheckCircle size={20} />
                  <span>Connected to {authStatus.channelName}</span>
                </div>
              ) : (
                <YouTubeConnectButton />
              )}
            </div>
          )}

          {/* Step 2: File Selection */}
          {step === 'file-select' && (
            <div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition"
                onClick={() => document.getElementById('file-input')?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a video file
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-gray-500">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Add a description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    value={metadata.subjectId}
                    onChange={(e) => setMetadata({ ...metadata, subjectId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subject</option>
                    <option value="1">Mathematics</option>
                    <option value="2">Physics</option>
                    <option value="3">Chemistry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Topic (Optional)
                  </label>
                  <select
                    value={metadata.lessonTopicId}
                    onChange={(e) => setMetadata({ ...metadata, lessonTopicId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!metadata.subjectId}
                  >
                    <option value="">Select topic</option>
                    <option value="1">Topic 1</option>
                    <option value="2">Topic 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Privacy
                </label>
                <select
                  value={metadata.privacyStatus}
                  onChange={(e) => setMetadata({ ...metadata, privacyStatus: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={metadata.isAspirantMaterial}
                    onChange={(e) =>
                      setMetadata({ ...metadata, isAspirantMaterial: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Aspirant Material</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={metadata.isPublic}
                    onChange={(e) => setMetadata({ ...metadata, isPublic: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Make publicly accessible</span>
                </label>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => setStep('file-select')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!metadata.title || !metadata.subjectId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Video
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Uploading */}
          {step === 'uploading' && (
            <div className="py-8">
              <div className="text-center mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Uploading to YouTube...
                </h3>
                <p className="text-gray-600">Please don't close this window</p>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>

              {selectedFile && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">File:</span> {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Size:</span> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Estimated time remaining: {Math.ceil((100 - uploadProgress) / 10)} minutes
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle size={64} className="mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Complete!
              </h3>
              <p className="text-gray-600 mb-6">
                Your video is now processing. You'll be notified when it's ready.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};