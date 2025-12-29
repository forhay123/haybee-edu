import React from 'react';
import { Loader, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useProcessingStatus } from '../hooks/useVideoUpload';

interface ProcessingIndicatorProps {
  videoId: number;
  pollInterval?: number;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  videoId,
  pollInterval = 5000,
}) => {
  const { data: status, isLoading, error, refetch } = useProcessingStatus(videoId, pollInterval);

  if (isLoading) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading processing status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full aspect-video bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center p-6">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Status</h3>
          <p className="text-sm text-red-700 mb-4">
            Failed to fetch processing status. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // Processing Failed
  if (status.status === 'FAILED') {
    return (
      <div className="w-full aspect-video bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={64} />
          <h3 className="text-xl font-semibold text-red-900 mb-2">Processing Failed</h3>
          <p className="text-sm text-red-700 mb-4">
            {status.error || 'An error occurred while processing your video.'}
          </p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={() => refetch()}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Processing Complete
  if (status.status === 'COMPLETED') {
    return (
      <div className="w-full aspect-video bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
        <div className="text-center p-6">
          <CheckCircle className="text-green-600 mx-auto mb-4" size={64} />
          <h3 className="text-xl font-semibold text-green-900 mb-2">Processing Complete!</h3>
          <p className="text-sm text-green-700 mb-4">
            Your video is ready to watch. Refreshing...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Processing In Progress
  return (
    <div className="w-full aspect-video bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg flex items-center justify-center">
      <div className="text-center p-6 max-w-md">
        <Loader className="animate-spin text-blue-600 mx-auto mb-6" size={64} />
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Processing Your Video
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          {status.currentStep || 'Processing in progress...'}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span className="font-semibold">{status.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${status.progress}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Processing Steps */}
        <div className="bg-white rounded-lg p-4 text-left">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Processing Steps:</h4>
          <div className="space-y-2">
            {[
              { label: 'Uploading to YouTube', completed: status.progress > 20 },
              { label: 'Video transcoding', completed: status.progress > 40 },
              { label: 'Generating thumbnail', completed: status.progress > 60 },
              { label: 'Creating chapters', completed: status.progress > 80 },
              { label: 'Finalizing', completed: status.progress > 95 },
            ].map((step, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                {step.completed ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                )}
                <span
                  className={`text-sm ${
                    step.completed ? 'text-green-700 font-medium' : 'text-gray-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This usually takes 2-5 minutes. You can leave this page and come back later.
        </p>
      </div>
    </div>
  );
};
